import { PartialType } from '@nestjs/mapped-types';
import { CreateSalesOrderDto } from './create-salesorder.dto';

export class UpdateSalesOrderDto extends PartialType(CreateSalesOrderDto) {}
