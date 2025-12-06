import { BadRequestException, ConflictException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
//import { prisma } from 'src/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, Roles, StatusOrder } from '@prisma/client';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { BusinessPlansService } from '../business-plans/business-plans.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessPlansService: BusinessPlansService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email, ...data } = createUserDto;

    // validacion de email en uso o persona que ya tiene usuario
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }],
      },
    });

    if (existingUser) {
      throw new ConflictException('el email esta en uso');
    }

    // Nota: La contraseña ya viene hasheada desde auth.service.ts
    // No se debe hashear nuevamente aquí

    // Crear usuario
    const user = await this.prisma.user.create({
      data: {
        email,
        ...data,
      },
    });

    // TODO: Temporalmente deshabilitado hasta resolver problema del cliente Prisma
    // Si es un cliente y tiene datos de ubicación, crear ClientLocation
    // if (data.role === 'CLIENT' && (department || province || district || address)) {
    //   try {
    //     await this.prisma.clientLocation.create({
    //       data: {
    //         userId: user.id,
    //         department: department || null,
    //         province: province || null,
    //         district: district || null,
    //         address: address || null,
    //       },
    //     });
    //     console.log('✅ ClientLocation creada exitosamente para usuario:', user.id);
    //   } catch (error) {
    //     console.error('❌ Error al crear ClientLocation:', error);
    //     // No lanzar error para no romper la creación del usuario
    //   }
    // }

    return user;
  }

  async updateStatus(id: number, dto: UpdateUserStatusDto, requestingUser?: User): Promise<User> {
    // Primero obtener el usuario para verificar su rol
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        business: {
          include: {
            pointsales: {
              include: {
                colaborador: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Validar que el negocio tenga un plan activo (excepto para SUPERADMIN)
    // Si el usuario que solicita es SUPERADMIN, siempre permitir
    if (requestingUser?.role !== 'SUPERADMIN') {
      // Obtener el businessId del usuario que se está modificando
      let businessId: number | null = null;
      
      if (user.role === 'ADMIN') {
        // Si es ADMIN, obtener su negocio
        const business = user.business?.[0];
        if (business) {
          businessId = business.id;
        }
      } else if (user.role === 'COLABORADOR') {
        // Si es COLABORADOR, obtener el negocio de su punto de venta
        const pointsale = await this.prisma.pointSale.findFirst({
          where: { userId: user.id },
          select: { businesId: true }
        });
        if (pointsale?.businesId) {
          businessId = pointsale.businesId;
        }
      } else if (user.role === 'CLIENT') {
        // Si es CLIENT, obtener el negocio asociado
        const clientUser = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: { clientBusinesId: true }
        });
        if (clientUser?.clientBusinesId) {
          businessId = clientUser.clientBusinesId;
        }
      }

      if (businessId) {
        try {
          const activePlan = await this.businessPlansService.findActiveByBusiness(businessId);
          const estado = activePlan.estado;
          
          // Verificar si el plan está vencido
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          let planFechaFin: Date;
          if (activePlan.fechaFin instanceof Date) {
            planFechaFin = new Date(activePlan.fechaFin);
          } else {
            const [year, month, day] = activePlan.fechaFin.split('-').map(Number);
            planFechaFin = new Date(year, month - 1, day);
          }
          planFechaFin.setHours(0, 0, 0, 0);
          const isExpired = planFechaFin < today;

          if (estado !== 'ACTIVO' || isExpired) {
            throw new ForbiddenException(
              'El módulo de autorizaciones solo está disponible cuando el negocio tiene un plan activo. Por favor, contacta al administrador para renovar tu plan.'
            );
          }
        } catch (error) {
          if (error instanceof ForbiddenException) {
            throw error;
          }
          // Si no tiene plan activo (NotFoundException), bloquear
          throw new ForbiddenException(
            'El módulo de autorizaciones solo está disponible cuando el negocio tiene un plan activo. Por favor, contacta al administrador para renovar tu plan.'
          );
        }
      }
    }

    // Actualizar el usuario principal
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        // Si se activa el usuario, también marcar como verificado
        isEmailVerified: dto.isActive ? true : undefined,
      },
    });

    // Si el usuario es ADMIN y se está desactivando, desactivar también a sus colaboradores
    if (user.role === 'ADMIN' && !dto.isActive) {
      console.log(`🔄 Desactivando colaboradores del ADMIN ${user.firstname} ${user.lastname}`);
      
      // Obtener todos los colaboradores asociados a los puntos de venta del negocio del ADMIN
      const collaboratorIds = user.business
        .flatMap(business => business.pointsales)
        .filter(pointSale => pointSale.colaborador)
        .map(pointSale => pointSale.colaborador!.id);

      if (collaboratorIds.length > 0) {
        // Desactivar todos los colaboradores
        await this.prisma.user.updateMany({
          where: {
            id: { in: collaboratorIds },
            role: 'COLABORADOR'
          },
          data: {
            isActive: false
          }
        });

        console.log(`✅ ${collaboratorIds.length} colaboradores desactivados automáticamente`);
      }
    }

    // Si el usuario es ADMIN y se está activando, NO hacer nada con los colaboradores
    // (mantienen su estado actual)
    if (user.role === 'ADMIN' && dto.isActive) {
      console.log(`✅ ADMIN ${user.firstname} ${user.lastname} activado. Colaboradores mantienen su estado actual.`);
    }

    return updatedUser;
  }

  async findAll() {
    return await this.prisma.user.findMany({
      include: {
        business: {
          include: {
            pointsales: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        pointsales: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        clientBusines: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findOneByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(
        `No se encontro un elemento con email ${email}`,
      );
    }

    return user;
  }

  async findOne(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmailOrNull(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        business: true,
      },
    });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  

  async updateRole(id: number, dto: { role: string }) {
    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role as Roles },
    });
  }

  // Métodos para manejar clientes
  async createClient(createClientDto: CreateUserDto, loggedInUserId?: number) {
    console.log('🔄 createClient llamado con:', { email: createClientDto.email, loggedInUserId });
    
    const { email, password, ...data } = createClientDto;

    // Validación de email en uso
    const existingUser = await this.prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está en uso');
    }

    // Validar que se proporcione contraseña
    if (!password) {
      throw new BadRequestException('La contraseña es requerida');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 Contraseña hasheada:', !!hashedPassword);

    // Obtener el negocio del usuario que está creando el cliente
    let businesId: number | null = null;
    
    if (loggedInUserId) {
      console.log('🔍 Buscando negocio para userId:', loggedInUserId);
      
      // Buscar si el usuario es ADMIN (tiene un negocio asignado)
      const business = await this.prisma.busines.findFirst({
        where: { userId: loggedInUserId },
      });

      if (business) {
        businesId = business.id;
        console.log('✅ Negocio encontrado (ADMIN):', { id: business.id, name: business.name });
      } else {
        console.log('❌ No se encontró negocio donde userId =', loggedInUserId);
        
        // Si no es ADMIN, buscar si es COLABORADOR
        const pointsale = await this.prisma.pointSale.findFirst({
          where: { userId: loggedInUserId },
          include: { business: true }
        });
        
        if (pointsale) {
          businesId = pointsale.business.id;
          console.log('✅ Negocio encontrado (COLABORADOR):', { id: pointsale.business.id, name: pointsale.business.name });
        } else {
          console.log('❌ No se encontró punto de venta donde userId =', loggedInUserId);
        }
      }
    } else {
      console.log('⚠️ loggedInUserId no proporcionado');
    }

    console.log('📋 businesId final para asignar:', businesId);

    // Crear cliente con rol CLIENT y asignar el negocio
    const client = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'CLIENT' as Roles,
        isActive: true,
        isEmailVerified: true,
        clientBusinesId: businesId,
        ...data,
      },
    });
    
    console.log('✅ Cliente creado:', { id: client.id, email: client.email, clientBusinesId: businesId });
    return client;
  }

  async getAllClients() {
    console.log('🔄 getAllClients llamado');
    
    try {
      // Obtener todos los clientes
      const clients = await this.prisma.user.findMany({
        where: { role: Roles.CLIENT },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          phone: true,
          dni: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      console.log('✅ Clientes encontrados:', clients.length);
      console.log('📋 Clientes:', clients.map(c => ({ id: c.id, name: `${c.firstname} ${c.lastname}`, email: c.email })));

      return clients;
    } catch (error) {
      console.error('❌ Error en getAllClients:', error);
      throw error;
    }
  }

  async getClients(businesId?: number) {
    console.log('🔄 getClients llamado con businesId:', businesId);
    
    try {
      if (businesId) {
        // Obtener clientes asociados a un negocio específico
        // Incluir clientes con y sin ServiceOrder
        console.log('🔄 Buscando clientes para businesId:', businesId);
        const clients = await this.prisma.user.findMany({
        where: {
          role: Roles.CLIENT,
          OR: [
            // Clientes con ServiceOrder asociada al negocio
            {
              serviceorders: {
                some: {
                  pointsale: {
                    businesId: businesId
                  }
                }
              }
            },
            // Clientes sin ServiceOrder (recién creados)
            {
              serviceorders: {
                none: {}
              }
            }
          ]
        },
        include: {
          serviceorders: {
            include: {
              pointsale: {
                include: {
                  business: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        }
      });

      // Agregar información del último servicio
      const result = clients.map(client => ({
        ...client,
        lastServiceDate: client.serviceorders[0]?.createdAt || null
      }));

      console.log('✅ Clientes encontrados:', result.length);
      console.log('📋 Clientes:', result.map(c => ({ id: c.id, name: `${c.firstname} ${c.lastname}`, email: c.email })));

      return result;
    } else {
      // Obtener todos los clientes
      return await this.prisma.user.findMany({
        where: { role: Roles.CLIENT },
        include: {
          serviceorders: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        }
      });
    }
    } catch (error) {
      console.error('❌ Error en getClients:', error);
      throw error;
    }
  }

  async getClientsByUser(userId: number) {
    console.log('🔄 getClientsByUser llamado con userId:', userId);
    
    try {
      // Obtener el usuario para verificar su rol
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        console.log('❌ Usuario no encontrado:', userId);
        return [];
      }

      console.log('🔍 Usuario role:', user.role);

      // Si es SUPERADMIN, devolver TODOS los clientes
      if (user.role === Roles.SUPERADMIN) {
        const clients = await this.prisma.user.findMany({
          where: { 
            role: Roles.CLIENT,
            isActive: true
          },
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            phone: true,
            dni: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        console.log('✅ Clientes encontrados (SUPERADMIN):', clients.length);
        return clients;
      }

      // Para ADMIN y COLABORADOR, obtener el negocio
      let businesId: number | null = null;
      
      // Buscar si el usuario es ADMIN (tiene un negocio asignado)
      const business = await this.prisma.busines.findFirst({
        where: { userId },
      });

      if (business) {
        businesId = business.id;
      } else {
        // Si no es ADMIN, buscar si es COLABORADOR
        const pointsale = await this.prisma.pointSale.findFirst({
          where: { userId },
          include: { business: true }
        });
        
        if (pointsale) {
          businesId = pointsale.business.id;
        }
      }

      if (!businesId) {
        console.log('❌ No se encontró negocio para el usuario:', userId);
        return [];
      }

      console.log('🔍 Negocio encontrado:', businesId);

      // Obtener clientes que pertenecen al negocio
      const clients = await this.prisma.user.findMany({
        where: { 
          role: Roles.CLIENT,
          isActive: true,
          clientBusinesId: businesId
        },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          phone: true,
          dni: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log('✅ Clientes encontrados:', clients.length);
      console.log('📋 Clientes:', clients.map(c => ({ id: c.id, name: `${c.firstname} ${c.lastname}`, email: c.email })));

      return clients;
    } catch (error) {
      console.error('❌ Error en getClientsByUser:', error);
      throw error;
    }
  }

  async getClient(id: number) {
    const client = await this.prisma.user.findUnique({
      where: { id, role: Roles.CLIENT },
      include: {
        serviceorders: {
          include: {
            pointsale: {
              include: {
                business: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return client;
  }

  async updateClient(id: number, updateUserDto: UpdateUserDto) {
    const client = await this.prisma.user.findUnique({
      where: { id, role: Roles.CLIENT },
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async removeClient(id: number) {
    const client = await this.prisma.user.findUnique({
      where: { id, role: Roles.CLIENT },
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return await this.prisma.user.delete({
      where: { id },
    });
  }

  async updateClientStatus(id: number, dto: UpdateUserStatusDto) {
    const client = await this.prisma.user.findUnique({
      where: { id, role: Roles.CLIENT },
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return await this.prisma.user.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        isEmailVerified: dto.isActive ? true : undefined,
      },
    });
  }
}
