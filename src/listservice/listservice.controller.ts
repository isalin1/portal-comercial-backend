/* eslint-disable */

import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ListServiceService } from './listservice.service';
import { CreateListServiceDto } from './dto/create-listservice.dto';
import { UpdateListServiceDto } from './dto/update-listservice.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CombinedAuthGuard } from '../auth/guards/auth.guard';
import { ServiceCategoryType, ServiceType, ServiceUnit, User } from '@prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('listservice')
@UseGuards(CombinedAuthGuard)
export class ListserviceController {
  constructor(
    private readonly listserviceService: ListServiceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('enums')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  getEnums() {
    return {
      categories: Object.values(ServiceCategoryType),
      types: Object.values(ServiceType),
      units: Object.values(ServiceUnit),
    };
  }

  @Post()
  @Roles('ADMIN', 'SUPERADMIN')
  async create(@GetUser() user: User, @Body() createListServiceDto: CreateListServiceDto) {
    try {
      console.log('🔍 POST /listservice - Usuario:', user.email, '| Rol:', user.role);
      console.log('📦 DTO recibido:', createListServiceDto);
      
      // Validar que el usuario tiene acceso al negocio de la categoría de servicio
      if (user.role === 'ADMIN') {
        // Obtener el negocio del usuario ADMIN
        const business = await this.prisma.busines.findFirst({
          where: { userId: user.id }
        });
        
        if (!business) {
          throw new Error('ADMIN sin negocio asignado');
        }
        
        // Verificar que la categoría de servicio pertenece al negocio del ADMIN
        const serviceCategory = await this.prisma.serviceCategory.findUnique({
          where: { id: createListServiceDto.servicecategoryId }
        });
        
        if (!serviceCategory) {
          throw new Error(`La categoría de servicio con ID ${createListServiceDto.servicecategoryId} no existe`);
        }
        
        if (serviceCategory.businesId !== business.id) {
          throw new Error('No tienes permiso para crear servicios en esta categoría');
        }
        
        console.log('✅ ADMIN - Validación pasada para negocio:', business.name);
      }
      
      return await this.listserviceService.create(createListServiceDto);
    } catch (error: any) {
      console.error('❌ Error en POST /listservice:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      
      // Si es un error de validación de class-validator, devolver mensaje específico
      if (error.response && Array.isArray(error.response.message)) {
        const validationErrors = error.response.message.join(', ');
        throw new BadRequestException(`Error de validación: ${validationErrors}`);
      }
      
      // Si es un error de Prisma, devolver mensaje específico
      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe un servicio con estos datos');
      }
      
      if (error.code === 'P2003') {
        throw new BadRequestException('La categoría de servicio especificada no existe');
      }
      
      // Si ya es una excepción HTTP, re-lanzarla
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Error genérico con mensaje
      throw new BadRequestException(error.message || 'Error al crear el servicio');
    }
  }

  @Get()
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  async findAll(@GetUser() user: User, @Query('businesId') businesId?: string) {
    console.log('🔍 GET /listservice - Usuario:', user.email, '| Rol:', user.role);
    
    // Determinar el businessId basándose en el rol del usuario
    let effectiveBusinessId: number | null = null;
    
    if (user.role === 'SUPERADMIN') {
      // SUPERADMIN puede especificar un businessId o ver todos
      if (businesId && !isNaN(+businesId)) {
        effectiveBusinessId = +businesId;
        console.log('🔑 SUPERADMIN - BusinessId especificado:', effectiveBusinessId);
      } else {
        // Si no se especifica businessId, devolver todos los servicios
        console.log('🔑 SUPERADMIN - Devolviendo todos los servicios');
        return this.listserviceService.findAll(null);
      }
    } else if (user.role === 'ADMIN') {
      // ADMIN solo puede ver servicios de su propio negocio
      const business = await this.prisma.busines.findFirst({
        where: { userId: user.id }
      });
      
      if (!business) {
        console.log('❌ ADMIN sin negocio asignado');
        return [];
      }
      
      effectiveBusinessId = business.id;
      console.log('🔑 ADMIN - BusinessId:', effectiveBusinessId, '| Negocio:', business.name);
    } else if (user.role === 'COLABORADOR') {
      // COLABORADOR solo puede ver servicios del negocio de su punto de venta
      const pointsale = await this.prisma.pointSale.findFirst({
        where: { userId: user.id },
        include: { business: true }
      });
      
      if (!pointsale) {
        console.log('❌ COLABORADOR sin punto de venta asignado');
        return [];
      }
      
      effectiveBusinessId = pointsale.business.id;
      console.log('🔑 COLABORADOR - BusinessId:', effectiveBusinessId, '| Negocio:', pointsale.business.name);
    }
    
    if (effectiveBusinessId === null) {
      console.log('❌ No se pudo determinar el businessId');
      return [];
    }
    
    console.log('✅ Buscando servicios para businessId:', effectiveBusinessId);
    return this.listserviceService.findAll(effectiveBusinessId);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  findOne(@Param('id') id: string) {
    return this.listserviceService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  async update(@GetUser() user: User, @Param('id') id: string, @Body() updateListServiceDto: UpdateListServiceDto) {
    console.log('🔍 PATCH /listservice/:id - Usuario:', user.email, '| Rol:', user.role, '| ServiceId:', id);
    
    // Validar que el usuario tiene acceso al servicio
    if (user.role === 'ADMIN') {
      const business = await this.prisma.busines.findFirst({
        where: { userId: user.id }
      });
      
      if (!business) {
        throw new Error('ADMIN sin negocio asignado');
      }
      
      // Obtener el servicio con su categoría
      const service = await this.prisma.listService.findUnique({
        where: { id: +id },
        include: { servicecategory: true }
      });
      
      if (!service || service.servicecategory.businesId !== business.id) {
        throw new Error('No tienes permiso para actualizar este servicio');
      }
      
      console.log('✅ ADMIN - Validación pasada para actualizar servicio');
    }
    
    return this.listserviceService.update(+id, updateListServiceDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  async remove(@GetUser() user: User, @Param('id') id: string) {
    console.log('🔍 DELETE /listservice/:id - Usuario:', user.email, '| Rol:', user.role, '| ServiceId:', id);
    
    // Validar que el usuario tiene acceso al servicio
    if (user.role === 'ADMIN') {
      const business = await this.prisma.busines.findFirst({
        where: { userId: user.id }
      });
      
      if (!business) {
        throw new Error('ADMIN sin negocio asignado');
      }
      
      // Obtener el servicio con su categoría
      const service = await this.prisma.listService.findUnique({
        where: { id: +id },
        include: { servicecategory: true }
      });
      
      if (!service || service.servicecategory.businesId !== business.id) {
        throw new Error('No tienes permiso para eliminar este servicio');
      }
      
      console.log('✅ ADMIN - Validación pasada para eliminar servicio');
    }
    
    return this.listserviceService.remove(+id);
  }
}
