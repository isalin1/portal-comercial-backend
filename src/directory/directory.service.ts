import { Injectable } from '@nestjs/common';
import { UserType } from '@prisma/client';
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
      select: { categoryId: true },
    });
    const categoryIds = new Set(businesses.map((business) => business.categoryId));
    return rubros
      .map((rubro) => ({
        ...rubro,
        categories: rubro.categories.filter((category) => categoryIds.has(category.id)),
      }))
      .filter((rubro) => rubro.categories.length > 0);
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

  private presentBusiness<
    T extends {
      user: { planCatalog: Parameters<typeof planFlags>[0] } | null
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
    const { user: _user, ...publicBusiness } = business
    return {
      ...publicBusiness,
      publicOffer: !hideProducts,
      showPhone: Boolean(business.user?.planCatalog) && flags.showPhone,
      clientOrders: business.user?.planCatalog ? flags.clientOrders : true,
      hasMenu,
      menuOffers: hideProducts ? [] : business.menuOffers,
      pointSales: business.pointSales
        .map((point) => {
          const offered = point.items.filter((item) => {
            const mark = item.availabilities[0]
            if (mark) return mark.available
            return item.kind !== 'MENU'
          })
          const items = (hideProducts ? [] : offered.slice(0, remaining)).map((item) => {
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
