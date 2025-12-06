import { PartialType } from '@nestjs/mapped-types';
import { CreateListServiceDto } from './create-listservice.dto';

export class UpdateListServiceDto extends PartialType(CreateListServiceDto) {}
