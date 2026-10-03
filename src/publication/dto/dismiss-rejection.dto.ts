import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export class DismissRejectionDto {
  @IsIn(['BUSINESS', 'POINT', 'ITEM', 'DESCRIPTION', 'MENU_OFFER', 'AGENDA_SERVICE'])
  scope: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  recordId: number;
}
