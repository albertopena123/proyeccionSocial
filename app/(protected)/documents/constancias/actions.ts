"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"

export async function getConstancias() {
    const session = await auth()

    if (!session) {
        throw new Error("No autorizado")
    }

    // Una server action es invocable directamente por cualquiera con sesión, así
    // que necesita la misma comprobación que la ruta de API equivalente.
    const canRead = await hasPermission(session.user.id, "constancias.access", PermissionAction.READ)
    if (!canRead) {
        throw new Error("Sin permisos para ver constancias")
    }

    const constancias = await prisma.constancia.findMany({
        include: {
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

    return constancias
}

export async function revalidateConstancias() {
    revalidatePath("/documents/constancias")
}