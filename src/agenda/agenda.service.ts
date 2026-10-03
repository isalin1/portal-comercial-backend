import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AgendaNoticeTarget,
  Prisma,
  UserType,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import { toWhatsAppUrl } from 'src/common/directory.utils';
import { planFlags } from 'src/common/plan-features';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { CreateAgendaServiceDto } from './dto/create-agenda-service.dto';
import { UpdateAgendaServiceDto } from './dto/update-agenda-service.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateAppointmentPaymentDto } from './dto/create-appointment-payment.dto';
import { PublicationService } from 'src/publication/publication.service';

const LIMA = 'America/Lima';

const appointmentInclude = {
  payments: { orderBy: { paidAt: 'asc' as const } },
  notices: { orderBy: { createdAt: 'asc' as const } },
  turnItems: { orderBy: { startsAt: 'asc' as const } },
} satisfies Prisma.AppointmentInclude;

type AppointmentRow = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

@Injectable()
export class AgendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publication: PublicationService,
  ) {}

  async accessMe(user: AuthUser) {
    if (user.userType === UserType.ADMIN) return { enabled: true };
    return { enabled: await this.isEnabled(user.id) };
  }

  async businesses(user: AuthUser) {
    if (user.userType !== UserType.ADMIN && !(await this.isEnabled(user.id))) return [];
    return this.prisma.business.findMany({
      where: {
        ...(user.userType === UserType.ADMIN ? {} : { userId: user.id }),
        rubro: { allowsAgenda: true },
      },
      select: { id: true, commercialName: true },
      orderBy: { commercialName: 'asc' },
    });
  }

  async get(businessId: number, user: AuthUser, professionalId?: number) {
    const business = await this.assertProfessional(businessId, user);
    const professionals = await this.prisma.professional.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
    });
    const chosen = professionalId || (professionals.length === 1 ? professionals[0].id : 0);
    const agenda = chosen
      ? await this.prisma.agenda.findFirst({
          where: { businessId, professionalId: chosen },
          include: { services: { orderBy: { name: 'asc' } }, days: { include: { turns: { orderBy: { startsAt: 'asc' } } } } },
        })
      : null;
    const mapped = agenda ? this.mapAgenda(agenda) : null;
    return {
      business: {
        id: business.id,
        commercialName: business.commercialName,
        rubroName: business.rubro.name,
        pointSales: business.pointSales.map((point) => ({
          id: point.id,
          name: point.name,
          phone: point.phone,
        })),
      },
      maxProfessionals: await this.professionalLimit(businessId),
      professionals: professionals.map((item) => ({ id: item.id, name: item.name, phone: item.phone, isActive: item.isActive })),
      agenda: mapped
        ? { ...mapped, services: await this.publication.decorateServices(user, mapped.services) }
        : null,
    };
  }

  async listProfessionals(businessId: number, user: AuthUser) {
    await this.assertOwner(businessId, user);
    const max = await this.professionalLimit(businessId);
    await this.fillAgendaSlot(businessId, max);
    const professionals = await this.prisma.professional.findMany({ where: { businessId }, orderBy: { name: 'asc' } });
    return {
      max,
      professionals: professionals.map((item) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        isActive: item.isActive,
        agendaControl: item.agendaControl,
      })),
    };
  }

  async createProfessional(businessId: number, user: AuthUser, body: { name: string; phone?: string }) {
    await this.assertOwner(businessId, user);
    const name = String(body.name || '').trim();
    if (!name) throw new BadRequestException('Indica el nombre del profesional');
    const phone = String(body.phone || '').trim();
    if (!phone) throw new BadRequestException('Indica el celular del profesional');
    const max = await this.professionalLimit(businessId);
    const used = await this.prisma.professional.count({ where: { businessId, agendaControl: true } });
    return this.prisma.professional.create({
      data: {
        businessId,
        name,
        phone,
        agendaControl: max > 0 && used < max,
        agenda: { create: { businessId, slotMinutes: 30 } },
      },
    });
  }

  async updateProfessional(id: number, user: AuthUser, body: { name?: string; phone?: string; isActive?: boolean; agendaControl?: boolean }) {
    const current = await this.prisma.professional.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Profesional no encontrado');
    await this.assertOwner(current.businessId, user);
    const name = body.name === undefined ? undefined : String(body.name).trim();
    if (name === '') throw new BadRequestException('Indica el nombre del profesional');
    if (body.agendaControl === true && !current.agendaControl) {
      await this.claimAgendaSlot(current.businessId, id);
    }
    return this.prisma.professional.update({
      where: { id },
      data: {
        name,
        phone: body.phone === undefined ? undefined : String(body.phone).trim() || null,
        isActive: body.isActive,
        agendaControl: body.agendaControl,
      },
    });
  }

  async removeProfessional(id: number, user: AuthUser) {
    const current = await this.prisma.professional.findUnique({ where: { id }, include: { agenda: true } });
    if (!current) throw new NotFoundException('Profesional no encontrado');
    await this.assertOwner(current.businessId, user);
    if (current.agenda) {
      const citas = await this.prisma.appointment.count({ where: { agendaId: current.agenda.id, status: { not: AppointmentStatus.ANULADA } } });
      if (citas) throw new BadRequestException('Este profesional tiene citas vigentes');
    }
    await this.prisma.professional.delete({ where: { id } });
    return { ok: true };
  }

  async save(businessId: number, dto: UpdateAgendaDto, user: AuthUser) {
    await this.assertProfessional(businessId, user);
    const opens = this.toMinutes(dto.opensAt);
    const closes = this.toMinutes(dto.closesAt);
    if (closes <= opens) {
      throw new BadRequestException('La hora de cierre debe ser posterior a la de apertura');
    }
    const data = {
      slotMinutes: dto.slotMinutes,
      opensAt: dto.opensAt,
      closesAt: dto.closesAt,
      openDays: dto.openDays,
      notifyClient: dto.notifyClient,
      notifyProfessional: dto.notifyProfessional,
      requiresPayment: dto.requiresPayment,
    };
    const current = await this.prisma.agenda.findFirst({ where: { businessId }, orderBy: { id: 'asc' } });
    const agenda = current
      ? await this.prisma.agenda.update({ where: { id: current.id }, data, include: { services: { orderBy: { name: 'asc' } } } })
      : await this.prisma.agenda.create({ data: { businessId, ...data }, include: { services: { orderBy: { name: 'asc' } } } });
    return {
      ...this.mapAgenda(agenda),
      turns: this.turnStarts(dto.opensAt, dto.closesAt, dto.slotMinutes),
    };
  }

  async createService(businessId: number, dto: CreateAgendaServiceDto, user: AuthUser, professionalId?: number) {
    const agenda = await this.requireAgenda(businessId, user, professionalId);
    const service = await this.prisma.agendaService.create({
      data: {
        agendaId: agenda.id,
        name: dto.name.trim(),
        durationMinutes: dto.durationMinutes,
        price: new Prisma.Decimal(dto.price),
      },
    });
    await this.publication.trackCreate(user, businessId, 'AGENDA_SERVICE', service.id, [
      { field: 'name', label: `Nombre del servicio · ${service.name}`, value: service.name },
    ]);
    const [decorated] = await this.publication.decorateServices(user, [this.mapService(service)]);
    return decorated;
  }

  async updateService(serviceId: number, dto: UpdateAgendaServiceDto, user: AuthUser) {
    const current = await this.prisma.agendaService.findUnique({
      where: { id: serviceId },
      include: { agenda: true },
    });
    if (!current) throw new NotFoundException('Servicio no encontrado');
    await this.assertProfessional(current.agenda.businessId, user);
    if (dto.durationMinutes !== undefined) this.assertDuration(dto.durationMinutes, current.agenda.slotMinutes);
    const nextName = dto.name?.trim();
    const blocked = nextName
      ? await this.publication.reviewFields(user, current.agenda.businessId, 'AGENDA_SERVICE', serviceId, [
          { field: 'name', label: `Nombre del servicio · ${nextName}`, before: current.name, after: nextName },
        ])
      : new Set<string>();
    const service = await this.prisma.agendaService.update({
      where: { id: serviceId },
      data: {
        name: blocked.has('name') ? undefined : nextName,
        durationMinutes: dto.durationMinutes,
        price: dto.price === undefined ? undefined : new Prisma.Decimal(dto.price),
        isActive: dto.isActive,
      },
    });
    const [decorated] = await this.publication.decorateServices(user, [this.mapService(service)]);
    return decorated;
  }

  async slots(businessId: number, date: string, serviceId: number, user: AuthUser, professionalId?: number) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      throw new BadRequestException('Indica la fecha de la cita');
    }
    const agenda = await this.requireAgenda(businessId, user, professionalId);
    const service = agenda.services.find((item) => item.id === serviceId && item.isActive);
    if (!service) throw new NotFoundException('Servicio no encontrado');
    const day = this.dayFor(agenda, date);
    if (!day) return [];
    const occupied = await this.occupied(agenda.id, date);
    const now = Date.now();
    return day.turns
      .filter((turn) => turn.active)
      .filter((turn) => {
        const startsAt = this.limaInstant(date, turn.startsAt);
        const endsAt = this.limaInstant(date, turn.endsAt);
        if (startsAt.getTime() <= now) return false;
        return !occupied.some((item) => item.startsAt < endsAt && item.endsAt > startsAt);
      })
      .map((turn) => ({ time: turn.startsAt, label: `${turn.startsAt} – ${turn.endsAt}` }));
  }

  async days(businessId: number, user: AuthUser, focus?: string, professionalId?: number) {
    if (focus && !/^\d{4}-\d{2}-\d{2}$/.test(focus)) {
      throw new BadRequestException('Indica una fecha válida');
    }
    const agenda = await this.requireAgenda(businessId, user, professionalId);
    let openDays = new Set<number>();
    try {
      const schedule = this.scheduleOf(agenda);
      openDays = new Set(schedule.openDays.split(',').filter(Boolean).map(Number));
    } catch {
      openDays = new Set();
    }
    const today = this.limaDate(new Date());
    const dates = new Set<string>();
    if (focus) {
      dates.add(focus);
    } else {
      for (let offset = 0; offset < 14; offset += 1) {
        const date = this.addDays(today, offset);
        if (openDays.has(this.weekday(date))) dates.add(date);
      }
    }
    const appointments = await this.prisma.appointment.findMany({
      where: { agendaId: agenda.id },
      include: { turnItems: { select: { startsAt: true } } },
      orderBy: { startsAt: 'asc' },
    });
    if (!focus) {
      for (const row of appointments) dates.add(this.limaDate(row.startsAt));
    }
    const sorted = [...dates].sort();
    if (!sorted.length) return [];
    const rangeStart = this.limaInstant(sorted[0], '00:00');
    const rangeEnd = new Date(this.limaInstant(sorted[sorted.length - 1], '00:00').getTime() + 24 * 60 * 60 * 1000);
    const occupied = await this.prisma.appointmentTurn.findMany({
      where: {
        appointment: { agendaId: agenda.id, status: { not: AppointmentStatus.ANULADA } },
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      select: { startsAt: true, endsAt: true },
    });
    return sorted.map((date) => {
      const dayStart = this.limaInstant(date, '00:00');
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const rows = appointments.filter((row) => this.limaDate(row.startsAt) === date);
      const active = rows.filter((row) => row.status !== AppointmentStatus.ANULADA);
      const booked = occupied.filter((item) => item.startsAt < dayEnd && item.endsAt > dayStart);
      return {
        date,
        label: this.limaDayLabel(this.limaInstant(date, '12:00')),
        isToday: date === today,
        appointments: active.length,
        cancelled: rows.length - active.length,
        bookedTurns: active.reduce((sum, row) => sum + Math.max(row.turnItems.length, 1), 0),
        freeTurns: this.freeOn(date, this.dayFor(agenda, date), booked),
      };
    });
  }

  async appointments(businessId: number, user: AuthUser, professionalId?: number) {
    const agenda = await this.requireAgenda(businessId, user, professionalId);
    const rows = await this.prisma.appointment.findMany({
      where: { agendaId: agenda.id },
      include: appointmentInclude,
      orderBy: { startsAt: 'desc' },
    });
    return rows.map((row) => this.mapAppointment(row));
  }

  async createAppointment(businessId: number, dto: CreateAppointmentDto, user: AuthUser) {
    const agenda = await this.requireAgenda(businessId, user, dto.professionalId);
    const day = this.dayFor(agenda, dto.date);
    const service = agenda.services.find((item) => item.id === dto.serviceId && item.isActive);
    if (!service) throw new NotFoundException('Servicio no encontrado');
    if (!(await this.publication.assertPublished('AGENDA_SERVICE', service.id))) {
      throw new BadRequestException('Pendiente de aprobación');
    }
    if (!day) throw new BadRequestException('Ese día no tiene horario configurado');
    const times = [...new Set(dto.times)].sort();
    const byStart = new Map(day.turns.map((turn) => [turn.startsAt, turn]));
    const ranges = times.map((time, index) => {
      const turn = byStart.get(time);
      if (!turn || !turn.active) throw new BadRequestException('Ese turno no está libre');
      if (index > 0 && this.toMinutes(time) - this.toMinutes(times[index - 1]) !== day.slotMinutes) {
        throw new BadRequestException('Los turnos de una cita deben ser consecutivos');
      }
      const startsAt = this.limaInstant(dto.date, time);
      const endsAt = this.limaInstant(dto.date, turn.endsAt);
      if (startsAt.getTime() <= Date.now()) throw new BadRequestException('Ese horario ya pasó');
      return { startsAt, endsAt };
    });
    const turns = ranges.length;
    const duration = turns * day.slotMinutes;
    const phone = this.phoneOrThrow(dto.clientPhone);
    const point = this.pickPoint(agenda.business.pointSales, dto.pointSaleId);
    const appointment = await this.prisma.$transaction(async (tx) => {
      for (const range of ranges) {
        const clash = await tx.appointmentTurn.findFirst({
          where: {
            appointment: { agendaId: agenda.id, status: { not: AppointmentStatus.ANULADA } },
            startsAt: { lt: range.endsAt },
            endsAt: { gt: range.startsAt },
          },
        });
        if (clash) throw new BadRequestException('Uno de los turnos ya está ocupado');
      }
      const created = await tx.appointment.create({
        data: {
          agendaId: agenda.id,
          serviceId: service.id,
          serviceName: service.name,
          durationMinutes: duration,
          turns,
          price: new Prisma.Decimal(service.price)
            .mul(duration)
            .div(service.durationMinutes)
            .toDecimalPlaces(2),
          clientUserId: null,
          clientName: dto.clientName.trim(),
          clientPhone: phone,
          clientAddress: dto.clientAddress.trim(),
          clientDni: dto.clientDni,
          pointSaleId: point?.id,
          professionalPhone: agenda.professional?.phone || point?.phone,
          notes: dto.notes?.trim() || null,
          startsAt: ranges[0].startsAt,
          endsAt: ranges[ranges.length - 1].endsAt,
          status: AppointmentStatus.PENDIENTE,
          turnItems: { create: ranges },
        },
      });
      await this.addNotices(tx, created.id, { ...agenda, notifyClient: dto.notifyClient !== false && agenda.notifyClient }, {
        status: AppointmentStatus.PENDIENTE,
        serviceName: service.name,
        clientName: dto.clientName.trim(),
        clientPhone: phone,
        professionalPhone: point?.phone,
        startsAt: ranges[0].startsAt,
        turns,
      });
      return tx.appointment.findUniqueOrThrow({
        where: { id: created.id },
        include: appointmentInclude,
      });
    });
    return this.mapAppointment(appointment);
  }

  async addPayment(appointmentId: number, dto: CreateAppointmentPaymentDto, user: AuthUser) {
    const current = await this.findOwned(appointmentId, user);
    if (current.status === AppointmentStatus.ANULADA) {
      throw new BadRequestException('No se puede registrar un pago en una cita anulada');
    }
    await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
        include: { payments: true },
      });
      const due = this.cents(fresh.price);
      const paid = fresh.payments.reduce((sum, payment) => sum + this.cents(payment.amount), 0);
      const next = this.cents(dto.amount);
      if (paid + next > due) {
        const remaining = Math.max(0, due - paid) / 100;
        throw new BadRequestException(
          remaining > 0
            ? `El pago supera el saldo del servicio. Puedes registrar hasta S/ ${remaining.toFixed(2)}`
            : 'Los pagos ya cubren el monto del servicio',
        );
      }
      await tx.appointmentPayment.create({
        data: {
          appointmentId,
          amount: new Prisma.Decimal(dto.amount),
          note: dto.note?.trim() || null,
        },
      });
    });
    return this.reload(appointmentId);
  }

  async confirm(appointmentId: number, user: AuthUser) {
    const current = await this.findOwned(appointmentId, user);
    if (current.status !== AppointmentStatus.PENDIENTE) {
      throw new BadRequestException('Solo se confirma una cita pendiente');
    }
    const due = this.cents(current.price);
    const paid = current.payments.reduce((sum, payment) => sum + this.cents(payment.amount), 0);
    if (current.agenda.requiresPayment && due > 0 && paid < due) {
      throw new BadRequestException('Registra el pago del servicio antes de confirmar la cita');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.CONFIRMADA },
      });
      await this.addNotices(tx, appointmentId, current.agenda, {
        ...current,
        status: AppointmentStatus.CONFIRMADA,
      });
    });
    return this.reload(appointmentId);
  }

  async cancel(appointmentId: number, user: AuthUser) {
    const current = await this.findOwned(appointmentId, user);
    if (current.status === AppointmentStatus.ANULADA) {
      throw new BadRequestException('La cita ya está anulada');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.ANULADA },
      });
      await this.addNotices(tx, appointmentId, current.agenda, {
        ...current,
        status: AppointmentStatus.ANULADA,
      });
    });
    return this.reload(appointmentId);
  }

  private async requireAgenda(businessId: number, user: AuthUser, professionalId?: number) {
    const business = await this.assertProfessional(businessId, user);
    const agenda = await this.prisma.agenda.findFirst({
      where: { businessId, ...(professionalId ? { professionalId } : {}) },
      include: {
        services: true,
        professional: true,
        days: { include: { turns: { orderBy: { startsAt: 'asc' } } } },
      },
      orderBy: { id: 'asc' },
    });
    if (!agenda) throw new BadRequestException('Registra primero un profesional para la agenda');
    if (agenda.professional && !agenda.professional.agendaControl) {
      throw new ForbiddenException('Tu plan no controla la agenda de este profesional');
    }
    if (!professionalId) {
      const count = await this.prisma.agenda.count({ where: { businessId } });
      if (count > 1) throw new BadRequestException('Elige el profesional');
    }
    return { ...agenda, business };
  }

  private async assertOwner(businessId: number, user: AuthUser) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { rubro: true },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (!business.rubro.allowsAgenda) {
      throw new ForbiddenException('Los profesionales se registran en el rubro de profesionales independientes');
    }
    if (user.userType !== UserType.ADMIN && business.userId !== user.id) {
      throw new ForbiddenException('No puedes modificar los profesionales de este negocio');
    }
    return business;
  }

  private async fillAgendaSlot(businessId: number, max: number) {
    if (max <= 0) return;
    const rows = await this.prisma.professional.findMany({ where: { businessId }, orderBy: { id: 'asc' } });
    const marked = rows.filter((row) => row.agendaControl);
    if (marked.length > max) {
      await this.prisma.professional.updateMany({
        where: { id: { in: marked.slice(max).map((row) => row.id) } },
        data: { agendaControl: false },
      });
    }
    if (!marked.length && rows[0]) {
      await this.prisma.professional.update({ where: { id: rows[0].id }, data: { agendaControl: true } });
    }
  }

  private async claimAgendaSlot(businessId: number, professionalId: number) {
    const max = await this.professionalLimit(businessId);
    if (max <= 0) throw new BadRequestException('Tu plan no incluye el control de agenda');
    const others = await this.prisma.professional.count({
      where: { businessId, agendaControl: true, id: { not: professionalId } },
    });
    if (others < max) return;
    if (max === 1) {
      await this.prisma.professional.updateMany({
        where: { businessId, id: { not: professionalId } },
        data: { agendaControl: false },
      });
      return;
    }
    throw new BadRequestException(`El plan anual controla la agenda de hasta ${max} profesionales`);
  }

  private async assertProfessional(businessId: number, user: AuthUser) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { rubro: true, pointSales: true },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (!business.rubro.allowsAgenda) {
      throw new ForbiddenException('La agenda solo aplica al rubro de profesionales independientes');
    }
    if (user.userType !== UserType.ADMIN && business.userId !== user.id) {
      throw new ForbiddenException('No puedes modificar esta agenda');
    }
    if (user.userType !== UserType.ADMIN && !(await this.isEnabled(user.id))) {
      throw new ForbiddenException('Tu plan no incluye el módulo Agenda');
    }
    return business;
  }

  private async isEnabled(userId: number) {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        planId: true,
        planCatalog: true,
        businesses: { where: { rubro: { allowsAgenda: true } }, select: { id: true }, take: 1 },
      },
    });
    if (!row?.businesses.length || !row.planCatalog) return false;
    return planFlags(row.planCatalog).agenda;
  }

  private async professionalLimit(businessId: number) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { user: { select: { planCatalog: true } } },
    });
    const plan = business?.user.planCatalog;
    if (!plan || !planFlags(plan).agenda) return 0;
    if (!/anual/i.test(plan.name)) return 1;
    const current = await this.prisma.appSetting.findUnique({ where: { id: 1 } });
    const max = current?.maxAgendaProfessionals ?? 3;
    return max > 0 ? max : 3;
  }

  private async findOwned(appointmentId: number, user: AuthUser) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { ...appointmentInclude, agenda: true },
    });
    if (!appointment) throw new NotFoundException('Cita no encontrada');
    await this.assertProfessional(appointment.agenda.businessId, user);
    return appointment;
  }

  private async reload(appointmentId: number) {
    const row = await this.prisma.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
      include: appointmentInclude,
    });
    return this.mapAppointment(row);
  }

  private phoneOrThrow(phone: string) {
    const digits = phone.replace(/\D/g, '');
    const tail = digits.startsWith('51') && digits.length > 9 ? digits.slice(2) : digits;
    if (tail.length < 9) {
      throw new BadRequestException('El celular del cliente debe tener 9 dígitos');
    }
    return phone.trim();
  }

  private turnStarts(opensAt: string, closesAt: string, slotMinutes: number) {
    const open = this.toMinutes(opensAt);
    const close = this.toMinutes(closesAt);
    const turns: string[] = [];
    for (let start = open; start + slotMinutes <= close; start += slotMinutes) {
      turns.push(this.fromMinutes(start));
    }
    return turns;
  }

  private pickPoint(points: { id: number; phone: string }[], pointSaleId?: number) {
    if (!points.length) return null;
    if (pointSaleId) {
      const point = points.find((item) => item.id === pointSaleId);
      if (!point) throw new BadRequestException('El punto de venta no pertenece al negocio');
      return point;
    }
    return points.find((item) => item.phone) || points[0];
  }

  private async occupied(agendaId: number, date: string) {
    const start = this.limaInstant(date, '00:00');
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return this.prisma.appointmentTurn.findMany({
      where: {
        appointment: {
          agendaId,
          status: { not: AppointmentStatus.ANULADA },
        },
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
      select: { startsAt: true, endsAt: true },
    });
  }

  private async addNotices(
    tx: Prisma.TransactionClient,
    appointmentId: number,
    agenda: { notifyClient: boolean; notifyProfessional: boolean },
    appointment: {
      status: AppointmentStatus;
      serviceName: string;
      clientName: string;
      clientPhone: string;
      professionalPhone?: string | null;
      startsAt: Date;
      turns?: number;
    },
  ) {
    const when = this.limaLabel(appointment.startsAt);
    const state = this.statusLabel(appointment.status).toLowerCase();
    const turnText = appointment.turns ? ` por ${appointment.turns} turno${appointment.turns === 1 ? '' : 's'}` : '';
    const rows: Prisma.AppointmentNoticeCreateManyInput[] = [];
    if (agenda.notifyClient) {
      const message = `Hola ${appointment.clientName}, tu cita de ${appointment.serviceName} para el ${when}${turnText} quedó ${state}.`;
      const whatsappUrl = this.whatsapp(appointment.clientPhone, message);
      if (whatsappUrl) {
        rows.push({
          appointmentId,
          target: AgendaNoticeTarget.CLIENTE,
          phone: appointment.clientPhone,
          message,
          whatsappUrl,
        });
      }
    }
    if (agenda.notifyProfessional && appointment.professionalPhone) {
      const message = `Cita de ${appointment.clientName} (${appointment.clientPhone}) por ${appointment.serviceName} el ${when}${turnText}. Estado: ${state}.`;
      const whatsappUrl = this.whatsapp(appointment.professionalPhone, message);
      if (whatsappUrl) {
        rows.push({
          appointmentId,
          target: AgendaNoticeTarget.PROFESIONAL,
          phone: appointment.professionalPhone,
          message,
          whatsappUrl,
        });
      }
    }
    if (rows.length) await tx.appointmentNotice.createMany({ data: rows });
  }

  async dayBoard(businessId: number, user: AuthUser, professionalId: number, date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new BadRequestException('Indica la fecha');
    const agenda = await this.requireAgenda(businessId, user, professionalId);
    const day = this.dayFor(agenda, date);
    const appointments = await this.prisma.appointment.findMany({
      where: { agendaId: agenda.id, status: { not: AppointmentStatus.ANULADA } },
      include: { turnItems: true },
    });
    const taken = new Map<string, { clientName: string; appointmentId: number }>();
    for (const row of appointments) {
      if (this.limaDate(row.startsAt) !== date) continue;
      const marks = row.turnItems.length ? row.turnItems : [{ startsAt: row.startsAt }];
      for (const turn of marks) taken.set(this.limaTime(turn.startsAt), { clientName: row.clientName, appointmentId: row.id });
    }
    const turns = (day?.turns || []).map((turn) => {
      const booked = taken.get(turn.startsAt);
      return {
        startsAt: turn.startsAt,
        endsAt: turn.endsAt,
        active: turn.active,
        estado: !turn.active ? 'inactivo' : booked ? 'separado' : 'libre',
        clientName: booked?.clientName || null,
        appointmentId: booked?.appointmentId || null,
      };
    });
    return {
      configured: Boolean(day),
      source: day?.onDate ? 'fecha' : 'semana',
      opensAt: day?.opensAt || '',
      closesAt: day?.closesAt || '',
      slotMinutes: day?.slotMinutes || agenda.slotMinutes,
      weekday: this.weekday(date),
      turns,
    };
  }

  async loadSchedule(businessId: number, user: AuthUser, professionalId: number, mode: string, weekday?: number, date?: string) {
    const agenda = await this.requireAgenda(businessId, user, professionalId);
    if (mode === 'fecha' && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const day = this.weekday(date);
      const exact = agenda.days.find((row) => row.onDate && row.onDate.toISOString().slice(0, 10) === date);
      const weekly = agenda.days.find((row) => row.weekday === day && !row.onDate);
      return { ...this.schedulePayload(exact || weekly, Boolean(exact)), weekday: day, habitual: Boolean(weekly) };
    }
    const weekly = agenda.days.find((row) => row.weekday === weekday && !row.onDate);
    return { ...this.schedulePayload(weekly, false), weekday: weekday ?? null, habitual: Boolean(weekly) };
  }

  private schedulePayload(
    day: { opensAt: string; closesAt: string; slotMinutes: number; turns: { startsAt: string; endsAt: string; active: boolean }[] } | undefined,
    customized: boolean,
  ) {
    if (!day) return { configured: false, customized, opensAt: '09:00', closesAt: '18:00', slotMinutes: 30, turns: [] as { startsAt: string; endsAt: string; active: boolean }[] };
    return {
      configured: true,
      customized,
      opensAt: day.opensAt,
      closesAt: day.closesAt,
      slotMinutes: day.slotMinutes,
      turns: day.turns.map((turn) => ({ startsAt: turn.startsAt, endsAt: turn.endsAt, active: turn.active })),
    };
  }

  async saveSchedule(businessId: number, user: AuthUser, body: Record<string, unknown>) {
    const professionalId = Number(body.professionalId);
    const agenda = await this.requireAgenda(businessId, user, professionalId);
    const opensAt = String(body.opensAt || '');
    const closesAt = String(body.closesAt || '');
    const slotMinutes = Number(body.slotMinutes);
    if (![15, 30, 60].includes(slotMinutes)) throw new BadRequestException('La duración del turno es 15, 30 o 60 minutos');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(opensAt) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(closesAt)) {
      throw new BadRequestException('Indica la hora de inicio y de fin');
    }
    if (this.toMinutes(closesAt) <= this.toMinutes(opensAt)) {
      throw new BadRequestException('La hora de cierre debe ser posterior a la de apertura');
    }
    const incoming = Array.isArray(body.turns) ? body.turns : [];
    const turns = (incoming.length ? incoming : this.generated(opensAt, closesAt, slotMinutes)).map((turn) => {
      const row = turn as { startsAt?: string; endsAt?: string; active?: boolean };
      return {
        startsAt: String(row.startsAt),
        endsAt: String(row.endsAt),
        active: row.active !== false,
      };
    });
    const mode = body.mode === 'fecha' ? 'fecha' : 'semana';
    await this.prisma.$transaction(async (tx) => {
      if (mode === 'fecha') {
        const date = String(body.date || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Indica la fecha');
        const weekday = this.weekday(date);
        const habitual = await tx.agendaDay.findFirst({ where: { agendaId: agenda.id, weekday, onDate: null } });
        if (!habitual) {
          throw new BadRequestException(`Configura primero el horario de todos los ${this.weekdayName(weekday)}`);
        }
        await tx.agendaDay.deleteMany({ where: { agendaId: agenda.id, onDate: new Date(`${date}T00:00:00.000Z`) } });
        await tx.agendaDay.create({
          data: {
            agendaId: agenda.id,
            onDate: new Date(`${date}T00:00:00.000Z`),
            opensAt,
            closesAt,
            slotMinutes,
            turns: { create: turns },
          },
        });
      } else {
        const weekday = Number(body.weekday);
        if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new BadRequestException('Elige el día de la semana');
        await tx.agendaDay.deleteMany({ where: { agendaId: agenda.id, weekday, onDate: null } });
        await tx.agendaDay.create({
          data: { agendaId: agenda.id, weekday, opensAt, closesAt, slotMinutes, turns: { create: turns } },
        });
      }
    });
    return this.dayBoard(businessId, user, professionalId, mode === 'fecha' ? String(body.date) : this.nextDateForWeekday(Number(body.weekday)));
  }

  private dayFor(
    agenda: {
      opensAt: string | null;
      closesAt: string | null;
      openDays: string | null;
      slotMinutes: number;
      days: { weekday: number | null; onDate: Date | null; opensAt: string; closesAt: string; slotMinutes: number; turns: { startsAt: string; endsAt: string; active: boolean }[] }[];
    },
    date: string,
  ) {
    const exact = agenda.days.find((day) => day.onDate && day.onDate.toISOString().slice(0, 10) === date);
    if (exact) return exact;
    const weekday = this.weekday(date);
    const weekly = agenda.days.find((day) => day.weekday === weekday && !day.onDate);
    if (weekly) return weekly;
    if (!agenda.opensAt || !agenda.closesAt || !agenda.openDays) return null;
    if (!agenda.openDays.split(',').map(Number).includes(weekday)) return null;
    return {
      weekday,
      onDate: null as Date | null,
      opensAt: agenda.opensAt,
      closesAt: agenda.closesAt,
      slotMinutes: agenda.slotMinutes,
      turns: this.generated(agenda.opensAt, agenda.closesAt, agenda.slotMinutes),
    };
  }

  private generated(opensAt: string, closesAt: string, slotMinutes: number) {
    const open = this.toMinutes(opensAt);
    const close = this.toMinutes(closesAt);
    const turns: { startsAt: string; endsAt: string; active: boolean }[] = [];
    for (let start = open; start + slotMinutes <= close; start += slotMinutes) {
      turns.push({ startsAt: this.fromMinutes(start), endsAt: this.fromMinutes(start + slotMinutes), active: true });
    }
    return turns;
  }

  private nextDateForWeekday(weekday: number) {
    const today = this.limaDate(new Date());
    for (let offset = 0; offset < 7; offset += 1) {
      const date = this.addDays(today, offset);
      if (this.weekday(date) === weekday) return date;
    }
    return today;
  }

  private freeOn(date: string, day: { slotMinutes: number; turns: { startsAt: string; endsAt: string; active: boolean }[] } | null, occupied: { startsAt: Date; endsAt: Date }[]) {
    if (!day) return 0;
    const now = Date.now();
    return day.turns.filter((turn) => {
      if (!turn.active) return false;
      const startsAt = this.limaInstant(date, turn.startsAt);
      const endsAt = this.limaInstant(date, turn.endsAt);
      if (startsAt.getTime() <= now) return false;
      return !occupied.some((item) => item.startsAt < endsAt && item.endsAt > startsAt);
    }).length;
  }

  private scheduleOf(agenda: { opensAt: string | null; closesAt: string | null; openDays: string | null; days?: { weekday: number | null; onDate: Date | null }[] }) {
    const weekly = (agenda.days || []).filter((day) => day.weekday != null && !day.onDate);
    if (weekly.length) {
      return {
        opensAt: agenda.opensAt || '09:00',
        closesAt: agenda.closesAt || '18:00',
        openDays: weekly.map((day) => day.weekday).join(','),
      };
    }
    if (!agenda.opensAt || !agenda.closesAt || !agenda.openDays) {
      throw new BadRequestException('Registra los días y el horario de la agenda');
    }
    return { opensAt: agenda.opensAt, closesAt: agenda.closesAt, openDays: agenda.openDays };
  }

  private assertDuration(durationMinutes: number, slotMinutes: number) {
    if (durationMinutes < slotMinutes || durationMinutes % slotMinutes !== 0) {
      throw new BadRequestException(`La duración debe ser un múltiplo del turno de ${slotMinutes} minutos`);
    }
  }

  private mapAgenda(agenda: {
    id: number;
    slotMinutes: number;
    opensAt: string | null;
    closesAt: string | null;
    openDays: string | null;
    notifyClient: boolean;
    notifyProfessional: boolean;
    requiresPayment: boolean;
    services?: { id: number; name: string; durationMinutes: number; price: Prisma.Decimal; isActive: boolean }[];
  }) {
    return {
      id: agenda.id,
      slotMinutes: agenda.slotMinutes,
      opensAt: agenda.opensAt,
      closesAt: agenda.closesAt,
      openDays: agenda.openDays,
      notifyClient: agenda.notifyClient,
      notifyProfessional: agenda.notifyProfessional,
      requiresPayment: agenda.requiresPayment,
      services: agenda.services?.map((service) => this.mapService(service)) || [],
    };
  }

  private mapService(service: {
    id: number;
    name: string;
    durationMinutes: number;
    price: Prisma.Decimal;
    isActive: boolean;
  }) {
    return {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: Number(service.price),
      isActive: service.isActive,
    };
  }

  private mapAppointment(row: AppointmentRow) {
    const paid = row.payments.reduce((sum, payment) => sum + this.cents(payment.amount), 0) / 100;
    return {
      id: row.id,
      serviceName: row.serviceName,
      durationMinutes: row.durationMinutes,
      turns: row.turns,
      turnLabels: row.turnItems.length
        ? row.turnItems.map((item) => `${this.limaTime(item.startsAt)} – ${this.limaTime(item.endsAt)}`)
        : [`${this.limaTime(row.startsAt)} – ${this.limaTime(row.endsAt)}`],
      untilTime: this.limaTime(row.endsAt),
      price: Number(row.price),
      paid,
      clientUserId: row.clientUserId,
      clientName: row.clientName,
      clientPhone: row.clientPhone,
      clientAddress: row.clientAddress,
      clientDni: row.clientDni,
      professionalPhone: row.professionalPhone,
      date: this.limaDate(row.startsAt),
      whenLabel: this.limaLabel(row.startsAt),
      status: row.status,
      statusLabel: this.statusLabel(row.status),
      payments: row.payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        note: payment.note,
        paidAt: payment.paidAt,
      })),
      notices: row.notices.map((notice) => ({
        id: notice.id,
        target: notice.target,
        phone: notice.phone,
        message: notice.message,
        whatsappUrl: notice.whatsappUrl,
      })),
    };
  }

  private statusLabel(status: AppointmentStatus) {
    if (status === AppointmentStatus.CONFIRMADA) return 'Confirmada';
    if (status === AppointmentStatus.ANULADA) return 'Anulada';
    return 'Pendiente de confirmación';
  }

  private whatsapp(phone: string, text: string) {
    const base = toWhatsAppUrl(phone);
    return base ? `${base}&text=${encodeURIComponent(text)}` : null;
  }

  private cents(value: Prisma.Decimal | number) {
    return Math.round(Number(value) * 100);
  }

  private toMinutes(value: string) {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  }

  private fromMinutes(value: number) {
    const hour = Math.floor(value / 60);
    const minute = value % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  private weekday(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }

  private weekdayName(weekday: number) {
    return ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'][weekday] || 'días';
  }

  private limaInstant(date: string, time: string) {
    return new Date(`${date}T${time}:00-05:00`);
  }

  private limaTime(value: Date) {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: LIMA,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(value);
  }

  private countFree(
    date: string,
    schedule: { opensAt: string; closesAt: string; openDays: string },
    slotMinutes: number,
    occupied: { startsAt: Date; endsAt: Date }[],
  ) {
    const openDays = schedule.openDays.split(',').map(Number);
    if (!openDays.includes(this.weekday(date))) return 0;
    const open = this.toMinutes(schedule.opensAt);
    const close = this.toMinutes(schedule.closesAt);
    const now = Date.now();
    let free = 0;
    for (let start = open; start + slotMinutes <= close; start += slotMinutes) {
      const startsAt = this.limaInstant(date, this.fromMinutes(start));
      const endsAt = new Date(startsAt.getTime() + slotMinutes * 60000);
      if (startsAt.getTime() <= now) continue;
      if (occupied.some((item) => item.startsAt < endsAt && item.endsAt > startsAt)) continue;
      free += 1;
    }
    return free;
  }

  private limaDate(value: Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: LIMA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  }

  private addDays(date: string, days: number) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
  }

  private limaDayLabel(value: Date) {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: LIMA,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(value);
  }

  private limaLabel(value: Date) {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: LIMA,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(value);
  }
}
