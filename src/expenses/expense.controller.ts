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
  Query,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, Roles as UserRoles } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpenseController {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  create(@Body() createExpenseDto: CreateExpenseDto, @GetUser() user: User) {
    // Si es COLABORADOR, verificar que el punto de venta pertenece al colaborador
    if (user.role === UserRoles.COLABORADOR) {
      // El punto de venta ya debe estar asignado al colaborador
      // Esto se valida en el frontend, pero también podemos validarlo aquí
      return this.expenseService.create(createExpenseDto);
    }

    return this.expenseService.create(createExpenseDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  async findAll(
    @GetUser() user: User,
    @Query('pointsaleId') pointsaleId?: string,
    @Query('date') date?: string,
  ) {
    const params: { pointsaleId?: number; date?: string } = {};

    // Si es COLABORADOR, solo mostrar gastos de su punto de venta
    if (user.role === UserRoles.COLABORADOR) {
      // Obtener el punto de venta del colaborador
      const pointsale = await this.prisma.pointSale.findFirst({
        where: { userId: user.id },
      });

      if (!pointsale) {
        return []; // Si no tiene punto de venta asignado, no mostrar nada
      }

      params.pointsaleId = pointsale.id;
    } else if (pointsaleId) {
      // Si es ADMIN o SUPERADMIN y se especifica un punto de venta
      params.pointsaleId = parseInt(pointsaleId, 10);
    }

    if (date) {
      params.date = date;
    }

    return this.expenseService.findAll(params);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  async findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    const expense = await this.expenseService.findOne(id);

    // Si es COLABORADOR, verificar que el gasto pertenece a su punto de venta
    if (user.role === UserRoles.COLABORADOR) {
      const pointsale = await this.prisma.pointSale.findFirst({
        where: { userId: user.id },
      });

      if (!pointsale || expense.pointsaleId !== pointsale.id) {
        throw new Error('No autorizado para ver este gasto');
      }
    }

    return expense;
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @GetUser() user: User,
  ) {
    // Si es COLABORADOR, verificar que el gasto pertenece a su punto de venta
    if (user.role === UserRoles.COLABORADOR) {
      const expense = await this.expenseService.findOne(id);
      const pointsale = await this.prisma.pointSale.findFirst({
        where: { userId: user.id },
      });

      if (!pointsale || expense.pointsaleId !== pointsale.id) {
        throw new Error('No autorizado para editar este gasto');
      }
    }

    return this.expenseService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.expenseService.remove(id);
  }
}


