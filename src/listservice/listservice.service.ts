import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListServiceDto } from './dto/create-listservice.dto';
import { UpdateListServiceDto } from './dto/update-listservice.dto';

@Injectable()
export class ListServiceService {
  constructor(private prisma: PrismaService) {}

  async create(createListServiceDto: CreateListServiceDto) {
    try {
      console.log('🔄 Creando servicio con datos:', createListServiceDto);
      
      // Validar que la categoría existe
      const category = await this.prisma.serviceCategory.findUnique({
        where: { id: createListServiceDto.servicecategoryId }
      });
      
      if (!category) {
        throw new Error(`La categoría de servicio con ID ${createListServiceDto.servicecategoryId} no existe`);
      }
      
      console.log('✅ Categoría encontrada:', category);
      
      // Convertir basePrice a Decimal si es necesario
      const basePriceValue = typeof createListServiceDto.basePrice === 'string' 
        ? parseFloat(createListServiceDto.basePrice) 
        : createListServiceDto.basePrice || 0;
      
      console.log('💰 Precio procesado:', basePriceValue, 'Tipo:', typeof basePriceValue);
      
      const service = await this.prisma.listService.create({
        data: {
          type: createListServiceDto.type,
          basePrice: basePriceValue,
          isActive: createListServiceDto.isActive ?? true,
          servicecategoryId: createListServiceDto.servicecategoryId,
        },
        include: {
          servicecategory: true,
          pointsaleServices: {
            include: {
              pointsale: true,
            },
          },
        },
      });
      
      console.log('✅ Servicio creado exitosamente:', service.id);
      return service;
    } catch (error: any) {
      console.error('❌ Error al crear servicio:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error meta:', error.meta);
      throw error;
    }
  }

  async findAll(businesId: number | null) {
    const whereClause = businesId !== null ? {
      servicecategory: {
        businesId,
      },
    } : {};
    
    return this.prisma.listService.findMany({
      where: whereClause,
      include: {
        servicecategory: {
          include: {
            busines: {
              select: {
                id: true,
                name: true,
                comercialname: true,
                pointsales: {
                  include: {
                    pointsaleServices: {
                      include: {
                        listservice: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        pointsaleServices: {
          include: {
            pointsale: {
              include: {
                business: {
                  select: {
                    id: true,
                    name: true,
                    comercialname: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.listService.findUnique({
      where: { id },
      include: {
        servicecategory: true,
        pointsaleServices: {
          include: {
            pointsale: true,
          },
        },
      },
    });
  }

  async update(id: number, updateListServiceDto: UpdateListServiceDto) {
    return this.prisma.listService.update({
      where: { id },
      data: updateListServiceDto,
      include: {
        servicecategory: true,
        pointsaleServices: {
          include: {
            pointsale: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    return this.prisma.listService.delete({
      where: { id },
    });
  }

  // Método para obtener servicios por PointSale
  async findByPointSale(pointSaleId: number) {
    // TODO: Implementar cuando se resuelvan los problemas de tipos
    console.log('findByPointSale called with:', pointSaleId)
    return []
  }
}
