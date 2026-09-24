import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocType, UserType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import { locksToOneCategory, toWhatsAppUrl } from 'src/common/directory.utils';

const businessInclude = {
  rubro: true,
  user: { include: { datUser: true } },
  pointSales: {
    include: {
      address: { include: { district: true } },
      items: { include: { descriptions: true, category: true } },
    },
  },
} as const;

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  private withWhatsApp<T extends { pointSales?: { phone: string }[] }>(
    business: T,
  ) {
    return {
      ...business,
      pointSales: business.pointSales?.map((point) => ({
        ...point,
        whatsappUrl: toWhatsAppUrl(point.phone),
      })),
    };
  }

  private assertCanEdit(user: AuthUser, ownerId: number) {
    if (user.userType === UserType.ADMIN) return;
    if (user.userType === UserType.EMPRESARIO && user.id === ownerId) return;
    throw new ForbiddenException('No puedes modificar este negocio');
  }

  async create(dto: CreateBusinessDto, user: AuthUser, imageUrl?: string) {
    if (user.userType !== UserType.EMPRESARIO) {
      throw new ForbiddenException('Solo un empresario puede registrar negocios');
    }
    const existing = await this.prisma.business.count({ where: { userId: user.id } });
    if (existing > 0) {
      throw new BadRequestException('Ya tienes un negocio registrado');
    }

    return this.withWhatsApp(
      await this.prisma.business.create({
        data: {
          legalName: dto.legalName,
          commercialName: dto.commercialName,
          numDoc: dto.numDoc,
          docType: dto.docType,
          rubroId: Number(dto.rubroId),
          userId: user.id,
          imageUrl,
        },
        include: businessInclude,
      }),
    );
  }

  async findAll(user: AuthUser) {
    const where =
      user.userType === UserType.ADMIN
        ? {}
        : { userId: user.id };

    const businesses = await this.prisma.business.findMany({
      where,
      include: businessInclude,
      orderBy: { commercialName: 'asc' },
    });
    return businesses.map((item) => this.withWhatsApp(item));
  }

  async findOne(id: number, user?: AuthUser) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: businessInclude,
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (user) this.assertCanEdit(user, business.userId);
    return this.withWhatsApp(business);
  }

  async chooseCategory(id: number, categoryId: number, user: AuthUser) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: { rubro: true },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    this.assertCanEdit(user, business.userId);
    if (!locksToOneCategory(business.rubro.name)) {
      throw new BadRequestException('Este rubro no elige una sola categoría');
    }
    if (business.categoryId) {
      throw new BadRequestException('La categoría del negocio ya fue elegida');
    }
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || category.rubroId !== business.rubroId) {
      throw new BadRequestException('Esa categoría no pertenece al rubro del negocio');
    }
    return this.withWhatsApp(
      await this.prisma.business.update({
        where: { id },
        data: { categoryId },
        include: businessInclude,
      }),
    );
  }

  async update(
    id: number,
    dto: UpdateBusinessDto,
    user: AuthUser,
    imageUrl?: string,
  ) {
    const current = await this.prisma.business.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Negocio no encontrado');
    this.assertCanEdit(user, current.userId);

    return this.withWhatsApp(
      await this.prisma.business.update({
        where: { id },
        data: {
          ...dto,
          rubroId: dto.rubroId !== undefined ? Number(dto.rubroId) : undefined,
          docType: dto.docType as DocType | undefined,
          imageUrl,
        },
        include: businessInclude,
      }),
    );
  }
}
