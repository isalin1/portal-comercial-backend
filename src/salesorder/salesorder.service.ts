import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSalesOrderDto } from './dto/create-salesorder.dto';
import { UpdateSalesOrderDto } from './dto/update-salesorder.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesOrderService {
  constructor(private prisma: PrismaService) {}

  async create(createSalesOrderDto: CreateSalesOrderDto) {
    return this.prisma.salesOrder.create({
      data: createSalesOrderDto,
      include: {
        serviceorder: {
          include: {
            itemserviceorders: {
              include: {
                listservice: {
                  include: {
                    servicecategory: true,
                  },
                },
              },
            },
            cliente: true,
            pointsale: {
              include: {
                business: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.salesOrder.findMany({
      include: {
        serviceorder: {
          include: {
            itemserviceorders: {
              include: {
                listservice: {
                  include: {
                    servicecategory: true,
                  },
                },
              },
            },
            cliente: true,
            pointsale: {
              include: {
                business: true,
              },
            },
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        serviceorder: {
          include: {
            itemserviceorders: {
              include: {
                listservice: {
                  include: {
                    servicecategory: true,
                  },
                },
              },
            },
            cliente: true,
            pointsale: {
              include: {
                business: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!salesOrder) {
      throw new NotFoundException(`Sales Order with ID ${id} not found`);
    }

    return salesOrder;
  }

  async update(id: number, updateSalesOrderDto: UpdateSalesOrderDto) {
    await this.findOne(id); // Verifica que existe

    return this.prisma.salesOrder.update({
      where: { id },
      data: updateSalesOrderDto,
      include: {
        serviceorder: {
          include: {
            itemserviceorders: {
              include: {
                listservice: {
                  include: {
                    servicecategory: true,
                  },
                },
              },
            },
            cliente: true,
            pointsale: {
              include: {
                business: true,
              },
            },
          },
        },
        payments: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Verifica que existe

    return this.prisma.salesOrder.delete({
      where: { id },
    });
  }
}
