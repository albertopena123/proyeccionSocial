// lib/services/permissions/permissions.service.ts
import { prisma } from "@/lib/prisma"

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

export async function hasPermission(userId: string, permissionCode: string) {
    const permission = await prisma.userPermission.findFirst({
        where: {
            userId,
            permission: { code: permissionCode },
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
            ]
        }
    });

    return !!permission;
}

