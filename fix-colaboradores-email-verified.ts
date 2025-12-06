import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixColaboradores() {
  try {
    // Actualizar Yomira
    await prisma.user.update({
      where: { email: 'yomira@mia.com' },
      data: { isEmailVerified: true }
    });
    console.log('✅ Yomira actualizada: isEmailVerified = true');
    
    // Actualizar Rusber
    await prisma.user.update({
      where: { email: 'rusber@mia.com' },
      data: { isEmailVerified: true }
    });
    console.log('✅ Rusber actualizado: isEmailVerified = true');
    
    console.log('\n🔐 Ahora ambos colaboradores pueden iniciar sesión con:');
    console.log('   Contraseña: 123456');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixColaboradores();












