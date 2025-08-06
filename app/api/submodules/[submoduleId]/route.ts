import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"
import { z } from "zod"

const updateSubmoduleSchema = z.object({
    name: z.string().min(1, "El nombre es requerido").optional(),
    slug: z.string().min(1, "El slug es requerido").regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones").optional(),
    description: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    order: z.number().int().min(0).optional()
})

// PATCH /api/submodules/[submoduleId] - Actualizar submódulo
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ submoduleId: string }> }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const canUpdate = await hasPermission(session.user.id, "roles.access", PermissionAction.UPDATE)
        if (!canUpdate) {
            return NextResponse.json({ error: "Sin permisos para actualizar submódulos" }, { status: 403 })
        }

        const body = await request.json()
        const validatedData = updateSubmoduleSchema.parse(body)

        const { submoduleId } = await params
        // Verificar que el submódulo existe
        const existingSubmodule = await prisma.submodule.findUnique({
            where: { id: submoduleId },
            include: { module: true }
        })

        if (!existingSubmodule) {
            return NextResponse.json({ error: "Submódulo no encontrado" }, { status: 404 })
        }

        // Si se cambia el slug, verificar que no exista en el mismo módulo
        if (validatedData.slug && validatedData.slug !== existingSubmodule.slug) {
            const slugExists = await prisma.submodule.findFirst({
                where: {
                    moduleId: existingSubmodule.moduleId,
                    slug: validatedData.slug,
                    NOT: { id: submoduleId }
                }
            })

            if (slugExists) {
                return NextResponse.json({ error: "El slug ya está en uso en este módulo" }, { status: 400 })
            }
        }

        // Actualizar submódulo
        const updatedSubmodule = await prisma.submodule.update({
            where: { id: submoduleId },
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
                action: "submodule.updated",
                entity: "Submodule",
                entityId: updatedSubmodule.id,
                changes: {
                    before: existingSubmodule,
                    after: updatedSubmodule
                },
                metadata: {
                    ip: request.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown'
                }
            }
        })

        return NextResponse.json(updatedSubmodule)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 })
        }
        console.error("Error actualizando submódulo:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}

// DELETE /api/submodules/[submoduleId] - Eliminar submódulo
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ submoduleId: string }> }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const canDelete = await hasPermission(session.user.id, "roles.access", PermissionAction.DELETE)
        if (!canDelete) {
            return NextResponse.json({ error: "Sin permisos para eliminar submódulos" }, { status: 403 })
        }

        const { submoduleId } = await params
        // Verificar que el submódulo existe
        const existingSubmodule = await prisma.submodule.findUnique({
            where: { id: submoduleId },
            include: {
                _count: {
                    select: {
                        permissions: true
                    }
                }
            }
        })

        if (!existingSubmodule) {
            return NextResponse.json({ error: "Submódulo no encontrado" }, { status: 404 })
        }

        // Verificar si tiene permisos asociados
        if (existingSubmodule._count.permissions > 0) {
            return NextResponse.json({ 
                error: "No se puede eliminar un submódulo con permisos asociados" 
            }, { status: 400 })
        }

        // Eliminar submódulo
        await prisma.submodule.delete({
            where: { id: submoduleId }
        })

        // Registrar en auditoría
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "submodule.deleted",
                entity: "Submodule",
                entityId: submoduleId,
                changes: {
                    before: existingSubmodule
                },
                metadata: {
                    ip: request.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown'
                }
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error eliminando submódulo:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}