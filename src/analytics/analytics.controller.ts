import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Roles as PrismaRoles } from '@prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('client-ranking')
  @Roles(PrismaRoles.SUPERADMIN, PrismaRoles.ADMIN, PrismaRoles.COLABORADOR)
  async getClientRanking(
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('type') type: string,
    @GetUser() user: User,
    @Query('businessId') businessId?: string,
    @Query('pointSaleId') pointSaleId?: string,
  ) {
    console.log('📊 GET /analytics/client-ranking');
    console.log('Query params:', { month, year, type, businessId, pointSaleId });
    console.log('User:', { id: user.id, role: user.role });

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error('Mes inválido. Debe ser un número entre 1 y 12.');
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      throw new Error('Año inválido.');
    }

    const rankingType = type || 'pointsale';
    const businessIdNum = businessId ? parseInt(businessId, 10) : null;
    const pointSaleIdNum = pointSaleId ? parseInt(pointSaleId, 10) : null;

    return this.analyticsService.getClientRanking(
      monthNum,
      yearNum,
      rankingType,
      user.id,
      user.role,
      businessIdNum,
      pointSaleIdNum,
    );
  }

  @Get('month-sales')
  @Roles(PrismaRoles.SUPERADMIN, PrismaRoles.ADMIN, PrismaRoles.COLABORADOR)
  async getMonthSales(
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('type') type: string,
    @GetUser() user: User,
    @Query('businessId') businessId?: string,
    @Query('pointSaleId') pointSaleId?: string,
  ) {
    console.log('📊 GET /analytics/month-sales');
    console.log('Query params:', { month, year, type, businessId, pointSaleId });
    console.log('User:', { id: user.id, role: user.role });

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error('Mes inválido. Debe ser un número entre 1 y 12.');
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      throw new Error('Año inválido.');
    }

    const reportType = type || 'pointsale';
    const businessIdNum = businessId ? parseInt(businessId, 10) : null;
    const pointSaleIdNum = pointSaleId ? parseInt(pointSaleId, 10) : null;

    return this.analyticsService.getMonthSales(
      monthNum,
      yearNum,
      reportType,
      user.id,
      user.role,
      businessIdNum,
      pointSaleIdNum,
    );
  }

  @Get('stock-sales')
  @Roles(PrismaRoles.SUPERADMIN, PrismaRoles.ADMIN, PrismaRoles.COLABORADOR)
  async getStockSales(@GetUser() user: User) {
    console.log('📊 GET /analytics/stock-sales');
    console.log('User:', { id: user.id, role: user.role });

    return this.analyticsService.getStockSales(user.id, user.role);
  }
}
