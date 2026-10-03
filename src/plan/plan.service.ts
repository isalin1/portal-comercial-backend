import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.plan.findMany({ orderBy: [{ commercialName: 'asc' }, { days: 'asc' }] });
  }

  async update(id: number, dto: UpdatePlanDto) {
    const current = await this.prisma.plan.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Plan no encontrado');
    const plan = await this.prisma.plan.update({
      where: { id },
      data: {
        ...dto,
        price: dto.price !== undefined ? dto.price : undefined,
      },
    });
    if (plan.name === 'Libre' && dto.days) {
      await this.prisma.appSetting.upsert({
        where: { id: 1 },
        create: { id: 1, freePlanDays: dto.days },
        update: { freePlanDays: dto.days },
      });
    }
    return plan;
  }
}
