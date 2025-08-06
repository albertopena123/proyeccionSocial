import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"
import { z } from "zod"

const updateModuleSchema = z.object({
    name: z.string().min(1, "El nombre es requerido").optional(),
    slug: z.string().min(1, "El slug es requerido").regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones").optional(),
    description: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    order: z.number().int().min(0).optional()
})

// GET /api/modules/[moduleId] - Obtener un módulo específico
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ moduleId: string }> }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const { moduleId } = await params
        const foundModule = await prisma.module.findUnique({
            where: { id: moduleId },
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

        if (!foundModule) {
            return NextResponse.json({ error: "Módulo no encontrado" }, { status: 404 })
        }

        return NextResponse.json(foundModule)
    } catch (error) {
        console.error("Error obteniendo módulo:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}

// PATCH /api/modules/[moduleId] - Actualizar módulo
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ moduleId: string }> }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const canUpdate = await hasPermission(session.user.id, "roles.access", PermissionAction.UPDATE)
        if (!canUpdate) {
            return NextResponse.json({ error: "Sin permisos para actualizar módulos" }, { status: 403 })
        }

        const body = await request.json()
        const validatedData = updateModuleSchema.parse(body)

        const { moduleId } = await params
        // Verificar que el módulo existe
        const existingModule = await prisma.module.findUnique({
            where: { id: moduleId }
        })

        if (!existingModule) {
            return NextResponse.json({ error: "Módulo no encontrado" }, { status: 404 })
        }

        // Si se cambia el slug, verificar que no exista
        if (validatedData.slug && validatedData.slug !== existingModule.slug) {
            const slugExists = await prisma.module.findUnique({
                where: { slug: validatedData.slug }
            })

            if (slugExists) {
                return NextResponse.json({ error: "El slug ya está en uso" }, { status: 400 })
            }
        }

        // Actualizar módulo
        const updatedModule = await prisma.module.update({
            where: { id: moduleId },
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
                action: "module.updated",
                entity: "Module",
                entityId: updatedModule.id,
                changes: {
                    before: existingModule,
                    after: updatedModule
                },
                metadata: {
                    ip: request.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown'
                }
            }
        })

        return NextResponse.json(updatedModule)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 })
        }
        console.error("Error actualizando módulo:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}

// DELETE /api/modules/[moduleId] - Eliminar módulo
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ moduleId: string }> }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const canDelete = await hasPermission(session.user.id, "roles.access", PermissionAction.DELETE)
        if (!canDelete) {
            return NextResponse.json({ error: "Sin permisos para eliminar módulos" }, { status: 403 })
        }

        const { moduleId } = await params
        // Verificar que el módulo existe
        const existingModule = await prisma.module.findUnique({
            where: { id: moduleId },
            include: {
                _count: {
                    select: {
                        permissions: true,
                        submodules: true
                    }
                }
            }
        })

        if (!existingModule) {
            return NextResponse.json({ error: "Módulo no encontrado" }, { status: 404 })
        }

        // Verificar si tiene submódulos o permisos
        if (existingModule._count.submodules > 0 || existingModule._count.permissions > 0) {
            return NextResponse.json({ 
                error: "No se puede eliminar un módulo con submódulos o permisos asociados" 
            }, { status: 400 })
        }

        // Eliminar módulo
        await prisma.module.delete({
            where: { id: moduleId }
        })

        // Registrar en auditoría
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "module.deleted",
                entity: "Module",
                entityId: moduleId,
                changes: {
                    before: existingModule
                },
                metadata: {
                    ip: request.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown'
                }
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error eliminando módulo:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}