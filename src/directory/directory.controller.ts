import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common';
import { DirectoryService } from './directory.service';

@Controller('public')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('rubros')
  findRubros(@Query('zoneId') zoneId?: string) {
    return this.directoryService.findRubros(zoneId ? Number(zoneId) : undefined);
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
    @Query('zoneId') zoneId?: string,
  ) {
    return this.directoryService.findBusinesses(
      categoryId ? Number(categoryId) : undefined,
      rubroId ? Number(rubroId) : undefined,
      zoneId ? Number(zoneId) : undefined,
    );
  }

  @Get('markets')
  findMarkets(@Query('zoneId') zoneId?: string) {
    return this.directoryService.findMarkets(zoneId ? Number(zoneId) : undefined);
  }

  @Get('markets/:id')
  async findMarket(@Param('id', ParseIntPipe) id: number, @Query('zoneId') zoneId?: string) {
    const market = await this.directoryService.findMarket(id, zoneId ? Number(zoneId) : undefined);
    if (!market) throw new NotFoundException('Mercado no encontrado');
    return market;
  }

  @Get('businesses/:id')
  async findBusiness(@Param('id', ParseIntPipe) id: number, @Query('zoneId') zoneId?: string) {
    const business = await this.directoryService.findBusiness(id, zoneId ? Number(zoneId) : undefined);
    if (!business) {
      throw new NotFoundException('Negocio no encontrado en el directorio');
    }
    return business;
  }
}
