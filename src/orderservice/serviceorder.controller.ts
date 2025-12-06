import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Query,
  Request 
} from '@nestjs/common';
import { ServiceOrderService } from './serviceorder.service';
import { CreateServiceOrderDto } from './dto/create-serviceorder.dto';
import { UpdateServiceOrderDto } from './dto/update-serviceorder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles as UserRoles, StatusOrder, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('serviceorder')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceOrderController {
  constructor(
    private readonly serviceOrderService: ServiceOrderService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(UserRoles.ADMIN, UserRoles.SUPERADMIN, UserRoles.COLABORADOR)
  create(@Body() createServiceOrderDto: CreateServiceOrderDto) {
    return this.serviceOrderService.create(createServiceOrderDto);
  }

  @Get()
  @Roles(UserRoles.ADMIN, UserRoles.SUPERADMIN, UserRoles.COLABORADOR)
  async findAll(@GetUser() user: User) {
    console.log('🔍 GET /serviceorder - Usuario:', user.email, '| Rol:', user.role);
    
    if (user.role === UserRoles.SUPERADMIN) {
      // SUPERADMIN puede ver todas las órdenes
      console.log('🔑 SUPERADMIN - Devolviendo todas las órdenes');
      return this.serviceOrderService.findAll();
    }
    
    if (user.role === UserRoles.ADMIN) {
      // ADMIN solo puede ver órdenes de su negocio
      const business = await this.prisma.busines.findFirst({
        where: { userId: user.id }
      });
      
      if (!business) {
        console.log('❌ ADMIN sin negocio asignado');
        return [];
      }
      
      // Obtener todos los puntos de venta del negocio
      const pointsales = await this.prisma.pointSale.findMany({
        where: { businesId: business.id }
      });
      
      const pointsaleIds = pointsales.map(ps => ps.id);
      
      console.log('🔑 ADMIN - BusinessId:', business.id, '| Negocio:', business.name);
      console.log('🔑 ADMIN - Puntos de venta:', pointsaleIds);
      
      // Obtener órdenes de todos los puntos de venta del negocio
      return this.serviceOrderService.findByMultiplePointSales(pointsaleIds);
    }
    
    if (user.role === UserRoles.COLABORADOR) {
      // COLABORADOR solo puede ver órdenes de su punto de venta
      const pointsale = await this.prisma.pointSale.findFirst({
        where: { userId: user.id }
      });
      
      if (!pointsale) {
        console.log('❌ COLABORADOR sin punto de venta asignado');
        return [];
      }
      
      console.log('🔑 COLABORADOR - PointSaleId:', pointsale.id, '| Punto de venta:', pointsale.name);
      return this.serviceOrderService.findByPointSale(pointsale.id);
    }
    
    return [];
  }

  @Get('pointsale/:pointsaleId')
  @Roles(UserRoles.ADMIN, UserRoles.SUPERADMIN, UserRoles.COLABORADOR)
  findByPointSale(@Param('pointsaleId') pointsaleId: string) {
    return this.serviceOrderService.findByPointSale(+pointsaleId);
  }

  @Get('user/:userId')
  @Roles(UserRoles.ADMIN, UserRoles.SUPERADMIN, UserRoles.COLABORADOR)
  findByUser(@Param('userId') userId: string) {
    return this.serviceOrderService.findByUser(+userId);
  }

  @Get(':id')
  @Roles(UserRoles.ADMIN, UserRoles.SUPERADMIN, UserRoles.COLABORADOR)
  findOne(@Param('id') id: string) {
    return this.serviceOrderService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRoles.ADMIN, UserRoles.SUPERADMIN, UserRoles.COLABORADOR)
  update(@Param('id') id: string, @Body() updateServiceOrderDto: UpdateServiceOrderDto) {
    return this.serviceOrderService.update(+id, updateServiceOrderDto);
  }

  @Patch(':id/status')
  @Roles(UserRoles.ADMIN, UserRoles.SUPERADMIN, UserRoles.COLABORADOR)
  updateStatus(@Param('id') id: string, @Body('statusOrder') statusOrder: StatusOrder) {
    return this.serviceOrderService.updateStatus(+id, statusOrder);
  }

  @Patch('item/:itemId/status')
  @Roles(UserRoles.ADMIN, UserRoles.SUPERADMIN, UserRoles.COLABORADOR)
  updateItemStatus(@Param('itemId') itemId: string, @Body('statusOrder') statusOrder: StatusOrder) {
    return this.serviceOrderService.updateItemStatus(+itemId, statusOrder);
  }

  @Delete(':id')
  @Roles(UserRoles.ADMIN, UserRoles.SUPERADMIN)
  remove(@Param('id') id: string) {
    return this.serviceOrderService.remove(+id);
  }
}



