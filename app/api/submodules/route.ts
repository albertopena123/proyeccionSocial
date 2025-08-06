import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"
import { z } from "zod"

const createSubmoduleSchema = z.object({
    moduleId: z.string().min(1, "El módulo es requerido"),
    name: z.string().min(1, "El nombre es requerido"),
    slug: z.string().min(1, "El slug es requerido").regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones"),
    description: z.string().optional(),
    icon: z.string().optional(),
    isActive: z.boolean().default(true),
    order: z.number().int().min(0).default(0)
})

// POST /api/submodules - Crear nuevo submódulo
export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const canManage = await hasPermission(session.user.id, "roles.access", PermissionAction.CREATE)
        if (!canManage) {
            return NextResponse.json({ error: "Sin permisos para crear submódulos" }, { status: 403 })
        }

        const body = await request.json()
        const validatedData = createSubmoduleSchema.parse(body)

        // Verificar que el módulo existe
        const foundModule = await prisma.module.findUnique({
            where: { id: validatedData.moduleId }
        })

        if (!foundModule) {
            return NextResponse.json({ error: "Módulo no encontrado" }, { status: 404 })
        }

        // Verificar si el slug ya existe en este módulo
        const existingSubmodule = await prisma.submodule.findFirst({
            where: {
                moduleId: validatedData.moduleId,
                slug: validatedData.slug
            }
        })

        if (existingSubmodule) {
            return NextResponse.json({ error: "El slug ya está en uso en este módulo" }, { status: 400 })
        }

        // Si no se especifica orden, usar el siguiente disponible
        if (validatedData.order === 0) {
            const maxOrder = await prisma.submodule.findFirst({
                where: { moduleId: validatedData.moduleId },
                orderBy: { order: 'desc' },
                select: { order: true }
            })
            validatedData.order = (maxOrder?.order || 0) + 1
        }

        // Crear submódulo
        const newSubmodule = await prisma.submodule.create({
            data: validatedData,
            include: {
                permissions: true,
                module: true
            }
        })

        // Registrar en auditoría
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "submodule.created",
                entity: "Submodule",
                entityId: newSubmodule.id,
                changes: {
                    new: newSubmodule
                },
                metadata: {
                    ip: request.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown'
                }
            }
        })

        return NextResponse.json(newSubmodule)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 })
        }
        console.error("Error creando submódulo:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}