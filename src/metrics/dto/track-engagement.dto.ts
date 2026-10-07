import { IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TrackEngagementDto {
  @IsIn(['BUSINESS_OPEN', 'WHATSAPP_CLICK'])
  kind!: 'BUSINESS_OPEN' | 'WHATSAPP_CLICK';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  businessId!: number;
}
