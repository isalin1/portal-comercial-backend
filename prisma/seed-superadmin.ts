/* eslint-disable */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const existing = await prisma.datUser.findUnique({
    where: { email: 'ignacio@admin.com' },
    include: { user: true },
  });

  if (!existing) {
    await prisma.datUser.create({
      data: {
        firstName: 'Ignacio',
        lastName: 'Salinas',
        email: 'ignacio@admin.com',
        phone: '999888777',
        userType: 'ADMIN',
        user: {
          create: {
            password: hashedPassword,
            isActive: true,
          },
        },
      },
    });
    console.log('Usuario Admin creado: ignacio@admin.com');
  } else if (existing.user) {
    await prisma.user.update({
      where: { id: existing.user.id },
      data: {
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log('Contraseña del Admin actualizada');
  }

  console.log('Email: ignacio@admin.com');
  console.log('Contraseña: 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
