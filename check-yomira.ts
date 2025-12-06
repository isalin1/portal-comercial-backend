import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkYomira() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { firstname: { contains: 'Yomira', mode: 'insensitive' } },
          { lastname: { contains: 'Yomira', mode: 'insensitive' } },
        ]
      },
      include: {
        business: true,
        pointsales: true,
      }
    });

    console.log('\n=== Usuario Yomira ===');
    console.log(JSON.stringify(user, null, 2));
    
    if (user) {
      console.log('\n=== Verificación ===');
      console.log('Email:', user.email);
      console.log('Rol:', user.role);
      console.log('Activo:', user.isActive);
      console.log('¿Tiene contraseña?:', user.password ? 'SÍ' : 'NO');
      console.log('¿Tiene negocio?:', user.business && user.business.length > 0 ? 'SÍ (ID: ' + user.business[0].id + ')' : 'NO');
      console.log('¿Tiene punto de venta?:', user.pointsales && user.pointsales.length > 0 ? 'SÍ' : 'NO');
    } else {
      console.log('Usuario Yomira no encontrado');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkYomira();

