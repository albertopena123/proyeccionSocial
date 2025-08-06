import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"
import { ModulesManagementView } from "@/components/users/modules-management-view"

export default async function ModulesManagementPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // Verificar permisos - usando el nuevo sistema simplificado
    const canManageModules = await hasPermission(session.user.id, "modules.access", PermissionAction.READ)
    
    if (!canManageModules) {
        redirect("/dashboard")
    }

    // Obtener todos los módulos con sus submódulos y permisos
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

    // Estadísticas
    const stats = {
        totalModules: modules.length,
        activeModules: modules.filter(m => m.isActive).length,
        totalSubmodules: modules.reduce((acc, m) => acc + m.submodules.length, 0),
        totalPermissions: await prisma.permission.count()
    }

    return <ModulesManagementView 
        modules={modules}
        stats={stats}
    />
}