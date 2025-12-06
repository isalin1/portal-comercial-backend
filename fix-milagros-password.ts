import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Actualizando contraseña de Milagros...\n');

  // Hashear la nueva contraseña correctamente (una sola vez)
  const newPassword = '123456';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Actualizar el usuario
  const updatedUser = await prisma.user.update({
    where: { email: 'milagros@mia.com' },
    data: { password: hashedPassword },
  });

  console.log('✅ Contraseña actualizada correctamente para:');
  console.log(`   Email: ${updatedUser.email}`);
  console.log(`   Nombre: ${updatedUser.firstname} ${updatedUser.lastname}`);
  console.log(`   Nueva contraseña: ${newPassword}`);
  console.log('\n💡 Ahora puedes hacer login con: milagros@mia.com / 123456');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });






