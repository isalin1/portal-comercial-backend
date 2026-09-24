import { Injectable } from '@nestjs/common';
import { UserType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { isOpenNow, scheduleLabel, toWhatsAppUrl } from 'src/common/directory.utils';

const MAX_PUBLIC_ITEMS = 12

@Injectable()
export class DirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  findRubros() {
    return this.prisma.rubro.findMany({
      include: { categories: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  findCategories(rubroId?: number) {
    return this.prisma.category.findMany({
      where: rubroId ? { rubroId } : undefined,
      include: { rubro: true },
      orderBy: { name: 'asc' },
    });
  }

  async findBusinesses(categoryId?: number, rubroId?: number) {
    const itemFilter = {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(rubroId && !categoryId ? { category: { rubroId } } : {}),
    };

    const businesses = await this.prisma.business.findMany({
      where: {
        user: {
          isActive: true,
          datUser: { userType: UserType.EMPRESARIO },
        },
        pointSales: {
          some: {
            items: {
              some: itemFilter,
            },
          },
        },
      },
      include: {
        rubro: true,
        pointSales: {
          include: {
            address: { include: { district: true } },
            items: {
              where: itemFilter,
              include: { descriptions: true, category: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: { commercialName: 'asc' },
    });

    return businesses.map((business) => {
      let remaining = MAX_PUBLIC_ITEMS
      return {
        ...business,
        pointSales: business.pointSales
          .map((point) => {
            const items = point.items.slice(0, remaining)
            remaining -= items.length
            return {
              ...point,
              items,
              whatsappUrl: toWhatsAppUrl(point.phone),
              isOpen: isOpenNow(point.opensAt, point.closesAt, point.openDays),
              scheduleLabel: scheduleLabel(
                point.opensAt,
                point.closesAt,
                point.openDays,
              ),
            }
          })
          .filter((point) => point.items.length > 0),
      }
    })
  }

  async findBusiness(id: number) {
    const list = await this.findBusinesses();
    return list.find((item) => item.id === id) ?? null;
  }
}
