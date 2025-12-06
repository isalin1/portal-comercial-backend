import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto) {
    try {
      // Verificar que la orden de venta existe
      const salesOrder = await this.prisma.salesOrder.findUnique({
        where: { id: createPaymentDto.salesorderId },
        include: {
          payments: true,
        },
      });

      if (!salesOrder) {
        throw new NotFoundException(`SalesOrder con ID ${createPaymentDto.salesorderId} no encontrada`);
      }

      // Calcular el saldo pendiente
      const totalPaid = salesOrder.payments.reduce((sum, payment) => {
        return sum + Number(payment.amount);
      }, 0);

      const balance = Number(salesOrder.total) - totalPaid;

      // Validar que el monto del pago no exceda el saldo pendiente
      if (createPaymentDto.amount > balance) {
        throw new BadRequestException(
          `El monto del pago (${createPaymentDto.amount}) excede el saldo pendiente (${balance.toFixed(2)})`
        );
      }

      // Crear el pago
      const payment = await this.prisma.payment.create({
        data: {
          amount: createPaymentDto.amount,
          methodpay: createPaymentDto.paymenttype,
          datepaid: new Date(createPaymentDto.datepaid),
          salesorderId: createPaymentDto.salesorderId,
        },
        include: {
          salesorder: {
            include: {
              serviceorder: {
                include: {
                  cliente: true,
                },
              },
            },
          },
        },
      });

      // Actualizar el estado de pago de la SalesOrder
      const newTotalPaid = totalPaid + Number(createPaymentDto.amount);
      let newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'PARTIAL';

      if (newTotalPaid >= Number(salesOrder.total)) {
        newStatus = 'PAID';
      } else if (newTotalPaid === 0) {
        newStatus = 'UNPAID';
      }

      await this.prisma.salesOrder.update({
        where: { id: createPaymentDto.salesorderId },
        data: { statusPay: newStatus },
      });

      return payment;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear el pago: ' + error.message);
    }
  }

  async findAll() {
    return await this.prisma.payment.findMany({
      include: {
        salesorder: {
          include: {
            serviceorder: {
              include: {
                cliente: true,
              },
            },
          },
        },
      },
      orderBy: {
        datepaid: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        salesorder: {
          include: {
            serviceorder: {
              include: {
                cliente: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment con ID ${id} no encontrado`);
    }

    return payment;
  }

  async findBySalesOrder(salesorderId: number) {
    return await this.prisma.payment.findMany({
      where: { salesorderId },
      orderBy: {
        datepaid: 'desc',
      },
    });
  }

  async update(id: number, updatePaymentDto: UpdatePaymentDto) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id },
      });

      if (!payment) {
        throw new NotFoundException(`Payment con ID ${id} no encontrado`);
      }

      return await this.prisma.payment.update({
        where: { id },
        data: updatePaymentDto,
        include: {
          salesorder: true,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al actualizar el pago');
    }
  }

  async remove(id: number) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id },
        include: {
          salesorder: true,
        },
      });

      if (!payment) {
        throw new NotFoundException(`Payment con ID ${id} no encontrado`);
      }

      // Eliminar el pago
      await this.prisma.payment.delete({
        where: { id },
      });

      // Recalcular el estado de pago de la SalesOrder
      const salesOrder = await this.prisma.salesOrder.findUnique({
        where: { id: payment.salesorderId },
        include: {
          payments: true,
        },
      });

      if (salesOrder) {
        const totalPaid = salesOrder.payments.reduce((sum, p) => {
          return sum + Number(p.amount);
        }, 0);

        let newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID';

        if (totalPaid >= Number(salesOrder.total)) {
          newStatus = 'PAID';
        } else if (totalPaid > 0) {
          newStatus = 'PARTIAL';
        }

        await this.prisma.salesOrder.update({
          where: { id: salesOrder.id },
          data: { statusPay: newStatus },
        });
      }

      return { message: 'Pago eliminado correctamente' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar el pago');
    }
  }
}












