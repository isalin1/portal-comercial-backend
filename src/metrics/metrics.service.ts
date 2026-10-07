import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EngagementKind, Prisma } from '@prisma/client';
import { calendarDateInLima } from 'src/common/directory.utils';
import { PrismaService } from 'src/prisma/prisma.service';
import { TrackEngagementDto } from './dto/track-engagement.dto';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(dto: TrackEngagementDto) {
    const businessId = Number(dto.businessId);
    if (!Number.isFinite(businessId) || businessId < 1) {
      throw new BadRequestException('Negocio inválido');
    }
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');

    const kind =
      dto.kind === 'WHATSAPP_CLICK' ? EngagementKind.WHATSAPP_CLICK : EngagementKind.BUSINESS_OPEN;

    await this.prisma.engagementEvent.create({
      data: {
        kind,
        businessId,
        occurredOn: calendarDateInLima(),
      },
    });

    return { ok: true };
  }

  async whatsappOrdersDay(date?: string, zoneIdRaw?: string) {
    const occurredOn =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(`${date}T00:00:00.000Z`)
        : calendarDateInLima();
    const dayKey = occurredOn.toISOString().slice(0, 10);
    const zoneId = Number(zoneIdRaw);
    if (!Number.isFinite(zoneId) || zoneId < 1) {
      throw new BadRequestException('Selecciona una zona');
    }

    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
      include: { district: { include: { province: { include: { department: true } } } } },
    });
    if (!zone) throw new NotFoundException('Zona no encontrada');

    const businesses = await this.prisma.business.findMany({
      where: { zoneId },
      select: {
        id: true,
        commercialName: true,
        commercialDescription: true,
        rubroId: true,
        categoryId: true,
        rubro: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { commercialName: 'asc' },
    });

    const businessIds = businesses.map((row) => row.id);
    const openCounts = new Map<number, number>();
    const waCounts = new Map<number, number>();
    const orderCounts = new Map<number, number>();

    if (businessIds.length) {
      const events = await this.prisma.engagementEvent.groupBy({
        by: ['businessId', 'kind'],
        where: { occurredOn, businessId: { in: businessIds } },
        _count: { _all: true },
      });
      for (const row of events) {
        const count = row._count._all;
        if (row.kind === EngagementKind.BUSINESS_OPEN) openCounts.set(row.businessId, count);
        else waCounts.set(row.businessId, count);
      }

      const orders = await this.prisma.customerOrder.findMany({
        where: { businessId: { in: businessIds } },
        select: { id: true, businessId: true, createdAt: true },
      });
      for (const order of orders) {
        if (this.limaDay(order.createdAt) !== dayKey) continue;
        orderCounts.set(order.businessId, (orderCounts.get(order.businessId) || 0) + 1);
      }
    }

    type BizRow = {
      id: number;
      commercialName: string;
      commercialDescription: string;
      businessClicks: number;
      whatsappClicks: number;
      orders: number;
    };

    type CatRow = {
      id: number;
      name: string;
      businessCount: number;
      businessClicks: number;
      whatsappClicks: number;
      orders: number;
      businesses: BizRow[];
    };

    type RubroRow = {
      id: number;
      name: string;
      businessCount: number;
      businessClicks: number;
      whatsappClicks: number;
      orders: number;
      categories: CatRow[];
    };

    const rubroMap = new Map<number, RubroRow>();

    for (const business of businesses) {
      const rubroId = business.rubroId;
      const rubroName = business.rubro?.name || 'Sin rubro';
      let rubro = rubroMap.get(rubroId);
      if (!rubro) {
        rubro = {
          id: rubroId,
          name: rubroName,
          businessCount: 0,
          businessClicks: 0,
          whatsappClicks: 0,
          orders: 0,
          categories: [],
        };
        rubroMap.set(rubroId, rubro);
      }

      const categoryId = business.categoryId || 0;
      const categoryName = business.category?.name || 'Sin categoría';
      let category = rubro.categories.find((item) => item.id === categoryId);
      if (!category) {
        category = {
          id: categoryId,
          name: categoryName,
          businessCount: 0,
          businessClicks: 0,
          whatsappClicks: 0,
          orders: 0,
          businesses: [],
        };
        rubro.categories.push(category);
      }

      const biz: BizRow = {
        id: business.id,
        commercialName: business.commercialName,
        commercialDescription: business.commercialDescription || '',
        businessClicks: openCounts.get(business.id) || 0,
        whatsappClicks: waCounts.get(business.id) || 0,
        orders: orderCounts.get(business.id) || 0,
      };
      category.businesses.push(biz);
      category.businessCount += 1;
      category.businessClicks += biz.businessClicks;
      category.whatsappClicks += biz.whatsappClicks;
      category.orders += biz.orders;
      rubro.businessCount += 1;
      rubro.businessClicks += biz.businessClicks;
      rubro.whatsappClicks += biz.whatsappClicks;
      rubro.orders += biz.orders;
    }

    const rubros = [...rubroMap.values()]
      .map((rubro) => ({
        ...rubro,
        categories: rubro.categories
          .map((category) => ({
            ...category,
            businesses: [...category.businesses].sort(
              (a, b) =>
                b.orders - a.orders ||
                b.businessClicks - a.businessClicks ||
                a.commercialName.localeCompare(b.commercialName, 'es'),
            ),
          }))
          .sort(
            (a, b) =>
              b.orders - a.orders ||
              b.businessClicks - a.businessClicks ||
              a.name.localeCompare(b.name, 'es'),
          ),
      }))
      .sort(
        (a, b) =>
          b.orders - a.orders ||
          b.businessClicks - a.businessClicks ||
          a.name.localeCompare(b.name, 'es'),
      );

    const totals = {
      businessClicks: rubros.reduce((sum, row) => sum + row.businessClicks, 0),
      whatsappClicks: rubros.reduce((sum, row) => sum + row.whatsappClicks, 0),
      orders: rubros.reduce((sum, row) => sum + row.orders, 0),
      totalBusinesses: businesses.length,
      activeBusinesses: businesses.filter(
        (row) =>
          (openCounts.get(row.id) || 0) +
            (waCounts.get(row.id) || 0) +
            (orderCounts.get(row.id) || 0) >
          0,
      ).length,
    };

    return {
      date: dayKey,
      zone: {
        id: zone.id,
        name: zone.name,
        districtName: zone.district.name,
        provinceName: zone.district.province.name,
        departmentName: zone.district.province.department.name,
        label: `${zone.district.province.department.name} / ${zone.district.name} / ${zone.name}`,
      },
      totals,
      rubros,
    };
  }

  private limaDay(value: Date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(value);
  }
}
