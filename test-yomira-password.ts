import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testYomiraPassword() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'yomira@mia.com' }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('\n=== Probando contraseña de Yomira ===');
    console.log('Email:', user.email);
    console.log('Hash guardado:', user.password);
    
    const testPassword = '123456';
    const isValid = await bcrypt.compare(testPassword, user.password);
    
    console.log('\nProbando contraseña: "123456"');
    console.log('¿Es válida?:', isValid ? 'SÍ ✅' : 'NO ❌');
    
    if (!isValid) {
      console.log('\n⚠️ La contraseña NO coincide. Vamos a actualizarla...');
      const newHash = await bcrypt.hash('123456', 10);
      await prisma.user.update({
        where: { email: 'yomira@mia.com' },
        data: { password: newHash }
      });
      console.log('✅ Contraseña actualizada correctamente');
      console.log('Nuevo hash:', newHash);
      console.log('\nAhora intenta con:');
      console.log('  Email: yomira@mia.com');
      console.log('  Contraseña: 123456');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testYomiraPassword();












