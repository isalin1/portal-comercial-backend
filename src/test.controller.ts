import { Controller, Get } from '@nestjs/common';
import { UserService } from './user/user.service';

@Controller('test')
export class TestController {
  constructor(private readonly userService: UserService) {}
  
  @Get('clients')
  async getTestClients() {
    console.log('🔄 GET /test/clients llamado');
    
    try {
      // Obtener clientes reales de la base de datos
      const clients = await this.userService.getAllClients();
      console.log('✅ Clientes encontrados:', clients.length);
      
      return {
        success: true,
        data: clients,
        count: clients.length
      };
    } catch (error) {
      console.error('❌ Error en getTestClients:', error);
      
      // Fallback a datos hardcodeados si hay error
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
  }
}
