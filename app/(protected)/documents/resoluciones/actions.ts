"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"

export async function getResoluciones() {
    const session = await auth()

    if (!session) {
        throw new Error("No autorizado")
    }

    // Una server action es invocable directamente por cualquiera con sesión, así
    // que necesita la misma comprobación que la ruta de API equivalente.
    const canRead = await hasPermission(session.user.id, "resoluciones.access", PermissionAction.READ)
    if (!canRead) {
        throw new Error("Sin permisos para ver resoluciones")
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