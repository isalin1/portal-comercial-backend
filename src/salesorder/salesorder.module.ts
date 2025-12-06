import { Module } from '@nestjs/common';
import { SalesOrderService } from './salesorder.service';
import { SalesOrderController } from './salesorder.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SalesOrderController],
  providers: [SalesOrderService],
  exports: [SalesOrderService],
})
export class SalesOrderModule {}
