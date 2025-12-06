import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllAdmins() {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    console.log(`\n=== Usuarios ADMIN encontrados: ${users.length} ===\n`);
    
    users.forEach(u => {
      const isHashed = u.password.startsWith('$2b$');
      console.log('----------------------------');
      console.log('Nombre:', u.firstname, u.lastname);
      console.log('Email:', u.email);
      console.log('Contraseña:', u.password.substring(0, 20) + '...');
      console.log('¿Hasheada?:', isHashed ? 'SÍ ✅' : 'NO ❌');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllAdmins();












