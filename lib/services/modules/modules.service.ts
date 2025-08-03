// lib/services/modules/modules.service.ts
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

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
                    module: {
                        include: {
                            submodules: {
                                where: { isActive: true },
                                orderBy: { order: 'asc' }
                            }
                        }
                    }
                }
            }
        }
    })

    const modulesMap = new Map()
    
    userPermissions.forEach(up => {
        if (up.permission.module?.isActive) {
            const moduleId = up.permission.module.id
            if (!modulesMap.has(moduleId)) {
                modulesMap.set(moduleId, up.permission.module)
            }
        }
    })

    return Array.from(modulesMap.values()).sort((a, b) => a.order - b.order)
}

