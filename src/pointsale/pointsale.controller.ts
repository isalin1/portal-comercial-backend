import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PointsaleService } from './pointsale.service';
import { CreatePointSaleDto } from './dto/create-pointsale.dto';
import { UpdatePointSaleDto } from './dto/update-pointsale.dto';

@Controller('pointsale')
export class PointsaleController {
  constructor(private readonly pointsaleService: PointsaleService) {}

  @Post()
  create(@Body() createPointSaleDto: CreatePointSaleDto) {
    return this.pointsaleService.create(createPointSaleDto);
  }

  @Get()
  findAll() {
    return this.pointsaleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pointsaleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePointSaleDto: UpdatePointSaleDto) {
    return this.pointsaleService.update(+id, updatePointSaleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pointsaleService.remove(+id);
  }

  @Patch(':id/assign-collaborator')
  assignCollaborator(
    @Param('id') id: string,
    @Body() body: { userId: number }
  ) {
    return this.pointsaleService.assignCollaborator(+id, body.userId);
  }

  @Post(':id/create-collaborator')
  createAndAssignCollaborator(
    @Param('id') id: string,
    @Body() collaboratorData: any
  ) {
    return this.pointsaleService.createAndAssignCollaborator(+id, collaboratorData);
  }
}
