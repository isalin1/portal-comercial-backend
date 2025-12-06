import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando clientes en la base de datos...\n');

  // 1. Verificar todos los clientes
  const allClients = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      clientBusinesId: true,
      isActive: true
    }
  });

  console.log('📋 CLIENTES EN LA BASE DE DATOS:', allClients.length);
  allClients.forEach(client => {
    console.log(`  - ${client.firstname} ${client.lastname} (${client.email})`);
    console.log(`    ID: ${client.id}`);
    console.log(`    clientBusinesId: ${client.clientBusinesId}`);
    console.log(`    isActive: ${client.isActive}`);
    console.log('');
  });

  // 2. Verificar negocios
  const allBusinesses = await prisma.busines.findMany({
    select: {
      id: true,
      name: true,
      userId: true,
      user: {
        select: {
          firstname: true,
          lastname: true,
          email: true,
          role: true
        }
      }
    }
  });

  console.log('\n🏢 NEGOCIOS EN LA BASE DE DATOS:', allBusinesses.length);
  allBusinesses.forEach(business => {
    console.log(`  - ${business.name} (ID: ${business.id})`);
    console.log(`    Admin: ${business.user.firstname} ${business.user.lastname} (${business.user.email})`);
    console.log(`    Admin Role: ${business.user.role}`);
    console.log('');
  });

  // 3. Verificar usuarios y sus roles
  const allUsers = await prisma.user.findMany({
    where: {
      role: {
        in: ['SUPERADMIN', 'ADMIN', 'COLABORADOR']
      }
    },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      role: true,
      isActive: true
    }
  });

  console.log('\n👥 USUARIOS (SUPERADMIN, ADMIN, COLABORADOR):', allUsers.length);
  allUsers.forEach(user => {
    console.log(`  - ${user.firstname} ${user.lastname} (${user.email})`);
    console.log(`    ID: ${user.id}`);
    console.log(`    Role: ${user.role}`);
    console.log(`    isActive: ${user.isActive}`);
    console.log('');
  });
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });











