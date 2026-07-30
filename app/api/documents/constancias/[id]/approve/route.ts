import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"
import { NextResponse } from "next/server"

// POST /api/documents/constancias/[id]/approve - Aprobar una constancia
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

        // Aprobar publica la constancia en la consulta ciudadana. Sin esta
        // comprobación cualquier usuario con sesión podía crear una constancia y
        // aprobarla acto seguido, emitiendo un documento oficial falso.
        const canApprove = await hasPermission(session.user.id, "constancias.access", PermissionAction.UPDATE)
        if (!canApprove) {
            return NextResponse.json(
                { error: "Sin permisos para aprobar constancias" },
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
                { error: "Solo se pueden aprobar constancias pendientes" },
                { status: 400 }
            )
        }

        // Aprobar la constancia
        const constancia = await prisma.constancia.update({
            where: {
                id: id
            },
            data: {
                status: "APROBADO",
                approvedById: session.user.id,
                approvedAt: new Date()
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
                action: 'constancias.approved',
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
        console.error("Error approving constancia:", error)
        return NextResponse.json(
            { error: "Error al aprobar la constancia" },
            { status: 500 }
        )
    }
}
