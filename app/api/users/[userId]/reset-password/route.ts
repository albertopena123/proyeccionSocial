import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { PermissionAction } from "@prisma/client"
import { actorRole, canManageRole } from "@/lib/security/authz"

const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
})

// POST /api/users/[userId]/reset-password - Restablecer contraseña
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

    // Antes bastaba con hasPermission(..., "users.access"), que sin acción concreta
    // se satisface con un simple READ: alguien con permiso de sólo lectura sobre
    // usuarios podía reescribir contraseñas.
    const canManage = await hasPermission(session.user.id, "users.access", PermissionAction.UPDATE)

    // Permitir cambiar su propia contraseña o si tiene permisos de gestión
    if (!canManage && session.user.id !== userId) {
      return NextResponse.json({ error: "Sin permisos para restablecer contraseña" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = resetPasswordSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Restablecer la contraseña de otra cuenta es apropiarse de ella. Sin
    // comprobar la jerarquía, un moderador con users.access se quedaba con la
    // cuenta de cualquier administrador.
    if (session.user.id !== userId) {
      const currentRole = await actorRole(session.user.id)
      if (!currentRole || !canManageRole(currentRole, user.role)) {
        return NextResponse.json(
          { error: "No puedes restablecer la contraseña de un usuario con un rol igual o superior al tuyo" },
          { status: 403 }
        )
      }
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10)

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword
      }
    })

    // Eliminar todas las sesiones del usuario para forzar nuevo login
    await prisma.session.deleteMany({
      where: { userId: userId }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'users.password_reset',
        entity: 'User',
        entityId: userId,
        metadata: {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          resetByAdmin: canManage && session.user.id !== userId
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: "Contraseña restablecida correctamente"
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 })
    }
    console.error("Error restableciendo contraseña:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}