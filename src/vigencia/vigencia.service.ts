import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { addCalendarDays, calendarDateInLima, isVigente } from 'src/common/directory.utils';

@Injectable()
export class VigenciaService {
  constructor(private readonly prisma: PrismaService) {}

  async refreshEmpresarios() {
    const libre = await this.prisma.plan.findFirst({ where: { name: 'Libre' } });
    const setting = await this.prisma.appSetting.findUnique({ where: { id: 1 } });
    const freeDays = libre?.days || setting?.freePlanDays || 30;
    const empresarios = await this.prisma.user.findMany({
      where: { datUser: { userType: UserType.EMPRESARIO } },
      include: { planCatalog: true, pendingPlan: true },
    });

    let updated = 0;
    for (const user of empresarios) {
      if (!user.vigenciaEnd) continue;
      if (isVigente(user.vigenciaEnd)) continue;
      if (user.pendingPlanId && user.pendingPlan) {
        const start = user.vigenciaEnd;
        const pendingDays = user.pendingPlan.days;
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            plan: user.pendingPlan.name === 'Libre' ? 'FREE' : null,
            planId: user.pendingPlanId,
            pendingPlanId: null,
            isActive: true,
            vigenciaStart: start,
            vigenciaEnd: addCalendarDays(start, pendingDays),
            vigenciaDays: pendingDays,
          },
        });
        updated += 1;
        continue;
      }
      const onFreePlan = user.plan === 'FREE' || user.planCatalog?.name === 'Libre';
      if (!onFreePlan) {
        const start = calendarDateInLima();
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            plan: 'FREE',
            planId: libre?.id,
            pendingPlanId: null,
            isActive: true,
            vigenciaStart: start,
            vigenciaEnd: addCalendarDays(start, freeDays),
            vigenciaDays: freeDays,
          },
        });
        updated += 1;
        continue;
      }
      if (user.isActive) {
        await this.prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
        updated += 1;
      }
    }
    return { checked: empresarios.length, updated };
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async dailyRefresh() {
    await this.refreshEmpresarios();
  }
}
