import { Module } from '@nestjs/common';
import { PlanPaymentsService } from './plan-payments.service';
import { PlanPaymentsController } from './plan-payments.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlanPaymentsController],
  providers: [PlanPaymentsService],
  exports: [PlanPaymentsService],
})
export class PlanPaymentsModule {}



