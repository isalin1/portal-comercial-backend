import { PartialType } from '@nestjs/mapped-types';
import { CreateCashWithdrawalDto } from './create-cash-withdrawal.dto';

export class UpdateCashWithdrawalDto extends PartialType(CreateCashWithdrawalDto) {}


