import { IsInt } from 'class-validator';

export class ChooseBusinessCategoryDto {
  @IsInt()
  categoryId: number;
}
