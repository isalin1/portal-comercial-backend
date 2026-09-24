import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { isVigente } from 'src/common/directory.utils';

@Injectable()
export class VigenciaService {
  constructor(private readonly prisma: PrismaService) {}

  async refreshEmpresarios() {
    const empresarios = await this.prisma.user.findMany({
      where: { datUser: { userType: UserType.EMPRESARIO } },
    });

    let updated = 0;
    for (const user of empresarios) {
      const active = isVigente(user.vigenciaEnd);
      if (user.isActive !== active) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isActive: active },
        });
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
