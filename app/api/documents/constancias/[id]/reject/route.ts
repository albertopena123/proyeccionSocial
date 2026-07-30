import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"
import { NextResponse } from "next/server"

// POST /api/documents/constancias/[id]/reject - Rechazar una constancia
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()

        if (!session) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            )
        }

        const canReject = await hasPermission(session.user.id, "constancias.access", PermissionAction.UPDATE)
        if (!canReject) {
            return NextResponse.json(
                { error: "Sin permisos para rechazar constancias" },
                { status: 403 }
            )
        }

        const { id } = await params

        // Verificar si la constancia existe
        const existingConstancia = await prisma.constancia.findUnique({
            where: {
                id: id
            }
        })

        if (!existingConstancia) {
            return NextResponse.json(
                { error: "Constancia no encontrada" },
                { status: 404 }
            )
        }

        // Verificar que la constancia esté pendiente
        if (existingConstancia.status !== "PENDIENTE") {
            return NextResponse.json(
                { error: "Solo se pueden rechazar constancias pendientes" },
                { status: 400 }
            )
        }

        // Rechazar la constancia
        const constancia = await prisma.constancia.update({
            where: {
                id: id
            },
            data: {
                status: "RECHAZADO"
            },
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
            }
        })

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: 'constancias.rejected',
                entity: 'Constancia',
                entityId: id,
                metadata: {
                    constanciaNumber: existingConstancia.constanciaNumber,
                    ip: request.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown'
                }
            }
        })

        return NextResponse.json(constancia)
    } catch (error) {
        console.error("Error rejecting constancia:", error)
        return NextResponse.json(
            { error: "Error al rechazar la constancia" },
            { status: 500 }
        )
    }
}
