import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando usuarios en la base de datos...\n');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstname: true,
      lastname: true,
      dni: true,
      role: true,
      isActive: true,
    },
  });

  console.log(`📊 Total de usuarios: ${users.length}\n`);
  
  users.forEach((user) => {
    console.log(`ID: ${user.id}`);
    console.log(`Nombre: ${user.firstname} ${user.lastname}`);
    console.log(`Email: ${user.email}`);
    console.log(`DNI: ${user.dni}`);
    console.log(`Rol: ${user.role}`);
    console.log(`Activo: ${user.isActive}`);
    console.log('---');
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







