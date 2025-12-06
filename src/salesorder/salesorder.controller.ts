import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SalesOrderService } from './salesorder.service';
import { CreateSalesOrderDto } from './dto/create-salesorder.dto';
import { UpdateSalesOrderDto } from './dto/update-salesorder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, Roles as UserRoles } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('salesorder')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesOrderController {
  constructor(
    private readonly salesOrderService: SalesOrderService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  create(@Body() createSalesOrderDto: CreateSalesOrderDto) {
    return this.salesOrderService.create(createSalesOrderDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  async findAll(@GetUser() user: User) {
    console.log('🔍 GET /salesorder - Usuario:', user.email, '| Rol:', user.role);
    
    if (user.role === UserRoles.SUPERADMIN) {
      // SUPERADMIN puede ver todas las órdenes
      console.log('🔑 SUPERADMIN - Devolviendo todas las órdenes de venta');
      return this.salesOrderService.findAll();
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
      
      // Filtrar sales orders por puntos de venta del negocio
      return this.prisma.salesOrder.findMany({
        where: {
          serviceorder: {
            pointsaleId: {
              in: pointsaleIds
            }
          }
        },
        include: {
          serviceorder: {
            include: {
              cliente: true,
              pointsale: {
                include: {
                  business: true
                }
              },
              itemserviceorders: {
                include: {
                  listservice: {
                    include: {
                      servicecategory: true
                    }
                  }
                }
              }
            }
          },
          payments: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
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
      
      // Filtrar sales orders por punto de venta
      return this.prisma.salesOrder.findMany({
        where: {
          serviceorder: {
            pointsaleId: pointsale.id
          }
        },
        include: {
          serviceorder: {
            include: {
              cliente: true,
              pointsale: {
                include: {
                  business: true
                }
              },
              itemserviceorders: {
                include: {
                  listservice: {
                    include: {
                      servicecategory: true
                    }
                  }
                }
              }
            }
          },
          payments: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }
    
    return [];
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesOrderService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSalesOrderDto: UpdateSalesOrderDto,
  ) {
    return this.salesOrderService.update(id, updateSalesOrderDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.salesOrderService.remove(id);
  }
}
