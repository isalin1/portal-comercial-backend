import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando clientes en la base de datos...\n');
  
  // Obtener todos los clientes
  const clients = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    include: {
      clientBusines: true
    }
  });
  
  console.log(`👥 Total clientes: ${clients.length}\n`);
  
  clients.forEach((client, index) => {
    console.log(`${index + 1}. ${client.firstname} ${client.lastname}`);
    console.log(`   Email: ${client.email}`);
    console.log(`   Activo: ${client.isActive}`);
    console.log(`   Negocio ID: ${client.clientBusinesId}`);
    console.log(`   Negocio: ${client.clientBusines?.name || 'Sin negocio'}`);
    console.log('');
  });
  
  // Obtener todos los negocios
  const businesses = await prisma.busines.findMany();
  console.log(`🏢 Total negocios: ${businesses.length}\n`);
  
  businesses.forEach((business, index) => {
    console.log(`${index + 1}. ${business.name}`);
    console.log(`   ID: ${business.id}`);
    console.log(`   Admin User ID: ${business.userId}`);
    console.log('');
  });
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });











