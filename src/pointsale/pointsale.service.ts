import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePointSaleDto } from './dto/create-pointsale.dto';
import { UpdatePointSaleDto } from './dto/update-pointsale.dto';
import { hash } from 'bcrypt';

@Injectable()
export class PointsaleService {
  constructor(private prisma: PrismaService) {}

  async create(createPointSaleDto: CreatePointSaleDto) {
    return this.prisma.pointSale.create({
      data: createPointSaleDto,
      include: {
        business: true,
        colaborador: true,
      },
    });
  }

  async findAll() {
    return this.prisma.pointSale.findMany({
      include: {
        business: true,
        colaborador: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.pointSale.findUnique({
      where: { id },
      include: {
        business: true,
        colaborador: true,
      },
    });
  }

  async update(id: number, updatePointSaleDto: UpdatePointSaleDto) {
    return this.prisma.pointSale.update({
      where: { id },
      data: updatePointSaleDto,
      include: {
        business: true,
        colaborador: true,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.pointSale.delete({
      where: { id },
    });
  }

  async assignCollaborator(pointSaleId: number, userId: number) {
    return this.prisma.pointSale.update({
      where: { id: pointSaleId },
      data: { userId },
      include: {
        business: true,
        colaborador: true,
      },
    });
  }

  async createAndAssignCollaborator(pointSaleId: number, collaboratorData: any) {
    // Usar transacción para asegurar que ambas operaciones se completen
    return this.prisma.$transaction(async (prisma) => {
      // Hashear la contraseña antes de crear el usuario
      const passwordHashed = await hash(collaboratorData.password, 10);
      
      // 1. Crear el usuario colaborador con la contraseña hasheada
      const newUser = await prisma.user.create({
        data: {
          ...collaboratorData,
          password: passwordHashed, // Sobrescribir con la contraseña hasheada
          role: 'COLABORADOR',
          isActive: true,
          isEmailVerified: true, // Los colaboradores se crean con email verificado
        },
      });

      // 2. Asignar el colaborador al punto de venta
      const updatedPointSale = await prisma.pointSale.update({
        where: { id: pointSaleId },
        data: { userId: newUser.id },
        include: {
          business: true,
          colaborador: true,
        },
      });

      return {
        user: newUser,
        pointSale: updatedPointSale,
      };
    });
  }
}
