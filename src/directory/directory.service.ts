import { Injectable } from '@nestjs/common';
import { ItemKind, UserType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { calendarDateInLima, isOpenNow, scheduleLabel, toWhatsAppUrl } from 'src/common/directory.utils';
import { COMMERCIAL_GROUP_NAME } from 'src/common/markets';
import { planFlags } from 'src/common/plan-features';
import { PublicationService } from 'src/publication/publication.service';

const MAX_PUBLIC_ITEMS = 12

@Injectable()
export class DirectoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publication: PublicationService,
  ) {}

  async findRubros(zoneId?: number) {
    const rubros = await this.prisma.rubro.findMany({
      include: { categories: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    if (!zoneId) return rubros;
    const hidden = await this.publication.hiddenBusinessIds();
    const businesses = await this.prisma.business.findMany({
      where: {
        zoneId,
        marketId: null,
        ...(hidden.length ? { id: { notIn: hidden } } : {}),
        categoryId: { not: null },
        user: { isActive: true, datUser: { userType: UserType.EMPRESARIO } },
      },
      select: { id: true, categoryId: true, rubroId: true },
    });
    const categoryIds = new Set(businesses.map((business) => business.categoryId));
    const countByRubro = new Map<number, number>();
    for (const business of businesses) {
      countByRubro.set(business.rubroId, (countByRubro.get(business.rubroId) || 0) + 1);
    }
    const offersByRubro = await this.dailyOffersByRubro(zoneId, hidden);
    return rubros
      .map((rubro) => ({
        ...rubro,
        businessCount: countByRubro.get(rubro.id) || 0,
        dailyOffers: offersByRubro.get(rubro.id) || [],
        categories: rubro.categories.filter((category) => categoryIds.has(category.id)),
      }))
      .filter((rubro) => rubro.categories.length > 0);
  }

  private async dailyOffersByRubro(zoneId: number, hidden: number[]) {
    const today = calendarDateInLima();
    const items = await this.prisma.item.findMany({
      where: {
        isActive: true,
        kind: ItemKind.OFERTA_DIA,
        availabilities: { some: { day: today, available: true } },
        pointSale: {
          business: {
            zoneId,
            marketId: null,
            ...(hidden.length ? { id: { notIn: hidden } } : {}),
            categoryId: { not: null },
            user: { isActive: true, datUser: { userType: UserType.EMPRESARIO } },
          },
        },
      },
      include: {
        descriptions: { include: { unit: true }, orderBy: { id: 'asc' } },
        category: true,
        pointSale: {
          include: {
            address: { include: { district: true } },
            business: {
              include: {
                rubro: true,
                user: { select: { plan: true, planCatalog: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const visibleBusinessIds = new Set(
      (
        await this.publication.hideUnpublished(
          items.map((item) => item.pointSale.business),
        )
      ).map((business) => business.id),
    );
    const blockedItems = new Set(
      (
        await this.prisma.publicationChange.findMany({
          where: {
            scope: 'ITEM',
            recordId: { in: items.map((item) => item.id) },
            kind: { in: ['ALTA', 'RECHAZADO'] },
            field: 'name',
          },
          select: { recordId: true },
        })
      ).map((row) => row.recordId),
    );

    type DailyOfferRow = {
      id: string
      kind: 'OFERTA_DIA'
      title: string
      detail: string
      businessId: number
      businessName: string
      categoryId: number | null
      imageUrl: string | null
      price: number | null
      compareAtPrice: number | null
      descriptionId?: number
      itemId: number
      footer: string
      cta: string
      clientOrders: boolean
      whatsappUrl: string | null
    }
    const byRubro = new Map<number, DailyOfferRow[]>();

    for (const item of items) {
      const business = item.pointSale.business;
      if (!visibleBusinessIds.has(business.id) || blockedItems.has(item.id)) continue;
      const flags = planFlags(business.user?.planCatalog);
      if (Boolean(business.user?.planCatalog) && !flags.showProducts) continue;
      const isPro = /profesional/i.test(business.rubro?.name || '');
      const canOrder = business.user?.planCatalog ? flags.clientOrders : true;
      const clientOrders = canOrder && !isPro;
      const whatsappUrl =
        business.user?.planCatalog && !flags.whatsappButton
          ? null
          : toWhatsAppUrl(item.pointSale.phone);
      const line = item.descriptions.find((d) => d.price != null) || item.descriptions[0];
      const footer = item.pointSale.chargesDelivery
        ? `Delivery en ${item.pointSale.address?.urbanZone || item.pointSale.address?.district?.name || 'tu zona'}`
        : scheduleLabel(item.pointSale.opensAt, item.pointSale.closesAt, item.pointSale.openDays) ||
          business.commercialDescription ||
          '';
      const list = byRubro.get(business.rubroId) || [];
      if (list.length >= 12) continue;
      list.push({
        id: `oferta-${item.id}`,
        kind: 'OFERTA_DIA',
        title: item.name,
        detail: line?.description || '',
        businessId: business.id,
        businessName: business.commercialName,
        categoryId: item.categoryId || business.categoryId || null,
        imageUrl: item.imageUrl || null,
        price: line?.price != null ? Number(line.price) : null,
        compareAtPrice: item.compareAtPrice != null ? Number(item.compareAtPrice) : null,
        descriptionId: line?.id,
        itemId: item.id,
        footer,
        cta: isPro ? 'Consultar vía WhatsApp' : clientOrders ? 'Pedir hoy' : 'Ver oferta',
        clientOrders,
        whatsappUrl,
      });
      byRubro.set(business.rubroId, list);
    }

    return byRubro;
  }

  findCategories(rubroId?: number) {
    return this.prisma.category.findMany({
      where: rubroId ? { rubroId } : undefined,
      include: { rubro: true },
      orderBy: { name: 'asc' },
    });
  }

  async findBusinesses(categoryId?: number, rubroId?: number, zoneId?: number, marketScope: 'outside' | 'any' = 'outside') {
    const today = calendarDateInLima()
    const itemFilter = {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(rubroId && !categoryId ? { category: { rubroId } } : {}),
    };

    const businesses = await this.prisma.business.findMany({
      where: {
        ...(marketScope === 'outside' ? { marketId: null } : {}),
        ...(zoneId ? { zoneId } : {}),
        user: {
          isActive: true,
          datUser: { userType: UserType.EMPRESARIO },
        },
        pointSales: {
          some: {
            items: {
              some: itemFilter,
            },
          },
        },
      },
      include: {
        rubro: true,
        user: { select: { plan: true, planCatalog: true } },
        menuOffers: { where: { isActive: true }, orderBy: { name: 'asc' } },
        pointSales: {
          include: {
            address: { include: { district: true } },
            items: {
              where: itemFilter,
              include: {
                descriptions: { include: { unit: true } },
                category: true,
                menuOffer: { select: { id: true, name: true, price: true } },
                menuLinks: { select: { menuOfferId: true } },
                availabilities: { where: { day: today } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: { commercialName: 'asc' },
    });

    const visible = await this.publication.hideUnpublished(businesses)
    return visible.map((business) => this.presentBusiness(business))
  }

  private affiliationBadge(
    user?: {
      plan?: string | null
      planCatalog?: { commercialName?: string | null; name?: string | null } | null
    } | null,
  ) {
    const commercial = user?.planCatalog?.commercialName || ''
    const name = user?.planCatalog?.name || ''
    if (/corporativo/i.test(commercial)) {
      return { affiliationTone: 'gold' as const, affiliationLabel: 'Afiliado Premium' }
    }
    if (/empresario/i.test(commercial)) {
      return { affiliationTone: 'green' as const, affiliationLabel: 'Afiliado Destacado' }
    }
    if (/emprendedor/i.test(commercial)) {
      return { affiliationTone: 'blue' as const, affiliationLabel: 'Afiliado' }
    }
    if (
      user?.plan === 'FREE' ||
      /free/i.test(commercial) ||
      /libre/i.test(commercial) ||
      /libre/i.test(name)
    ) {
      return { affiliationTone: 'gray' as const, affiliationLabel: 'Participante' }
    }
    return { affiliationTone: 'gray' as const, affiliationLabel: 'Participante' }
  }

  private presentBusiness<
    T extends {
      user: {
        plan?: string | null
        planCatalog: (Parameters<typeof planFlags>[0] & {
          commercialName?: string | null
          name?: string | null
        }) | null
      } | null
      menuOffers: { id: number }[]
      pointSales: {
        phone: string
        opensAt: string | null
        closesAt: string | null
        openDays: string | null
        items: {
          kind: string
          menuOfferId: number | null
          menuLinks: { menuOfferId: number }[]
          availabilities: { available: boolean }[]
        }[]
      }[]
    },
  >(business: T, keepEmptyPoints = false) {
    const flags = planFlags(business.user?.planCatalog)
    const hideProducts = Boolean(business.user?.planCatalog) && !flags.showProducts
    const hasMenu = business.pointSales.some((point) => point.items.some((item) => item.kind === 'MENU'))
    let remaining = MAX_PUBLIC_ITEMS
    const affiliation = this.affiliationBadge(business.user)
    const { user: _user, ...publicBusiness } = business
    return {
      ...publicBusiness,
      ...affiliation,
      publicOffer: !hideProducts,
      showPhone: Boolean(business.user?.planCatalog) && flags.showPhone,
      clientOrders: business.user?.planCatalog ? flags.clientOrders : true,
      hasMenu,
      menuOffers: hideProducts ? [] : business.menuOffers,
      pointSales: business.pointSales
        .map((point) => {
          const offered = point.items.filter((item) => {
            if (item.kind === ItemKind.OFERTA_DIA) {
              return Boolean(item.availabilities[0]?.available)
            }
            const mark = item.availabilities[0]
            if (mark) return mark.available
            return item.kind !== ItemKind.MENU
          })
          const daily = offered.filter((item) => item.kind === ItemKind.OFERTA_DIA)
          const rest = offered.filter((item) => item.kind !== ItemKind.OFERTA_DIA)
          const picked = hideProducts
            ? []
            : [...daily, ...rest.slice(0, Math.max(0, remaining - daily.length))]
          const items = picked.map((item) => {
            const linked = item.menuLinks?.map((link) => link.menuOfferId) || []
            return { ...item, menuOfferIds: linked.length ? linked : item.menuOfferId ? [item.menuOfferId] : [] }
          })
          if (!hideProducts) remaining -= items.length
          return {
            ...point,
            items,
            whatsappUrl: business.user?.planCatalog && !flags.whatsappButton ? null : toWhatsAppUrl(point.phone),
            isOpen: isOpenNow(point.opensAt, point.closesAt, point.openDays),
            scheduleLabel: scheduleLabel(point.opensAt, point.closesAt, point.openDays),
          }
        })
        .filter((point) => keepEmptyPoints || hideProducts || point.items.length > 0),
    }
  }

  async findMarkets(zoneId?: number) {
    const group = await this.prisma.commercialGroup.findUnique({
      where: { name: COMMERCIAL_GROUP_NAME },
    });
    if (!group) return { name: COMMERCIAL_GROUP_NAME, markets: [] };
    const hidden = await this.publication.hiddenBusinessIds();
    const markets = await this.prisma.market.findMany({
      where: {
        groupId: group.id,
        ...(zoneId
          ? {
              businesses: {
                some: {
                  zoneId,
                  ...(hidden.length ? { id: { notIn: hidden } } : {}),
                  user: { isActive: true, datUser: { userType: UserType.EMPRESARIO } },
                },
              },
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
    return { name: COMMERCIAL_GROUP_NAME, markets };
  }

  async findMarket(id: number, zoneId?: number) {
    const market = await this.prisma.market.findUnique({
      where: { id },
      include: { group: true },
    });
    if (!market || market.group.name !== COMMERCIAL_GROUP_NAME) return null;
    const today = calendarDateInLima();
    const hidden = await this.publication.hiddenBusinessIds();
    const businesses = (
      await this.publication.hideUnpublished(await this.prisma.business.findMany({
        where: {
        marketId: id,
        ...(zoneId ? { zoneId } : {}),
        ...(hidden.length ? { id: { notIn: hidden } } : {}),
        user: { isActive: true, datUser: { userType: UserType.EMPRESARIO } },
        },
        include: {
          category: true,
          rubro: true,
          user: { select: { plan: true, planCatalog: true } },
          menuOffers: { where: { isActive: true }, orderBy: { name: 'asc' } },
          pointSales: {
            include: {
              address: { include: { district: true } },
              items: {
                where: { isActive: true },
                include: {
                  descriptions: { include: { unit: true } },
                  category: true,
                  menuOffer: { select: { id: true, name: true, price: true } },
                  menuLinks: { select: { menuOfferId: true } },
                  availabilities: { where: { day: today } },
                },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
        orderBy: { commercialName: 'asc' },
      }))
    ).map((business) => this.presentBusiness(business, true));
    const grouped = new Map<number, { id: number; name: string; categories: Map<number, { id: number | null; name: string; businesses: typeof businesses }> }>();
    for (const business of businesses) {
      const rubroKey = business.rubroId;
      const rubro = grouped.get(rubroKey) || {
        id: rubroKey,
        name: business.rubro?.name || 'Sin rubro',
        categories: new Map(),
      };
      const categoryKey = business.categoryId ?? 0;
      const category = rubro.categories.get(categoryKey) || {
        id: business.category?.id ?? null,
        name: business.category?.name || 'Sin categoría',
        businesses: [],
      };
      category.businesses.push(business);
      rubro.categories.set(categoryKey, category);
      grouped.set(rubroKey, rubro);
    }
    const rubros = [...grouped.values()]
      .map((rubro) => ({
        id: rubro.id,
        name: rubro.name,
        categories: [...rubro.categories.values()].sort((a, b) => {
          if (!a.id) return 1;
          if (!b.id) return -1;
          return a.name.localeCompare(b.name, 'es');
        }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return {
      id: market.id,
      name: market.name,
      imageUrl: market.imageUrl,
      groupName: market.group.name,
      rubros,
    };
  }

  async findBusiness(id: number, zoneId?: number) {
    const list = await this.findBusinesses(undefined, undefined, zoneId, 'any');
    return list.find((item) => item.id === id) ?? null;
  }
}
