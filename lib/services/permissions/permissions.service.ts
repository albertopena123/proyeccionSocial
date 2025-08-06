// lib/services/permissions/permissions.service.ts
import { prisma } from "@/lib/prisma"
import { PermissionAction } from "@prisma/client"

export async function getUserPermissions(userId: string) {
    return await prisma.userPermission.findMany({
        where: { 
            userId,
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
            ]
        },
        include: {
            permission: true
        }
    })
}

export async function hasPermission(
    userId: string, 
    permissionCode: string,
    action?: PermissionAction
) {
    const userPermission = await prisma.userPermission.findFirst({
        where: {
            userId,
            permission: { 
                code: permissionCode
            },
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
            ]
        },
        include: {
            permission: true
        }
    });

    // Si no hay permiso, retornar false
    if (!userPermission) {
        return false;
    }

    // Si no se especifica una acción, verificar si tiene al menos READ
    if (!action) {
        return userPermission.actions.includes(PermissionAction.READ);
    }

    // Verificar si el usuario tiene la acción específica en sus permisos
    return userPermission.actions.includes(action);
}

export async function hasAnyPermission(
    userId: string,
    permissionCodes: string[],
    action?: PermissionAction
) {
    const permissions = await prisma.userPermission.findMany({
        where: {
            userId,
            permission: {
                code: {
                    in: permissionCodes
                },
                ...(action && {
                    actions: {
                        has: action
                    }
                })
            },
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
            ]
        }
    });

    return permissions.length > 0;
}

export async function hasAllPermissions(
    userId: string,
    permissionCodes: string[],
    action?: PermissionAction
) {
    const permissions = await prisma.userPermission.findMany({
        where: {
            userId,
            permission: {
                code: {
                    in: permissionCodes
                },
                ...(action && {
                    actions: {
                        has: action
                    }
                })
            },
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
            ]
        }
    });

    return permissions.length === permissionCodes.length;
}

