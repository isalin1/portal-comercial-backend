import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface ClientRankingResult {
  clientId: number;
  clientName: string;
  clientPhone: string | null;
  orderCount: number;
  totalAmount: number;
  averageAmount: number;
}

export interface MonthSalesReport {
  totalOrders: number;
  totalSales: number;
  totalCollected: number;
  pendingBalance: number;
  byPaymentStatus: Array<{
    status: string;
    count: number;
    totalAmount: number;
  }>;
  topServices: Array<{
    serviceName: string;
    categoryName: string;
    quantity: number;
    totalRevenue: number;
  }>;
}

export interface StockSalesReport {
  summary: {
    totalPointSales: number;
    totalOrders: number;
    totalSalesValue: number;
    totalPendingBalance: number;
  };
  byPointSale: Array<{
    pointSaleId: number;
    pointSaleName: string;
    businessName: string;
    orderCount: number;
    totalValue: number;
    pendingBalance: number;
  }>;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getClientRanking(
    month: number,
    year: number,
    rankingType: string,
    userId: number,
    userRole: string,
    businessId: number | null,
    pointSaleId: number | null,
  ): Promise<ClientRankingResult[]> {
    console.log('🔍 getClientRanking - params:', { 
      month, 
      year, 
      rankingType, 
      userId, 
      userRole, 
      businessId, 
      pointSaleId 
    });

    // Calcular el rango de fechas del mes
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    console.log('📅 Rango de fechas:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    let serviceOrderFilter: any = {};

    if (rankingType === 'business') {
      // RANKING POR NEGOCIO: todas las órdenes del cliente en cualquier punto del negocio
      console.log('📊 Tipo: Ranking por Negocio');
      
      if (userRole === 'SUPERADMIN') {
        // SUPERADMIN puede ver cualquier negocio
        if (businessId) {
          const business = await this.prisma.busines.findUnique({
            where: { id: businessId },
            include: { pointsales: true },
          });
          
          if (business && business.pointsales.length > 0) {
            const pointSaleIds = business.pointsales.map((ps) => ps.id);
            serviceOrderFilter = { pointsaleId: { in: pointSaleIds } };
            console.log('🏆 SUPERADMIN - Negocio seleccionado, filtro:', serviceOrderFilter);
          }
        }
      } else if (userRole === 'ADMIN') {
        // ADMIN solo ve su negocio
        const business = await this.prisma.busines.findFirst({
          where: { userId },
          include: { pointsales: true },
        });

        if (business && business.pointsales.length > 0) {
          const pointSaleIds = business.pointsales.map((ps) => ps.id);
          serviceOrderFilter = { pointsaleId: { in: pointSaleIds } };
          console.log('👔 ADMIN - Su negocio, filtro:', serviceOrderFilter);
        } else {
          console.log('⚠️ ADMIN sin puntos de venta');
          return [];
        }
      } else {
        // COLABORADOR no puede ver ranking por negocio
        console.log('⚠️ COLABORADOR no tiene acceso a ranking por negocio');
        return [];
      }
    } else {
      // RANKING POR PUNTO DE VENTA: solo órdenes del punto específico
      console.log('📊 Tipo: Ranking por Punto de Venta');
      
      if (userRole === 'SUPERADMIN') {
        // SUPERADMIN puede ver cualquier punto de venta
        if (pointSaleId) {
          serviceOrderFilter = { pointsaleId: pointSaleId };
          console.log('🏆 SUPERADMIN - Punto seleccionado:', pointSaleId);
        }
      } else if (userRole === 'ADMIN') {
        // ADMIN puede ver cualquiera de sus puntos de venta
        if (pointSaleId) {
          // Verificar que el punto pertenezca a su negocio
          const business = await this.prisma.busines.findFirst({
            where: { userId },
            include: { pointsales: true },
          });
          
          if (business) {
            const ownedPointSale = business.pointsales.find((ps) => ps.id === pointSaleId);
            if (ownedPointSale) {
              serviceOrderFilter = { pointsaleId: pointSaleId };
              console.log('👔 ADMIN - Punto de su negocio:', pointSaleId);
            } else {
              console.log('⚠️ ADMIN intentó acceder a punto que no le pertenece');
              return [];
            }
          }
        }
      } else if (userRole === 'COLABORADOR') {
        // COLABORADOR solo ve su punto de venta
        const userPointSale = await this.prisma.pointSale.findFirst({
          where: { userId },
        });

        if (userPointSale) {
          serviceOrderFilter = { pointsaleId: userPointSale.id };
          console.log('👷 COLABORADOR - Su punto de venta:', userPointSale.id);
        } else {
          console.log('⚠️ COLABORADOR sin punto de venta asignado');
          return [];
        }
      }
    }

    // Obtener todas las sales orders del mes con filtro
    console.log('🔍 Filtro aplicado a serviceorder:', JSON.stringify(serviceOrderFilter, null, 2));
    
    const salesOrders = await this.prisma.salesOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        serviceorder: serviceOrderFilter,
      },
      include: {
        serviceorder: {
          include: {
            cliente: true,
          },
        },
      },
    });

    console.log(`📦 Sales Orders encontradas: ${salesOrders.length}`);
    
    // Log detallado de cada sales order
    salesOrders.forEach((so, index) => {
      console.log(`  ${index + 1}. SalesOrder #${so.id} - Cliente: ${so.serviceorder.cliente?.firstname} - Punto: ${so.serviceorder.pointsaleId}`);
    });

    // Agrupar por cliente y calcular totales
    const clientMap = new Map<number, {
      clientId: number;
      clientName: string;
      clientPhone: string | null;
      orderCount: number;
      totalAmount: Decimal;
    }>();

    for (const order of salesOrders) {
      const client = order.serviceorder.cliente;
      if (!client) continue;

      const clientId = client.id;
      const existing = clientMap.get(clientId);

      if (existing) {
        existing.orderCount += 1;
        existing.totalAmount = existing.totalAmount.add(order.total);
      } else {
        clientMap.set(clientId, {
          clientId: client.id,
          clientName: `${client.firstname} ${client.lastname}`,
          clientPhone: client.phone,
          orderCount: 1,
          totalAmount: order.total,
        });
      }
    }

    // Convertir a array y calcular promedio
    const ranking: ClientRankingResult[] = Array.from(clientMap.values()).map(
      (client) => ({
        clientId: client.clientId,
        clientName: client.clientName,
        clientPhone: client.clientPhone,
        orderCount: client.orderCount,
        totalAmount: client.totalAmount.toNumber(),
        averageAmount: client.totalAmount.div(client.orderCount).toNumber(),
      }),
    );

    // Ordenar de mayor a menor por total
    ranking.sort((a, b) => b.totalAmount - a.totalAmount);

    console.log(`✅ Ranking generado con ${ranking.length} clientes`);
    return ranking;
  }

  async getMonthSales(
    month: number,
    year: number,
    reportType: string,
    userId: number,
    userRole: string,
    businessId: number | null,
    pointSaleId: number | null,
  ): Promise<MonthSalesReport> {
    console.log('📊 getMonthSales - params:', {
      month,
      year,
      reportType,
      userId,
      userRole,
      businessId,
      pointSaleId,
    });

    // Calcular el rango de fechas del mes
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    let serviceOrderFilter: any = {};

    if (reportType === 'business') {
      // REPORTE POR NEGOCIO
      if (userRole === 'SUPERADMIN') {
        if (businessId) {
          const business = await this.prisma.busines.findUnique({
            where: { id: businessId },
            include: { pointsales: true },
          });

          if (business && business.pointsales.length > 0) {
            const pointSaleIds = business.pointsales.map((ps) => ps.id);
            serviceOrderFilter = { pointsaleId: { in: pointSaleIds } };
          }
        }
      } else if (userRole === 'ADMIN') {
        const business = await this.prisma.busines.findFirst({
          where: { userId },
          include: { pointsales: true },
        });

        if (business && business.pointsales.length > 0) {
          const pointSaleIds = business.pointsales.map((ps) => ps.id);
          serviceOrderFilter = { pointsaleId: { in: pointSaleIds } };
        }
      }
    } else {
      // REPORTE POR PUNTO DE VENTA
      if (userRole === 'SUPERADMIN') {
        if (pointSaleId) {
          serviceOrderFilter = { pointsaleId: pointSaleId };
        }
      } else if (userRole === 'ADMIN') {
        if (pointSaleId) {
          const business = await this.prisma.busines.findFirst({
            where: { userId },
            include: { pointsales: true },
          });

          if (business) {
            const ownedPointSale = business.pointsales.find(
              (ps) => ps.id === pointSaleId,
            );
            if (ownedPointSale) {
              serviceOrderFilter = { pointsaleId: pointSaleId };
            }
          }
        }
      } else if (userRole === 'COLABORADOR') {
        const userPointSale = await this.prisma.pointSale.findFirst({
          where: { userId },
        });

        if (userPointSale) {
          serviceOrderFilter = { pointsaleId: userPointSale.id };
        }
      }
    }

    console.log('🔍 Filtro aplicado:', JSON.stringify(serviceOrderFilter, null, 2));

    // Obtener todas las sales orders del mes
    const salesOrders = await this.prisma.salesOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        serviceorder: serviceOrderFilter,
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
          },
        },
        payments: true,
      },
    });

    console.log(`📦 Sales Orders encontradas: ${salesOrders.length}`);

    // Calcular totales
    let totalSales = new Decimal(0);
    let totalCollected = new Decimal(0);

    const statusMap = new Map<string, { count: number; totalAmount: Decimal }>();
    const serviceMap = new Map<
      string,
      {
        serviceName: string;
        categoryName: string;
        quantity: number;
        totalRevenue: Decimal;
      }
    >();

    for (const order of salesOrders) {
      totalSales = totalSales.add(order.total);

      // Calcular total cobrado
      for (const payment of order.payments) {
        totalCollected = totalCollected.add(payment.amount);
      }

      // Agrupar por estado de pago
      const existing = statusMap.get(order.statusPay);
      if (existing) {
        existing.count += 1;
        existing.totalAmount = existing.totalAmount.add(order.total);
      } else {
        statusMap.set(order.statusPay, {
          count: 1,
          totalAmount: order.total,
        });
      }

      // Agrupar servicios
      for (const item of order.serviceorder.itemserviceorders) {
        const service = item.listservice;
        const serviceName = service.type; // ServiceType enum: GENERAL, ABRIGO, etc.
        const categoryName = service.servicecategory.name;

        const existingService = serviceMap.get(serviceName);
        if (existingService) {
          existingService.quantity += Number(item.quantity);
          existingService.totalRevenue = existingService.totalRevenue.add(
            item.subtotal,
          );
        } else {
          serviceMap.set(serviceName, {
            serviceName,
            categoryName,
            quantity: Number(item.quantity),
            totalRevenue: item.subtotal,
          });
        }
      }
    }

    const pendingBalance = totalSales.sub(totalCollected);

    // Convertir a arrays
    const byPaymentStatus = Array.from(statusMap.entries()).map(
      ([status, data]) => ({
        status,
        count: data.count,
        totalAmount: data.totalAmount.toNumber(),
      }),
    );

    // Top 5 servicios más vendidos
    const topServices = Array.from(serviceMap.values())
      .map((service) => ({
        serviceName: service.serviceName,
        categoryName: service.categoryName,
        quantity: service.quantity,
        totalRevenue: service.totalRevenue.toNumber(),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    const report: MonthSalesReport = {
      totalOrders: salesOrders.length,
      totalSales: totalSales.toNumber(),
      totalCollected: totalCollected.toNumber(),
      pendingBalance: pendingBalance.toNumber(),
      byPaymentStatus,
      topServices,
    };

    console.log('✅ Reporte generado:', report);
    return report;
  }

  async getStockSales(
    userId: number,
    userRole: string,
  ): Promise<StockSalesReport> {
    console.log('📊 getStockSales - params:', { userId, userRole });

    // Determinar qué puntos de venta puede ver el usuario
    let pointSaleIds: number[] = [];

    if (userRole === 'SUPERADMIN') {
      // SUPERADMIN ve todos los puntos de venta
      const allPointSales = await this.prisma.pointSale.findMany({
        select: { id: true },
      });
      pointSaleIds = allPointSales.map((ps) => ps.id);
      console.log('🏆 SUPERADMIN - Todos los puntos de venta:', pointSaleIds.length);
    } else if (userRole === 'ADMIN') {
      // ADMIN ve los puntos de venta de su negocio
      const business = await this.prisma.busines.findFirst({
        where: { userId },
        include: { pointsales: true },
      });

      if (business && business.pointsales.length > 0) {
        pointSaleIds = business.pointsales.map((ps) => ps.id);
        console.log('👔 ADMIN - Puntos de venta de su negocio:', pointSaleIds.length);
      }
    } else if (userRole === 'COLABORADOR') {
      // COLABORADOR ve solo su punto de venta
      const userPointSale = await this.prisma.pointSale.findFirst({
        where: { userId },
      });

      if (userPointSale) {
        pointSaleIds = [userPointSale.id];
        console.log('👷 COLABORADOR - Su punto de venta:', pointSaleIds);
      }
    }

    if (pointSaleIds.length === 0) {
      console.log('⚠️ No se encontraron puntos de venta para el usuario');
      return {
        summary: {
          totalPointSales: 0,
          totalOrders: 0,
          totalSalesValue: 0,
          totalPendingBalance: 0,
        },
        byPointSale: [],
      };
    }

    // Obtener todas las sales orders que NO han sido entregadas
    const salesOrders = await this.prisma.salesOrder.findMany({
      where: {
        serviceorder: {
          pointsaleId: { in: pointSaleIds },
          statusOrder: { not: 'DELIVERED' }, // Excluir órdenes entregadas
        },
      },
      include: {
        serviceorder: {
          include: {
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

    console.log(`📦 Sales Orders no entregadas encontradas: ${salesOrders.length}`);

    // Agrupar por punto de venta
    const pointSaleMap = new Map<
      number,
      {
        pointSaleName: string;
        businessName: string;
        orderCount: number;
        totalValue: Decimal;
        totalCollected: Decimal;
      }
    >();

    for (const order of salesOrders) {
      const pointSale = order.serviceorder.pointsale;
      const pointSaleId = pointSale.id;

      // Calcular total cobrado de esta orden
      let collected = new Decimal(0);
      for (const payment of order.payments) {
        collected = collected.add(payment.amount);
      }

      const existing = pointSaleMap.get(pointSaleId);
      if (existing) {
        existing.orderCount += 1;
        existing.totalValue = existing.totalValue.add(order.total);
        existing.totalCollected = existing.totalCollected.add(collected);
      } else {
        pointSaleMap.set(pointSaleId, {
          pointSaleName: pointSale.name,
          businessName: pointSale.business.name,
          orderCount: 1,
          totalValue: order.total,
          totalCollected: collected,
        });
      }
    }

    // Convertir a array y calcular saldo pendiente
    const byPointSale = Array.from(pointSaleMap.entries()).map(([id, data]) => ({
      pointSaleId: id,
      pointSaleName: data.pointSaleName,
      businessName: data.businessName,
      orderCount: data.orderCount,
      totalValue: data.totalValue.toNumber(),
      pendingBalance: data.totalValue.sub(data.totalCollected).toNumber(),
    }));

    // Ordenar por mayor saldo pendiente
    byPointSale.sort((a, b) => b.pendingBalance - a.pendingBalance);

    // Calcular totales del resumen
    let totalSalesValue = new Decimal(0);
    let totalPendingBalance = new Decimal(0);

    for (const item of byPointSale) {
      totalSalesValue = totalSalesValue.add(item.totalValue);
      totalPendingBalance = totalPendingBalance.add(item.pendingBalance);
    }

    const report: StockSalesReport = {
      summary: {
        totalPointSales: byPointSale.length,
        totalOrders: salesOrders.length,
        totalSalesValue: totalSalesValue.toNumber(),
        totalPendingBalance: totalPendingBalance.toNumber(),
      },
      byPointSale,
    };

    console.log('✅ Reporte de stock generado:', {
      pointSales: report.summary.totalPointSales,
      orders: report.summary.totalOrders,
      value: report.summary.totalSalesValue,
      pending: report.summary.totalPendingBalance,
    });
    return report;
  }
}
