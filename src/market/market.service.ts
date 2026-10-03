import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { COMMERCIAL_GROUP_NAME } from 'src/common/markets';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMarketDto } from './dto/create-market.dto';
import { UpdateMarketDto } from './dto/update-market.dto';

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  async group() {
    return this.prisma.commercialGroup.upsert({
      where: { name: COMMERCIAL_GROUP_NAME },
      update: {},
      create: { name: COMMERCIAL_GROUP_NAME },
    });
  }

  async findAll() {
    const group = await this.group();
    return this.prisma.market.findMany({
      where: { groupId: group.id },
      include: { zone: { include: { district: { include: { province: true } } } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateMarketDto, imageUrl?: string) {
    const group = await this.group();
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Escribe el nombre del mercado');
    const zoneId = await this.resolveZone(dto.zoneId);
    try {
      return await this.prisma.market.create({
        data: { name, groupId: group.id, imageUrl, zoneId },
        include: { zone: { include: { district: { include: { province: true } } } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ese mercado ya está registrado en esta zona');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateMarketDto, imageUrl?: string) {
    await this.findOwned(id);
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Escribe el nombre del mercado');
    const zoneId = dto.zoneId !== undefined ? await this.resolveZone(dto.zoneId) : undefined;
    try {
      return await this.prisma.market.update({
        where: { id },
        data: {
          name,
          ...(zoneId !== undefined ? { zoneId } : {}),
          ...(imageUrl ? { imageUrl } : dto.removeImage ? { imageUrl: null } : {}),
        },
        include: { zone: { include: { district: { include: { province: true } } } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ese mercado ya está registrado en esta zona');
      }
      throw error;
    }
  }

  async remove(id: number) {
    await this.findOwned(id);
    return this.prisma.market.delete({ where: { id } });
  }

  private async resolveZone(zoneId?: number | null) {
    const id = Number(zoneId);
    if (!id) throw new BadRequestException('Elige la zona del mercado');
    const zone = await this.prisma.zone.findUnique({ where: { id } });
    if (!zone) throw new BadRequestException('Esa zona no está registrada');
    return zone.id;
  }

  private async findOwned(id: number) {
    const group = await this.group();
    const market = await this.prisma.market.findFirst({ where: { id, groupId: group.id } });
    if (!market) throw new NotFoundException('Mercado no encontrado');
    return market;
  }
}
