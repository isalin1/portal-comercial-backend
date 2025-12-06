import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetMiaPassword() {
  console.log('🔧 Reseteando contraseña del usuario Mia...\n');

  // Nueva contraseña (puedes cambiarla aquí)
  const newPassword = '123456';
  
  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Buscar usuario mia
  const miaUser = await prisma.user.findUnique({
    where: { email: 'mia@mia.com' },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      role: true
    }
  });

  if (!miaUser) {
    console.log('❌ Usuario mia@mia.com no encontrado');
    return;
  }

  console.log('✅ Usuario encontrado:');
  console.log(`   - ${miaUser.firstname} ${miaUser.lastname}`);
  console.log(`   - Email: ${miaUser.email}`);
  console.log(`   - Role: ${miaUser.role}`);
  console.log('');

  // Actualizar contraseña
  await prisma.user.update({
    where: { id: miaUser.id },
    data: { password: hashedPassword }
  });

  console.log(`✅ Contraseña actualizada exitosamente`);
  console.log(`   Nueva contraseña: ${newPassword}`);
  console.log('');
  console.log('🎉 Ahora puedes loguearte con:');
  console.log(`   Email: ${miaUser.email}`);
  console.log(`   Password: ${newPassword}`);
}

resetMiaPassword()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });










