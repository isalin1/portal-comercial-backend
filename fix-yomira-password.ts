import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function fixYomiraPassword() {
  try {
    const plainPassword = '123456'; // La contraseña que quieres usar
    
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    // Actualizar el usuario Yomira
    const updatedUser = await prisma.user.update({
      where: { email: 'yomira@mia.com' },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Contraseña de Yomira actualizada correctamente');
    console.log('Email:', updatedUser.email);
    console.log('Nueva contraseña (en texto plano):', plainPassword);
    console.log('Hash guardado:', hashedPassword);
    console.log('\n🔐 Ahora puedes iniciar sesión con:');
    console.log('   Email: yomira@mia.com');
    console.log('   Contraseña: 123456');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixYomiraPassword();












