import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await auth()
        
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const canUpdate = await hasPermission(
            session.user.id,
            "resoluciones.access",
            PermissionAction.UPDATE
        )

        if (!canUpdate) {
            return NextResponse.json({ error: "Sin permisos para rechazar resoluciones" }, { status: 403 })
        }

        // Verificar que la resolución existe
        const existingResolucion = await prisma.resolucion.findUnique({
            where: { id }
        })

        if (!existingResolucion) {
            return NextResponse.json({ error: "Resolución no encontrada" }, { status: 404 })
        }

        if (existingResolucion.status === 'RECHAZADO') {
            return NextResponse.json(
                { error: "La resolución ya está rechazada" },
                { status: 400 }
            )
        }

        // Rechazar la resolución
        const resolucion = await prisma.resolucion.update({
            where: { id },
            data: {
                status: 'RECHAZADO',
                approvedById: null,
                approvedAt: null
            },
            include: {
                facultad: true,
                departamento: true,
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
            }
        })

        return NextResponse.json(resolucion)
    } catch (error) {
        console.error("Error al rechazar resolución:", error)
        return NextResponse.json(
            { error: "Error al rechazar la resolución" },
            { status: 500 }
        )
    }
}