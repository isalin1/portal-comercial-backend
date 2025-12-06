import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetSuperadminPassword() {
  console.log('🔧 Reseteando contraseña del SUPERADMIN...\n');

  // Nueva contraseña (puedes cambiarla aquí)
  const newPassword = '123456';
  
  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Buscar TODOS los usuarios SUPERADMIN
  const allSuperadmins = await prisma.user.findMany({
    where: { role: 'SUPERADMIN' },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      role: true,
      isActive: true
    }
  });

  if (allSuperadmins.length === 0) {
    console.log('❌ No se encontró ningún usuario SUPERADMIN en la base de datos');
    console.log('💡 Puedes crear uno ejecutando: npm run seed:superadmin');
    return;
  }

  // Si hay múltiples superadmins, mostrar todos
  if (allSuperadmins.length > 1) {
    console.log(`⚠️  Se encontraron ${allSuperadmins.length} usuarios SUPERADMIN:\n`);
    allSuperadmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.firstname} ${admin.lastname} - ${admin.email} (${admin.isActive ? 'ACTIVO' : 'INACTIVO'})`);
    });
    console.log('\n🔄 Reseteando contraseña para TODOS los superadmins...\n');
  }

  // Actualizar contraseña para todos los superadmins
  for (const superadmin of allSuperadmins) {
    console.log(`📝 Actualizando contraseña para: ${superadmin.email}`);
    
    await prisma.user.update({
      where: { id: superadmin.id },
      data: { password: hashedPassword }
    });

    console.log(`✅ Contraseña actualizada para ${superadmin.email}`);
  }

  console.log(`\n✅ Contraseña actualizada exitosamente para ${allSuperadmins.length} superadmin(s)`);
  console.log(`   Nueva contraseña: ${newPassword}`);
  console.log('');
  console.log('🎉 Ahora puedes loguearte con cualquiera de estos usuarios:');
  allSuperadmins.forEach((admin) => {
    console.log(`   - Email: ${admin.email} | Password: ${newPassword}`);
  });
  console.log('');
  console.log('⚠️  IMPORTANTE: Cambia esta contraseña después de iniciar sesión por seguridad.');
}

resetSuperadminPassword()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

