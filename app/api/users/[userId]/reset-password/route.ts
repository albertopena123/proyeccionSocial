import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import bcrypt from "bcryptjs"
import { z } from "zod"

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
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

    const canManage = await hasPermission(session.user.id, "users.access")
    
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