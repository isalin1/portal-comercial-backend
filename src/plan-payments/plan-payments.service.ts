import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanPaymentDto } from './dto/create-plan-payment.dto';

@Injectable()
export class PlanPaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createPlanPaymentDto: CreatePlanPaymentDto) {
    // Verificar que el negocio existe
    const business = await this.prisma.busines.findUnique({
      where: { id: createPlanPaymentDto.businesId },
      include: { user: true },
    });

    if (!business) {
      throw new NotFoundException(`Negocio con ID ${createPlanPaymentDto.businesId} no encontrado`);
    }

    // Verificar que el plan existe
    const plan = await this.prisma.plan.findUnique({
      where: { id: createPlanPaymentDto.planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${createPlanPaymentDto.planId} no encontrado`);
    }

    // Validar que el monto coincida con el costo del plan (opcional, puede ser flexible)
    if (plan.costo && createPlanPaymentDto.monto !== Number(plan.costo)) {
      // Permitir pero registrar la diferencia
      console.warn(`Monto ingresado (${createPlanPaymentDto.monto}) no coincide con costo del plan (${plan.costo})`);
    }

    // Buscar si el negocio ya tiene un plan activo
    const existingBusinessPlan = await this.prisma.businessPlan.findFirst({
      where: {
        businesId: createPlanPaymentDto.businesId,
        estado: 'ACTIVO',
      },
      orderBy: { fechaFin: 'desc' },
    });

    // Calcular fechas - convertir string a Date
    // El formato puede ser "YYYY-MM-DD" o ISO string
    let fechaPagoUTC: Date;
    const fechaPagoString = createPlanPaymentDto.fechaPago;
    
    console.log('📅 [PLAN-PAYMENT] Fecha recibida del frontend:', fechaPagoString);
    
    if (typeof fechaPagoString === 'string' && fechaPagoString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Si viene como "YYYY-MM-DD", parsearlo directamente sin problemas de timezone
      const [year, month, day] = fechaPagoString.split('-').map(Number);
      fechaPagoUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
      console.log('📅 [PLAN-PAYMENT] Parseado como YYYY-MM-DD:', year, month, day, '-> UTC:', fechaPagoUTC.toISOString());
    } else {
      // Si viene como ISO string, parsearlo y luego usar UTC
      const fechaPago = new Date(fechaPagoString);
      fechaPagoUTC = new Date(Date.UTC(
        fechaPago.getUTCFullYear(),
        fechaPago.getUTCMonth(),
        fechaPago.getUTCDate(),
        12, 0, 0, 0
      ));
      console.log('📅 [PLAN-PAYMENT] Parseado como ISO string -> UTC:', fechaPagoUTC.toISOString());
    }

    let fechaInicio: Date;
    let fechaFin: Date;

    if (existingBusinessPlan) {
      // Si ya tiene plan activo, extender desde la fecha de fin actual
      // existingBusinessPlan.fechaFin viene como Date desde Prisma
      const existingFechaFin = existingBusinessPlan.fechaFin instanceof Date 
        ? existingBusinessPlan.fechaFin 
        : new Date(existingBusinessPlan.fechaFin);
      
      fechaInicio = new Date(Date.UTC(
        existingFechaFin.getUTCFullYear(),
        existingFechaFin.getUTCMonth(),
        existingFechaFin.getUTCDate() + 1, // Empezar el día siguiente
        12, 0, 0, 0
      ));
    } else {
      // Si no tiene plan, empezar desde la fecha de pago
      fechaInicio = fechaPagoUTC;
    }

    console.log('📅 [PLAN-PAYMENT] Fecha inicio calculada:', fechaInicio.toISOString(), 'UTC date:', fechaInicio.getUTCDate());

    // Calcular fecha de fin sumando los días del período
    fechaFin = new Date(Date.UTC(
      fechaInicio.getUTCFullYear(),
      fechaInicio.getUTCMonth(),
      fechaInicio.getUTCDate() + plan.diasPeriodo,
      12, 0, 0, 0
    ));
    
    console.log('📅 [PLAN-PAYMENT] Fecha fin calculada:', fechaFin.toISOString(), 'UTC date:', fechaFin.getUTCDate(), 'Días período:', plan.diasPeriodo);

    // Usar transacción para asegurar consistencia
    const result = await this.prisma.$transaction(async (tx) => {
      // Si ya existe un plan activo, solo marcarlo como VENCIDO si su fecha ya pasó
      // Si aún no está vencido, mantenerlo como ACTIVO (aunque haya un plan posterior)
      if (existingBusinessPlan) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Parsear fechaFin del plan existente
        let existingFechaFin: Date;
        if (existingBusinessPlan.fechaFin instanceof Date) {
          existingFechaFin = new Date(existingBusinessPlan.fechaFin);
        } else {
          existingFechaFin = new Date(existingBusinessPlan.fechaFin);
        }
        existingFechaFin.setHours(0, 0, 0, 0);
        
        // Solo marcar como VENCIDO si la fecha de fin ya pasó
        // Si aún no está vencido, mantenerlo como ACTIVO
        if (existingFechaFin < today) {
          await tx.businessPlan.update({
            where: { id: existingBusinessPlan.id },
            data: { estado: 'VENCIDO' },
          });
          console.log(`📅 Plan anterior ${existingBusinessPlan.id} marcado como VENCIDO (fechaFin=${existingFechaFin.toISOString()} < hoy=${today.toISOString()})`);
        } else {
          // Mantener como ACTIVO si aún no está vencido
          console.log(`📅 Plan anterior ${existingBusinessPlan.id} se mantiene ACTIVO (fechaFin=${existingFechaFin.toISOString()} >= hoy=${today.toISOString()})`);
        }
      }

      // Crear nuevo business_plan
      const newBusinessPlan = await tx.businessPlan.create({
        data: {
          businesId: createPlanPaymentDto.businesId,
          planId: createPlanPaymentDto.planId,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
          estado: 'ACTIVO',
          fechaPago: fechaPagoUTC,
        },
        include: {
          business: {
            include: {
              user: true,
            },
          },
          plan: true,
        },
      });

      // Crear registro de pago
      const planPayment = await tx.planPayment.create({
        data: {
          businessPlanId: newBusinessPlan.id,
          monto: createPlanPaymentDto.monto,
          fechaPago: fechaPagoUTC,
          metodoPago: createPlanPaymentDto.metodoPago || null,
          comprobante: createPlanPaymentDto.comprobante || null,
          estado: 'APROBADO', // Los pagos registrados por SUPERADMIN se aprueban automáticamente
        },
      });

      // Activar todos los usuarios del negocio (ADMIN, COLABORADORES, CLIENTES)
      // Obtener todos los usuarios relacionados al negocio
      const userIdsToActivate: number[] = [];

      // 1. ADMIN del negocio
      if (business.userId) {
        userIdsToActivate.push(business.userId);
      }

      // 2. COLABORADORES (usuarios de puntos de venta)
      const pointsales = await tx.pointSale.findMany({
        where: { businesId: createPlanPaymentDto.businesId },
        include: { colaborador: true },
      });

      pointsales.forEach((pointSale) => {
        if (pointSale.userId && pointSale.colaborador) {
          userIdsToActivate.push(pointSale.userId);
        }
      });

      // 3. CLIENTES del negocio
      const clients = await tx.user.findMany({
        where: { clientBusinesId: createPlanPaymentDto.businesId },
      });

      clients.forEach((client) => {
        userIdsToActivate.push(client.id);
      });

      // Activar todos los usuarios en una sola operación
      if (userIdsToActivate.length > 0) {
        await tx.user.updateMany({
          where: {
            id: { in: userIdsToActivate },
          },
          data: {
            isActive: true,
          },
        });

        console.log(`✅ Activados ${userIdsToActivate.length} usuarios del negocio ${createPlanPaymentDto.businesId}`);
      }

      return {
        planPayment,
        businessPlan: newBusinessPlan,
      };
    });

    return result.planPayment;
  }

  async findAll(params?: { businessPlanId?: number; businesId?: number }) {
    const where: any = {};

    if (params?.businessPlanId) {
      where.businessPlanId = params.businessPlanId;
    }

    if (params?.businesId) {
      where.businessPlan = {
        businesId: params.businesId,
      };
    }

    return this.prisma.planPayment.findMany({
      where,
      include: {
        businessPlan: {
          include: {
            plan: true,
            business: true,
          },
        },
      },
      orderBy: { fechaPago: 'desc' },
    });
  }

  async findOne(id: number) {
    const payment = await this.prisma.planPayment.findUnique({
      where: { id },
      include: {
        businessPlan: {
          include: {
            plan: true,
            business: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    return payment;
  }

  async approve(id: number) {
    const payment = await this.findOne(id);
    
    return this.prisma.planPayment.update({
      where: { id },
      data: { estado: 'APROBADO' },
    });
  }

  async reject(id: number) {
    const payment = await this.findOne(id);
    
    return this.prisma.planPayment.update({
      where: { id },
      data: { estado: 'RECHAZADO' },
    });
  }
}

