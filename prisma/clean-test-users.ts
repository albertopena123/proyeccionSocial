// Script para limpiar usuarios de prueba
// Ejecutar con: npx ts-node prisma/clean-test-users.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanTestUsers() {
  console.log('🧹 Limpiando usuarios de prueba...')
  
  try {
    // Eliminar usuarios de prueba específicos
    const testEmails = [
      'test@unamad.edu.pe',
      'prueba@unamad.edu.pe',
      'demo@unamad.edu.pe',
    ]
    
    const result = await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { in: testEmails } },
          { personalEmail: { in: ['test@example.com', 'prueba@gmail.com'] } }
        ]
      }
    })
    
    console.log(`✅ ${result.count} usuarios de prueba eliminados`)
    
    // Opcional: Listar usuarios restantes
    const remainingUsers = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })
    
    console.log('\n📊 Usuarios restantes en el sistema:')
    remainingUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Activo: ${user.isActive ? '✓' : '✗'}`)
    })
    
  } catch (error) {
    console.error('❌ Error limpiando usuarios:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanTestUsers()