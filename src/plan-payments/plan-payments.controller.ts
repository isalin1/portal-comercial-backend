import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlanPaymentsService } from './plan-payments.service';
import { CreatePlanPaymentDto } from './dto/create-plan-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('plan-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanPaymentsController {
  constructor(private readonly planPaymentsService: PlanPaymentsService) {}

  @Post()
  @Roles('SUPERADMIN')
  create(@Body() createPlanPaymentDto: CreatePlanPaymentDto) {
    return this.planPaymentsService.create(createPlanPaymentDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERADMIN')
  findAll(
    @Query('businessPlanId') businessPlanId?: string,
    @Query('businesId') businesId?: string,
  ) {
    const params: any = {};
    if (businessPlanId) {
      params.businessPlanId = parseInt(businessPlanId, 10);
    }
    if (businesId) {
      params.businesId = parseInt(businesId, 10);
    }
    return this.planPaymentsService.findAll(params);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  findOne(@Param('id') id: string) {
    return this.planPaymentsService.findOne(+id);
  }

  @Patch(':id/approve')
  @Roles('SUPERADMIN')
  approve(@Param('id') id: string) {
    return this.planPaymentsService.approve(+id);
  }

  @Patch(':id/reject')
  @Roles('SUPERADMIN')
  reject(@Param('id') id: string) {
    return this.planPaymentsService.reject(+id);
  }
}



