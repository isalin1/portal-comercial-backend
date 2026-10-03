import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRubroDto } from './dto/create-rubro.dto';
import { UpdateRubroDto } from './dto/update-rubro.dto';

@Injectable()
export class RubroService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateRubroDto & { imageUrl?: string }) {
    return this.prisma.rubro.create({ data });
  }

  findAll() {
    return this.prisma.rubro.findMany({
      include: { categories: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const rubro = await this.prisma.rubro.findUnique({
      where: { id },
      include: { categories: true },
    });
    if (!rubro) throw new NotFoundException('Rubro no encontrado');
    return rubro;
  }

  async update(id: number, data: UpdateRubroDto & { imageUrl?: string }) {
    await this.findOne(id);
    const { imageUrl, ...rest } = data;
    return this.prisma.rubro.update({
      where: { id },
      data: {
        ...rest,
        ...(imageUrl ? { imageUrl } : {}),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    const businesses = await this.prisma.business.count({ where: { rubroId: id } });
    if (businesses) {
      throw new BadRequestException('No se puede eliminar el rubro porque tiene negocios registrados');
    }
    return this.prisma.$transaction(async (tx) => {
      const categories = await tx.category.findMany({ where: { rubroId: id }, select: { id: true } });
      const categoryIds = categories.map((category) => category.id);
      if (categoryIds.length) {
        await tx.business.updateMany({ where: { categoryId: { in: categoryIds } }, data: { categoryId: null } });
        const items = await tx.item.findMany({ where: { categoryId: { in: categoryIds } }, select: { id: true } });
        const itemIds = items.map((item) => item.id);
        if (itemIds.length) {
          await tx.orderMenuDish.deleteMany({ where: { itemId: { in: itemIds } } });
          await tx.item.deleteMany({ where: { id: { in: itemIds } } });
        }
        await tx.category.deleteMany({ where: { id: { in: categoryIds } } });
      }
      return tx.rubro.delete({ where: { id } });
    });
  }
}
