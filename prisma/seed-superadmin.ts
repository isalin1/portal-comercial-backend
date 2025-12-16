import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando limpieza de base de datos...');

  try {
    // 1. Eliminar datos en orden (respetando foreign keys)
    console.log('🗑️ Eliminando pagos...');
    await prisma.payment.deleteMany();

    console.log('🗑️ Eliminando órdenes de venta...');
    await prisma.salesOrder.deleteMany();

    console.log('🗑️ Eliminando items de órdenes de servicio...');
    await prisma.itemServiceOrder.deleteMany();

    console.log('🗑️ Eliminando órdenes de servicio...');
    await prisma.serviceOrder.deleteMany();

    console.log('🗑️ Eliminando servicios por punto de venta...');
    await prisma.pointSaleService.deleteMany();

    console.log('🗑️ Eliminando lista de servicios...');
    await prisma.listService.deleteMany();

    console.log('🗑️ Eliminando categorías de servicio...');
    await prisma.serviceCategory.deleteMany();

    console.log('🗑️ Eliminando puntos de venta...');
    await prisma.pointSale.deleteMany();

    console.log('🗑️ Eliminando negocios...');
    await prisma.busines.deleteMany();

    console.log('🗑️ Eliminando ubicaciones de clientes...');
    await prisma.clientLocation.deleteMany();

    console.log('🗑️ Eliminando todos los usuarios...');
    await prisma.user.deleteMany();

    console.log('✅ Base de datos limpiada exitosamente');

    // 2. Crear usuario SUPERADMIN
    console.log('🔄 Creando usuario SUPERADMIN...');
    
    const hashedPassword = await bcrypt.hash('123456', 10);
    const existingUser = await prisma.user.findFirst({
      where: { email : 'ignacio@mia.com'}
    })

    if(existingUser){
      const superadmin = await prisma.user.create({
        data: {
          firstname: 'Ignacio',
          lastname: 'Salinas',
          email: 'ignacio@mia.com',
          password: hashedPassword,
          phone: '999888777',
          dni: '12345678',
          role: 'SUPERADMIN',
          isActive: true,
          isEmailVerified: true,
        },
      });


      console.log('✅ Usuario SUPERADMIN creado exitosamente:');
      console.log({
        id: superadmin.id,
        nombre: `${superadmin.firstname} ${superadmin.lastname}`,
        email: superadmin.email,
        role: superadmin.role,
        isActive: superadmin.isActive,
      });
  
      console.log('\n📋 Credenciales de acceso:');
      console.log('Email: ignacio@mia.com');
      console.log('Contraseña: 123456');
      console.log('\n✅ Base de datos lista para usar');
    }

   

  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });














