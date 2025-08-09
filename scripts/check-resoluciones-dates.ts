// Script para verificar la distribución de fechas de resoluciones
import { prisma } from "../lib/prisma"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"

async function checkResolucionesDates() {
    console.log("🔍 Verificando distribución de fechas de resoluciones...\n")
    
    // Obtener todas las resoluciones
    const totalResoluciones = await prisma.resolucion.count()
    console.log(`Total de resoluciones: ${totalResoluciones}\n`)
    
    // Obtener muestra de resoluciones con sus fechas
    const resoluciones = await prisma.resolucion.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
            numeroResolucion: true,
            createdAt: true,
            tituloProyecto: true
        }
    })
    
    console.log("📅 Muestra de resoluciones y sus fechas:")
    resoluciones.forEach(r => {
        console.log(`  - #${r.numeroResolucion}: ${r.createdAt.toLocaleDateString('es-ES')} - ${r.tituloProyecto.substring(0, 50)}...`)
    })
    
    // Verificar distribución por mes (últimos 6 meses)
    console.log("\n📊 Distribución por mes (últimos 6 meses):")
    const now = new Date()
    
    for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i))
        const monthEnd = endOfMonth(subMonths(now, i))
        
        const count = await prisma.resolucion.count({
            where: {
                createdAt: {
                    gte: monthStart,
                    lte: monthEnd
                }
            }
        })
        
        const monthName = monthStart.toLocaleString('es', { month: 'long', year: 'numeric' })
        const percentage = totalResoluciones > 0 ? ((count / totalResoluciones) * 100).toFixed(1) : 0
        console.log(`  ${monthName}: ${count} resoluciones (${percentage}%)`)
    }
    
    // Verificar años
    console.log("\n📆 Distribución por año:")
    const resolucionesByYear = await prisma.resolucion.groupBy({
        by: ['createdAt'],
        _count: true
    })
    
    const yearCounts = new Map<number, number>()
    resolucionesByYear.forEach(r => {
        const year = r.createdAt.getFullYear()
        yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
    })
    
    Array.from(yearCounts.entries())
        .sort((a, b) => b[0] - a[0])
        .forEach(([year, count]) => {
            console.log(`  ${year}: ${count} resoluciones`)
        })
    
    // Verificar resoluciones del mes actual
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    
    const thisMonthResoluciones = await prisma.resolucion.count({
        where: {
            createdAt: {
                gte: thisMonthStart,
                lte: thisMonthEnd
            }
        }
    })
    
    console.log(`\n⚠️  Resoluciones en el mes actual (${now.toLocaleString('es', { month: 'long' })}): ${thisMonthResoluciones}`)
    
    if (thisMonthResoluciones === totalResoluciones) {
        console.log("❌ PROBLEMA DETECTADO: Todas las resoluciones están en el mes actual!")
        console.log("   Esto explicaría por qué el gráfico muestra todo en un solo mes.")
    }
}

checkResolucionesDates()
    .catch(console.error)
    .finally(() => prisma.$disconnect())