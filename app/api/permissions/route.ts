import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"

// GET /api/permissions - Obtener todos los permisos
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const canManageRoles = await hasPermission(session.user.id, "roles.access")
    if (!canManageRoles) {
      return NextResponse.json({ error: "Sin permisos para ver permisos" }, { status: 403 })
    }

    const permissions = await prisma.permission.findMany({
      include: {
        module: {
          include: {
            submodules: true
          }
        },
        submodule: true,
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: [
        { module: { order: 'asc' } },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(permissions)
  } catch (error) {
    console.error("Error obteniendo permisos:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}