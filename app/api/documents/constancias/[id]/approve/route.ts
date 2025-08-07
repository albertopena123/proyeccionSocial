import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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

        return NextResponse.json(constancia)
    } catch (error) {
        console.error("Error approving constancia:", error)
        return NextResponse.json(
            { error: "Error al aprobar la constancia" },
            { status: 500 }
        )
    }
}