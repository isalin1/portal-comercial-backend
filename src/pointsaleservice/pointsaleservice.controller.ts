import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { PointSaleServiceService } from './pointsaleservice.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CombinedAuthGuard } from '../auth/guards/auth.guard';

@Controller('pointsaleservice')
@UseGuards(CombinedAuthGuard)
export class PointSaleServiceController {
  constructor(private readonly pointSaleServiceService: PointSaleServiceService) {}

  @Post()
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  createOrUpdate(@Body() data: {
    listserviceId: number;
    pointsaleId: number;
    price: number;
    isActive: boolean;
  }) {
    return this.pointSaleServiceService.createOrUpdate(data);
  }

  @Get('pointsale/:pointsaleId')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  findByPointSale(@Param('pointsaleId') pointsaleId: string) {
    return this.pointSaleServiceService.findByPointSale(+pointsaleId);
  }

  @Patch(':id/price')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  updatePrice(@Param('id') id: string, @Body() data: { price: number }) {
    return this.pointSaleServiceService.updatePrice(+id, data.price);
  }

  @Patch(':id/toggle')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  toggleActive(@Param('id') id: string) {
    return this.pointSaleServiceService.toggleActive(+id);
  }
} 