import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceOrderDto } from './dto/create-serviceorder.dto';
import { UpdateServiceOrderDto } from './dto/update-serviceorder.dto';
import { StatusOrder, StatusPay } from '@prisma/client';

@Injectable()
export class ServiceOrderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera el código único para una orden de servicio/venta
   * Formato: MM-XXXX donde MM es el mes (01-12) y XXXX es el correlativo del mes
   */
  private async generateOrderCode(): Promise<string> {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // MM (01-12)
    
    // Obtener el primer y último día del mes actual
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Contar cuántas órdenes se han creado este mes
    const count = await this.prisma.serviceOrder.count({
      where: {
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    });
    
    // El siguiente correlativo será count + 1
    const correlative = String(count + 1).padStart(4, '0'); // XXXX
    
    return `${month}-${correlative}`;
  }

  /**
   * Genera el código único para un item de servicio dentro de una orden
   * Formato: MM-XXXX-YY donde MM-XXXX es el código de la orden e YY es el orden de la categoría
   */
  private generateItemCode(orderCode: string, categoryOrder: number): string {
    const categoryNumber = String(categoryOrder).padStart(2, '0'); // YY
    return `${orderCode}-${categoryNumber}`;
  }

  /**
   * Calcula el estado general de la orden basado en el estado mínimo de todos los items
   * Orden de estados (de menor a mayor): RECEIVED < IN_PROGRESS < READY < DELIVERED
   */
  private calculateOrderStatus(itemStatuses: StatusOrder[]): StatusOrder {
    if (itemStatuses.length === 0) return StatusOrder.RECEIVED;

    // Definir el orden de prioridad (menor índice = menor estado)
    const statusPriority: Record<StatusOrder, number> = {
      [StatusOrder.RECEIVED]: 0,
      [StatusOrder.IN_PROGRESS]: 1,
      [StatusOrder.READY]: 2,
      [StatusOrder.DELIVERED]: 3,
    };

    // Encontrar el estado con menor prioridad (menor número)
    const priorities = itemStatuses.map(status => statusPriority[status] ?? 0);
    const minPriority = Math.min(...priorities);
    
    // Retornar el estado correspondiente a la menor prioridad de forma explícita
    if (minPriority === 0) return StatusOrder.RECEIVED;
    if (minPriority === 1) return StatusOrder.IN_PROGRESS;
    if (minPriority === 2) return StatusOrder.READY;
    if (minPriority === 3) return StatusOrder.DELIVERED;
    
    // Fallback
    return StatusOrder.RECEIVED;
  }

  /**
   * Actualiza el estado general de la orden basado en los estados de los items
   */
  private async updateOrderStatus(serviceOrderId: number): Promise<void> {
    // Obtener todos los items de la orden
    const items = await this.prisma.itemServiceOrder.findMany({
      where: { serviceorderId: serviceOrderId },
      select: { statusOrder: true },
    });

    // Calcular el estado general
    const itemStatuses = items.map(item => item.statusOrder);
    const generalStatus = this.calculateOrderStatus(itemStatuses);

    // Actualizar el estado general de la orden
    await this.prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: { statusOrder: generalStatus },
    });
  }

  async create(createServiceOrderDto: CreateServiceOrderDto) {
    const { userId, pointsaleId, items, total, servicedeadline } = createServiceOrderDto;

    // Validar que el usuario existe
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Validar que el punto de venta existe
    const pointsale = await this.prisma.pointSale.findUnique({ where: { id: pointsaleId } });
    if (!pointsale) {
      throw new NotFoundException(`Punto de venta con ID ${pointsaleId} no encontrado`);
    }

    // Validar que todos los servicios existen
    for (const item of items) {
      const listservice = await this.prisma.listService.findUnique({ 
        where: { id: item.listserviceId } 
      });
      if (!listservice) {
        throw new NotFoundException(`Servicio con ID ${item.listserviceId} no encontrado`);
      }
    }

    try {
      // Generar código único para la orden
      const orderCode = await this.generateOrderCode();

      // Crear ServiceOrder y SalesOrder en una transacción
      const result = await this.prisma.$transaction(async (prisma) => {
        // Agrupar items por categoría para asignar códigos secuenciales
        // Necesitamos obtener las categorías de los servicios primero
        const itemsWithCategories = await Promise.all(
          items.map(async (item) => {
            const listservice = await prisma.listService.findUnique({
              where: { id: item.listserviceId },
              include: { servicecategory: true },
            });
            return {
              ...item,
              categoryId: listservice?.servicecategory.id || 0,
              categoryName: listservice?.servicecategory.name || '',
            };
          })
        );

        // Ordenar items por categoría (por nombre para mantener consistencia)
        itemsWithCategories.sort((a, b) => a.categoryName.localeCompare(b.categoryName));

        // Asignar códigos a los items basados en el orden de categoría
        const itemsWithCodes = itemsWithCategories.map((item, index) => ({
          listserviceId: item.listserviceId,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          numberpieces: item.numberpieces,
          subtotal: item.subtotal,
          observations: item.observations || null,
          code: this.generateItemCode(orderCode, index + 1), // YY empieza en 01
          statusOrder: StatusOrder.RECEIVED, // Estado inicial para cada item
        }));

        // 1. Crear ServiceOrder con estado RECEIVED y código
        // El estado general será RECEIVED inicialmente (todos los items empiezan en RECEIVED)
        const serviceOrder = await prisma.serviceOrder.create({
          data: {
            userId,
            pointsaleId,
            code: orderCode,
            statusOrder: StatusOrder.RECEIVED, // Estado inicial (mínimo de los items)
            itemserviceorders: {
              create: itemsWithCodes.map(item => ({
                listserviceId: item.listserviceId,
                quantity: item.quantity,
                totalPrice: item.totalPrice,
                numberpieces: item.numberpieces,
                subtotal: item.subtotal,
                observations: item.observations,
                code: item.code,
                statusOrder: item.statusOrder, // Estado individual del item
              })),
            },
          },
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
            pointsale: true,
          },
        });

        // 2. Crear SalesOrder asociada al ServiceOrder con el mismo código
        const salesOrder = await prisma.salesOrder.create({
          data: {
            serviceorderId: serviceOrder.id, // Relación 1:1
            code: orderCode, // Mismo código que ServiceOrder
            total,
            servicedeadline: new Date(servicedeadline),
            statusPay: StatusPay.UNPAID, // Estado de pago inicial
          },
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
                pointsale: true,
              },
            },
          },
        });

        return { serviceOrder, salesOrder };
      });

      return result;
    } catch (error) {
      console.error('Error al crear orden de servicio:', error);
      throw new BadRequestException('Error al crear la orden de servicio');
    }
  }

  async findAll() {
    const orders = await this.prisma.serviceOrder.findMany({
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
        pointsale: true,
        salesorder: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Recalcular y actualizar el estado general para cada orden
    for (const order of orders) {
      await this.updateOrderStatus(order.id);
    }

    // Retornar las órdenes actualizadas
    return this.prisma.serviceOrder.findMany({
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
        pointsale: true,
        salesorder: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id },
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
        pointsale: true,
        salesorder: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!serviceOrder) {
      throw new NotFoundException(`Orden de servicio con ID ${id} no encontrada`);
    }

    // Recalcular y actualizar el estado general basado en los items
    await this.updateOrderStatus(id);

    // Retornar la orden actualizada
    return this.prisma.serviceOrder.findUnique({
      where: { id },
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
        pointsale: true,
        salesorder: {
          include: {
            payments: true,
          },
        },
      },
    });
  }

  async findByPointSale(pointsaleId: number) {
    const orders = await this.prisma.serviceOrder.findMany({
      where: { pointsaleId },
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
        pointsale: true,
        salesorder: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Recalcular y actualizar el estado general para cada orden
    for (const order of orders) {
      await this.updateOrderStatus(order.id);
    }

    // Retornar las órdenes actualizadas
    return this.prisma.serviceOrder.findMany({
      where: { pointsaleId },
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
        pointsale: true,
        salesorder: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByMultiplePointSales(pointsaleIds: number[]) {
    return this.prisma.serviceOrder.findMany({
      where: {
        pointsaleId: {
          in: pointsaleIds,
        },
      },
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
        pointsale: true,
        salesorder: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByUser(userId: number) {
    const orders = await this.prisma.serviceOrder.findMany({
      where: { userId },
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
        pointsale: true,
        salesorder: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Recalcular y actualizar el estado general para cada orden
    for (const order of orders) {
      await this.updateOrderStatus(order.id);
    }

    // Retornar las órdenes actualizadas
    return this.prisma.serviceOrder.findMany({
      where: { userId },
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
        pointsale: true,
        salesorder: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: number, updateServiceOrderDto: UpdateServiceOrderDto) {
    const serviceOrder = await this.findOne(id);

    return this.prisma.serviceOrder.update({
      where: { id },
      data: {
        statusOrder: updateServiceOrderDto.statusOrder,
      },
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
        pointsale: true,
        salesorder: {
          include: {
            payments: true,
          },
        },
      },
    });
  }

  async updateStatus(id: number, statusOrder: StatusOrder) {
    const serviceOrder = await this.findOne(id);

    // Actualizar el estado de la orden
    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: { statusOrder },
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
        pointsale: true,
        salesorder: {
          include: {
            payments: true,
          },
        },
      },
    });

    // Actualizar todos los items al mismo estado (comportamiento legacy)
    await this.prisma.itemServiceOrder.updateMany({
      where: { serviceorderId: id },
      data: { statusOrder },
    });

    return updated;
  }

  /**
   * Actualiza el estado de un item individual y recalcula el estado general de la orden
   */
  async updateItemStatus(itemId: number, statusOrder: StatusOrder) {
    // Verificar que el item existe
    const item = await this.prisma.itemServiceOrder.findUnique({
      where: { id: itemId },
      include: {
        serviceorder: {
          include: {
            salesorder: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item de servicio con ID ${itemId} no encontrado`);
    }

    // Validación: Si está pasando a DELIVERED, verificar que el saldo sea cero
    if (statusOrder === StatusOrder.DELIVERED && item.serviceorder.salesorder) {
      try {
        const salesOrder = await this.prisma.salesOrder.findUnique({
          where: { id: item.serviceorder.salesorder.id },
          include: { payments: true },
        });

        if (salesOrder) {
          const total = Number(salesOrder.total) || 0;
          const totalPaid = salesOrder.payments?.reduce((sum: number, payment: any) => {
            return sum + (Number(payment.amount) || 0);
          }, 0) || 0;
          
          const balance = total - totalPaid;
          
          if (balance > 0) {
            throw new BadRequestException(
              `No se puede entregar el servicio. El cliente tiene un saldo pendiente de S/. ${balance.toFixed(2)}.`
            );
          }
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        console.error('Error al verificar el saldo:', error);
      }
    }

    // Actualizar el estado del item
    const updatedItem = await this.prisma.itemServiceOrder.update({
      where: { id: itemId },
      data: { statusOrder },
      include: {
        listservice: {
          include: {
            servicecategory: true,
          },
        },
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
            pointsale: true,
            salesorder: {
              include: {
                payments: true,
              },
            },
          },
        },
      },
    });

    // Recalcular y actualizar el estado general de la orden
    await this.updateOrderStatus(item.serviceorderId);

    // Retornar la orden completa actualizada
    return this.findOne(item.serviceorderId);
  }

  async remove(id: number) {
    const serviceOrder = await this.findOne(id);

    // Al eliminar el ServiceOrder, también se eliminará el SalesOrder por la relación CASCADE
    return this.prisma.serviceOrder.delete({
      where: { id },
    });
  }
}









