import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { UserType } from '@prisma/client';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import { PedidosService } from './pedidos.service';

@Controller('pedidos')
@Auth(UserType.CLIENTE, UserType.EMPRESARIO)
export class PedidosClienteController {
  constructor(private readonly pedidos: PedidosService) {}

  @Get('mios')
  mine(@GetUser() user: AuthUser) {
    return this.pedidos.listMine(user);
  }

  @Get('mios/:id')
  one(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.pedidos.findMine(user, id);
  }

  @Patch('mios/:id')
  update(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.pedidos.updateForClient(user, id, body);
  }

  @Post('mios/:id/anular')
  cancel(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.pedidos.cancelForClient(user, id);
  }

  @Post('cliente')
  create(@GetUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.pedidos.createForClient(user, body);
  }
}
