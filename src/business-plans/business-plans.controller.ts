import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { BusinessPlansService } from './business-plans.service';
import { CreateBusinessPlanDto } from './dto/create-business-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('business-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessPlansController {
  constructor(private readonly businessPlansService: BusinessPlansService) {}

  @Get()
  @Roles('ADMIN', 'SUPERADMIN')
  findAll(
    @Query('businesId') businesId?: string,
    @Query('estado') estado?: string,
    @GetUser() user?: any,
  ) {
    const params: any = {};
    
    // ADMIN solo puede ver su propio plan
    if (user?.role === 'ADMIN') {
      // Obtener el businessId del usuario ADMIN
      // Esto debería venir del token o de una relación
      // Por ahora, si viene businesId en query, validar que sea del usuario
    }
    
    if (businesId) {
      params.businesId = parseInt(businesId, 10);
    }
    if (estado) {
      params.estado = estado;
    }
    
    return this.businessPlansService.findAll(params);
  }

  @Get('business/:businesId/active')
  @Roles('ADMIN', 'SUPERADMIN')
  findActiveByBusiness(@Param('businesId') businesId: string, @GetUser() user?: any) {
    const businessId = parseInt(businesId, 10);
    
    // ADMIN solo puede ver su propio plan
    if (user?.role === 'ADMIN') {
      // Validar que el businessId pertenezca al usuario ADMIN
      // Esto debería implementarse con una validación adicional
    }
    
    return this.businessPlansService.findActiveByBusiness(businessId);
  }

  @Post()
  @Roles('SUPERADMIN')
  create(@Body() createBusinessPlanDto: CreateBusinessPlanDto) {
    return this.businessPlansService.create(createBusinessPlanDto);
  }

  @Patch(':id/renew')
  @Roles('SUPERADMIN')
  renew(@Param('id') id: string) {
    return this.businessPlansService.renew(+id);
  }

  @Patch(':id/suspend')
  @Roles('SUPERADMIN')
  suspend(@Param('id') id: string) {
    return this.businessPlansService.suspend(+id);
  }

  @Patch(':id/activate')
  @Roles('SUPERADMIN')
  activate(@Param('id') id: string) {
    return this.businessPlansService.activate(+id);
  }

  @Get('expiring')
  @Roles('SUPERADMIN')
  findExpiring(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days, 10) : 7;
    return this.businessPlansService.findExpiring(daysNumber);
  }

  @Get('expired')
  @Roles('SUPERADMIN')
  findExpired() {
    return this.businessPlansService.findExpired();
  }

  @Get('business/:businesId/status')
  @Roles('ADMIN', 'SUPERADMIN')
  async getPlanStatus(@Param('businesId') businesId: string) {
    try {
      const status = await this.businessPlansService.getActivePlanWithDaysRemaining(+businesId);
      return status || null;
    } catch (error) {
      // Si no tiene plan activo, retornar null
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  @Post('check-expired')
  @Roles('SUPERADMIN')
  checkExpiredPlans() {
    return this.businessPlansService.checkAndDeactivateExpiredPlans();
  }

  @Post('correct-states')
  @Roles('SUPERADMIN')
  correctPlanStates() {
    return this.businessPlansService.correctPlanStates();
  }
}

