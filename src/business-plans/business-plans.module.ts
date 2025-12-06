import { Module } from '@nestjs/common';
import { BusinessPlansService } from './business-plans.service';
import { BusinessPlansController } from './business-plans.controller';
import { BusinessPlansCronService } from './business-plans-cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [BusinessPlansController],
  providers: [BusinessPlansService, BusinessPlansCronService],
  exports: [BusinessPlansService],
})
export class BusinessPlansModule {}

