import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePointSaleDto } from './dto/create-point-sale.dto';
import { UpdatePointSaleDto } from './dto/update-point-sale.dto';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import { isOpenNow, scheduleLabel, toWhatsAppUrl } from 'src/common/directory.utils';

const include = {
  address: { include: { district: { include: { province: true } } } },
  business: true,
  items: true,
} as const;

@Injectable()
export class PointSalesService {
  constructor(private readonly prisma: PrismaService) {}

  private map(point: {
    phone: string;
    opensAt?: string | null;
    closesAt?: string | null;
    openDays?: string | null;
  }) {
    return {
      ...point,
      whatsappUrl: toWhatsAppUrl(point.phone),
      isOpen: isOpenNow(point.opensAt, point.closesAt, point.openDays),
      scheduleLabel: scheduleLabel(point.opensAt, point.closesAt, point.openDays),
    };
  }

  private async assertBusiness(user: AuthUser, businessId: number) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (user.userType === UserType.ADMIN) return business;
    if (user.userType === UserType.EMPRESARIO && business.userId === user.id) {
      return business;
    }
    throw new ForbiddenException('No puedes gestionar este punto de venta');
  }

  async create(dto: CreatePointSaleDto, user: AuthUser) {
    await this.assertBusiness(user, Number(dto.businessId));

    const address = await this.prisma.address.create({
      data: {
        districtId: Number(dto.districtId),
        street: dto.street,
        urbanZone: dto.urbanZone,
        reference: dto.reference,
      },
    });

    const point = await this.prisma.pointSale.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        businessId: Number(dto.businessId),
        addressId: address.id,
        opensAt: dto.opensAt || null,
        closesAt: dto.closesAt || null,
        openDays: dto.openDays || null,
      },
      include,
    });
    return this.map(point);
  }

  async findAll(user: AuthUser, businessId?: number) {
    const where: {
      businessId?: number;
      business?: { userId: number };
    } = {};
    if (businessId) where.businessId = businessId;
    if (user.userType === UserType.EMPRESARIO) {
      where.business = { userId: user.id };
    }

    const points = await this.prisma.pointSale.findMany({
      where,
      include,
      orderBy: { name: 'asc' },
    });
    return points.map((item) => this.map(item));
  }

  async findOne(id: number, user: AuthUser) {
    const point = await this.prisma.pointSale.findUnique({
      where: { id },
      include,
    });
    if (!point) throw new NotFoundException('Punto de venta no encontrado');
    await this.assertBusiness(user, point.businessId);
    return this.map(point);
  }

  async update(id: number, dto: UpdatePointSaleDto, user: AuthUser) {
    const current = await this.prisma.pointSale.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('Punto de venta no encontrado');
    await this.assertBusiness(user, current.businessId);

    if (dto.businessId) {
      await this.assertBusiness(user, Number(dto.businessId));
    }

    if (
      dto.street ||
      dto.districtId ||
      dto.urbanZone !== undefined ||
      dto.reference !== undefined
    ) {
      await this.prisma.address.update({
        where: { id: current.addressId },
        data: {
          street: dto.street,
          districtId: dto.districtId ? Number(dto.districtId) : undefined,
          urbanZone: dto.urbanZone,
          reference: dto.reference,
        },
      });
    }

    const point = await this.prisma.pointSale.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        businessId: dto.businessId ? Number(dto.businessId) : undefined,
        opensAt: dto.opensAt === undefined ? undefined : dto.opensAt || null,
        closesAt: dto.closesAt === undefined ? undefined : dto.closesAt || null,
        openDays: dto.openDays === undefined ? undefined : dto.openDays || null,
      },
      include,
    });
    return this.map(point);
  }
}
