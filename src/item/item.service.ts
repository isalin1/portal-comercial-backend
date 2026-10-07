import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ItemKind, MenuPart, UserType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import { calendarDateInLima, isMenuCategory, locksToOneCategory } from 'src/common/directory.utils';
import { PublicationService } from 'src/publication/publication.service';

const include = {
  descriptions: { include: { unit: true } },
  category: { include: { rubro: true } },
  pointSale: { include: { business: true } },
  menuLinks: { select: { menuOfferId: true } },
} as const;

@Injectable()
export class ItemService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publication: PublicationService,
  ) {}

  onModuleInit() {
    return this.uncheckMenuForToday();
  }

  @Cron('0 0 * * *', { timeZone: 'America/Lima' })
  async uncheckMenuForToday() {
    const day = calendarDateInLima();
    const items = await this.prisma.item.findMany({
      where: { kind: { in: [ItemKind.MENU, ItemKind.OFERTA_DIA] }, isActive: true },
      select: { id: true },
    });
    if (!items.length) return;
    await this.prisma.itemAvailability.createMany({
      data: items.map((item) => ({ itemId: item.id, day, available: false })),
      skipDuplicates: true,
    });
  }

  private async assertPointSale(user: AuthUser, pointSaleId: number) {
    const point = await this.prisma.pointSale.findUnique({
      where: { id: pointSaleId },
      include: { business: true },
    });
    if (!point) throw new NotFoundException('Punto de venta no encontrado');
    if (user.userType === UserType.ADMIN) return point;
    if (
      user.userType === UserType.EMPRESARIO &&
      point.business.userId === user.id
    ) {
      return point;
    }
    throw new ForbiddenException('No puedes gestionar ítems de este local');
  }

  private async assertCategory(user: AuthUser, categoryId: number, businessId?: number) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    if (user.userType === UserType.ADMIN) return category;
    const business = businessId
      ? await this.prisma.business.findUnique({ where: { id: businessId }, include: { rubro: true } })
      : await this.prisma.business.findFirst({
          where: { userId: user.id, rubroId: category.rubroId },
          include: { rubro: true },
        });
    if (!business || business.userId !== user.id || business.rubroId !== category.rubroId) {
      throw new ForbiddenException(
        'Solo puedes publicar ítems en las categorías del rubro de tu negocio',
      );
    }
    if (business.categoryId && business.categoryId !== category.id) {
      throw new ForbiddenException('Solo puedes publicar ítems en la categoría que elegiste');
    }
    if (locksToOneCategory(business.rubro.name) && !business.categoryId) {
      throw new BadRequestException('Elige primero la categoría de tu negocio');
    }
    return category;
  }

  private plate(categoryName: string, dto: Pick<CreateItemDto, 'kind' | 'menuPart' | 'descriptions' | 'compareAtPrice'>) {
    const kind: ItemKind =
      dto.kind === 'OFERTA_DIA'
        ? ItemKind.OFERTA_DIA
        : isMenuCategory(categoryName) && dto.kind === 'MENU'
          ? ItemKind.MENU
          : ItemKind.CARTA;
    if (kind === ItemKind.MENU && !dto.menuPart) {
      throw new BadRequestException('Elige si el plato es entrada, segundo o refresco');
    }
    const descriptions = (dto.descriptions || []).map((line) => {
      const text = String(line.description || '').trim();
      if (kind === ItemKind.MENU) {
        return { id: line.id, description: text, price: null as number | null, unitId: null as number | null };
      }
      if (!text) {
        throw new BadRequestException('Completa la descripción para terminar el registro');
      }
      if (line.price === undefined || line.price === null || Number.isNaN(Number(line.price)) || Number(line.price) < 0) {
        throw new BadRequestException('El precio no puede ser menor que cero');
      }
      if (!line.unitId) throw new BadRequestException('Elige la unidad de cada descripción');
      return { id: line.id, description: text, price: Number(line.price), unitId: Number(line.unitId) };
    }).filter((line) => line.description);
    if ((kind === ItemKind.CARTA || kind === ItemKind.OFERTA_DIA) && !descriptions.length) {
      throw new BadRequestException('Completa la descripción para terminar el registro');
    }
    let compareAtPrice: number | null = null;
    if (kind === ItemKind.OFERTA_DIA) {
      if (dto.compareAtPrice === undefined || dto.compareAtPrice === null || dto.compareAtPrice === ('' as unknown)) {
        compareAtPrice = null;
      } else {
        const value = Number(dto.compareAtPrice);
        if (Number.isNaN(value) || value < 0) {
          throw new BadRequestException('El precio de referencia no puede ser menor que cero');
        }
        compareAtPrice = value;
      }
    }
    return {
      kind,
      menuPart: kind === ItemKind.MENU ? (dto.menuPart as MenuPart) : null,
      compareAtPrice,
      descriptions,
    };
  }

  private async resolveMenuOffers(
    kind: ItemKind,
    menuPart: MenuPart | null,
    businessId: number,
    raw?: number[] | null,
  ) {
    if (kind !== ItemKind.MENU) return [];
    const ids = [...new Set((raw || []).map(Number).filter(Boolean))];
    if (!ids.length) throw new BadRequestException('Elige el tipo de menú');
    if (menuPart === MenuPart.SEGUNDO && ids.length !== 1) {
      throw new BadRequestException('El segundo pertenece a un solo tipo de menú');
    }
    const offers = await this.prisma.menuOffer.findMany({
      where: { id: { in: ids }, businessId, isActive: true },
    });
    if (offers.length !== ids.length) throw new BadRequestException('Ese tipo de menú no pertenece al negocio');
    return ids;
  }

  private withOffers<T extends { menuOfferId?: number | null; menuLinks?: { menuOfferId: number }[] }>(item: T) {
    const linked = item.menuLinks?.map((link) => link.menuOfferId) || [];
    return { ...item, menuOfferIds: linked.length ? linked : item.menuOfferId ? [item.menuOfferId] : [] };
  }

  async create(dto: CreateItemDto, user: AuthUser, imageUrl?: string) {
    const point = await this.assertPointSale(user, Number(dto.pointSaleId));
    const category = await this.assertCategory(user, Number(dto.categoryId), point.business.id);
    const plate = this.plate(category.name, dto);
    const menuOfferIds = await this.resolveMenuOffers(
      plate.kind,
      plate.menuPart,
      point.business.id,
      dto.menuOfferIds?.length ? dto.menuOfferIds : dto.menuOfferId ? [dto.menuOfferId] : [],
    );

    const created = await this.prisma.item.create({
      data: {
        name: dto.name,
        pointSaleId: Number(dto.pointSaleId),
        categoryId: Number(dto.categoryId),
        isActive: dto.isActive ?? true,
        kind: plate.kind,
        menuPart: plate.menuPart,
        compareAtPrice: plate.kind === ItemKind.OFERTA_DIA ? plate.compareAtPrice : null,
        menuOfferId: menuOfferIds.length === 1 ? menuOfferIds[0] : null,
        menuLinks: menuOfferIds.length ? { create: menuOfferIds.map((menuOfferId) => ({ menuOfferId })) } : undefined,
        imageUrl,
        descriptions: plate.descriptions.length
          ? { create: plate.descriptions.map(({ description, price, unitId }) => ({ description, price, unitId })) }
          : undefined,
      },
      include,
    });
    if (plate.kind === ItemKind.OFERTA_DIA || plate.kind === ItemKind.MENU) {
      await this.prisma.itemAvailability.upsert({
        where: { itemId_day: { itemId: created.id, day: calendarDateInLima() } },
        create: { itemId: created.id, day: calendarDateInLima(), available: false },
        update: {},
      });
    }
    await this.publication.trackCreate(user, point.business.id, 'ITEM', created.id, [
      { field: 'name', label: `Nombre del producto · ${created.name}`, value: created.name },
      { field: 'imageUrl', label: `Foto del producto · ${created.name}`, value: created.imageUrl },
    ]);
    for (const line of created.descriptions) {
      await this.publication.trackCreate(user, point.business.id, 'DESCRIPTION', line.id, [
        { field: 'description', label: `Descripción · ${created.name}`, value: line.description },
      ]);
    }
    const [decorated] = await this.publication.decorateItems(user, [this.withOffers(created)]);
    return decorated;
  }

  async findAll(user: AuthUser, pointSaleId?: number) {
    const where: {
      pointSaleId?: number;
      pointSale?: { business: { userId: number } };
    } = {};
    if (pointSaleId) where.pointSaleId = pointSaleId;
    if (user.userType === UserType.EMPRESARIO) {
      where.pointSale = { business: { userId: user.id } };
    }

    const items = await this.prisma.item.findMany({
      where,
      include,
      orderBy: { name: 'asc' },
    });
    return this.publication.decorateItems(user, items.map((item) => this.withOffers(item)));
  }

  async findOne(id: number, user: AuthUser) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include,
    });
    if (!item) throw new NotFoundException('Ítem no encontrado');
    await this.assertPointSale(user, item.pointSaleId);
    const [decorated] = await this.publication.decorateItems(user, [this.withOffers(item)]);
    return decorated;
  }

  async update(
    id: number,
    dto: UpdateItemDto,
    user: AuthUser,
    imageUrl?: string,
  ) {
    const current = await this.prisma.item.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Ítem no encontrado');
    await this.assertPointSale(user, current.pointSaleId);

    if (dto.pointSaleId) {
      await this.assertPointSale(user, Number(dto.pointSaleId));
    }
    const pointId = dto.pointSaleId ? Number(dto.pointSaleId) : current.pointSaleId;
    const point = await this.assertPointSale(user, pointId);
    const categoryId = dto.categoryId ? Number(dto.categoryId) : current.categoryId;
    const category = await this.assertCategory(user, categoryId, point.business.id);
    const plate = dto.descriptions || dto.kind || dto.menuPart || dto.compareAtPrice !== undefined
      ? this.plate(category.name, {
          kind: dto.kind || (current.kind as 'CARTA' | 'MENU' | 'OFERTA_DIA'),
          menuPart: dto.menuPart === undefined ? current.menuPart : dto.menuPart,
          compareAtPrice:
            dto.compareAtPrice !== undefined
              ? dto.compareAtPrice
              : current.compareAtPrice != null
                ? Number(current.compareAtPrice)
                : null,
          descriptions: dto.descriptions || [],
        })
      : null;
    const wantsOffers = dto.menuOfferIds !== undefined || dto.menuOfferId !== undefined;
    const menuOfferIds = plate || wantsOffers
      ? await this.resolveMenuOffers(
          plate?.kind || (current.kind as ItemKind),
          plate ? plate.menuPart : current.menuPart,
          point.business.id,
          dto.menuOfferIds !== undefined
            ? dto.menuOfferIds
            : dto.menuOfferId
              ? [dto.menuOfferId]
              : current.menuOfferId
                ? [current.menuOfferId]
                : [],
        )
      : undefined;

    const nextName = dto.name?.trim() || current.name;
    const nextImage = imageUrl !== undefined ? imageUrl : dto.removeImage ? null : undefined;
    const blocked = await this.publication.reviewFields(user, point.business.id, 'ITEM', id, [
      ...(dto.name !== undefined ? [{ field: 'name', label: `Nombre del producto · ${nextName}`, before: current.name, after: dto.name }] : []),
      ...(nextImage !== undefined ? [{ field: 'imageUrl', label: `Foto del producto · ${nextName}`, before: current.imageUrl, after: nextImage }] : []),
    ]);
    if (dto.descriptions && plate) await this.syncDescriptions(user, point.business.id, id, nextName, plate.descriptions);

    const saved = await this.prisma.item.update({
      where: { id },
      data: {
        name: blocked.has('name') ? undefined : dto.name,
        isActive: dto.isActive,
        categoryId: dto.categoryId ? Number(dto.categoryId) : undefined,
        pointSaleId: dto.pointSaleId ? Number(dto.pointSaleId) : undefined,
        ...(plate
          ? {
              kind: plate.kind,
              menuPart: plate.menuPart,
              compareAtPrice: plate.kind === ItemKind.OFERTA_DIA ? plate.compareAtPrice : null,
            }
          : {}),
        ...(menuOfferIds
          ? {
              menuOfferId: menuOfferIds.length === 1 ? menuOfferIds[0] : null,
              menuLinks: { deleteMany: {}, create: menuOfferIds.map((menuOfferId) => ({ menuOfferId })) },
            }
          : {}),
        ...(blocked.has('imageUrl') ? {} : imageUrl ? { imageUrl } : dto.removeImage ? { imageUrl: null } : {}),
      },
      include,
    });
    const [decorated] = await this.publication.decorateItems(user, [this.withOffers(saved)]);
    return decorated;
  }

  private async syncDescriptions(
    user: AuthUser,
    businessId: number,
    itemId: number,
    itemName: string,
    lines: { id?: number; description: string; price: number | null; unitId: number | null }[],
  ) {
    const existing = await this.prisma.itemDescription.findMany({ where: { itemId } });
    const kept = new Set<number>();
    for (const line of lines) {
      const text = line.description.trim();
      if (!text) continue;
      const match = line.id ? existing.find((row) => row.id === line.id) : undefined;
      if (match) {
        kept.add(match.id);
        const blocked = await this.publication.reviewFields(user, businessId, 'DESCRIPTION', match.id, [
          { field: 'description', label: `Descripción · ${itemName}`, before: match.description, after: text },
        ]);
        await this.prisma.itemDescription.update({
          where: { id: match.id },
          data: {
            description: blocked.has('description') ? undefined : text,
            price: line.price,
            unitId: line.unitId,
          },
        });
        continue;
      }
      const created = await this.prisma.itemDescription.create({
        data: { itemId, description: text, price: line.price, unitId: line.unitId },
      });
      kept.add(created.id);
      await this.publication.trackCreate(user, businessId, 'DESCRIPTION', created.id, [
        { field: 'description', label: `Descripción · ${itemName}`, value: text },
      ]);
    }
    for (const row of existing) {
      if (kept.has(row.id)) continue;
      await this.publication.forget('DESCRIPTION', row.id);
      await this.prisma.itemDescription.delete({ where: { id: row.id } });
    }
  }

  async availability(user: AuthUser, day?: string) {
    const date = this.parseDay(day);
    const items = await this.prisma.item.findMany({
      where: user.userType === UserType.EMPRESARIO
        ? { pointSale: { business: { userId: user.id } } }
        : {},
      include: {
        category: { include: { rubro: true } },
        menuOffer: true,
        menuLinks: { include: { menuOffer: { select: { name: true } } } },
        availabilities: { where: { day: date } },
      },
      orderBy: { name: 'asc' },
    });
    return {
      date: date.toISOString().slice(0, 10),
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        menuPart: item.menuPart,
        menuOfferId: item.menuOfferId,
        menuOfferIds: item.menuLinks.length
          ? item.menuLinks.map((link) => link.menuOfferId)
          : item.menuOfferId
            ? [item.menuOfferId]
            : [],
        menuOfferNames: item.menuLinks.length
          ? item.menuLinks.map((link) => link.menuOffer.name)
          : item.menuOffer?.name
            ? [item.menuOffer.name]
            : [],
        menuOfferName: item.menuLinks[0]?.menuOffer.name || item.menuOffer?.name || '',
        categoryName: item.category.name,
        available: item.availabilities[0]
          ? item.availabilities[0].available
          : item.kind === ItemKind.CARTA,
      })),
    };
  }

  async setAvailability(user: AuthUser, day: string | undefined, itemIds: number[]) {
    const date = this.parseDay(day);
    const mine = await this.prisma.item.findMany({
      where: user.userType === UserType.EMPRESARIO
        ? { pointSale: { business: { userId: user.id } } }
        : { id: { in: itemIds } },
      select: { id: true },
    });
    const allowed = new Set(mine.map((item) => item.id));
    if (itemIds.some((id) => !allowed.has(Number(id)))) {
      throw new ForbiddenException('No puedes publicar platos de otro negocio');
    }
    const chosen = new Set(itemIds.map(Number));
    await this.prisma.$transaction(
      mine.map((item) =>
        this.prisma.itemAvailability.upsert({
          where: { itemId_day: { itemId: item.id, day: date } },
          create: { itemId: item.id, day: date, available: chosen.has(item.id) },
          update: { available: chosen.has(item.id) },
        }),
      ),
    );
    return this.availability(user, date.toISOString().slice(0, 10));
  }

  private parseDay(day?: string) {
    if (!day) return calendarDateInLima();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new BadRequestException('La fecha no es válida');
    }
    return new Date(`${day}T00:00:00.000Z`);
  }

  async remove(id: number, user: AuthUser) {
    const current = await this.prisma.item.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Ítem no encontrado');
    await this.assertPointSale(user, current.pointSaleId);
    return this.prisma.item.delete({ where: { id } });
  }
}
