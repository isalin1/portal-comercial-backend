import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PublicationModule } from 'src/publication/publication.module';
import { PedidosClienteController } from './pedidos-cliente.controller';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';

@Module({
  imports: [PrismaModule, AuthModule, PublicationModule],
  controllers: [PedidosController, PedidosClienteController],
  providers: [PedidosService],
})
export class PedidosModule {}
