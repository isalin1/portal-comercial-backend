import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BusinesService } from './busines.service';
import { CreateBusinesDto } from './dto/create-busines.dto';
import { UpdateBusinesDto } from './dto/update-busines.dto';

@Controller('busines')
export class BusinesController {
  constructor(private readonly businesService: BusinesService) {}

  @Post()
  create(@Body() createBusinesDto: CreateBusinesDto) {
    return this.businesService.create(createBusinesDto);
  }

  @Get()
  findAll() {
    return this.businesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBusinesDto: UpdateBusinesDto) {
    return this.businesService.update(+id, updateBusinesDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.businesService.remove(+id);
  }
}
