import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateMarketDto } from './create-market.dto';

export class UpdateMarketDto extends PartialType(CreateMarketDto) {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  removeImage?: boolean;
}
