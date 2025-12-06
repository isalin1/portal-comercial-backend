import { PartialType } from '@nestjs/mapped-types';
import { CreatePointSaleDto } from './create-pointsale.dto';

export class UpdatePointSaleDto extends PartialType(CreatePointSaleDto) {}
