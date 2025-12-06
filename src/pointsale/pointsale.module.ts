import { Module } from '@nestjs/common';
import { PointsaleService } from './pointsale.service';
import { PointsaleController } from './pointsale.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PointsaleController],
  providers: [PointsaleService],
})
export class PointsaleModule {}
