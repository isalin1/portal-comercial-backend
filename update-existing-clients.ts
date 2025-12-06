import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Actualizando clientes existentes...');
  
  // Obtener todos los negocios
  const businesses = await prisma.busines.findMany();
  console.log(`📊 Negocios encontrados: ${businesses.length}`);
  
  if (businesses.length === 0) {
    console.log('⚠️ No hay negocios en la base de datos');
    return;
  }
  
  // Obtener todos los clientes sin negocio asignado
  const clients = await prisma.user.findMany({
    where: {
      role: 'CLIENT',
      clientBusinesId: null
    }
  });
  
  console.log(`👥 Clientes sin negocio: ${clients.length}`);
  
  if (clients.length === 0) {
    console.log('✅ Todos los clientes ya tienen negocio asignado');
    return;
  }
  
  // Asignar el primer negocio a todos los clientes existentes
  const firstBusinessId = businesses[0].id;
  console.log(`🏢 Asignando negocio ID ${firstBusinessId} (${businesses[0].name}) a todos los clientes...`);
  
  const result = await prisma.user.updateMany({
    where: {
      role: 'CLIENT',
      clientBusinesId: null
    },
    data: {
      clientBusinesId: firstBusinessId
    }
  });
  
  console.log(`✅ ${result.count} clientes actualizados`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });












