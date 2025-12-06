import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixJeysonBusiness() {
  console.log('🔧 Corrigiendo negocio del cliente Jeyson...\n');

  // Buscar usuario Mia
  const mia = await prisma.user.findUnique({
    where: { email: 'mia@mia.com' }
  });

  if (!mia) {
    console.log('❌ Usuario mia no encontrado');
    return;
  }

  // Buscar negocio de Mia
  const miaBusiness = await prisma.busines.findFirst({
    where: { userId: mia.id }
  });

  if (!miaBusiness) {
    console.log('❌ Negocio de Mia no encontrado');
    return;
  }

  console.log('✅ Negocio de Mia:', { id: miaBusiness.id, name: miaBusiness.name });

  // Buscar cliente Jeyson
  const jeyson = await prisma.user.findFirst({
    where: { 
      email: 'jeyson@mia.com',
      role: 'CLIENT'
    }
  });

  if (!jeyson) {
    console.log('❌ Cliente Jeyson no encontrado');
    return;
  }

  console.log('✅ Cliente Jeyson encontrado:', { 
    id: jeyson.id, 
    name: `${jeyson.firstname} ${jeyson.lastname}`,
    clientBusinesId: jeyson.clientBusinesId 
  });

  // Actualizar cliente Jeyson
  const updated = await prisma.user.update({
    where: { id: jeyson.id },
    data: { clientBusinesId: miaBusiness.id }
  });

  console.log('\n✅ Cliente actualizado exitosamente:');
  console.log(`   ${updated.firstname} ${updated.lastname}`);
  console.log(`   clientBusinesId: ${jeyson.clientBusinesId} → ${updated.clientBusinesId}`);
  console.log(`   Ahora pertenece al negocio: ${miaBusiness.name}`);
}

fixJeysonBusiness()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });











