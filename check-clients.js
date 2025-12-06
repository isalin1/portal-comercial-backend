const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkClients() {
  try {
    console.log('🔍 Verificando clientes en la base de datos...')
    
    // Obtener todos los usuarios con rol CLIENT
    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })
    
    console.log(`✅ Clientes encontrados: ${clients.length}`)
    
    if (clients.length > 0) {
      console.log('📋 Lista de clientes:')
      clients.forEach(client => {
        console.log(`- ID: ${client.id}, Nombre: ${client.firstname} ${client.lastname}, Email: ${client.email}, Activo: ${client.isActive}`)
      })
    } else {
      console.log('❌ No se encontraron clientes con rol CLIENT')
    }
    
    // También verificar todos los usuarios
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        role: true,
        isActive: true
      }
    })
    
    console.log(`\n🔍 Total de usuarios en la base de datos: ${allUsers.length}`)
    console.log('📋 Todos los usuarios:')
    allUsers.forEach(user => {
      console.log(`- ID: ${user.id}, Nombre: ${user.firstname} ${user.lastname}, Email: ${user.email}, Rol: ${user.role}, Activo: ${user.isActive}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkClients()
