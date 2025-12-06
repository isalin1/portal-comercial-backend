import { Module } from '@nestjs/common';
import { PointSaleServiceService } from './pointsaleservice.service';
import { PointSaleServiceController } from './pointsaleservice.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PointSaleServiceController],
  providers: [PointSaleServiceService],
  exports: [PointSaleServiceService],
})
export class PointSaleServiceModule {} 