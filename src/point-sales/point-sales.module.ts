import { Module } from '@nestjs/common';
import { PointSalesService } from './point-sales.service';
import { PointSalesController } from './point-sales.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { PublicationModule } from 'src/publication/publication.module';

@Module({
  imports: [PrismaModule, AuthModule, PublicationModule],
  controllers: [PointSalesController],
  providers: [PointSalesService],
  exports: [PointSalesService],
})
export class PointSalesModule {}
