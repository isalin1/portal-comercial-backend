import { PartialType } from '@nestjs/mapped-types';
import { CreateCashContributionDto } from './create-cash-contribution.dto';

export class UpdateCashContributionDto extends PartialType(CreateCashContributionDto) {}


