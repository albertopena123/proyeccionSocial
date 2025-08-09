// Script para redistribuir las fechas de resoluciones en los últimos 6 meses
import { prisma } from "../lib/prisma"
import { subMonths, startOfMonth, addDays } from "date-fns"

async function updateResolucionesDates() {
    console.log("📅 Redistribuyendo fechas de resoluciones para el dashboard...\n")
    
    // Obtener todas las resoluciones
    const resoluciones = await prisma.resolucion.findMany({
        orderBy: { numeroResolucion: 'asc' }
    })
    
    console.log(`Total de resoluciones a actualizar: ${resoluciones.length}`)
    
    if (resoluciones.length === 0) {
        console.log("No hay resoluciones para actualizar")
        return
    }
    
    // Distribuir las resoluciones en los últimos 6 meses
    const now = new Date()
    const resolucionesPerMonth = Math.ceil(resoluciones.length / 6)
    
    let updatedCount = 0
    const updatePromises = []
    
    for (let monthIndex = 0; monthIndex < 6; monthIndex++) {
        const startIndex = monthIndex * resolucionesPerMonth
        const endIndex = Math.min(startIndex + resolucionesPerMonth, resoluciones.length)
        
        // Fecha base para este mes (hace 5-monthIndex meses)
        const monthBase = startOfMonth(subMonths(now, 5 - monthIndex))
        
        for (let i = startIndex; i < endIndex; i++) {
            const resolucion = resoluciones[i]
            
            // Distribuir las resoluciones a lo largo del mes
            const daysToAdd = Math.floor(((i - startIndex) / resolucionesPerMonth) * 28) // Usar 28 días para estar seguros
            const newDate = addDays(monthBase, daysToAdd)
            
            // Actualizar la resolución
            updatePromises.push(
                prisma.resolucion.update({
                    where: { id: resolucion.id },
                    data: {
                        createdAt: newDate,
                        updatedAt: newDate
                    }
                })
            )
            
            updatedCount++
            
            // Ejecutar en lotes de 50 para evitar sobrecarga
            if (updatePromises.length >= 50) {
                await Promise.all(updatePromises)
                console.log(`✅ Actualizadas ${updatedCount} resoluciones...`)
                updatePromises.length = 0
            }
        }
    }
    
    // Ejecutar las actualizaciones restantes
    if (updatePromises.length > 0) {
        await Promise.all(updatePromises)
    }
    
    console.log(`\n✨ Se actualizaron ${updatedCount} resoluciones exitosamente`)
    
    // Verificar la nueva distribución
    console.log("\n📊 Nueva distribución por mes:")
    for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i))
        const monthEnd = startOfMonth(subMonths(now, i - 1))
        
        const count = await prisma.resolucion.count({
            where: {
                createdAt: {
                    gte: monthStart,
                    lt: i === 0 ? new Date() : monthEnd
                }
            }
        })
        
        const monthName = monthStart.toLocaleString('es', { month: 'long', year: 'numeric' })
        console.log(`  ${monthName}: ${count} resoluciones`)
    }
    
    // Verificar muestra de las fechas actualizadas
    console.log("\n📅 Muestra de resoluciones con fechas actualizadas:")
    const sample = await prisma.resolucion.findMany({
        take: 10,
        orderBy: { createdAt: 'asc' },
        select: {
            numeroResolucion: true,
            createdAt: true
        }
    })
    
    sample.forEach(r => {
        console.log(`  - #${r.numeroResolucion}: ${r.createdAt.toLocaleDateString('es-ES')}`)
    })
}

updateResolucionesDates()
    .catch(console.error)
    .finally(() => prisma.$disconnect())