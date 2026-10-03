import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const current = await this.prisma.appSetting.findUnique({ where: { id: 1 } });
    return {
      salesWhatsapp: current?.salesWhatsapp || '940485657',
      freePlanDays: current?.freePlanDays || 30,
      maxAgendaProfessionals: current?.maxAgendaProfessionals || 3,
    };
  }

  async setFreePlanDays(days: number) {
    if (![7, 15, 30, 60, 90, 180, 360].includes(days)) {
      throw new BadRequestException('Elige 7, 15, 30, 60, 90, 180 o 360 días');
    }
    const saved = await this.prisma.appSetting.upsert({
      where: { id: 1 },
      create: { id: 1, freePlanDays: days },
      update: { freePlanDays: days },
    });
    await this.prisma.plan.updateMany({ where: { name: 'Libre' }, data: { days } });
    return saved;
  }

  async setSalesWhatsapp(salesWhatsapp: string) {
    const digits = salesWhatsapp.replace(/\D/g, '');
    if (digits.length < 9) throw new BadRequestException('Indica un celular de al menos 9 dígitos');
    return this.prisma.appSetting.upsert({
      where: { id: 1 },
      create: { id: 1, salesWhatsapp: digits },
      update: { salesWhatsapp: digits },
    });
  }

  async setMaxAgendaProfessionals(maxAgendaProfessionals: number) {
    const max = Math.trunc(Number(maxAgendaProfessionals));
    if (!Number.isInteger(max) || max < 1 || max > 20) {
      throw new BadRequestException('Indica entre 1 y 20 profesionales');
    }
    return this.prisma.appSetting.upsert({
      where: { id: 1 },
      create: { id: 1, maxAgendaProfessionals: max },
      update: { maxAgendaProfessionals: max },
    });
  }
}
