import { Module } from '@nestjs/common';
import { CashWithdrawalsService } from './cash-withdrawals.service';
import { CashWithdrawalsController } from './cash-withdrawals.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CashWithdrawalsController],
  providers: [CashWithdrawalsService],
  exports: [CashWithdrawalsService],
})
export class CashWithdrawalsModule {}


