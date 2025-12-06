import { PartialType } from '@nestjs/mapped-types';
import { CreateBusinesDto } from './create-busines.dto';

export class UpdateBusinesDto extends PartialType(CreateBusinesDto) {}
