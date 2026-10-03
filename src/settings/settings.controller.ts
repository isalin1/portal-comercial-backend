import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UserType } from '@prisma/client';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch('vigencia-free')
  @Auth(UserType.ADMIN)
  setFreePlan(@Body() body: { days: number }) {
    return this.settings.setFreePlanDays(Number(body.days));
  }

  @Patch('whatsapp-planes')
  @Auth(UserType.ADMIN)
  setWhatsapp(@Body() body: { salesWhatsapp: string }) {
    return this.settings.setSalesWhatsapp(String(body.salesWhatsapp || ''));
  }

  @Patch('profesionales-agenda')
  @Auth(UserType.ADMIN)
  setProfessionals(@Body() body: { maxAgendaProfessionals: number }) {
    return this.settings.setMaxAgendaProfessionals(Number(body.maxAgendaProfessionals));
  }
}
