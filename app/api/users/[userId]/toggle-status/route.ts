import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"
import { actorRole, canManageRole } from "@/lib/security/authz"

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

    // Sin acción concreta, hasPermission acepta un permiso de sólo lectura.
    const canManage = await hasPermission(session.user.id, "users.access", PermissionAction.UPDATE)
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

    // Comprobar el rol del objetivo: sin esto un moderador podía desactivar a los
    // administradores y dejar el sistema sin quien lo gobierne.
    const currentRole = await actorRole(session.user.id)
    if (!currentRole || !canManageRole(currentRole, user.role)) {
      return NextResponse.json(
        { error: "No puedes cambiar el estado de un usuario con un rol igual o superior al tuyo" },
        { status: 403 }
      )
    }

    // Se actualiza también isActive, que es el campo que comprueba el login.
    // Antes sólo se tocaba emailVerified, así que "desactivar" a un usuario no le
    // impedía entrar: seguía autenticándose con normalidad.
    const activate = !user.emailVerified
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: activate ? new Date() : null,
        isActive: activate
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