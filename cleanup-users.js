const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupUsers() {
  try {
    console.log('🧹 Limpiando usuarios no asociados a negocio...')
    
    // 1. Verificar usuarios actuales
    console.log('\n📊 Usuarios actuales:')
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        dni: true,
        role: true,
        isActive: true
      }
    })
    
    allUsers.forEach(user => {
      console.log(`- ${user.role}: ${user.firstname} ${user.lastname} (DNI: ${user.dni})`)
    })
    
    // 2. Eliminar usuarios COLABORADOR y CLIENT
    console.log('\n🗑️ Eliminando usuarios COLABORADOR y CLIENT...')
    
    const deletedCollaborators = await prisma.user.deleteMany({
      where: { role: 'COLABORADOR' }
    })
    console.log(`✅ Eliminados ${deletedCollaborators.count} usuarios COLABORADOR`)
    
    const deletedClients = await prisma.user.deleteMany({
      where: { role: 'CLIENT' }
    })
    console.log(`✅ Eliminados ${deletedClients.count} usuarios CLIENT`)
    
    // 3. Verificar usuarios restantes
    console.log('\n📋 Usuarios restantes:')
    const remainingUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        dni: true,
        role: true,
        isActive: true
      }
    })
    
    remainingUsers.forEach(user => {
      console.log(`- ${user.role}: ${user.firstname} ${user.lastname} (DNI: ${user.dni})`)
    })
    
    console.log(`\n🎉 Limpieza completada:`)
    console.log(`- Total usuarios restantes: ${remainingUsers.length}`)
    console.log(`- SUPERADMIN: ${remainingUsers.filter(u => u.role === 'SUPERADMIN').length}`)
    console.log(`- ADMIN: ${remainingUsers.filter(u => u.role === 'ADMIN').length}`)
    
    console.log(`\n🔑 Usuarios disponibles para login:`)
    remainingUsers.forEach(user => {
      console.log(`${user.role}: ${user.email} / 123456`)
    })
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupUsers()
