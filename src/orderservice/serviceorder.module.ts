import { Module } from '@nestjs/common';
import { ServiceOrderService } from './serviceorder.service';
import { ServiceOrderController } from './serviceorder.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceOrderController],
  providers: [ServiceOrderService],
  exports: [ServiceOrderService],
})
export class ServiceOrderModule {}













