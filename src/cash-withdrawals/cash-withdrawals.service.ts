import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCashWithdrawalDto } from './dto/create-cash-withdrawal.dto';
import { UpdateCashWithdrawalDto } from './dto/update-cash-withdrawal.dto';

@Injectable()
export class CashWithdrawalsService {
  constructor(private prisma: PrismaService) {}

  async create(createCashWithdrawalDto: CreateCashWithdrawalDto) {
    // Verificar que el punto de venta existe
    const pointSale = await this.prisma.pointSale.findUnique({
      where: { id: createCashWithdrawalDto.pointsaleId },
    });

    if (!pointSale) {
      throw new NotFoundException(`Punto de venta con ID ${createCashWithdrawalDto.pointsaleId} no encontrado`);
    }

    // Convertir fecha a Date object con UTC midday (igual que en expenses)
    // Si viene como string "YYYY-MM-DD", parsearlo directamente
    let date: Date;
    if (typeof createCashWithdrawalDto.date === 'string' && createCashWithdrawalDto.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = createCashWithdrawalDto.date.split('-').map(Number);
      date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    } else {
      date = new Date(createCashWithdrawalDto.date);
      date.setHours(12, 0, 0, 0);
    }

    console.log('📝 Creando retiro:', {
      pointsaleId: createCashWithdrawalDto.pointsaleId,
      dateString: createCashWithdrawalDto.date,
      dateObject: date,
      dateISO: date.toISOString(),
      amount: createCashWithdrawalDto.amount,
    });

    const cashWithdrawal = await this.prisma.cashWithdrawal.create({
      data: {
        pointsaleId: createCashWithdrawalDto.pointsaleId,
        date: date,
        amount: createCashWithdrawalDto.amount,
        concept: createCashWithdrawalDto.concept,
        notes: createCashWithdrawalDto.notes,
      },
      include: {
        pointsale: true,
      },
    });

    console.log('✅ Retiro creado en BD:', {
      id: cashWithdrawal.id,
      date: cashWithdrawal.date,
      dateISO: cashWithdrawal.date.toISOString(),
    });

    return {
      ...cashWithdrawal,
      date: this.formatDateForResponse(cashWithdrawal.date),
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

      console.log('🔍 Buscando retiros:', {
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

    const withdrawals = await this.prisma.cashWithdrawal.findMany({
      where,
      include: {
        pointsale: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    console.log('📊 Retiros encontrados:', withdrawals.length, withdrawals.map(w => ({
      id: w.id,
      date: w.date,
      dateISO: w.date.toISOString(),
      amount: w.amount,
    })));

    return withdrawals.map(cw => ({
      ...cw,
      date: this.formatDateForResponse(cw.date),
    }));
  }

  async findOne(id: number) {
    const withdrawal = await this.prisma.cashWithdrawal.findUnique({
      where: { id },
      include: {
        pointsale: true,
      },
    });

    if (!withdrawal) {
      throw new NotFoundException(`Retiro con ID ${id} no encontrado`);
    }

    return {
      ...withdrawal,
      date: this.formatDateForResponse(withdrawal.date),
    };
  }

  async update(id: number, updateCashWithdrawalDto: UpdateCashWithdrawalDto) {
    await this.findOne(id);

    const updateData: any = {};

    if (updateCashWithdrawalDto.amount !== undefined) {
      updateData.amount = updateCashWithdrawalDto.amount;
    }

    if (updateCashWithdrawalDto.concept !== undefined) {
      updateData.concept = updateCashWithdrawalDto.concept;
    }

    if (updateCashWithdrawalDto.notes !== undefined) {
      updateData.notes = updateCashWithdrawalDto.notes;
    }

    if (updateCashWithdrawalDto.date) {
      const date = new Date(updateCashWithdrawalDto.date);
      date.setHours(12, 0, 0, 0);
      updateData.date = date;
    }

    const updated = await this.prisma.cashWithdrawal.update({
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
    await this.prisma.cashWithdrawal.delete({
      where: { id },
    });
    return { message: 'Retiro eliminado exitosamente' };
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


