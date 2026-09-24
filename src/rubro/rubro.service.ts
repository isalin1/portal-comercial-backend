import { Injectable, NotFoundException } from '@nestjs/common';
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
    return this.prisma.rubro.delete({ where: { id } });
  }
}
