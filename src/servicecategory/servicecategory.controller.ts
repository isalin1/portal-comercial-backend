import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ServiceCategoryService } from './servicecategory.service';
import { CreateServiceCategoryDto } from './dto/create-servicecategory.dto';
import { UpdateServiceCategoryDto } from './dto/update-servicecategory.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CombinedAuthGuard } from '../auth/guards/auth.guard';

@Controller('servicecategory')
@UseGuards(CombinedAuthGuard)
export class ServiceCategoryController {
  constructor(private readonly serviceCategoryService: ServiceCategoryService) {}

  @Post()
  @Roles('ADMIN', 'SUPERADMIN')
  create(@Body() createServiceCategoryDto: CreateServiceCategoryDto) {
    return this.serviceCategoryService.create(createServiceCategoryDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  findAll(@Query('businesId') businesId: string) {
    return this.serviceCategoryService.findAll(+businesId);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  findOne(@Param('id') id: string) {
    return this.serviceCategoryService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  update(@Param('id') id: string, @Body() updateServiceCategoryDto: UpdateServiceCategoryDto) {
    return this.serviceCategoryService.update(+id, updateServiceCategoryDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  remove(@Param('id') id: string) {
    return this.serviceCategoryService.remove(+id);
  }
}
