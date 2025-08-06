// lib/services/modules/modules.service.ts
import { prisma } from "@/lib/prisma"
import { UserRole, Module } from "@prisma/client"

export async function getUserModules(userId: string, userRole: UserRole) {
    if (userRole === UserRole.SUPER_ADMIN) {
        return await getAllActiveModules()
    }
    return await getModulesByUserPermissions(userId)
}

async function getAllActiveModules() {
    return await prisma.module.findMany({
        where: { isActive: true },
        include: {
            submodules: {
                where: { isActive: true },
                orderBy: { order: 'asc' }
            }
        },
        orderBy: { order: 'asc' }
    })
}

async function getModulesByUserPermissions(userId: string) {
    const userPermissions = await prisma.userPermission.findMany({
        where: { 
            userId,
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
            ]
        },
        include: {
            permission: {
                include: {
                    submodule: true,
                    module: true
                }
            }
        }
    })

    // Mapa para almacenar módulos y sus submódulos permitidos
    const modulesMap = new Map<string, {
        module: Module,
        allowedSubmoduleIds: Set<string>
    }>()
    
    // Recopilar módulos y submódulos permitidos
    userPermissions.forEach(up => {
        if (up.permission.module?.isActive) {
            const moduleId = up.permission.module.id
            
            if (!modulesMap.has(moduleId)) {
                modulesMap.set(moduleId, {
                    module: up.permission.module,
                    allowedSubmoduleIds: new Set<string>()
                })
            }
            
            // Si el permiso está asociado a un submódulo específico, agregarlo
            if (up.permission.submoduleId && up.permission.submodule?.isActive) {
                modulesMap.get(moduleId)!.allowedSubmoduleIds.add(up.permission.submoduleId)
            }
        }
    })

    // Construir los módulos con solo los submódulos permitidos
    const modules = []
    for (const [moduleId, data] of modulesMap) {
        // Obtener el módulo completo con todos sus submódulos
        const fullModule = await prisma.module.findUnique({
            where: { id: moduleId },
            include: {
                submodules: {
                    where: { 
                        isActive: true,
                        id: {
                            in: Array.from(data.allowedSubmoduleIds)
                        }
                    },
                    orderBy: { order: 'asc' }
                }
            }
        })
        
        if (fullModule) {
            modules.push(fullModule)
        }
    }

    return modules.sort((a, b) => a.order - b.order)
}

