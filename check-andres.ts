import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndres() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { firstname: { contains: 'Andres', mode: 'insensitive' }},
          { firstname: { contains: 'Andrés', mode: 'insensitive' }}
        ]
      }
    });

    if (user) {
      console.log('\n=== Usuario encontrado ===');
      console.log('Nombre:', user.firstname, user.lastname);
      console.log('Email:', user.email);
      console.log('Rol:', user.role);
      console.log('Contraseña guardada:', user.password);
      console.log('¿Está hasheada?:', user.password.startsWith('$2b$') ? 'SÍ ✅' : 'NO ❌');
      
      if (!user.password.startsWith('$2b$')) {
        console.log('\n⚠️ ATENCIÓN: La contraseña NO está hasheada correctamente');
      }
    } else {
      console.log('Usuario no encontrado');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndres();












