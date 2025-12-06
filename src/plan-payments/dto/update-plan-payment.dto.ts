import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanPaymentDto } from './create-plan-payment.dto';

export class UpdatePlanPaymentDto extends PartialType(CreatePlanPaymentDto) {}



