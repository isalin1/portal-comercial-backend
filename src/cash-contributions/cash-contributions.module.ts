import { Module } from '@nestjs/common';
import { CashContributionsService } from './cash-contributions.service';
import { CashContributionsController } from './cash-contributions.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CashContributionsController],
  providers: [CashContributionsService],
  exports: [CashContributionsService],
})
export class CashContributionsModule {}


