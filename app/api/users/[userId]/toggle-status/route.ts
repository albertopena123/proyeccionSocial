import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"

// POST /api/users/[userId]/toggle-status - Activar/Desactivar usuario
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const canManage = await hasPermission(session.user.id, "users.access")
    if (!canManage) {
      return NextResponse.json({ error: "Sin permisos para cambiar estado de usuarios" }, { status: 403 })
    }

    // No permitir desactivar su propio usuario
    if (session.user.id === userId) {
      return NextResponse.json({ error: "No puedes desactivar tu propio usuario" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Toggle del estado verificado del email (usado como indicador de activo/inactivo)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: user.emailVerified ? null : new Date()
      }
    })

    // Si se desactiva, eliminar todas las sesiones activas
    if (!updatedUser.emailVerified) {
      await prisma.session.deleteMany({
        where: { userId: userId }
      })
    }

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: updatedUser.emailVerified ? 'users.activated' : 'users.deactivated',
        entity: 'User',
        entityId: userId,
        metadata: {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      isActive: !!updatedUser.emailVerified,
      message: updatedUser.emailVerified ? "Usuario activado" : "Usuario desactivado"
    })
  } catch (error) {
    console.error("Error cambiando estado del usuario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}