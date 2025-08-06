import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"
import { z } from "zod"

const createModuleSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    slug: z.string().min(1, "El slug es requerido").regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones"),
    description: z.string().optional(),
    icon: z.string().optional(),
    isActive: z.boolean().default(true),
    order: z.number().int().min(0).default(0)
})

// GET /api/modules - Obtener todos los módulos
export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const modules = await prisma.module.findMany({
            include: {
                submodules: {
                    include: {
                        permissions: true
                    },
                    orderBy: { order: 'asc' }
                },
                permissions: {
                    where: { submoduleId: null }
                },
                MenuItem: true,
                ModuleSettings: true,
                _count: {
                    select: {
                        permissions: true,
                        submodules: true
                    }
                }
            },
            orderBy: { order: 'asc' }
        })

        return NextResponse.json(modules)
    } catch (error) {
        console.error("Error obteniendo módulos:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}

// POST /api/modules - Crear nuevo módulo
export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const canManage = await hasPermission(session.user.id, "roles.access", PermissionAction.CREATE)
        if (!canManage) {
            return NextResponse.json({ error: "Sin permisos para crear módulos" }, { status: 403 })
        }

        const body = await request.json()
        const validatedData = createModuleSchema.parse(body)

        // Verificar si el slug ya existe
        const existingModule = await prisma.module.findUnique({
            where: { slug: validatedData.slug }
        })

        if (existingModule) {
            return NextResponse.json({ error: "El slug ya está en uso" }, { status: 400 })
        }

        // Si no se especifica orden, usar el siguiente disponible
        if (validatedData.order === 0) {
            const maxOrder = await prisma.module.findFirst({
                orderBy: { order: 'desc' },
                select: { order: true }
            })
            validatedData.order = (maxOrder?.order || 0) + 1
        }

        // Crear módulo
        const newModule = await prisma.module.create({
            data: validatedData,
            include: {
                submodules: {
                    include: {
                        permissions: true
                    },
                    orderBy: { order: 'asc' }
                },
                permissions: {
                    where: { submoduleId: null }
                },
                MenuItem: true,
                ModuleSettings: true,
                _count: {
                    select: {
                        permissions: true,
                        submodules: true
                    }
                }
            }
        })

        // Registrar en auditoría
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "module.created",
                entity: "Module",
                entityId: newModule.id,
                changes: {
                    new: newModule
                },
                metadata: {
                    ip: request.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown'
                }
            }
        })

        return NextResponse.json(newModule)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 })
        }
        console.error("Error creando módulo:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}