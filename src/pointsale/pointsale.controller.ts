import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, ConflictException } from '@nestjs/common';
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
  async createAndAssignCollaborator(
    @Param('id') id: string,
    @Body() collaboratorData: any
  ) {
    try {
      console.log('🔍 POST /pointsale/:id/create-collaborator - ID:', id);
      console.log('📦 Datos recibidos:', { ...collaboratorData, password: '***' });
      
      const result = await this.pointsaleService.createAndAssignCollaborator(+id, collaboratorData);
      console.log('✅ Colaborador creado exitosamente');
      return result;
    } catch (error: any) {
      console.error('❌ Error en createAndAssignCollaborator:', error);
      console.error('❌ Error message:', error.message);
      
      // Si es un error conocido, devolver un mensaje más claro
      if (error.message?.includes('ya está registrado')) {
        throw new ConflictException(error.message);
      }
      if (error.message?.includes('no encontrado')) {
        throw new BadRequestException(error.message);
      }
      if (error.message?.includes('contraseña')) {
        throw new BadRequestException(error.message);
      }
      
      // Para otros errores, lanzar un mensaje genérico
      throw new BadRequestException(`Error al crear el colaborador: ${error.message || 'Error desconocido'}`);
    }
  }
}
