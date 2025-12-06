import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async create(createPlanDto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: {
        tipo: createPlanDto.tipo,
        nombrePeriodo: createPlanDto.nombrePeriodo,
        diasPeriodo: createPlanDto.diasPeriodo,
        costo: createPlanDto.costo ? createPlanDto.costo : null,
      },
    });
  }

  async findAll() {
    return this.prisma.plan.findMany({
      orderBy: [
        { tipo: 'asc' },
        { nombrePeriodo: 'asc' },
      ],
    });
  }

  async findOne(id: number) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${id} no encontrado`);
    }

    return plan;
  }

  async update(id: number, updatePlanDto: UpdatePlanDto) {
    await this.findOne(id); // Verificar que existe

    return this.prisma.plan.update({
      where: { id },
      data: {
        tipo: updatePlanDto.tipo,
        nombrePeriodo: updatePlanDto.nombrePeriodo,
        diasPeriodo: updatePlanDto.diasPeriodo,
        costo: updatePlanDto.costo !== undefined ? updatePlanDto.costo : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Verificar que existe

    return this.prisma.plan.delete({
      where: { id },
    });
  }
}


