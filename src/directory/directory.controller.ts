import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common';
import { DirectoryService } from './directory.service';

@Controller('public')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('rubros')
  findRubros() {
    return this.directoryService.findRubros();
  }

  @Get('categories')
  findCategories(@Query('rubroId') rubroId?: string) {
    return this.directoryService.findCategories(
      rubroId ? Number(rubroId) : undefined,
    );
  }

  @Get('businesses')
  findBusinesses(
    @Query('categoryId') categoryId?: string,
    @Query('rubroId') rubroId?: string,
  ) {
    return this.directoryService.findBusinesses(
      categoryId ? Number(categoryId) : undefined,
      rubroId ? Number(rubroId) : undefined,
    );
  }

  @Get('businesses/:id')
  async findBusiness(@Param('id', ParseIntPipe) id: number) {
    const business = await this.directoryService.findBusiness(id);
    if (!business) {
      throw new NotFoundException('Negocio no encontrado en el directorio');
    }
    return business;
  }
}
