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
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { CreateAgendaServiceDto } from './dto/create-agenda-service.dto';
import { UpdateAgendaServiceDto } from './dto/update-agenda-service.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateAppointmentPaymentDto } from './dto/create-appointment-payment.dto';

const LIMA = 'America/Lima';

const appointmentInclude = {
  payments: { orderBy: { paidAt: 'asc' as const } },
  notices: { orderBy: { createdAt: 'asc' as const } },
  turnItems: { orderBy: { startsAt: 'asc' as const } },
} satisfies Prisma.AppointmentInclude;

type AppointmentRow = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  async accessMe(user: AuthUser) {
    if (user.userType === UserType.ADMIN) return { enabled: true };
    return { enabled: await this.isEnabled(user.id) };
  }

  async listAccess() {
    const rows = await this.prisma.user.findMany({
      where: {
        datUser: { userType: UserType.EMPRESARIO },
        businesses: { some: { rubro: { name: { contains: 'profesional', mode: 'insensitive' } } } },
      },
      include: {
        datUser: true,
        businesses: {
          where: { rubro: { name: { contains: 'profesional', mode: 'insensitive' } } },
          select: { commercialName: true },
        },
      },
      orderBy: { datUser: { lastName: 'asc' } },
    });
    return rows.map((row) => this.mapAccess(row));
  }

  async setAccess(userId: number, enabled: boolean) {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { datUser: true },
    });
    if (!row || row.datUser.userType !== UserType.EMPRESARIO) {
      throw new BadRequestException('El módulo se activa solo para un empresario');
    }
    const professional = await this.prisma.business.count({
      where: { userId, rubro: { name: { contains: 'profesional', mode: 'insensitive' } } },
    });
    if (!professional) {
      throw new BadRequestException('La agenda solo aplica al rubro de profesionales independientes');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { agendaEnabled: enabled },
      include: {
        datUser: true,
        businesses: {
          where: { rubro: { name: { contains: 'profesional', mode: 'insensitive' } } },
          select: { commercialName: true },
        },
      },
    });
    return this.mapAccess(updated);
  }

  private mapAccess(row: {
    id: number;
    agendaEnabled: boolean;
    datUser: { firstName: string; lastName: string; email: string; phone: string };
    businesses: { commercialName: string }[];
  }) {
    return {
      id: row.id,
      firstName: row.datUser.firstName,
      lastName: row.datUser.lastName,
      email: row.datUser.email,
      phone: row.datUser.phone,
      businessName: row.businesses.map((business) => business.commercialName).join(', ') || 'Sin negocio',
      enabled: row.agendaEnabled,
    };
  }

  async businesses(user: AuthUser) {
    if (user.userType !== UserType.ADMIN && !(await this.isEnabled(user.id))) return [];
    return this.prisma.business.findMany({
      where: {
        ...(user.userType === UserType.ADMIN ? {} : { userId: user.id }),
        rubro: { name: { contains: 'Profesional', mode: 'insensitive' } },
      },
      select: { id: true, commercialName: true },
      orderBy: { commercialName: 'asc' },
    });
  }

  async get(businessId: number, user: AuthUser) {
    const business = await this.assertProfessional(businessId, user);
    const agenda = await this.prisma.agenda.findUnique({
      where: { businessId },
      include: { services: { orderBy: { name: 'asc' } } },
    });
    return {
      business: {
        id: business.id,
        commercialName: business.commercialName,
        pointSales: business.pointSales.map((point) => ({
          id: point.id,
          name: point.name,
          phone: point.phone,
        })),
      },
      agenda: agenda ? this.mapAgenda(agenda) : null,
    };
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
    const agenda = await this.prisma.agenda.upsert({
      where: { businessId },
      create: { businessId, ...data },
      update: data,
      include: { services: { orderBy: { name: 'asc' } } },
    });
    return {
      ...this.mapAgenda(agenda),
      turns: this.turnStarts(dto.opensAt, dto.closesAt, dto.slotMinutes),
    };
  }

  async createService(businessId: number, dto: CreateAgendaServiceDto, user: AuthUser) {
    const agenda = await this.requireAgenda(businessId, user);
    this.assertDuration(dto.durationMinutes, agenda.slotMinutes);
    const service = await this.prisma.agendaService.create({
      data: {
        agendaId: agenda.id,
        name: dto.name.trim(),
        durationMinutes: dto.durationMinutes,
        price: new Prisma.Decimal(dto.price),
      },
    });
    return this.mapService(service);
  }

  async updateService(serviceId: number, dto: UpdateAgendaServiceDto, user: AuthUser) {
    const current = await this.prisma.agendaService.findUnique({
      where: { id: serviceId },
      include: { agenda: true },
    });
    if (!current) throw new NotFoundException('Servicio no encontrado');
    await this.assertProfessional(current.agenda.businessId, user);
    const duration = dto.durationMinutes ?? current.durationMinutes;
    this.assertDuration(duration, current.agenda.slotMinutes);
    const service = await this.prisma.agendaService.update({
      where: { id: serviceId },
      data: {
        name: dto.name?.trim(),
        durationMinutes: dto.durationMinutes,
        price: dto.price === undefined ? undefined : new Prisma.Decimal(dto.price),
        isActive: dto.isActive,
      },
    });
    return this.mapService(service);
  }

  async slots(businessId: number, date: string, serviceId: number, user: AuthUser) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      throw new BadRequestException('Indica la fecha de la cita');
    }
    const agenda = await this.requireAgenda(businessId, user);
    const service = agenda.services.find((item) => item.id === serviceId && item.isActive);
    if (!service) throw new NotFoundException('Servicio no encontrado');
    const schedule = this.scheduleOf(agenda);
    const days = schedule.openDays.split(',').map(Number);
    if (!days.includes(this.weekday(date))) return [];
    const occupied = await this.occupied(agenda.id, date);
    const open = this.toMinutes(schedule.opensAt);
    const close = this.toMinutes(schedule.closesAt);
    const now = Date.now();
    const slots: { time: string; label: string }[] = [];
    for (let start = open; start + agenda.slotMinutes <= close; start += agenda.slotMinutes) {
      const time = this.fromMinutes(start);
      const startsAt = this.limaInstant(date, time);
      const endsAt = new Date(startsAt.getTime() + agenda.slotMinutes * 60000);
      if (startsAt.getTime() <= now) continue;
      if (occupied.some((item) => item.startsAt < endsAt && item.endsAt > startsAt)) continue;
      slots.push({ time, label: `${time} – ${this.fromMinutes(start + agenda.slotMinutes)}` });
    }
    return slots;
  }

  async days(businessId: number, user: AuthUser, focus?: string) {
    if (focus && !/^\d{4}-\d{2}-\d{2}$/.test(focus)) {
      throw new BadRequestException('Indica una fecha válida');
    }
    const agenda = await this.requireAgenda(businessId, user);
    const schedule = this.scheduleOf(agenda);
    const openDays = new Set(schedule.openDays.split(',').filter(Boolean).map(Number));
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
        freeTurns: this.countFree(date, schedule, agenda.slotMinutes, booked),
      };
    });
  }

  async appointments(businessId: number, user: AuthUser) {
    const agenda = await this.requireAgenda(businessId, user);
    const rows = await this.prisma.appointment.findMany({
      where: { agendaId: agenda.id },
      include: appointmentInclude,
      orderBy: { startsAt: 'desc' },
    });
    return rows.map((row) => this.mapAppointment(row));
  }

  async createAppointment(businessId: number, dto: CreateAppointmentDto, user: AuthUser) {
    const agenda = await this.requireAgenda(businessId, user);
    const schedule = this.scheduleOf(agenda);
    const service = agenda.services.find((item) => item.id === dto.serviceId && item.isActive);
    if (!service) throw new NotFoundException('Servicio no encontrado');
    const days = schedule.openDays.split(',').map(Number);
    if (!days.includes(this.weekday(dto.date))) {
      throw new BadRequestException('La agenda no atiende ese día');
    }
    const times = [...new Set(dto.times)].sort();
    const openMinute = this.toMinutes(schedule.opensAt);
    const closeMinute = this.toMinutes(schedule.closesAt);
    const ranges = times.map((time) => {
      const startMinute = this.toMinutes(time);
      if (startMinute < openMinute || (startMinute - openMinute) % agenda.slotMinutes !== 0) {
        throw new BadRequestException('Ese horario no corresponde a un turno de la agenda');
      }
      if (startMinute + agenda.slotMinutes > closeMinute) {
        throw new BadRequestException('Ese turno no cabe en la atención del día');
      }
      const startsAt = this.limaInstant(dto.date, time);
      const endsAt = new Date(startsAt.getTime() + agenda.slotMinutes * 60000);
      if (startsAt.getTime() <= Date.now()) {
        throw new BadRequestException('Ese horario ya pasó');
      }
      return { startsAt, endsAt };
    });
    const turns = ranges.length;
    const duration = turns * agenda.slotMinutes;
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
          professionalPhone: point?.phone,
          startsAt: ranges[0].startsAt,
          endsAt: ranges[ranges.length - 1].endsAt,
          status: AppointmentStatus.PENDIENTE,
          turnItems: { create: ranges },
        },
      });
      await this.addNotices(tx, created.id, agenda, {
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

  private async requireAgenda(businessId: number, user: AuthUser) {
    const business = await this.assertProfessional(businessId, user);
    const agenda = await this.prisma.agenda.findUnique({
      where: { businessId },
      include: { services: true },
    });
    if (!agenda) throw new BadRequestException('Registra primero el horario de la agenda');
    return { ...agenda, business };
  }

  private async assertProfessional(businessId: number, user: AuthUser) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { rubro: true, pointSales: true },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (!/profesional/i.test(business.rubro.name)) {
      throw new ForbiddenException('La agenda solo aplica al rubro de profesionales independientes');
    }
    if (user.userType !== UserType.ADMIN && business.userId !== user.id) {
      throw new ForbiddenException('No puedes modificar esta agenda');
    }
    if (user.userType !== UserType.ADMIN && !(await this.isEnabled(user.id))) {
      throw new ForbiddenException('La agenda no está activa para tu cuenta');
    }
    return business;
  }

  private async isEnabled(userId: number) {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { agendaEnabled: true },
    });
    return Boolean(row?.agendaEnabled);
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

  private scheduleOf(agenda: { opensAt: string | null; closesAt: string | null; openDays: string | null }) {
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
