import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, Roles as UserRoles } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('payment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.create(createPaymentDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  async findAll(@GetUser() user: User) {
    // Si es COLABORADOR, solo mostrar pagos de su punto de venta
    if (user.role === UserRoles.COLABORADOR) {
      // Obtener el punto de venta del colaborador
      const pointsale = await this.prisma.pointSale.findFirst({
        where: { userId: user.id }
      });
      
      if (!pointsale) {
        return []; // Si no tiene punto de venta asignado, no mostrar nada
      }
      
      // Filtrar pagos por punto de venta
      return this.prisma.payment.findMany({
        where: {
          salesorder: {
            serviceorder: {
              pointsaleId: pointsale.id
            }
          }
        },
        include: {
          salesorder: {
            include: {
              serviceorder: {
                include: {
                  cliente: true
                }
              }
            }
          }
        },
        orderBy: {
          datepaid: 'desc'
        }
      });
    }
    
    // Si es ADMIN o SUPERADMIN, mostrar todos los pagos
    return this.paymentService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentService.findOne(id);
  }

  @Get('salesorder/:salesorderId')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  findBySalesOrder(@Param('salesorderId', ParseIntPipe) salesorderId: number) {
    return this.paymentService.findBySalesOrder(salesorderId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    return this.paymentService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentService.remove(id);
  }
}

