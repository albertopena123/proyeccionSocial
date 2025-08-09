// Script para verificar la distribución mensual exacta como lo hace el dashboard
import { prisma } from "../lib/prisma"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"

async function verifyMonthlyDistribution() {
    console.log("📊 Verificando distribución mensual (como en el dashboard)...\n")
    
    const now = new Date()
    const monthlyData = []
    
    // Simular exactamente lo que hace el dashboard
    for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i))
        const monthEnd = endOfMonth(subMonths(now, i))
        
        const [constancias, resoluciones] = await Promise.all([
            prisma.constancia.count({
                where: {
                    createdAt: {
                        gte: monthStart,
                        lte: monthEnd
                    }
                }
            }),
            prisma.resolucion.count({
                where: {
                    createdAt: {
                        gte: monthStart,
                        lte: monthEnd
                    }
                }
            })
        ])

        const monthName = monthStart.toLocaleString('es', { month: 'short' })
        
        monthlyData.push({
            month: monthName,
            constancias,
            resoluciones,
            total: constancias + resoluciones
        })
        
        console.log(`${monthName.padEnd(5)} - Constancias: ${constancias.toString().padEnd(3)} | Resoluciones: ${resoluciones.toString().padEnd(3)} | Total: ${(constancias + resoluciones).toString().padEnd(3)}`)
    }
    
    console.log("\n✅ Resumen:")
    console.log(`Total Constancias: ${monthlyData.reduce((sum, m) => sum + m.constancias, 0)}`)
    console.log(`Total Resoluciones: ${monthlyData.reduce((sum, m) => sum + m.resoluciones, 0)}`)
    console.log(`Total General: ${monthlyData.reduce((sum, m) => sum + m.total, 0)}`)
    
    console.log("\n📈 Datos para el gráfico (formato JSON):")
    console.log(JSON.stringify(monthlyData, null, 2))
}

verifyMonthlyDistribution()
    .catch(console.error)
    .finally(() => prisma.$disconnect())