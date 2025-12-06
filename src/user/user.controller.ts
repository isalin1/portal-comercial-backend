import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { User } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Roles as PrismaRoles } from '@prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';


@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ==========================================
  // RUTAS ESPECÍFICAS (DEBEN IR PRIMERO)
  // ==========================================

  // Endpoint alternativo para obtener clientes
  @Get('clientes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(PrismaRoles.ADMIN, PrismaRoles.SUPERADMIN, PrismaRoles.COLABORADOR)
  async getClientes(@GetUser() user: User) {
    console.log('🔥🔥🔥 GET /user/clientes LLAMADO 🔥🔥🔥');
    console.log('📋 Usuario logueado:', { 
      id: user.id, 
      email: user.email, 
      firstname: user.firstname,
      role: user.role 
    });
    
    try {
      // Obtener clientes del mismo negocio del usuario logueado
      const clients = await this.userService.getClientsByUser(user.id);
      console.log('✅ Clientes encontrados:', clients.length);
      console.log('📦 Clientes a devolver:', clients.map(c => ({ 
        id: c.id, 
        name: `${c.firstname} ${c.lastname}`, 
        email: c.email 
      })));
      
      // Forzar respuesta con código 200
      return clients;
    } catch (error) {
      console.error('❌ Error en getClientes:', error);
      throw error;
    }
  }

  // Endpoint simple para obtener clientes
  @Get('clients')
  @UseGuards(AuthGuard('jwt'))
  async getClients() {
    console.log('🔄 GET /user/clients llamado');
    
    try {
      // Obtener todos los clientes directamente
      const clients = await this.userService.getAllClients();
      console.log('✅ Clientes encontrados:', clients.length);
      return clients;
    } catch (error) {
      console.error('❌ Error en getClients:', error);
      throw error;
    }
  }

  // Endpoint completamente nuevo
  @Get('lista-clientes')
  async getListaClientes() {
    console.log('🔄 GET /user/lista-clientes llamado');
    
    try {
      // Obtener TODOS los clientes directamente (simplificado)
      const clients = await this.userService.getAllClients();
      console.log('✅ Clientes encontrados:', clients.length);
      
      // Devolver directamente sin procesamiento adicional
      return {
        success: true,
        data: clients,
        count: clients.length
      };
    } catch (error) {
      console.error('❌ Error en getListaClientes:', error);
      throw error;
    }
  }

  // Endpoint de prueba completamente nuevo
  @Get('test-clients')
  async getTestClients() {
    console.log('🔄 GET /user/test-clients llamado');
    
    try {
      // Obtener TODOS los clientes directamente (simplificado)
      const clients = await this.userService.getAllClients();
      console.log('✅ Clientes encontrados:', clients.length);
      
      // Devolver directamente sin procesamiento adicional
      return {
        success: true,
        data: clients,
        count: clients.length
      };
    } catch (error) {
      console.error('❌ Error en getTestClients:', error);
      throw error;
    }
  }

  // Endpoint de prueba con datos hardcodeados
  @Get('hardcoded-clients')
  async getHardcodedClients() {
    console.log('🔄 GET /user/hardcoded-clients llamado');
    
    const hardcodedClients = [
      {
        id: 1,
        firstname: 'Juan',
        lastname: 'Pérez',
        email: 'juan@test.com',
        phone: '999999999',
        dni: '12345678',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        firstname: 'María',
        lastname: 'García',
        email: 'maria@test.com',
        phone: '888888888',
        dni: '87654321',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    return {
      success: true,
      data: hardcodedClients,
      count: hardcodedClients.length
    };
  }

  // Endpoint para crear clientes
  @Post('clients')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(PrismaRoles.ADMIN, PrismaRoles.COLABORADOR)
  async createClient(@Body() createClientDto: CreateUserDto, @GetUser() user: User) {
    console.log('🔄 POST /user/clients llamado con:', { createClientDto, userId: user.id });
    try {
      // Usar el método createClient que asigna el negocio
      const result = await this.userService.createClient(createClientDto, user.id);
      console.log('✅ Cliente creado exitosamente:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en createClient:', error);
      throw error;
    }
  }

  // Endpoint para obtener un cliente específico
  @Get('clients/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(PrismaRoles.ADMIN, PrismaRoles.SUPERADMIN, PrismaRoles.COLABORADOR)
  getClient(@Param('id', ParseIntPipe) id: number) {
    console.log('🔄 GET /user/clients/:id llamado con ID:', id);
    return this.userService.getClient(id);
  }

  // Endpoint para actualizar un cliente
  @Patch('clients/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(PrismaRoles.ADMIN, PrismaRoles.SUPERADMIN, PrismaRoles.COLABORADOR)
  updateClient(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto, @GetUser() user: User) {
    console.log('🔄 PATCH /user/clients/:id llamado con ID:', id);
    console.log('📝 Datos a actualizar:', updateUserDto);
    console.log('👤 Usuario autenticado:', user.email);
    return this.userService.updateClient(id, updateUserDto);
  }

  // Endpoint para eliminar un cliente
  @Delete('clients/:id')
  removeClient(@Param('id', ParseIntPipe) id: number) {
    return this.userService.removeClient(id);
  }

  // Endpoint para actualizar estado de cliente
  @Patch('clients/:id/status')
  updateClientStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserStatusDto) {
    return this.userService.updateClientStatus(id, dto);
  }

  // ==========================================
  // RUTAS GENERALES Y CON PARÁMETROS
  // ==========================================

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  async findAll() {
    console.log('🔥 GET /user llamado');
    const users = await this.userService.findAll();
    console.log('📦 Total usuarios encontrados:', users.length);
    if (users.length > 0) {
      console.log('🔍 Primer usuario (ejemplo):', JSON.stringify({
        id: users[0].id,
        firstname: users[0].firstname,
        role: users[0].role,
        hasBusiness: !!users[0].business,
        hasPointsales: !!users[0].pointsales,
        hasClientBusines: !!users[0].clientBusines,
        businessLength: users[0].business?.length,
        pointsalesLength: users[0].pointsales?.length
      }, null, 2));
    }
    return users;
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(PrismaRoles.ADMIN, PrismaRoles.SUPERADMIN)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @GetUser() user: User,
  ): Promise<User> {
    return this.userService.updateStatus(id, dto, user);
  }

  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.userService.updateRole(+id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

 
}
