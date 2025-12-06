import { PrismaClient, Roles } from '@prisma/client';

const prisma = new PrismaClient();

async function testGetClientsByUser() {
  console.log('🧪 TESTING getClientsByUser logic...\n');

  // Test 1: Superadmin (Ignacio - ID: 21)
  console.log('📋 TEST 1: SUPERADMIN (Ignacio)');
  const superadminId = 21;
  const superadmin = await prisma.user.findUnique({ where: { id: superadminId } });
  console.log('   Usuario:', superadmin?.firstname, superadmin?.role);

  if (superadmin?.role === Roles.SUPERADMIN) {
    const clientsForSuperadmin = await prisma.user.findMany({
      where: { 
        role: Roles.CLIENT,
        isActive: true
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        phone: true,
        dni: true,
        isActive: true,
        clientBusinesId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('   ✅ Clientes visibles:', clientsForSuperadmin.length);
    clientsForSuperadmin.forEach(c => {
      console.log(`      - ${c.firstname} ${c.lastname} (${c.email}) - Business: ${c.clientBusinesId}`);
    });
  }

  console.log('');

  // Test 2: Admin (Milagros - ID: 22)
  console.log('📋 TEST 2: ADMIN (Milagros)');
  const adminId = 22;
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  console.log('   Usuario:', admin?.firstname, admin?.role);

  // Buscar negocio del admin
  const business = await prisma.busines.findFirst({
    where: { userId: adminId },
  });

  if (business) {
    console.log('   Negocio:', business.name, '(ID:', business.id + ')');

    const clientsForAdmin = await prisma.user.findMany({
      where: { 
        role: Roles.CLIENT,
        isActive: true,
        clientBusinesId: business.id
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        phone: true,
        dni: true,
        isActive: true,
        clientBusinesId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('   ✅ Clientes visibles:', clientsForAdmin.length);
    clientsForAdmin.forEach(c => {
      console.log(`      - ${c.firstname} ${c.lastname} (${c.email}) - Business: ${c.clientBusinesId}`);
    });
  } else {
    console.log('   ❌ No se encontró negocio para este admin');
  }

  console.log('');

  // Test 3: Colaborador (Yomira - ID: 23)
  console.log('📋 TEST 3: COLABORADOR (Yomira)');
  const colaboradorId = 23;
  const colaborador = await prisma.user.findUnique({ where: { id: colaboradorId } });
  console.log('   Usuario:', colaborador?.firstname, colaborador?.role);

  // Buscar punto de venta del colaborador
  const pointsale = await prisma.pointSale.findFirst({
    where: { userId: colaboradorId },
    include: { business: true }
  });

  if (pointsale) {
    console.log('   Punto de Venta:', pointsale.name, '(ID:', pointsale.id + ')');
    console.log('   Negocio:', pointsale.business.name, '(ID:', pointsale.business.id + ')');

    const clientsForColaborador = await prisma.user.findMany({
      where: { 
        role: Roles.CLIENT,
        isActive: true,
        clientBusinesId: pointsale.business.id
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        phone: true,
        dni: true,
        isActive: true,
        clientBusinesId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('   ✅ Clientes visibles:', clientsForColaborador.length);
    clientsForColaborador.forEach(c => {
      console.log(`      - ${c.firstname} ${c.lastname} (${c.email}) - Business: ${c.clientBusinesId}`);
    });
  } else {
    console.log('   ❌ No se encontró punto de venta para este colaborador');
  }

  console.log('');

  // Test 4: Colaborador (Rusber - ID: 24)
  console.log('📋 TEST 4: COLABORADOR (Rusber)');
  const rusberColaboradorId = 24;
  const rusberColaborador = await prisma.user.findUnique({ where: { id: rusberColaboradorId } });
  console.log('   Usuario:', rusberColaborador?.firstname, rusberColaborador?.role);

  // Buscar punto de venta del colaborador
  const rusberPointsale = await prisma.pointSale.findFirst({
    where: { userId: rusberColaboradorId },
    include: { business: true }
  });

  if (rusberPointsale) {
    console.log('   Punto de Venta:', rusberPointsale.name, '(ID:', rusberPointsale.id + ')');
    console.log('   Negocio:', rusberPointsale.business.name, '(ID:', rusberPointsale.business.id + ')');

    const clientsForRusberColaborador = await prisma.user.findMany({
      where: { 
        role: Roles.CLIENT,
        isActive: true,
        clientBusinesId: rusberPointsale.business.id
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        phone: true,
        dni: true,
        isActive: true,
        clientBusinesId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('   ✅ Clientes visibles:', clientsForRusberColaborador.length);
    clientsForRusberColaborador.forEach(c => {
      console.log(`      - ${c.firstname} ${c.lastname} (${c.email}) - Business: ${c.clientBusinesId}`);
    });
  } else {
    console.log('   ❌ No se encontró punto de venta para este colaborador');
  }
}

testGetClientsByUser()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });










