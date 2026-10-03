import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateUnitDto) {
    return this.prisma.unit.create({ data: { name: dto.name.trim() } }).catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Esa unidad ya está registrada');
      }
      throw error;
    });
  }

  findAll() {
    return this.prisma.unit.findMany({ orderBy: { name: 'asc' } });
  }

  async update(id: number, dto: UpdateUnitDto) {
    await this.findOne(id);
    return this.prisma.unit.update({
      where: { id },
      data: { name: dto.name?.trim() },
    }).catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Esa unidad ya está registrada');
      }
      throw error;
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    const used = await this.prisma.itemDescription.count({ where: { unitId: id } });
    if (used) throw new ConflictException('Esa unidad está en uso en variantes');
    return this.prisma.unit.delete({ where: { id } });
  }

  private async findOne(id: number) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    return unit;
  }
}
