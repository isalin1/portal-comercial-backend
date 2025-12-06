import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceCategoryDto } from './create-servicecategory.dto';

export class UpdateServiceCategoryDto extends PartialType(CreateServiceCategoryDto) {}
