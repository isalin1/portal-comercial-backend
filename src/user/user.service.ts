import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserType } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { addCalendarDays, calendarDateInLima, isVigente, nextVigenciaEnd } from 'src/common/directory.utils';
import { comparePlans } from 'src/common/plan-features';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';

const userInclude = {
  datUser: true,
  businesses: { include: { rubro: true, category: { select: { id: true, name: true } } } },
  planCatalog: true,
  pendingPlan: true,
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private omitPassword<T extends { password?: string }>(user: T) {
    const { password: _password, ...rest } = user;
    return rest;
  }

  async create(createUserDto: CreateUserDto) {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      userType = UserType.CLIENTE,
      isActive,
    } = createUserDto;

    const resolvedActive =
      userType === UserType.EMPRESARIO ? Boolean(isActive) : (isActive ?? true);

    const existing = await this.prisma.datUser.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('el email esta en uso');
    }

    const passwordHash = password.startsWith('$2')
      ? password
      : await bcrypt.hash(password, 10);

    const datUser = await this.prisma.datUser.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        userType,
        user: {
          create: {
            password: passwordHash,
            isActive: resolvedActive,
            ...(createUserDto.plan === 'free' ? { plan: 'FREE' } : {}),
          },
        },
      },
      include: {
        user: {
          include: userInclude,
        },
      },
    });

    if (!datUser.user) {
      throw new ConflictException('No se pudo crear el usuario');
    }

    if (createUserDto.plan === 'free') {
      const libre = await this.prisma.plan.findFirst({ where: { name: 'Libre' } });
      const setting = await this.prisma.appSetting.findUnique({ where: { id: 1 } });
      const days = libre?.days || setting?.freePlanDays || 30;
      const vigenciaStart = calendarDateInLima();
      const vigenciaEnd = addCalendarDays(vigenciaStart, days);
      const user = await this.prisma.user.update({
        where: { id: datUser.user.id },
        data: { plan: 'FREE', planId: libre?.id, vigenciaStart, vigenciaEnd, vigenciaDays: days, isActive: true },
        include: userInclude,
      });
      return this.omitPassword(user);
    }

    return this.omitPassword(datUser.user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: userInclude,
    });
    return users.map((user) => this.omitPassword(user));
  }

  async findOne(id: number, actor?: AuthUser) {
    this.assertCanRead(actor, id);
    return this.omitPassword(await this.findWithPassword(id));
  }

  private assertCanRead(actor: AuthUser | undefined, id: number) {
    if (!actor || actor.userType === UserType.ADMIN || actor.id === id) return;
    throw new ForbiddenException('No puedes ver este usuario');
  }

  async findWithPassword(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return user;
  }

  async findByEmailOrNull(email: string) {
    const datUser = await this.prisma.datUser.findUnique({
      where: { email },
      include: {
        user: {
          include: userInclude,
        },
      },
    });

    return datUser?.user ?? null;
  }

  async findOneByEmail(email: string) {
    const user = await this.findByEmailOrNull(email);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto, actor?: AuthUser) {
    const current = await this.findWithPassword(id);
    const previousPhone = current.datUser.phone;
    const isAdmin = actor?.userType === UserType.ADMIN;
    if (actor && !isAdmin && actor.id !== id) {
      throw new ForbiddenException('No puedes editar este usuario');
    }

    const {
      email,
      firstName,
      lastName,
      phone,
      password,
      userType,
      isActive,
    } = updateUserDto;

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...(isAdmin && isActive !== undefined && { isActive }),
          ...(password && {
            password: password.startsWith('$2')
              ? password
              : await bcrypt.hash(password, 10),
          }),
          datUser: {
            update: {
              ...(email && { email }),
              ...(firstName && { firstName }),
              ...(lastName && { lastName }),
              ...(phone && { phone }),
              ...(isAdmin && userType && { userType }),
            },
          },
        },
        include: userInclude,
      });
      if (phone && phone !== previousPhone) {
        await this.prisma.pointSale.updateMany({
          where: { business: { userId: id }, phone: previousPhone },
          data: { phone },
        });
      }
      return this.omitPassword(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ese correo ya está registrado');
      }
      throw error;
    }
  }

  async updateStatus(id: number, dto: UpdateUserStatusDto) {
    const current = await this.findWithPassword(id);
    if (!dto.isActive) {
      const user = await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
        include: userInclude,
      });
      return this.omitPassword(user);
    }

    const onFreePlan = current.plan === 'FREE' || current.planCatalog?.name === 'Libre';
    const expired = !current.vigenciaEnd || !isVigente(current.vigenciaEnd);
    if (current.datUser.userType === UserType.EMPRESARIO && (onFreePlan || expired)) {
      const libre = await this.prisma.plan.findFirst({ where: { name: 'Libre' } });
      const setting = await this.prisma.appSetting.findUnique({ where: { id: 1 } });
      const days = libre?.days || setting?.freePlanDays || 30;
      const vigenciaStart = calendarDateInLima();
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          isActive: true,
          plan: 'FREE',
          planId: libre?.id,
          vigenciaStart,
          vigenciaEnd: addCalendarDays(vigenciaStart, days),
          vigenciaDays: days,
        },
        include: userInclude,
      });
      return this.omitPassword(user);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      include: userInclude,
    });
    return this.omitPassword(user);
  }

  async updateRole(id: number, dto: UpdateUserRoleDto) {
    const user = await this.findWithPassword(id);

    await this.prisma.datUser.update({
      where: { id: user.datUserId },
      data: { userType: dto.userType },
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    const user = await this.findWithPassword(id);
    await this.prisma.datUser.delete({
      where: { id: user.datUserId },
    });
    return { id };
  }

  async findEmpresarios() {
    const users = await this.prisma.user.findMany({
      where: { datUser: { userType: UserType.EMPRESARIO } },
      include: userInclude,
      orderBy: { id: 'desc' },
    });
    return users.map((user) => this.omitPassword(user));
  }

  private paymentData(userId: number, chosen: { id: number; days: number; price: Prisma.Decimal; name: string; commercialName: string }) {
    return {
      userId,
      planId: chosen.id,
      days: chosen.days,
      amount: chosen.price,
      planName: chosen.name,
      commercialName: chosen.commercialName,
      paidOn: calendarDateInLima(),
    };
  }

  async extendVigencia(id: number, planId: number) {
    const current = await this.findWithPassword(id);
    const chosen = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!chosen) throw new NotFoundException('Ese plan no está registrado');
    if (chosen.name === 'Libre') throw new ConflictException('El plan Free no se registra como pago');
    const days = chosen.days;
    const vigente = Boolean(current.vigenciaEnd && isVigente(current.vigenciaEnd));
    const change = vigente && current.planCatalog ? comparePlans(current.planCatalog, chosen) : 'asignado';
    const payment = this.paymentData(id, chosen);

    if (change === 'inferior') {
      const [user] = await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id },
          data: { pendingPlanId: chosen.id },
          include: userInclude,
        }),
        this.prisma.planPayment.create({ data: payment }),
      ]);
      return { ...this.omitPassword(user), planChange: 'inferior' as const };
    }

    const today = calendarDateInLima();
    const extendCurrent = vigente;
    const vigenciaStart = extendCurrent ? current.vigenciaStart ?? today : today;
    const vigenciaEnd = extendCurrent ? nextVigenciaEnd(current.vigenciaEnd, days) : addCalendarDays(today, days);
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          vigenciaStart,
          vigenciaEnd,
          vigenciaDays: days,
          plan: null,
          planId: chosen.id,
          pendingPlanId: null,
          isActive: isVigente(vigenciaEnd),
        },
        include: userInclude,
      }),
      this.prisma.planPayment.create({ data: payment }),
    ]);
    return { ...this.omitPassword(user), planChange: change };
  }

  async findPlanPayments(date?: string) {
    const paidOn = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(`${date}T00:00:00.000Z`)
      : calendarDateInLima();
    const rows = await this.prisma.planPayment.findMany({
      where: { paidOn },
      include: { user: { include: { datUser: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      firstName: row.user.datUser.firstName,
      lastName: row.user.datUser.lastName,
      days: row.days,
      amount: row.amount,
      planName: row.planName,
      commercialName: row.commercialName,
      paidOn: row.paidOn,
    }));
  }

  async findClients() {
    const users = await this.prisma.user.findMany({
      where: {
        datUser: { userType: UserType.CLIENTE },
      },
      include: userInclude,
    });
    return users.map((user) => this.omitPassword(user));
  }
}
