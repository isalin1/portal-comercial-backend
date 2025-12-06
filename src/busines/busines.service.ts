import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinesDto } from './dto/create-busines.dto';
import { UpdateBusinesDto } from './dto/update-busines.dto';

@Injectable()
export class BusinesService {
  constructor(private prisma: PrismaService) {}

  async create(createBusinesDto: CreateBusinesDto) {
    return this.prisma.busines.create({
      data: createBusinesDto,
    });
  }

  async findAll() {
    return this.prisma.busines.findMany({
      include: {
        user: true,
        pointsales: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.busines.findUnique({
      where: { id },
      include: {
        user: true,
        pointsales: true,
      },
    });
  }

  async update(id: number, updateBusinesDto: UpdateBusinesDto) {
    return this.prisma.busines.update({
      where: { id },
      data: updateBusinesDto,
    });
  }

  async remove(id: number) {
    return this.prisma.busines.delete({
      where: { id },
    });
  }
}
