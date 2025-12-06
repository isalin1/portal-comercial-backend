import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear SUPERADMIN: Ignacio
  const passwordHash = await bcrypt.hash('123456', 10);

  const superadmin = await prisma.user.upsert({
    where: { email: 'ignacio@admin.com' },
    update: {},
    create: {
      firstname: 'Ignacio',
      lastname: 'Administrador',
      phone: '999999999',
      dni: '12345678',
      email: 'ignacio@admin.com',
      password: passwordHash,
      role: 'SUPERADMIN',
      isActive: true,
      isEmailVerified: true,
    },
  });

  console.log('✅ SUPERADMIN creado:', {
    id: superadmin.id,
    name: `${superadmin.firstname} ${superadmin.lastname}`,
    email: superadmin.email,
    role: superadmin.role,
  });

  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });










