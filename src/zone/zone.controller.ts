import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { UserType } from '@prisma/client';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZoneService } from './zone.service';

@Controller('zones')
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @Get()
  findAll() {
    return this.zoneService.findAll();
  }

  @Post()
  @Auth(UserType.ADMIN)
  create(@Body() dto: CreateZoneDto) {
    return this.zoneService.create(dto);
  }

  @Patch(':id')
  @Auth(UserType.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateZoneDto) {
    return this.zoneService.update(id, dto);
  }

  @Delete(':id')
  @Auth(UserType.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.zoneService.remove(id);
  }
}
