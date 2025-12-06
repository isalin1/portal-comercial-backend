import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PointSaleServiceService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdate(data: {
    listserviceId: number;
    pointsaleId: number;
    price: number;
    isActive: boolean;
  }) {
    return this.prisma.pointSaleService.upsert({
      where: {
        listserviceId_pointsaleId: {
          listserviceId: data.listserviceId,
          pointsaleId: data.pointsaleId,
        },
      },
      update: {
        price: data.price,
        isActive: data.isActive,
      },
      create: {
        listserviceId: data.listserviceId,
        pointsaleId: data.pointsaleId,
        price: data.price,
        isActive: data.isActive,
      },
      include: {
        listservice: {
          include: {
            servicecategory: true,
          },
        },
        pointsale: true,
      },
    });
  }

  async findByPointSale(pointsaleId: number) {
    return this.prisma.pointSaleService.findMany({
      where: { pointsaleId },
      include: {
        listservice: {
          include: {
            servicecategory: true,
          },
        },
        pointsale: true,
      },
    });
  }

  async updatePrice(id: number, price: number) {
    return this.prisma.pointSaleService.update({
      where: { id },
      data: { price },
      include: {
        listservice: {
          include: {
            servicecategory: true,
          },
        },
        pointsale: true,
      },
    });
  }

  async toggleActive(id: number) {
    const current = await this.prisma.pointSaleService.findUnique({
      where: { id },
    });
    
    return this.prisma.pointSaleService.update({
      where: { id },
      data: { isActive: !current?.isActive },
      include: {
        listservice: {
          include: {
            servicecategory: true,
          },
        },
        pointsale: true,
      },
    });
  }
} 