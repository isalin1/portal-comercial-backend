import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import { locksToOneCategory } from 'src/common/directory.utils';

const include = {
  descriptions: true,
  category: { include: { rubro: true } },
  pointSale: { include: { business: true } },
} as const;

@Injectable()
export class ItemService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (locksToOneCategory(business.rubro.name)) {
      if (!business.categoryId) {
        throw new BadRequestException('Elige primero la categoría de tu negocio');
      }
      if (business.categoryId !== category.id) {
        throw new ForbiddenException('Solo puedes publicar ítems en la categoría que elegiste');
      }
    }
    return category;
  }

  async create(dto: CreateItemDto, user: AuthUser, imageUrl?: string) {
    const point = await this.assertPointSale(user, Number(dto.pointSaleId));
    await this.assertCategory(user, Number(dto.categoryId), point.business.id);

    return this.prisma.item.create({
      data: {
        name: dto.name,
        pointSaleId: Number(dto.pointSaleId),
        categoryId: Number(dto.categoryId),
        isActive: dto.isActive ?? true,
        imageUrl,
        descriptions: dto.descriptions?.length
          ? {
              create: dto.descriptions.map((item) => ({
                description: item.description,
                price: item.price,
              })),
            }
          : undefined,
      },
      include,
    });
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

    return this.prisma.item.findMany({
      where,
      include,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number, user: AuthUser) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include,
    });
    if (!item) throw new NotFoundException('Ítem no encontrado');
    await this.assertPointSale(user, item.pointSaleId);
    return item;
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
    await this.assertCategory(user, categoryId, point.business.id);

    if (dto.descriptions) {
      await this.prisma.itemDescription.deleteMany({ where: { itemId: id } });
    }

    return this.prisma.item.update({
      where: { id },
      data: {
        name: dto.name,
        isActive: dto.isActive,
        categoryId: dto.categoryId ? Number(dto.categoryId) : undefined,
        pointSaleId: dto.pointSaleId ? Number(dto.pointSaleId) : undefined,
        ...(imageUrl ? { imageUrl } : dto.removeImage ? { imageUrl: null } : {}),
        descriptions: dto.descriptions
          ? {
              create: dto.descriptions.map((item) => ({
                description: item.description,
                price: item.price,
              })),
            }
          : undefined,
      },
      include,
    });
  }

  async remove(id: number, user: AuthUser) {
    const current = await this.prisma.item.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Ítem no encontrado');
    await this.assertPointSale(user, current.pointSaleId);
    return this.prisma.item.delete({ where: { id } });
  }
}
