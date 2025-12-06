import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCashContributionDto } from './dto/create-cash-contribution.dto';
import { UpdateCashContributionDto } from './dto/update-cash-contribution.dto';

@Injectable()
export class CashContributionsService {
  constructor(private prisma: PrismaService) {}

  async create(createCashContributionDto: CreateCashContributionDto) {
    // Verificar que el punto de venta existe
    const pointSale = await this.prisma.pointSale.findUnique({
      where: { id: createCashContributionDto.pointsaleId },
    });

    if (!pointSale) {
      throw new NotFoundException(`Punto de venta con ID ${createCashContributionDto.pointsaleId} no encontrado`);
    }

    // Convertir fecha a Date object con UTC midday (igual que en expenses)
    // Si viene como string "YYYY-MM-DD", parsearlo directamente
    let date: Date;
    if (typeof createCashContributionDto.date === 'string' && createCashContributionDto.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = createCashContributionDto.date.split('-').map(Number);
      date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    } else {
      date = new Date(createCashContributionDto.date);
      date.setHours(12, 0, 0, 0);
    }

    console.log('📝 Creando aporte:', {
      pointsaleId: createCashContributionDto.pointsaleId,
      dateString: createCashContributionDto.date,
      dateObject: date,
      dateISO: date.toISOString(),
      amount: createCashContributionDto.amount,
    });

    const cashContribution = await this.prisma.cashContribution.create({
      data: {
        pointsaleId: createCashContributionDto.pointsaleId,
        date: date,
        amount: createCashContributionDto.amount,
        concept: createCashContributionDto.concept,
        notes: createCashContributionDto.notes,
      },
      include: {
        pointsale: true,
      },
    });

    console.log('✅ Aporte creado en BD:', {
      id: cashContribution.id,
      date: cashContribution.date,
      dateISO: cashContribution.date.toISOString(),
    });

    return {
      ...cashContribution,
      date: this.formatDateForResponse(cashContribution.date),
    };
  }

  async findAll(params?: { pointsaleId?: number; date?: string }) {
    const where: any = {};

    if (params?.pointsaleId) {
      where.pointsaleId = params.pointsaleId;
    }

    if (params?.date) {
      // Parsear fecha y crear rango para el día completo usando UTC
      const [year, month, day] = params.date.split('-').map(Number);
      const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

      console.log('🔍 Buscando aportes:', {
        dateString: params.date,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        pointsaleId: params.pointsaleId,
      });

      where.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    const contributions = await this.prisma.cashContribution.findMany({
      where,
      include: {
        pointsale: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    console.log('📊 Aportes encontrados:', contributions.length, contributions.map(c => ({
      id: c.id,
      date: c.date,
      dateISO: c.date.toISOString(),
      amount: c.amount,
    })));

    return contributions.map(cc => ({
      ...cc,
      date: this.formatDateForResponse(cc.date),
    }));
  }

  async findOne(id: number) {
    const contribution = await this.prisma.cashContribution.findUnique({
      where: { id },
      include: {
        pointsale: true,
      },
    });

    if (!contribution) {
      throw new NotFoundException(`Aporte con ID ${id} no encontrado`);
    }

    return {
      ...contribution,
      date: this.formatDateForResponse(contribution.date),
    };
  }

  async update(id: number, updateCashContributionDto: UpdateCashContributionDto) {
    const contribution = await this.findOne(id);

    const updateData: any = {};

    if (updateCashContributionDto.amount !== undefined) {
      updateData.amount = updateCashContributionDto.amount;
    }

    if (updateCashContributionDto.concept !== undefined) {
      updateData.concept = updateCashContributionDto.concept;
    }

    if (updateCashContributionDto.notes !== undefined) {
      updateData.notes = updateCashContributionDto.notes;
    }

    if (updateCashContributionDto.date) {
      const date = new Date(updateCashContributionDto.date);
      date.setHours(12, 0, 0, 0);
      updateData.date = date;
    }

    const updated = await this.prisma.cashContribution.update({
      where: { id },
      data: updateData,
      include: {
        pointsale: true,
      },
    });

    return {
      ...updated,
      date: this.formatDateForResponse(updated.date),
    };
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.cashContribution.delete({
      where: { id },
    });
    return { message: 'Aporte eliminado exitosamente' };
  }

  private formatDateForResponse(date: Date | string): string {
    if (!date) return '';
    
    let dateObj: Date;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
}

