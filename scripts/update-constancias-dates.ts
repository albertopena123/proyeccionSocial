// Script para actualizar fechas de constancias para que aparezcan en el dashboard
import { prisma } from "../lib/prisma"
import { subDays, subMonths } from "date-fns"

async function updateConstanciasDates() {
    console.log("📅 Actualizando fechas de constancias para el dashboard...\n")
    
    // Obtener todas las constancias
    const constancias = await prisma.constancia.findMany({
        orderBy: { createdAt: 'asc' }
    })
    
    console.log(`Total de constancias a actualizar: ${constancias.length}`)
    
    if (constancias.length === 0) {
        console.log("No hay constancias para actualizar")
        return
    }
    
    // Distribuir las constancias en los últimos 6 meses
    const now = new Date()
    const constanciasPerMonth = Math.ceil(constancias.length / 6)
    
    let updatedCount = 0
    
    for (let monthIndex = 0; monthIndex < 6; monthIndex++) {
        const startIndex = monthIndex * constanciasPerMonth
        const endIndex = Math.min(startIndex + constanciasPerMonth, constancias.length)
        
        for (let i = startIndex; i < endIndex; i++) {
            const constancia = constancias[i]
            
            // Calcular nueva fecha: distribuir en el mes correspondiente
            const baseDate = subMonths(now, 5 - monthIndex) // Empezar desde hace 5 meses
            const daysInMonth = 30
            const dayOffset = Math.floor((i - startIndex) * (daysInMonth / constanciasPerMonth))
            const newDate = subDays(baseDate, -dayOffset) // Sumar días para distribuir en el mes
            
            // Actualizar la constancia
            await prisma.constancia.update({
                where: { id: constancia.id },
                data: {
                    createdAt: newDate,
                    updatedAt: newDate
                }
            })
            
            updatedCount++
            
            if (updatedCount % 50 === 0) {
                console.log(`✅ Actualizadas ${updatedCount} constancias...`)
            }
        }
    }
    
    console.log(`\n✨ Se actualizaron ${updatedCount} constancias exitosamente`)
    
    // Verificar la distribución
    console.log("\n📊 Distribución por mes:")
    for (let i = 5; i >= 0; i--) {
        const monthStart = subMonths(now, i)
        const monthEnd = subMonths(now, i - 1)
        
        const count = await prisma.constancia.count({
            where: {
                createdAt: {
                    gte: monthStart,
                    lt: monthEnd
                }
            }
        })
        
        const monthName = monthStart.toLocaleString('es', { month: 'long', year: 'numeric' })
        console.log(`  ${monthName}: ${count} constancias`)
    }
}

updateConstanciasDates()
    .catch(console.error)
    .finally(() => prisma.$disconnect())