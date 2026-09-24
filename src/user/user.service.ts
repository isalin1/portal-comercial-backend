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
import { isVigente, nextVigenciaEnd } from 'src/common/directory.utils';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';

const userInclude = {
  datUser: true,
  businesses: true,
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
      userType === UserType.EMPRESARIO ? false : (isActive ?? true);

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
    await this.findWithPassword(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
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

  async extendVigencia(id: number, days: number) {
    const current = await this.findWithPassword(id);
    const vigenciaEnd = nextVigenciaEnd(current.vigenciaEnd, days);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        vigenciaEnd,
        isActive: isVigente(vigenciaEnd),
      },
      include: userInclude,
    });
    return this.omitPassword(user);
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
