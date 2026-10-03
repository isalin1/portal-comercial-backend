import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { UserType } from '@prisma/client';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitService } from './unit.service';

@Controller('units')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Get()
  findAll() {
    return this.unitService.findAll();
  }

  @Post()
  @Auth(UserType.ADMIN)
  create(@Body() dto: CreateUnitDto) {
    return this.unitService.create(dto);
  }

  @Patch(':id')
  @Auth(UserType.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUnitDto) {
    return this.unitService.update(id, dto);
  }

  @Delete(':id')
  @Auth(UserType.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.unitService.remove(id);
  }
}
