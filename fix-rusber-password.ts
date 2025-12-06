import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function fixRusberPassword() {
  try {
    const plainPassword = '123456'; // La contraseña que quieres usar
    
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    // Actualizar el usuario Rusber
    const updatedUser = await prisma.user.update({
      where: { email: 'rusber@mia.com' },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Contraseña de Rusber actualizada correctamente');
    console.log('Email:', updatedUser.email);
    console.log('Nombre:', updatedUser.firstname, updatedUser.lastname);
    console.log('Nueva contraseña (en texto plano):', plainPassword);
    console.log('Hash guardado:', hashedPassword);
    console.log('\n🔐 Ahora puedes iniciar sesión con:');
    console.log('   Email: rusber@mia.com');
    console.log('   Contraseña: 123456');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRusberPassword();












