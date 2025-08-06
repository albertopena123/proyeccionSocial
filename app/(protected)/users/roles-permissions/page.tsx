// app/(protected)/users/roles-permissions/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { RolesPermissionsSimpleView } from "@/components/users/roles-permissions-simple-view"
import { UserRole } from "@prisma/client"

export default async function RolesPermissionsPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // Verificar permisos - usando el nuevo sistema simplificado
    const canManageRoles = await hasPermission(session.user.id, "roles.access")

    if (!canManageRoles) {
        redirect("/dashboard")
    }

    // Obtener módulos con submódulos y permisos
    const modules = await prisma.module.findMany({
        where: { isActive: true },
        include: {
            submodules: {
                where: { isActive: true },
                include: {
                    permissions: {
                        include: {
                            users: {
                                include: {
                                    user: {
                                        select: {
                                            role: true
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: { name: 'asc' }
                    }
                },
                orderBy: { order: 'asc' }
            }
        },
        orderBy: { order: 'asc' }
    })

    // Obtener todos los permisos con usuarios asignados y sus acciones
    const allPermissions = await prisma.permission.findMany({
        include: {
            users: {
                include: {
                    user: {
                        select: {
                            id: true,
                            role: true
                        }
                    }
                }
            }
        }
    })

    // Crear un mapa de permisos por rol basado en los usuarios actuales
    // Este es un sistema simplificado donde asumimos que todos los usuarios
    // de un rol tienen los mismos permisos
    interface RolePermission {
        roleId: string
        permissionId: string
        actions: string[]
    }
    const rolePermissions: RolePermission[] = []

    // Agrupar permisos por rol con las acciones reales de la BD
    const permissionsByRole = new Map<string, Map<string, string[]>>()

    for (const permission of allPermissions) {
        for (const userPerm of permission.users) {
            if (!permissionsByRole.has(userPerm.user.role)) {
                permissionsByRole.set(userPerm.user.role, new Map())
            }
            const rolePermMap = permissionsByRole.get(userPerm.user.role)!
            
            // Obtener las acciones actuales o crear un array vacío
            const currentActions = rolePermMap.get(permission.id) || []
            
            // Combinar con las nuevas acciones (evitar duplicados)
            const allActions = [...new Set([...currentActions, ...userPerm.actions])]
            rolePermMap.set(permission.id, allActions)
        }
    }

    // Convertir a formato esperado por el componente
    for (const [role, permissions] of permissionsByRole.entries()) {
        for (const [permissionId, actions] of permissions.entries()) {
            rolePermissions.push({
                roleId: role,
                permissionId: permissionId,
                actions: actions // Usar las acciones reales de la BD
            })
        }
    }

    // Agregar permisos predeterminados para SUPER_ADMIN (todos)
    for (const mod of modules) {
        for (const submodule of mod.submodules) {
            for (const permission of submodule.permissions) {
                // Si no existe un permiso para SUPER_ADMIN, agregarlo
                const exists = rolePermissions.some(
                    rp => rp.roleId === UserRole.SUPER_ADMIN && rp.permissionId === permission.id
                )
                if (!exists) {
                    rolePermissions.push({
                        roleId: UserRole.SUPER_ADMIN,
                        permissionId: permission.id,
                        actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'] // SUPER_ADMIN tiene todas las acciones
                    })
                }
            }
        }
    }

    return <RolesPermissionsSimpleView
        modules={modules}
        rolePermissions={rolePermissions}
        currentUserId={session.user.id}
    />
}