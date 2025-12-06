import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function correctPlanStates() {
  console.log('🔄 Iniciando corrección de estados de planes...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setMinutes(0, 0, 0);

  // Buscar todos los planes
  const allPlans = await prisma.businessPlan.findMany({
    include: {
      business: true,
    },
  });

  console.log(`📊 Total de planes encontrados: ${allPlans.length}`);

  const corrections: Array<{
    planId: number;
    businesId: number;
    businessName: string;
    oldEstado: string;
    newEstado: string;
    fechaFin: Date | string;
  }> = [];

  for (const plan of allPlans) {
    // Parsear fechaFin correctamente
    let planFechaFin: Date;
    const fechaFinValue: any = plan.fechaFin;
    if (fechaFinValue instanceof Date) {
      planFechaFin = new Date(fechaFinValue);
    } else if (typeof fechaFinValue === 'string') {
      // Si viene como string "YYYY-MM-DD", parsearlo directamente
      if (fechaFinValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = fechaFinValue.split('-').map(Number);
        planFechaFin = new Date(year, month - 1, day);
      } else {
        planFechaFin = new Date(fechaFinValue);
      }
    } else {
      planFechaFin = new Date(fechaFinValue);
    }
    planFechaFin.setHours(0, 0, 0, 0);
    planFechaFin.setMinutes(0, 0, 0);

    let correctEstado = plan.estado;

    console.log(`🔍 Plan ${plan.id} (${plan.business.name}):`);
    console.log(`   Estado actual: ${plan.estado}`);
    console.log(`   Fecha fin: ${planFechaFin.toISOString()}`);
    console.log(`   Hoy: ${today.toISOString()}`);
    console.log(`   Comparación: ${planFechaFin >= today ? 'fechaFin >= hoy' : 'fechaFin < hoy'}`);

    // Si el plan está marcado como VENCIDO pero la fecha aún no pasó, corregirlo a ACTIVO
    if (plan.estado === 'VENCIDO' && planFechaFin >= today) {
      correctEstado = 'ACTIVO';
      console.log(`   ⚠️ Necesita corrección: VENCIDO → ACTIVO`);
    }
    // Si el plan está marcado como ACTIVO pero la fecha ya pasó, marcarlo como VENCIDO
    else if (plan.estado === 'ACTIVO' && planFechaFin < today) {
      correctEstado = 'VENCIDO';
      console.log(`   ⚠️ Necesita corrección: ACTIVO → VENCIDO`);
    } else {
      console.log(`   ✅ Estado correcto`);
    }

    // Solo actualizar si el estado necesita corrección
    if (correctEstado !== plan.estado) {
      await prisma.businessPlan.update({
        where: { id: plan.id },
        data: { estado: correctEstado },
      });

      corrections.push({
        planId: plan.id,
        businesId: plan.businesId,
        businessName: plan.business.name,
        oldEstado: plan.estado,
        newEstado: correctEstado,
        fechaFin: plan.fechaFin,
      });

      console.log(`   ✅ Corregido: ${plan.estado} → ${correctEstado}`);
    }
    console.log('');
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Total de planes: ${allPlans.length}`);
  console.log(`   Planes corregidos: ${corrections.length}`);
  
  if (corrections.length > 0) {
    console.log(`\n📝 Detalles de correcciones:`);
    corrections.forEach((c) => {
      console.log(`   - Plan ${c.planId} (${c.businessName}): ${c.oldEstado} → ${c.newEstado}`);
    });
  }

  return {
    totalPlans: allPlans.length,
    corrections: corrections.length,
    details: corrections,
  };
}

correctPlanStates()
  .then((result) => {
    console.log('\n✅ Corrección completada:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en corrección:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

