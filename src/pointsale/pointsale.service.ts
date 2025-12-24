import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePointSaleDto } from './dto/create-pointsale.dto';
import { UpdatePointSaleDto } from './dto/update-pointsale.dto';
import { hash } from 'bcrypt';
import { Prisma } from '@prisma/client';

@Injectable()
export class PointsaleService {
  constructor(private prisma: PrismaService) {}

  async create(createPointSaleDto: CreatePointSaleDto) {
    return this.prisma.pointSale.create({
      data: createPointSaleDto,
      include: {
        business: true,
        colaborador: true,
        district: {
          include: {
            province: {
              include: {
                department: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll() {
    try {
      console.log('🔍 Buscando todos los puntos de venta con relaciones...');
      const pointSales = await this.prisma.pointSale.findMany({
        include: {
          business: {
            select: {
              id: true,
              name: true,
              comercialname: true,
              numdoc: true,
            },
          },
          colaborador: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
              phone: true,
            },
          },
        },
      });
      
      console.log(`✅ ${pointSales.length} puntos de venta encontrados, cargando ubicaciones...`);
      
      // Cargar distritos por separado para evitar errores de relaciones rotas
      const pointSalesWithLocation = await Promise.all(
        pointSales.map(async (ps) => {
          if (ps.districtId) {
            try {
              const district = await this.prisma.district.findUnique({
                where: { id: ps.districtId },
                include: {
                  province: {
                    include: {
                      department: true,
                    },
                  },
                },
              });
              return { ...ps, district: district || null };
            } catch (districtError: any) {
              console.warn(`⚠️ Error al cargar distrito ${ps.districtId} para punto de venta ${ps.id}:`, districtError.message);
              return { ...ps, district: null };
            }
          }
          return { ...ps, district: null };
        })
      );
      
      console.log(`✅ ${pointSalesWithLocation.length} puntos de venta procesados exitosamente`);
      return pointSalesWithLocation;
    } catch (error: any) {
      console.error('❌ Error en findAll de pointsale:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      if (error.stack) {
        console.error('❌ Error stack:', error.stack);
      }
      
      // Si hay un error, intentar sin relaciones anidadas
      try {
        console.log('🔄 Intentando fallback: cargar puntos de venta sin relaciones anidadas...');
        const pointSales = await this.prisma.pointSale.findMany({
          include: {
            business: {
              select: {
                id: true,
                name: true,
                comercialname: true,
                numdoc: true,
              },
            },
            colaborador: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                phone: true,
              },
            },
          },
        });
        console.log(`✅ Fallback exitoso: ${pointSales.length} puntos de venta encontrados (sin ubicación)`);
        // Agregar district: null a todos para mantener la estructura
        return pointSales.map(ps => ({ ...ps, district: null }));
      } catch (fallbackError: any) {
        console.error('❌ Error en fallback de findAll:', fallbackError);
        console.error('❌ Fallback error message:', fallbackError.message);
        // Último recurso: devolver array vacío en lugar de lanzar error
        console.warn('⚠️ Devolviendo array vacío debido a errores persistentes');
        return [];
      }
    }
  }

  async findOne(id: number) {
    return this.prisma.pointSale.findUnique({
      where: { id },
      include: {
        business: true,
        colaborador: true,
        district: {
          include: {
            province: {
              include: {
                department: true,
              },
            },
          },
        },
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
        district: {
          include: {
            province: {
              include: {
                department: true,
              },
            },
          },
        },
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
        district: {
          include: {
            province: {
              include: {
                department: true,
              },
            },
          },
        },
      },
    });
  }

  async createAndAssignCollaborator(pointSaleId: number, collaboratorData: any) {
    try {
      console.log('🔄 Creando colaborador para punto de venta:', pointSaleId);
      console.log('📦 Datos recibidos:', { ...collaboratorData, password: '***' });
      
      // Validar que el punto de venta existe
      const pointSale = await this.prisma.pointSale.findUnique({
        where: { id: pointSaleId },
      });
      
      if (!pointSale) {
        throw new NotFoundException(`Punto de venta con ID ${pointSaleId} no encontrado`);
      }
      
      // Limpiar datos: eliminar campos que no pertenecen al modelo User
      const { confirmPassword, ...userData } = collaboratorData;
      
      // Validar que el email no esté duplicado
      const existingUserByEmail = await this.prisma.user.findUnique({
        where: { email: userData.email },
      });
      
      if (existingUserByEmail) {
        throw new ConflictException(`El email ${userData.email} ya está registrado`);
      }
      
      // Validar que el DNI no esté duplicado (si se proporciona)
      if (userData.dni) {
        const existingUserByDni = await this.prisma.user.findFirst({
          where: { dni: userData.dni },
        });
        
        if (existingUserByDni) {
          throw new ConflictException(`El DNI ${userData.dni} ya está registrado`);
        }
      }
      
      // Validar que la contraseña esté presente
      if (!userData.password || userData.password.length < 8) {
        throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
      }
      
      // Usar transacción para asegurar que ambas operaciones se completen
      return await this.prisma.$transaction(async (prisma) => {
        // Hashear la contraseña antes de crear el usuario
        const passwordHashed = await hash(userData.password, 10);
        
        // 1. Crear el usuario colaborador con la contraseña hasheada
        const newUser = await prisma.user.create({
          data: {
            firstname: userData.firstname,
            lastname: userData.lastname,
            phone: userData.phone || null,
            dni: userData.dni || null,
            email: userData.email,
            password: passwordHashed,
            role: 'COLABORADOR',
            isActive: true,
            isEmailVerified: true, // Los colaboradores se crean con email verificado
          },
        });
        
        console.log('✅ Usuario colaborador creado:', newUser.id);

        // 2. Asignar el colaborador al punto de venta
        const updatedPointSale = await prisma.pointSale.update({
          where: { id: pointSaleId },
          data: { userId: newUser.id },
          include: {
            business: true,
            colaborador: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                phone: true,
              },
            },
            district: {
              include: {
                province: {
                  include: {
                    department: true,
                  },
                },
              },
            },
          },
        });
        
        console.log('✅ Colaborador asignado al punto de venta:', pointSaleId);

        return {
          user: newUser,
          pointSale: updatedPointSale,
        };
      });
    } catch (error: any) {
      console.error('❌ Error en createAndAssignCollaborator:', error);
      console.error('❌ Error message:', error.message);
      if (error.stack) {
        console.error('❌ Error stack:', error.stack);
      }
      
      // Si ya es una excepción de NestJS, re-lanzarla
      if (error instanceof BadRequestException || 
          error instanceof ConflictException || 
          error instanceof NotFoundException) {
        throw error;
      }
      
      // Si es un error de Prisma, manejarlo
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[] || [];
          if (target.includes('email')) {
            throw new ConflictException(`El email ya está registrado`);
          } else if (target.includes('dni')) {
            throw new ConflictException(`El DNI ya está registrado`);
          }
        }
      }
      
      // Para otros errores, lanzar BadRequestException
      throw new BadRequestException(`Error al crear el colaborador: ${error.message || 'Error desconocido'}`);
    }
  }
}
