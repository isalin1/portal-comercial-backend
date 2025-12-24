import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinesDto } from './dto/create-busines.dto';
import { UpdateBusinesDto } from './dto/update-busines.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BusinesService {
  constructor(private prisma: PrismaService) {}

  async create(createBusinesDto: CreateBusinesDto) {
    try {
      console.log('🔄 Creando negocio:', { ...createBusinesDto, phone: createBusinesDto.phone || 'no proporcionado' });
      
      // Crear el negocio
      const business = await this.prisma.busines.create({
        data: createBusinesDto,
      });

      console.log('✅ Negocio creado exitosamente:', business.id);

      // Buscar o crear el plan "Sin Plan"
      let sinPlan = await this.prisma.plan.findFirst({
        where: {
          tipo: 'sin_plan_tipo',
          nombrePeriodo: 'sin_plan_periodo',
        },
      });

      console.log('🔍 Plan "Sin Plan" encontrado:', sinPlan ? sinPlan.id : 'no existe');

      // Si no existe el plan "Sin Plan", crearlo
      if (!sinPlan) {
        try {
          console.log('📝 Creando plan "Sin Plan"...');
          sinPlan = await this.prisma.plan.create({
            data: {
              tipo: 'sin_plan_tipo',
              nombrePeriodo: 'sin_plan_periodo',
              diasPeriodo: 0,
              costo: null,
            },
          });
          console.log('✅ Plan "Sin Plan" creado:', sinPlan.id);
        } catch (planError: any) {
          console.error('❌ Error al crear plan "Sin Plan":', planError);
          // Si falla la creación del plan, intentar buscarlo de nuevo (podría haber sido creado por otro proceso)
          sinPlan = await this.prisma.plan.findFirst({
            where: {
              tipo: 'sin_plan_tipo',
              nombrePeriodo: 'sin_plan_periodo',
            },
          });
          if (!sinPlan) {
            console.error('❌ No se pudo crear ni encontrar el plan "Sin Plan"');
            throw new BadRequestException('No se pudo crear el plan inicial para el negocio');
          }
          console.log('✅ Plan "Sin Plan" encontrado después del error:', sinPlan.id);
        }
      }

      // Crear el business plan con estado INACTIVO
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      try {
        console.log('📝 Creando business plan con estado INACTIVO...');
        const businessPlan = await this.prisma.businessPlan.create({
          data: {
            businesId: business.id,
            planId: sinPlan.id,
            fechaInicio: today,
            fechaFin: today,
            estado: 'INACTIVO',
            fechaPago: null,
          },
        });
        console.log('✅ Business plan creado exitosamente:', businessPlan.id);
      } catch (planError: any) {
        // Si falla la creación del business plan, loguear el error completo
        console.error('❌ Error al crear business plan inicial:', planError);
        console.error('❌ Error code:', planError.code);
        console.error('❌ Error message:', planError.message);
        console.error('❌ Error meta:', planError.meta);
        
        // Si es un error de constraint único, podría ser que ya existe un plan para este negocio
        if (planError.code === 'P2002') {
          console.log('⚠️ Ya existe un business plan para este negocio, continuando...');
          // No lanzar error, el negocio ya fue creado
        } else {
          // Para otros errores, lanzar excepción
          throw new BadRequestException(`Error al crear el plan inicial: ${planError.message || 'Error desconocido'}`);
        }
      }

      return business;
    } catch (error: any) {
      console.error('❌ Error completo al crear negocio:', error);
      console.error('❌ Error stack:', error.stack);
      
      // Manejar errores de Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('❌ Prisma error code:', error.code);
        console.error('❌ Prisma error meta:', error.meta);
        
        if (error.code === 'P2002') {
          // Unique constraint violation
          const target = error.meta?.target as string[] || [];
          if (target.includes('numdoc')) {
            throw new ConflictException(`El número de documento "${createBusinesDto.numdoc}" ya está registrado`);
          } else if (target.includes('phone')) {
            throw new ConflictException(`El teléfono "${createBusinesDto.phone}" ya está registrado`);
          } else {
            throw new ConflictException('Los datos ingresados ya están registrados. Por favor, verifica que el número de documento y teléfono sean únicos');
          }
        } else if (error.code === 'P2003') {
          throw new BadRequestException('Error de referencia: El usuario especificado no existe');
        }
      }
      
      // Si ya es una excepción de NestJS, re-lanzarla
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      
      // Para otros errores, lanzar una excepción genérica con el mensaje
      throw new BadRequestException(`Error al crear el negocio: ${error.message || 'Error desconocido'}`);
    }
  }

  async findAll() {
    try {
      console.log('🔍 Buscando todos los negocios con relaciones...');
      const businesses = await this.prisma.busines.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
              phone: true,
              dni: true,
              role: true,
            },
          },
          pointsales: {
            select: {
              id: true,
              name: true,
              address: true,
              phonenumber: true,
              businesId: true,
              districtId: true,
            },
          },
        },
      });
      console.log(`✅ ${businesses.length} negocios encontrados`);
      return businesses;
    } catch (error: any) {
      console.error('❌ Error en findAll de busines:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      if (error.stack) {
        console.error('❌ Error stack:', error.stack);
      }
      
      // Si hay un error con las relaciones, intentar sin incluir relaciones problemáticas
      try {
        console.log('🔄 Intentando fallback: cargar negocios sin relaciones...');
        const businesses = await this.prisma.busines.findMany();
        console.log(`✅ Fallback exitoso: ${businesses.length} negocios encontrados (sin relaciones)`);
        return businesses;
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
