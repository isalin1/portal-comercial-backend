import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocType, Prisma, UserType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import { locksToOneCategory, toWhatsAppUrl } from 'src/common/directory.utils';
import { PublicationService } from 'src/publication/publication.service';

const businessInclude = {
  rubro: true,
  category: true,
  market: true,
  zone: { include: { district: { include: { province: { include: { department: true } } } } } },
  user: { include: { datUser: true, planCatalog: { select: { name: true, agenda: true } } } },
  professionals: {
    orderBy: { name: 'asc' },
    select: { id: true, name: true, phone: true, agendaControl: true, isActive: true },
  },
  pointSales: {
    include: {
      address: { include: { district: true } },
      items: { include: { descriptions: { include: { unit: true } }, category: true } },
    },
  },
} as const;

@Injectable()
export class BusinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publication: PublicationService,
  ) {}

  private async resolveCategory(rubroId: number, categoryId?: number | null) {
    const categories = await this.prisma.category.findMany({ where: { rubroId }, select: { id: true } });
    if (!categories.length) return null;
    const id = Number(categoryId);
    if (!id || !categories.some((category) => category.id === id)) {
      throw new BadRequestException('Elige una categoría de ese rubro');
    }
    return id;
  }

  private async resolveZone(zoneId?: number | null) {
    const zones = await this.prisma.zone.count();
    if (!zones) return null;
    const id = Number(zoneId);
    if (!id) throw new BadRequestException('Elige la zona del negocio');
    const zone = await this.prisma.zone.findUnique({ where: { id } });
    if (!zone) throw new BadRequestException('Esa zona no está registrada');
    return zone.id;
  }

  private async syncPointDistrict(businessId: number, zoneId: number) {
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId }, select: { districtId: true } });
    if (!zone) return;
    const points = await this.prisma.pointSale.findMany({
      where: { businessId },
      select: { addressId: true },
    });
    if (!points.length) return;
    await this.prisma.address.updateMany({
      where: { id: { in: points.map((point) => point.addressId) } },
      data: { districtId: zone.districtId },
    });
  }

  private async resolveMarket(marketId?: number | null, zoneId?: number | null) {
    if (marketId === undefined) return undefined;
    const id = Number(marketId);
    if (!id) return null;
    const market = await this.prisma.market.findUnique({ where: { id } });
    if (!market) throw new BadRequestException('Ese mercado no está registrado');
    if (!zoneId || market.zoneId !== zoneId) {
      throw new BadRequestException('Ese mercado no pertenece a la zona elegida');
    }
    return id;
  }

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

  private description(value: string) {
    const text = value.trim();
    if (!text) throw new BadRequestException('La descripción comercial es obligatoria');
    if (text.length > 50) throw new BadRequestException('La descripción comercial admite como máximo 50 caracteres');
    return text;
  }

  private assertDocument(docType?: string, numDoc?: string) {
    if (docType !== DocType.DNI && docType !== DocType.RUC) {
      throw new BadRequestException('El tipo de documento es obligatorio');
    }
    const digits = (numDoc || '').trim();
    if (!digits) throw new BadRequestException('El número de documento es obligatorio');
    if (docType === DocType.DNI && !/^\d{8}$/.test(digits)) {
      throw new BadRequestException('El DNI debe tener 8 dígitos');
    }
    if (docType === DocType.RUC && !/^\d{11}$/.test(digits)) {
      throw new BadRequestException('El RUC debe tener 11 dígitos');
    }
  }

  async create(dto: CreateBusinessDto, user: AuthUser, imageUrl?: string) {
    if (user.userType !== UserType.EMPRESARIO) {
      throw new ForbiddenException('Solo un empresario puede registrar negocios');
    }
    const existing = await this.prisma.business.count({ where: { userId: user.id } });
    if (existing > 0) {
      throw new BadRequestException('Ya tienes un negocio registrado');
    }
    this.assertDocument(dto.docType, dto.numDoc);
    const rubroId = Number(dto.rubroId);
    const categoryId = await this.resolveCategory(rubroId, dto.categoryId);
    const zoneId = await this.resolveZone(dto.zoneId);
    const marketId = await this.resolveMarket(dto.marketId ?? null, zoneId);

    const commercialDescription = this.description(dto.commercialDescription);
    try {
      const created = await this.prisma.business.create({
        data: {
          legalName: dto.legalName,
          commercialName: dto.commercialName,
          commercialDescription,
          numDoc: dto.numDoc.trim(),
          docType: dto.docType,
          rubroId,
          categoryId,
          marketId,
          zoneId,
          userId: user.id,
          imageUrl,
        },
        include: businessInclude,
      });
      await this.publication.trackCreate(user, created.id, 'BUSINESS', created.id, [
        { field: 'legalName', label: 'Razón social', value: created.legalName },
        { field: 'commercialName', label: 'Nombre comercial', value: created.commercialName },
        { field: 'commercialDescription', label: 'Descripción comercial', value: created.commercialDescription },
        { field: 'imageUrl', label: 'Foto del negocio', value: created.imageUrl },
      ]);
      return this.publication.decorateBusiness(user, this.withWhatsApp(created));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Ese número de documento ya está registrado');
      }
      throw error;
    }
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
    return this.publication.decorateBusinesses(user, businesses.map((item) => this.withWhatsApp(item)));
  }

  async findOne(id: number, user?: AuthUser) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: businessInclude,
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (user) this.assertCanEdit(user, business.userId);
    const mapped = this.withWhatsApp(business);
    return user ? this.publication.decorateBusiness(user, mapped) : mapped;
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
    return this.publication.decorateBusiness(user, this.withWhatsApp(
      await this.prisma.business.update({
        where: { id },
        data: { categoryId },
        include: businessInclude,
      }),
    ));
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
    this.assertDocument(dto.docType ?? current.docType, dto.numDoc ?? current.numDoc);
    const rubroId = dto.rubroId !== undefined ? Number(dto.rubroId) : current.rubroId;
    const categoryId = dto.categoryId !== undefined || dto.rubroId !== undefined
      ? await this.resolveCategory(rubroId, dto.categoryId ?? current.categoryId)
      : undefined;
    const zoneId = dto.zoneId !== undefined ? await this.resolveZone(dto.zoneId) : current.zoneId;
    const marketId = dto.marketId !== undefined || dto.zoneId !== undefined
      ? await this.resolveMarket(dto.marketId ?? current.marketId, zoneId)
      : undefined;

    const commercialDescription = dto.commercialDescription !== undefined
      ? this.description(dto.commercialDescription)
      : undefined;
    const blocked = await this.publication.reviewFields(user, id, 'BUSINESS', id, [
      ...(dto.legalName !== undefined ? [{ field: 'legalName', label: 'Razón social', before: current.legalName, after: dto.legalName }] : []),
      ...(dto.commercialName !== undefined ? [{ field: 'commercialName', label: 'Nombre comercial', before: current.commercialName, after: dto.commercialName }] : []),
      ...(commercialDescription !== undefined ? [{ field: 'commercialDescription', label: 'Descripción comercial', before: current.commercialDescription, after: commercialDescription }] : []),
      ...(imageUrl !== undefined ? [{ field: 'imageUrl', label: 'Foto del negocio', before: current.imageUrl, after: imageUrl }] : []),
    ]);
    try {
      const saved = this.withWhatsApp(
        await this.prisma.business.update({
          where: { id },
          data: {
            ...dto,
            legalName: blocked.has('legalName') ? undefined : dto.legalName,
            commercialName: blocked.has('commercialName') ? undefined : dto.commercialName,
            commercialDescription: blocked.has('commercialDescription') ? undefined : commercialDescription,
            numDoc: dto.numDoc?.trim(),
            rubroId: dto.rubroId !== undefined ? rubroId : undefined,
            categoryId,
            marketId,
            zoneId,
            docType: dto.docType as DocType | undefined,
            imageUrl: blocked.has('imageUrl') ? undefined : imageUrl,
          },
          include: businessInclude,
        }),
      );
      if (zoneId && zoneId !== current.zoneId) await this.syncPointDistrict(id, zoneId);
      return this.publication.decorateBusiness(user, saved);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Ese número de documento ya está registrado');
      }
      throw error;
    }
  }
}
