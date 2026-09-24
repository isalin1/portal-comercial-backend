import { Module } from '@nestjs/common';
import { PointSalesService } from './point-sales.service';
import { PointSalesController } from './point-sales.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PointSalesController],
  providers: [PointSalesService],
  exports: [PointSalesService],
})
export class PointSalesModule {}
