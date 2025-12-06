import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceCategoryDto } from './dto/create-servicecategory.dto';
import { UpdateServiceCategoryDto } from './dto/update-servicecategory.dto';

@Injectable()
export class ServiceCategoryService {
  constructor(private prisma: PrismaService) {}

  async create(createServiceCategoryDto: CreateServiceCategoryDto) {
    return this.prisma.serviceCategory.create({
      data: createServiceCategoryDto,
    });
  }

  async findAll(businesId: number) {
    return this.prisma.serviceCategory.findMany({
      where: { businesId },
      include: {
        listservices: {
          include: {
            pointsaleServices: {
              include: {
                pointsale: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.serviceCategory.findUnique({
      where: { id },
      include: {
        listservices: {
          include: {
            pointsaleServices: {
              include: {
                pointsale: true,
              },
            },
          },
        },
      },
    });
  }

  async update(id: number, updateServiceCategoryDto: UpdateServiceCategoryDto) {
    return this.prisma.serviceCategory.update({
      where: { id },
      data: updateServiceCategoryDto,
    });
  }

  async remove(id: number) {
    return this.prisma.serviceCategory.delete({
      where: { id },
    });
  }
}
