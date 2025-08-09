// Script para verificar y poblar datos del dashboard
import { prisma } from "../lib/prisma"

async function checkDashboardData() {
    console.log("🔍 Verificando datos del dashboard...\n")
    
    // Verificar constancias
    const constanciasCount = await prisma.constancia.count()
    console.log(`📄 Constancias en la BD: ${constanciasCount}`)
    
    if (constanciasCount > 0) {
        const constancias = await prisma.constancia.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        })
        console.log("Últimas constancias:")
        constancias.forEach(c => {
            console.log(`  - #${c.constanciaNumber} - ${c.fullName} - ${c.status} - ${c.createdAt.toLocaleDateString()}`)
        })
    }
    
    // Verificar resoluciones
    const resolucionesCount = await prisma.resolucion.count()
    console.log(`\n📋 Resoluciones en la BD: ${resolucionesCount}`)
    
    if (resolucionesCount > 0) {
        const resoluciones = await prisma.resolucion.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        })
        console.log("Últimas resoluciones:")
        resoluciones.forEach(r => {
            console.log(`  - #${r.numeroResolucion} - ${r.tituloProyecto} - ${r.status} - ${r.createdAt.toLocaleDateString()}`)
        })
    }
    
    // Si no hay datos, preguntar si quiere crear datos de prueba
    if (constanciasCount === 0 && resolucionesCount === 0) {
        console.log("\n⚠️  No hay datos en el sistema.")
        console.log("Ejecuta 'npm run seed' para poblar la base de datos con datos de prueba.")
    } else {
        // Verificar datos de los últimos 6 meses para el gráfico
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        
        const constanciasLast6Months = await prisma.constancia.count({
            where: {
                createdAt: {
                    gte: sixMonthsAgo
                }
            }
        })
        
        const resolucionesLast6Months = await prisma.resolucion.count({
            where: {
                createdAt: {
                    gte: sixMonthsAgo
                }
            }
        })
        
        console.log(`\n📊 Datos de los últimos 6 meses:`)
        console.log(`  - Constancias: ${constanciasLast6Months}`)
        console.log(`  - Resoluciones: ${resolucionesLast6Months}`)
        
        if (constanciasLast6Months === 0 && resolucionesLast6Months === 0) {
            console.log("\n⚠️  Los datos existentes son muy antiguos (más de 6 meses).")
            console.log("Los gráficos del dashboard pueden aparecer vacíos.")
        }
    }
    
    // Verificar usuarios
    const usersCount = await prisma.user.count()
    const activeUsers = await prisma.user.count({
        where: {
            isActive: true,
            emailVerified: { not: null }
        }
    })
    console.log(`\n👥 Usuarios: ${activeUsers} activos de ${usersCount} totales`)
}

checkDashboardData()
    .catch(console.error)
    .finally(() => prisma.$disconnect())