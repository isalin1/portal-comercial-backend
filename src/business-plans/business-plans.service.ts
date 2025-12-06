import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessPlanDto } from './dto/create-business-plan.dto';

@Injectable()
export class BusinessPlansService {
  constructor(private prisma: PrismaService) {}

  // Método auxiliar para formatear fechas en formato YYYY-MM-DD
  private formatDateForResponse(date: Date | string): string {
    if (!date) return '';
    
    let dateObj: Date;
    if (typeof date === 'string') {
      // Si es string, puede venir como ISO string o como YYYY-MM-DD
      if (date.includes('T')) {
        // Es un ISO string, parsearlo
        dateObj = new Date(date);
      } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Ya es YYYY-MM-DD, devolverlo directamente
        return date;
      } else {
        // Otro formato de string, intentar parsearlo
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    
    // Verificar que dateObj sea válido
    if (isNaN(dateObj.getTime())) {
      console.error('Fecha inválida:', date);
      return '';
    }
    
    // Usar métodos UTC para evitar problemas de timezone
    // Esto asegura que siempre extraigamos la fecha correcta independientemente de la zona horaria
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;
    
    // Log temporal para depuración
    console.log('📅 [BUSINESS-PLAN] Formateando fecha:', {
      original: date,
      dateObjISO: dateObj.toISOString(),
      year,
      month,
      day,
      formatted,
      getUTCDate: dateObj.getUTCDate(),
      getDate: dateObj.getDate() // Para comparar
    });
    
    return formatted;
  }

  // Método auxiliar para formatear un objeto businessPlan completo
  private formatBusinessPlanResponse(bp: any) {
    return {
      ...bp,
      fechaInicio: this.formatDateForResponse(bp.fechaInicio),
      fechaFin: this.formatDateForResponse(bp.fechaFin),
      fechaPago: bp.fechaPago ? this.formatDateForResponse(bp.fechaPago) : null,
      fechaSuspension: bp.fechaSuspension ? this.formatDateForResponse(bp.fechaSuspension) : null,
      diasSuspendidos: bp.diasSuspendidos || 0,
      // Asegurar que el business tenga el estado correcto del usuario
      business: {
        ...bp.business,
        isActive: bp.business?.user?.isActive ?? false,
      },
      // Asegurar que el plan se incluya completo con todos sus campos
      plan: bp.plan ? {
        ...bp.plan,
        id: bp.plan.id,
        tipo: bp.plan.tipo,
        nombrePeriodo: bp.plan.nombrePeriodo,
        diasPeriodo: bp.plan.diasPeriodo,
        costo: bp.plan.costo,
      } : null,
    };
  }

  async create(createBusinessPlanDto: CreateBusinessPlanDto) {
    // Verificar que el negocio existe
    const business = await this.prisma.busines.findUnique({
      where: { id: createBusinessPlanDto.businesId },
    });

    if (!business) {
      throw new NotFoundException(`Negocio con ID ${createBusinessPlanDto.businesId} no encontrado`);
    }

    // Verificar que el plan existe
    const plan = await this.prisma.plan.findUnique({
      where: { id: createBusinessPlanDto.planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${createBusinessPlanDto.planId} no encontrado`);
    }

    // Convertir fechas a Date objects con UTC midday
    const fechaInicio = new Date(createBusinessPlanDto.fechaInicio);
    fechaInicio.setHours(12, 0, 0, 0);

    const fechaFin = new Date(createBusinessPlanDto.fechaFin);
    fechaFin.setHours(12, 0, 0, 0);

    const fechaPago = createBusinessPlanDto.fechaPago 
      ? new Date(createBusinessPlanDto.fechaPago)
      : null;
    if (fechaPago) {
      fechaPago.setHours(12, 0, 0, 0);
    }

    const businessPlan = await this.prisma.businessPlan.create({
      data: {
        businesId: createBusinessPlanDto.businesId,
        planId: createBusinessPlanDto.planId,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        estado: createBusinessPlanDto.estado || 'ACTIVO',
        fechaPago: fechaPago,
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

    return this.formatBusinessPlanResponse(businessPlan);
  }

  async findAll(params?: { businesId?: number; estado?: string }) {
    const where: any = {};

    if (params?.businesId) {
      where.businesId = params.businesId;
    }

    if (params?.estado) {
      where.estado = params.estado;
    }

    const businessPlans = await this.prisma.businessPlan.findMany({
      where,
      include: {
        business: {
          include: {
            user: true,
          },
        },
        plan: true,
      },
      orderBy: [
        { business: { name: 'asc' } },
        { fechaFin: 'desc' },
      ],
    });

    // Corregir estados basándose en fechas reales antes de devolver
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setMinutes(0, 0, 0);

    const correctedPlans = await Promise.all(
      businessPlans.map(async (bp) => {
        // Parsear fechaFin correctamente
        let planFechaFin: Date;
        if (bp.fechaFin instanceof Date) {
          planFechaFin = new Date(bp.fechaFin);
        } else {
          // Si viene como string "YYYY-MM-DD", parsearlo directamente
          const fechaFinStr = String(bp.fechaFin);
          if (fechaFinStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = fechaFinStr.split('-').map(Number);
            planFechaFin = new Date(year, month - 1, day);
          } else {
            planFechaFin = new Date(fechaFinStr);
          }
        }
        planFechaFin.setHours(0, 0, 0, 0);
        planFechaFin.setMinutes(0, 0, 0);

        console.log(`🔍 Verificando plan ${bp.id}: estado=${bp.estado}, fechaFin=${planFechaFin.toISOString()}, hoy=${today.toISOString()}, comparación=${planFechaFin >= today}`);

        // Si el plan está marcado como VENCIDO pero la fecha aún no pasó, corregirlo
        if (bp.estado === 'VENCIDO' && planFechaFin >= today) {
          console.log(`⚠️ Plan ${bp.id} marcado como VENCIDO pero fechaFin (${planFechaFin.toISOString()}) >= hoy (${today.toISOString()}). Corrigiendo a ACTIVO...`);
          await this.prisma.businessPlan.update({
            where: { id: bp.id },
            data: { estado: 'ACTIVO' },
          });
          bp.estado = 'ACTIVO';
          console.log(`✅ Plan ${bp.id} corregido: VENCIDO → ACTIVO`);
        }
        // Si el plan está marcado como ACTIVO pero la fecha ya pasó, marcarlo como VENCIDO
        else if (bp.estado === 'ACTIVO' && planFechaFin < today) {
          console.log(`⚠️ Plan ${bp.id} marcado como ACTIVO pero fechaFin (${planFechaFin.toISOString()}) < hoy (${today.toISOString()}). Corrigiendo a VENCIDO...`);
          await this.prisma.businessPlan.update({
            where: { id: bp.id },
            data: { estado: 'VENCIDO' },
          });
          bp.estado = 'VENCIDO';
          console.log(`✅ Plan ${bp.id} corregido: ACTIVO → VENCIDO`);
        }

        return this.formatBusinessPlanResponse(bp);
      })
    );

    return correctedPlans;
  }

  async findActiveByBusiness(businesId: number) {
    // Buscar plan ACTIVO o SUSPENDIDO (no VENCIDO)
    const businessPlan = await this.prisma.businessPlan.findFirst({
      where: {
        businesId,
        estado: {
          in: ['ACTIVO', 'SUSPENDIDO'],
        },
      },
      include: {
        business: {
          include: {
            user: true,
          },
        },
        plan: true,
      },
      orderBy: { fechaFin: 'desc' },
    });

    if (!businessPlan) {
      throw new NotFoundException(`No se encontró un plan activo o suspendido para el negocio con ID ${businesId}`);
    }

    // Verificar que si hay un plan ACTIVO, el negocio y sus usuarios estén ACTIVOS
    // Si el plan está activo pero el negocio está inactivo, corregirlo automáticamente
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let planFechaFin: Date;
    if (businessPlan.fechaFin instanceof Date) {
      planFechaFin = new Date(businessPlan.fechaFin);
    } else {
      planFechaFin = new Date(businessPlan.fechaFin);
    }
    planFechaFin.setHours(0, 0, 0, 0);

    // Si el plan está ACTIVO (no SUSPENDIDO) y no está vencido, asegurar que los usuarios estén activos
    if (businessPlan.estado === 'ACTIVO' && planFechaFin >= today) {
      // Verificar el estado del usuario ADMIN del negocio
      const adminUser = await this.prisma.user.findUnique({
        where: { id: businessPlan.business.userId },
        select: { isActive: true },
      });

      if (!adminUser || !adminUser.isActive) {
        console.log(`⚠️ Plan activo encontrado pero negocio inactivo. Activando usuarios del negocio ${businesId}...`);
        await this.activateBusinessUsers(businesId);
        
        // Recargar el businessPlan completo para obtener el estado actualizado
        const updatedBusinessPlan = await this.prisma.businessPlan.findFirst({
          where: {
            businesId,
            estado: {
              in: ['ACTIVO', 'SUSPENDIDO'],
            },
          },
          include: {
            business: {
              include: {
                user: {
                  select: {
                    id: true,
                    isActive: true,
                    email: true,
                    firstname: true,
                    lastname: true,
                  },
                },
              },
            },
            plan: true,
          },
          orderBy: { fechaFin: 'desc' },
        });

        if (updatedBusinessPlan) {
          console.log(`✅ Usuarios activados. Estado del negocio actualizado: ${updatedBusinessPlan.business.user?.isActive ? 'ACTIVO' : 'INACTIVO'}`);
          return this.formatBusinessPlanResponse(updatedBusinessPlan);
        }
      }
    }
    // Si el plan está SUSPENDIDO, no hacer nada (los usuarios ya están desactivados)

    return this.formatBusinessPlanResponse(businessPlan);
  }

  async renew(id: number) {
    const businessPlan = await this.prisma.businessPlan.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!businessPlan) {
      throw new NotFoundException(`Plan de negocio con ID ${id} no encontrado`);
    }

    // Calcular nuevas fechas
    const fechaInicio = new Date(businessPlan.fechaFin);
    fechaInicio.setDate(fechaInicio.getDate() + 1); // Empezar el día siguiente
    fechaInicio.setHours(12, 0, 0, 0);

    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + businessPlan.plan.diasPeriodo);
    fechaFin.setHours(12, 0, 0, 0);

    // Solo marcar como VENCIDO si la fecha de fin ya pasó
    // Si aún no está vencido, mantenerlo como ACTIVO
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let planFechaFin: Date;
    if (businessPlan.fechaFin instanceof Date) {
      planFechaFin = new Date(businessPlan.fechaFin);
    } else {
      planFechaFin = new Date(businessPlan.fechaFin);
    }
    planFechaFin.setHours(0, 0, 0, 0);
    
    if (planFechaFin < today) {
      await this.prisma.businessPlan.update({
        where: { id },
        data: { estado: 'VENCIDO' },
      });
    }
    // Si aún no está vencido, no hacer nada (se mantiene ACTIVO)

    // Crear nuevo plan activo
    const newBusinessPlan = await this.prisma.businessPlan.create({
      data: {
        businesId: businessPlan.businesId,
        planId: businessPlan.planId,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        estado: 'ACTIVO',
        fechaPago: new Date(),
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

    return this.formatBusinessPlanResponse(newBusinessPlan);
  }

  async suspend(id: number) {
    const businessPlan = await this.findOne(id);
    
    // Verificar que el plan esté ACTIVO antes de suspender
    if (businessPlan.estado !== 'ACTIVO') {
      throw new BadRequestException('Solo se pueden suspender planes que estén ACTIVOS');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Actualizar el plan: cambiar estado a SUSPENDIDO y guardar fecha de suspensión
    const updated = await this.prisma.businessPlan.update({
      where: { id },
      data: { 
        estado: 'SUSPENDIDO',
        fechaSuspension: today,
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

    // Desactivar todos los usuarios del negocio
    await this.deactivateBusinessUsers(businessPlan.businesId);

    console.log(`⏸️ Plan ${id} suspendido. Usuarios del negocio ${businessPlan.businesId} desactivados.`);

    return this.formatBusinessPlanResponse(updated);
  }

  async activate(id: number) {
    const businessPlan = await this.findOne(id);
    
    // Verificar que el plan esté SUSPENDIDO antes de reactivar
    if (businessPlan.estado !== 'SUSPENDIDO') {
      throw new BadRequestException('Solo se pueden reactivar planes que estén SUSPENDIDOS');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calcular días suspendidos desde la fecha de suspensión hasta hoy
    let fechaSuspension: Date;
    if (businessPlan.fechaSuspension instanceof Date) {
      fechaSuspension = new Date(businessPlan.fechaSuspension);
    } else if (businessPlan.fechaSuspension) {
      fechaSuspension = new Date(businessPlan.fechaSuspension);
    } else {
      // Si no hay fecha de suspensión guardada, usar la fecha actual (no debería pasar)
      fechaSuspension = today;
    }
    fechaSuspension.setHours(0, 0, 0, 0);

    const diasSuspendidosEstaVez = Math.max(0, Math.ceil((today.getTime() - fechaSuspension.getTime()) / (1000 * 60 * 60 * 24)));
    const diasSuspendidosTotales = (businessPlan.diasSuspendidos || 0) + diasSuspendidosEstaVez;

    // Calcular nueva fecha de fin: sumar los días suspendidos a la fecha de fin original
    let fechaFinOriginal: Date;
    if (businessPlan.fechaFin instanceof Date) {
      fechaFinOriginal = new Date(businessPlan.fechaFin);
    } else {
      fechaFinOriginal = new Date(businessPlan.fechaFin);
    }
    fechaFinOriginal.setHours(0, 0, 0, 0);

    // Nueva fecha de fin = fecha fin original + días suspendidos totales
    const nuevaFechaFin = new Date(fechaFinOriginal);
    nuevaFechaFin.setDate(nuevaFechaFin.getDate() + diasSuspendidosTotales);

    // Verificar si hay otro plan activo para este negocio
    const existingActive = await this.prisma.businessPlan.findFirst({
      where: {
        businesId: businessPlan.businesId,
        estado: 'ACTIVO',
        id: { not: id },
      },
    });

    if (existingActive) {
      // Solo marcar como VENCIDO si la fecha de fin ya pasó
      const existingFechaFin: Date = existingActive.fechaFin instanceof Date 
        ? new Date(existingActive.fechaFin) 
        : new Date(existingActive.fechaFin);
      existingFechaFin.setHours(0, 0, 0, 0);
      
      if (existingFechaFin < today) {
        await this.prisma.businessPlan.update({
          where: { id: existingActive.id },
          data: { estado: 'VENCIDO' },
        });
      }
    }

    // Actualizar el plan: cambiar estado a ACTIVO, ajustar fechaFin, limpiar fechaSuspension
    const updated = await this.prisma.businessPlan.update({
      where: { id },
      data: { 
        estado: 'ACTIVO',
        fechaFin: nuevaFechaFin,
        fechaSuspension: null,
        diasSuspendidos: diasSuspendidosTotales,
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

    // Reactivar todos los usuarios del negocio
    await this.activateBusinessUsers(businessPlan.businesId);

    console.log(`▶️ Plan ${id} reactivado. Días suspendidos esta vez: ${diasSuspendidosEstaVez}, Total acumulado: ${diasSuspendidosTotales}. Nueva fecha fin: ${nuevaFechaFin.toISOString()}. Usuarios reactivados.`);

    return this.formatBusinessPlanResponse(updated);
  }

  async findOne(id: number) {
    const businessPlan = await this.prisma.businessPlan.findUnique({
      where: { id },
      include: {
        business: {
          include: {
            user: true,
          },
        },
        plan: true,
      },
    });

    if (!businessPlan) {
      throw new NotFoundException(`Plan de negocio con ID ${id} no encontrado`);
    }

    return this.formatBusinessPlanResponse(businessPlan);
  }

  async findExpiring(days: number = 7) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);

    const businessPlans = await this.prisma.businessPlan.findMany({
      where: {
        estado: 'ACTIVO',
        fechaFin: {
          gte: today,
          lte: futureDate,
        },
      },
      include: {
        business: {
          include: {
            user: true,
          },
        },
        plan: true,
      },
      orderBy: { fechaFin: 'asc' },
    });

    return businessPlans.map(bp => this.formatBusinessPlanResponse(bp));
  }

  async findExpired() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const businessPlans = await this.prisma.businessPlan.findMany({
      where: {
        estado: 'ACTIVO',
        fechaFin: {
          lt: today,
        },
      },
      include: {
        business: {
          include: {
            user: true,
          },
        },
        plan: true,
      },
      orderBy: { fechaFin: 'asc' },
    });

    return businessPlans.map(bp => this.formatBusinessPlanResponse(bp));
  }

  /**
   * Activa todos los usuarios relacionados a un negocio
   * - ADMIN del negocio
   * - COLABORADORES (usuarios de puntos de venta)
   * - CLIENTES del negocio
   */
  async activateBusinessUsers(businesId: number) {
    const business = await this.prisma.busines.findUnique({
      where: { id: businesId },
      include: {
        user: true, // ADMIN
        pointsales: {
          include: {
            colaborador: true, // COLABORADORES
          },
        },
        clients: true, // CLIENTES
      },
    });

    if (!business) {
      throw new NotFoundException(`Negocio con ID ${businesId} no encontrado`);
    }

    const userIdsToActivate: number[] = [];

    // 1. Activar ADMIN del negocio
    if (business.userId) {
      userIdsToActivate.push(business.userId);
    }

    // 2. Activar COLABORADORES (usuarios de puntos de venta)
    business.pointsales.forEach((pointSale) => {
      if (pointSale.userId && pointSale.colaborador) {
        userIdsToActivate.push(pointSale.userId);
      }
    });

    // 3. Activar CLIENTES del negocio
    business.clients.forEach((client) => {
      userIdsToActivate.push(client.id);
    });

    // Activar todos los usuarios en una sola operación
    if (userIdsToActivate.length > 0) {
      await this.prisma.user.updateMany({
        where: {
          id: { in: userIdsToActivate },
        },
        data: {
          isActive: true,
        },
      });

      console.log(`✅ Activados ${userIdsToActivate.length} usuarios del negocio ${businesId}`);
    }

    return {
      activatedUsers: userIdsToActivate.length,
      userIds: userIdsToActivate,
    };
  }

  /**
   * Desactiva todos los usuarios relacionados a un negocio
   * - ADMIN del negocio
   * - COLABORADORES (usuarios de puntos de venta)
   * - CLIENTES del negocio
   */
  async deactivateBusinessUsers(businesId: number) {
    const business = await this.prisma.busines.findUnique({
      where: { id: businesId },
      include: {
        user: true, // ADMIN
        pointsales: {
          include: {
            colaborador: true, // COLABORADORES
          },
        },
        clients: true, // CLIENTES
      },
    });

    if (!business) {
      throw new NotFoundException(`Negocio con ID ${businesId} no encontrado`);
    }

    const userIdsToDeactivate: number[] = [];

    // 1. Desactivar ADMIN del negocio
    if (business.userId) {
      userIdsToDeactivate.push(business.userId);
    }

    // 2. Desactivar COLABORADORES (usuarios de puntos de venta)
    business.pointsales.forEach((pointSale) => {
      if (pointSale.userId && pointSale.colaborador) {
        userIdsToDeactivate.push(pointSale.userId);
      }
    });

    // 3. Desactivar CLIENTES del negocio
    business.clients.forEach((client) => {
      userIdsToDeactivate.push(client.id);
    });

    // Desactivar todos los usuarios en una sola operación
    if (userIdsToDeactivate.length > 0) {
      await this.prisma.user.updateMany({
        where: {
          id: { in: userIdsToDeactivate },
        },
        data: {
          isActive: false,
        },
      });

      console.log(`❌ Desactivados ${userIdsToDeactivate.length} usuarios del negocio ${businesId}`);
    }

    return {
      deactivatedUsers: userIdsToDeactivate.length,
      userIds: userIdsToDeactivate,
    };
  }

  /**
   * Corrige el estado de los planes basándose en la fecha real
   * Un plan solo debe estar VENCIDO si su fechaFin ya pasó
   */
  async correctPlanStates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar todos los planes
    const allPlans = await this.prisma.businessPlan.findMany({
      include: {
        business: true,
      },
    });

    const corrections: Array<{
      planId: number;
      businesId: number;
      businessName: string;
      oldEstado: string;
      newEstado: string;
      fechaFin: Date | string;
    }> = [];

    for (const plan of allPlans) {
      let planFechaFin: Date;
      if (plan.fechaFin instanceof Date) {
        planFechaFin = new Date(plan.fechaFin);
      } else {
        planFechaFin = new Date(plan.fechaFin);
      }
      planFechaFin.setHours(0, 0, 0, 0);

      let correctEstado = plan.estado;

      // Si el plan está marcado como VENCIDO pero la fecha aún no pasó, corregirlo a ACTIVO
      if (plan.estado === 'VENCIDO' && planFechaFin >= today) {
        // Verificar si hay otro plan ACTIVO para el mismo negocio
        // Si hay otro plan activo, mantener este como está (no cambiar a ACTIVO)
        // Pero si no hay otro plan activo, cambiarlo a ACTIVO
        const hasOtherActivePlan = await this.prisma.businessPlan.findFirst({
          where: {
            businesId: plan.businesId,
            estado: 'ACTIVO',
            id: { not: plan.id },
            fechaFin: {
              gte: today,
            },
          },
        });

        // Si no hay otro plan activo y este no está vencido, activarlo
        // Si hay otro plan activo, dejarlo como está (puede quedar como VENCIDO aunque no esté vencido por fecha)
        // Pero según la lógica del usuario, todos los planes no vencidos deben estar ACTIVOS
        correctEstado = 'ACTIVO';
      }
      // Si el plan está marcado como ACTIVO pero la fecha ya pasó, marcarlo como VENCIDO
      else if (plan.estado === 'ACTIVO' && planFechaFin < today) {
        correctEstado = 'VENCIDO';
      }

      // Solo actualizar si el estado necesita corrección
      if (correctEstado !== plan.estado) {
        await this.prisma.businessPlan.update({
          where: { id: plan.id },
          data: { estado: correctEstado },
        });

        corrections.push({
          planId: plan.id,
          businesId: plan.businesId,
          businessName: plan.business.name,
          oldEstado: plan.estado,
          newEstado: correctEstado,
          fechaFin: plan.fechaFin,
        });

        console.log(`✅ Plan ${plan.id} (${plan.business.name}) corregido: ${plan.estado} → ${correctEstado}`);
      }
    }

    return {
      totalPlans: allPlans.length,
      corrections: corrections.length,
      details: corrections,
    };
  }

  /**
   * Verifica y desactiva planes vencidos
   * Este método debe ejecutarse periódicamente (cron job)
   */
  async checkAndDeactivateExpiredPlans() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar planes activos que han vencido
    const expiredPlans = await this.prisma.businessPlan.findMany({
      where: {
        estado: 'ACTIVO',
        fechaFin: {
          lt: today,
        },
      },
      include: {
        business: true,
      },
    });

    console.log(`🔍 Encontrados ${expiredPlans.length} planes vencidos para procesar`);

    const results: Array<{
      planId: number;
      businesId: number;
      businessName?: string;
      fechaFin?: Date;
      deactivatedUsers?: number;
      error?: string;
    }> = [];

    for (const plan of expiredPlans) {
      try {
        // Marcar el plan como VENCIDO
        await this.prisma.businessPlan.update({
          where: { id: plan.id },
          data: { estado: 'VENCIDO' },
        });

        // Desactivar todos los usuarios del negocio
        const deactivationResult = await this.deactivateBusinessUsers(plan.businesId);

        results.push({
          planId: plan.id,
          businesId: plan.businesId,
          businessName: plan.business.name,
          fechaFin: plan.fechaFin,
          deactivatedUsers: deactivationResult.deactivatedUsers,
        });

        console.log(`✅ Plan ${plan.id} del negocio ${plan.business.name} marcado como vencido y usuarios desactivados`);
      } catch (error) {
        console.error(`❌ Error procesando plan vencido ${plan.id}:`, error);
        results.push({
          planId: plan.id,
          businesId: plan.businesId,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    return {
      processed: expiredPlans.length,
      results,
    };
  }

  /**
   * Obtiene el plan activo de un negocio y calcula días restantes
   */
  async getActivePlanWithDaysRemaining(businesId: number) {
    try {
      const activePlan = await this.findActiveByBusiness(businesId);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Parsear fechaFin (puede venir como string "YYYY-MM-DD" o Date)
      let fechaFin: Date;
      if (typeof activePlan.fechaFin === 'string') {
        const [year, month, day] = activePlan.fechaFin.split('-').map(Number);
        fechaFin = new Date(year, month - 1, day);
      } else {
        fechaFin = new Date(activePlan.fechaFin);
      }
      fechaFin.setHours(0, 0, 0, 0);
      
      const diffTime = fechaFin.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...activePlan,
        daysRemaining,
        isExpiringSoon: daysRemaining <= 5 && daysRemaining > 0,
        isExpired: daysRemaining < 0,
      };
    } catch (error) {
      // Si no tiene plan activo, retornar null
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }
}

