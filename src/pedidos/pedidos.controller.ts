import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { UserType } from '@prisma/client';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import { PedidosService } from './pedidos.service';

@Controller('pedidos')
@Auth(UserType.EMPRESARIO, UserType.ADMIN)
export class PedidosController {
  constructor(private readonly pedidos: PedidosService) {}

  @Get('ofertas')
  offers(@GetUser() user: AuthUser, @Query('businessId') businessId: string) {
    return this.pedidos.offers(user, Number(businessId));
  }

  @Post('ofertas')
  createOffer(@GetUser() user: AuthUser, @Body() body: { businessId: number; name: string; price: number }) {
    return this.pedidos.saveOffer(user, body);
  }

  @Patch('ofertas/:id')
  updateOffer(
    @GetUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; price?: number; isActive?: boolean },
  ) {
    return this.pedidos.saveOffer(user, body, id);
  }

  @Patch('delivery')
  delivery(@GetUser() user: AuthUser, @Body() body: { businessId: number; chargesDelivery: boolean; deliveryFee: number }) {
    return this.pedidos.setDelivery(user, Number(body.businessId), Boolean(body.chargesDelivery), Number(body.deliveryFee));
  }

  @Patch('exigencia')
  paymentRule(@GetUser() user: AuthUser, @Body() body: { businessId: number; requireOrderPayment: boolean }) {
    return this.pedidos.setPaymentRule(user, Number(body.businessId), Boolean(body.requireOrderPayment));
  }

  @Get('resumen')
  summary(@GetUser() user: AuthUser, @Query('businessId') businessId: string, @Query('date') date?: string) {
    return this.pedidos.summary(user, Number(businessId), date);
  }

  @Get('clientes')
  clients(@GetUser() user: AuthUser, @Query('businessId') businessId: string) {
    return this.pedidos.clients(user, Number(businessId));
  }

  @Post('clientes')
  createClient(@GetUser() user: AuthUser, @Body() body: { businessId: number; name: string; phone: string; address?: string }) {
    return this.pedidos.createClient(user, body);
  }

  @Get('catalogo')
  catalog(@GetUser() user: AuthUser, @Query('businessId') businessId: string) {
    return this.pedidos.catalog(user, Number(businessId));
  }

  @Get()
  list(@GetUser() user: AuthUser, @Query('businessId') businessId?: string) {
    return this.pedidos.list(user, businessId ? Number(businessId) : undefined);
  }

  @Post()
  create(@GetUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.pedidos.create(user, body);
  }

  @Patch(':id/estado')
  status(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: { status: string }) {
    return this.pedidos.setStatus(user, id, body.status);
  }

  @Patch('lineas/:id')
  served(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: { quantityServed: number }) {
    return this.pedidos.setServed(user, id, Number(body.quantityServed));
  }

  @Patch('lineas/:id/platos')
  dishes(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.pedidos.updateMenu(user, id, body);
  }

  @Delete('lineas/:id')
  removeLine(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.pedidos.removeLine(user, id);
  }

  @Post(':id/pagos')
  pay(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: { amount: number }) {
    return this.pedidos.pay(user, id, Number(body.amount));
  }
}
