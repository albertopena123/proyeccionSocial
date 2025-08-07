"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getResoluciones() {
    const session = await auth()
    
    if (!session) {
        throw new Error("No autorizado")
    }

    const resoluciones = await prisma.resolucion.findMany({
        include: {
            facultad: true,
            departamento: true,
            docentes: true,
            estudiantes: true,
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            approvedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    // Convertir Decimal a string para serialización
    const resolucionesSerializables = resoluciones.map(res => ({
        ...res,
        monto: res.monto ? res.monto.toString() : null
    }))

    return resolucionesSerializables
}

export async function revalidateResoluciones() {
    revalidatePath("/documents/resoluciones")
}