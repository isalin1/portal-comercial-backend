import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateCategoryDto & { imageUrl?: string }) {
    return this.prisma.category.create({
      data: {
        name: data.name,
        rubroId: data.rubroId,
        imageUrl: data.imageUrl,
      },
    });
  }

  findAll(rubroId?: number) {
    return this.prisma.category.findMany({
      where: rubroId ? { rubroId } : undefined,
      include: { rubro: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { rubro: true },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  async update(id: number, data: UpdateCategoryDto & { imageUrl?: string }) {
    await this.findOne(id);
    const { imageUrl, removeImage, ...rest } = data;
    return this.prisma.category.update({
      where: { id },
      data: {
        ...rest,
        ...(imageUrl ? { imageUrl } : removeImage ? { imageUrl: null } : {}),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.business.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      });
      const items = await tx.item.findMany({
        where: { categoryId: id },
        select: { id: true },
      });
      const itemIds = items.map((item) => item.id);
      if (itemIds.length) {
        await tx.orderMenuDish.deleteMany({ where: { itemId: { in: itemIds } } });
        await tx.item.deleteMany({ where: { id: { in: itemIds } } });
      }
      return tx.category.delete({ where: { id } });
    });
  }
}
