import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { z } from "zod"
import { UserRole, PermissionAction } from "@prisma/client"
import { actorRole, canGrantRole, roleRank } from "@/lib/security/authz"

const rolePermissionSchema = z.object({
    roleId: z.nativeEnum(UserRole),
    permissionId: z.string(),
    actions: z.array(z.nativeEnum(PermissionAction)) // Ahora acepta PermissionAction enum
})

const bulkUpdateSchema = z.object({
    changes: z.array(rolePermissionSchema)
})

// POST /api/permissions/bulk-update - Actualizar permisos por rol en lote
export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        // hasPermission sin acción se conforma con READ: acceso de sólo lectura a
        // roles permitía reescribir los permisos de todo el sistema.
        const canManage = await hasPermission(session.user.id, "roles.access", PermissionAction.UPDATE)
        if (!canManage) {
            return NextResponse.json({ error: "Sin permisos para gestionar roles" }, { status: 403 })
        }

        const currentRole = await actorRole(session.user.id)
        if (!currentRole || roleRank(currentRole) < roleRank(UserRole.ADMIN)) {
            return NextResponse.json({ error: "Sin permisos para gestionar roles" }, { status: 403 })
        }

        const body = await request.json()
        const validatedData = bulkUpdateSchema.parse(body)

        // Sin esto, un ADMIN se concedía a sí mismo los permisos de SUPER_ADMIN
        // reescribiendo los de su propio rol o de uno superior.
        const forbidden = validatedData.changes.find(change => !canGrantRole(currentRole, change.roleId))
        if (forbidden) {
            return NextResponse.json(
                { error: "No puedes modificar los permisos de un rol igual o superior al tuyo" },
                { status: 403 }
            )
        }

        // Procesar cada cambio individualmente
        for (const change of validatedData.changes) {
            // Obtener todos los usuarios con este rol
            const users = await prisma.user.findMany({
                where: { role: change.roleId },
                select: { id: true }
            })

            // Para cada usuario del rol
            for (const user of users) {
                // Obtener el permiso actual del usuario para este permiso específico
                const existingPermission = await prisma.userPermission.findFirst({
                    where: {
                        userId: user.id,
                        permissionId: change.permissionId
                    }
                })

                if (change.actions.length === 0) {
                    // Si no hay acciones, eliminar este permiso específico
                    if (existingPermission) {
                        await prisma.userPermission.delete({
                            where: { id: existingPermission.id }
                        })
                    }
                } else {
                    // Si hay acciones, crear o actualizar este permiso específico
                    if (existingPermission) {
                        // Actualizar el permiso existente con las nuevas acciones
                        await prisma.userPermission.update({
                            where: { id: existingPermission.id },
                            data: {
                                actions: change.actions, // Actualizar las acciones
                                grantedBy: session.user.id,
                                grantedAt: new Date()
                            }
                        })
                    } else {
                        // Crear nuevo permiso con las acciones especificadas
                        await prisma.userPermission.create({
                            data: {
                                userId: user.id,
                                permissionId: change.permissionId,
                                actions: change.actions, // Incluir las acciones
                                grantedBy: session.user.id,
                                grantedAt: new Date()
                            }
                        })
                    }
                }
            }
        }

        // Registrar en auditoría
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: 'permissions.bulk_update',
                entity: 'UserPermission',
                entityId: 'bulk_update', // Usar un identificador especial para actualizaciones masivas
                changes: {
                    count: validatedData.changes.length,
                    details: validatedData.changes
                },
                metadata: {
                    ip: request.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown'
                }
            }
        })

        return NextResponse.json({ 
            success: true, 
            message: `${validatedData.changes.length} permisos actualizados exitosamente` 
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 })
        }
        console.error("Error actualizando permisos:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}