import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListServiceDto } from './dto/create-listservice.dto';
import { UpdateListServiceDto } from './dto/update-listservice.dto';

@Injectable()
export class ListServiceService {
  constructor(private prisma: PrismaService) {}

  async create(createListServiceDto: CreateListServiceDto) {
    return this.prisma.listService.create({
      data: {
        ...createListServiceDto,
        basePrice: createListServiceDto.basePrice || 0,
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
        servicecategory: true,
        pointsaleServices: {
          include: {
            pointsale: true,
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
