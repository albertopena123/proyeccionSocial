import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { UserRole, Permission } from "@prisma/client"

// GET /api/permissions/by-role - Obtener permisos por rol
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const canManageRoles = await hasPermission(session.user.id, "roles.access")
    if (!canManageRoles) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    // Obtener todos los permisos
    const allPermissions = await prisma.permission.findMany({
      include: {
        module: true,
        submodule: true
      }
    })

    // Obtener permisos por cada rol
    // Import or define the Permission type if not already imported
    // import { Permission } from "@prisma/client"

    const permissionsByRole: Record<UserRole, Permission[]> = {
      [UserRole.SUPER_ADMIN]: [],
      [UserRole.ADMIN]: [],
      [UserRole.MODERATOR]: [],
      [UserRole.USER]: []
    }

    // Para cada rol, obtener un usuario representativo y sus permisos
    for (const role of Object.values(UserRole)) {
      // Obtener un usuario con este rol
      const userWithRole = await prisma.user.findFirst({
        where: { role },
        include: {
          permissions: {
            include: {
              permission: {
                include: {
                  module: true,
                  submodule: true
                }
              }
            }
          }
        }
      })

      if (userWithRole) {
        permissionsByRole[role] = userWithRole.permissions.map(up => up.permission)
      }
    }

    // Contar usuarios por rol
    const userCountByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    })

    return NextResponse.json({
      allPermissions,
      permissionsByRole,
      userCountByRole: userCountByRole.reduce((acc, item) => {
        acc[item.role] = item._count.role
        return acc
      }, {} as Record<UserRole, number>)
    })
  } catch (error) {
    console.error("Error obteniendo permisos por rol:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}