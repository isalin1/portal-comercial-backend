import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

const zoneInclude = {
  district: { include: { province: { include: { department: true } } } },
} as const;

@Injectable()
export class ZoneService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const zones = await this.prisma.zone.findMany({
      include: { ...zoneInclude, _count: { select: { businesses: true } } },
      orderBy: { name: 'asc' },
    });
    return zones.map(({ _count, ...zone }) => ({ ...zone, businessCount: _count.businesses }));
  }

  async create(dto: CreateZoneDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Escribe el nombre de la zona');
    const districtId = Number(dto.districtId);
    const district = await this.prisma.district.findUnique({ where: { id: districtId } });
    if (!district) throw new BadRequestException('Ese distrito no está registrado');
    const already = await this.prisma.zone.count();
    try {
      const zone = await this.prisma.zone.create({
        data: { name, districtId },
        include: zoneInclude,
      });
      let assignedBusinesses = 0;
      if (already === 0) {
        const assigned = await this.prisma.business.updateMany({
          where: { zoneId: null },
          data: { zoneId: zone.id },
        });
        assignedBusinesses = assigned.count;
      }
      return { ...zone, assignedBusinesses };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Esa zona ya está registrada en este distrito');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateZoneDto) {
    const current = await this.findOne(id);
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Escribe el nombre de la zona');
    const districtId = dto.districtId !== undefined ? Number(dto.districtId) : current.districtId;
    if (dto.districtId !== undefined) {
      const district = await this.prisma.district.findUnique({ where: { id: districtId } });
      if (!district) throw new BadRequestException('Ese distrito no está registrado');
    }
    try {
      const zone = await this.prisma.zone.update({
        where: { id },
        data: { name, districtId },
        include: zoneInclude,
      });
      if (districtId !== current.districtId) await this.syncPointDistricts(id, districtId);
      return zone;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Esa zona ya está registrada en este distrito');
      }
      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    const businesses = await this.prisma.business.count({ where: { zoneId: id } });
    if (businesses) {
      throw new BadRequestException('No se puede eliminar la zona porque tiene negocios registrados');
    }
    const markets = await this.prisma.market.count({ where: { zoneId: id } });
    if (markets) {
      throw new BadRequestException('No se puede eliminar la zona porque tiene mercados registrados');
    }
    return this.prisma.zone.delete({ where: { id } });
  }

  private async findOne(id: number) {
    const zone = await this.prisma.zone.findUnique({ where: { id }, include: zoneInclude });
    if (!zone) throw new NotFoundException('Zona no encontrada');
    return zone;
  }

  private async syncPointDistricts(zoneId: number, districtId: number) {
    const points = await this.prisma.pointSale.findMany({
      where: { business: { zoneId } },
      select: { addressId: true },
    });
    if (!points.length) return;
    await this.prisma.address.updateMany({
      where: { id: { in: points.map((point) => point.addressId) } },
      data: { districtId },
    });
  }
}
