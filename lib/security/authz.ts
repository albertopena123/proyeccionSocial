// lib/security/authz.ts
// Jerarquía de roles.
//
// El sistema de permisos granulares responde "¿puede tocar usuarios?" pero no
// "¿puede tocar ESTE usuario?". Sin esa segunda pregunta, cualquiera con
// users.access podía cambiar el rol de un SUPER_ADMIN, restablecer su contraseña
// o ascenderse a sí mismo.

import { UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const ROLE_RANK: Record<UserRole, number> = {
    [UserRole.USER]: 1,
    [UserRole.MODERATOR]: 2,
    [UserRole.ADMIN]: 3,
    [UserRole.SUPER_ADMIN]: 4,
}

export function roleRank(role: UserRole): number {
    return ROLE_RANK[role] ?? 0
}

/** Rol real del actor leído de la base de datos, no del JWT. */
export async function actorRole(userId: string): Promise<UserRole | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    })

    return user?.role ?? null
}

/**
 * Un actor puede administrar a un objetivo sólo si su rol es estrictamente
 * superior. La comparación estricta impide además que dos administradores del
 * mismo nivel se expulsen mutuamente.
 */
export function canManageRole(actor: UserRole, target: UserRole): boolean {
    return roleRank(actor) > roleRank(target)
}

/** Nadie puede conceder un rol igual o superior al suyo. */
export function canGrantRole(actor: UserRole, roleToGrant: UserRole): boolean {
    return roleRank(actor) > roleRank(roleToGrant)
}
