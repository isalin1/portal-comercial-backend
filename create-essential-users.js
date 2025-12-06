const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function createEssentialUsers() {
  try {
    console.log('🚀 Creando usuarios esenciales con DNIs únicos...')
    
    // 1. Crear SUPERADMIN
    console.log('\n👑 Creando SUPERADMIN...')
    const superadminPassword = await bcrypt.hash('123456', 10)
    const superadmin = await prisma.user.create({
      data: {
        email: 'ignacio.salinas@mia.com',
        password: superadminPassword,
        firstname: 'Ignacio',
        lastname: 'Salinas',
        dni: '12345678',
        phone: '999999999',
        role: 'SUPERADMIN',
        isActive: true,
        isEmailVerified: true
      }
    })
    console.log(`✅ SUPERADMIN creado: ${superadmin.firstname} ${superadmin.lastname} (DNI: ${superadmin.dni})`)
    
    // 2. Crear ADMIN
    console.log('\n👨‍💼 Creando ADMIN...')
    const adminPassword = await bcrypt.hash('123456', 10)
    const admin = await prisma.user.create({
      data: {
        email: 'milagros.costti@mia.com',
        password: adminPassword,
        firstname: 'Milagros',
        lastname: 'Costti',
        dni: '87654321',
        phone: '888888888',
        role: 'ADMIN',
        isActive: true,
        isEmailVerified: true
      }
    })
    console.log(`✅ ADMIN creado: ${admin.firstname} ${admin.lastname} (DNI: ${admin.dni})`)
    
    // 3. Crear COLABORADOR
    console.log('\n👷‍♂️ Creando COLABORADOR...')
    const colaboradorPassword = await bcrypt.hash('123456', 10)
    const colaborador = await prisma.user.create({
      data: {
        email: 'angelita.zapata@mia.com',
        password: colaboradorPassword,
        firstname: 'Angelita',
        lastname: 'Zapata',
        dni: '11223344',
        phone: '777777777',
        role: 'COLABORADOR',
        isActive: true,
        isEmailVerified: true
      }
    })
    console.log(`✅ COLABORADOR creado: ${colaborador.firstname} ${colaborador.lastname} (DNI: ${colaborador.dni})`)
    
    // 4. Crear algunos CLIENTES de prueba
    console.log('\n👥 Creando CLIENTES de prueba...')
    const clientPasswords = await Promise.all([
      bcrypt.hash('123456', 10),
      bcrypt.hash('123456', 10),
      bcrypt.hash('123456', 10)
    ])
    
    const clients = await Promise.all([
      prisma.user.create({
        data: {
          email: 'juan.perez@test.com',
          password: clientPasswords[0],
          firstname: 'Juan',
          lastname: 'Pérez',
          dni: '22334455',
          phone: '666666666',
          role: 'CLIENT',
          isActive: true,
          isEmailVerified: true
        }
      }),
      prisma.user.create({
        data: {
          email: 'maria.garcia@test.com',
          password: clientPasswords[1],
          firstname: 'María',
          lastname: 'García',
          dni: '33445566',
          phone: '555555555',
          role: 'CLIENT',
          isActive: true,
          isEmailVerified: true
        }
      }),
      prisma.user.create({
        data: {
          email: 'carlos.lopez@test.com',
          password: clientPasswords[2],
          firstname: 'Carlos',
          lastname: 'López',
          dni: '44556677',
          phone: '444444444',
          role: 'CLIENT',
          isActive: false, // Cliente inactivo para probar
          isEmailVerified: true
        }
      })
    ])
    
    clients.forEach(client => {
      console.log(`✅ CLIENTE creado: ${client.firstname} ${client.lastname} (DNI: ${client.dni}) - Estado: ${client.isActive ? 'Activo' : 'Inactivo'}`)
    })
    
    // 5. Verificación final
    console.log('\n📊 Verificación final...')
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
    
    console.log(`\n🎉 Usuarios creados exitosamente:`)
    allUsers.forEach(user => {
      console.log(`- ${user.role}: ${user.firstname} ${user.lastname} (DNI: ${user.dni}) - ${user.isActive ? 'Activo' : 'Inactivo'}`)
    })
    
    console.log(`\n📋 Resumen:`)
    console.log(`- Total usuarios: ${allUsers.length}`)
    console.log(`- SUPERADMIN: ${allUsers.filter(u => u.role === 'SUPERADMIN').length}`)
    console.log(`- ADMIN: ${allUsers.filter(u => u.role === 'ADMIN').length}`)
    console.log(`- COLABORADOR: ${allUsers.filter(u => u.role === 'COLABORADOR').length}`)
    console.log(`- CLIENT: ${allUsers.filter(u => u.role === 'CLIENT').length}`)
    
    // Verificar que no hay DNIs duplicados
    const dnis = allUsers.map(u => u.dni)
    const uniqueDnis = [...new Set(dnis)]
    if (dnis.length === uniqueDnis.length) {
      console.log(`✅ Todos los DNIs son únicos`)
    } else {
      console.log(`❌ Hay DNIs duplicados`)
    }
    
    console.log(`\n🔑 Credenciales de acceso:`)
    console.log(`SUPERADMIN: ignacio.salinas@mia.com / 123456`)
    console.log(`ADMIN: milagros.costti@mia.com / 123456`)
    console.log(`COLABORADOR: angelita.zapata@mia.com / 123456`)
    console.log(`CLIENTE: juan.perez@test.com / 123456`)
    
  } catch (error) {
    console.error('❌ Error creando usuarios:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createEssentialUsers()
