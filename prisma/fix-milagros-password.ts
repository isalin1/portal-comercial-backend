import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Verificando usuario Milagros...');

  try {
    // Buscar usuario Milagros
    const milagros = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'milagros', mode: 'insensitive' } },
          { firstname: { contains: 'Milagros', mode: 'insensitive' } }
        ]
      }
    });

    if (!milagros) {
      console.log('❌ Usuario Milagros no encontrado');
      console.log('📋 Usuarios disponibles:');
      const allUsers = await prisma.user.findMany({
        select: { id: true, firstname: true, lastname: true, email: true, role: true, isActive: true }
      });
      console.table(allUsers);
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log({
      id: milagros.id,
      nombre: `${milagros.firstname} ${milagros.lastname}`,
      email: milagros.email,
      role: milagros.role,
      isActive: milagros.isActive,
      isEmailVerified: milagros.isEmailVerified,
      passwordLength: milagros.password.length
    });

    // Actualizar contraseña a 123456
    console.log('\n🔄 Actualizando contraseña a: 123456');
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const updatedUser = await prisma.user.update({
      where: { id: milagros.id },
      data: {
        password: hashedPassword,
        isActive: true,
        isEmailVerified: true
      }
    });

    console.log('✅ Contraseña actualizada exitosamente');
    console.log('\n📋 Credenciales para login:');
    console.log(`Email: ${updatedUser.email}`);
    console.log('Contraseña: 123456');
    console.log(`Activo: ${updatedUser.isActive}`);
    console.log(`Email verificado: ${updatedUser.isEmailVerified}`);

  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });














