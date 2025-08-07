import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/lib/auth"

const changePasswordSchema = z.object({
  userId: z.string().min(1, "ID de usuario requerido"),
  currentPassword: z.string().min(1, "Contraseña actual requerida"),
  newPassword: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
})

export async function POST(req: Request) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const body = await req.json()
    
    // Validar entrada
    const validatedData = changePasswordSchema.parse(body)
    const { userId, currentPassword, newPassword } = validatedData

    // Verificar que el usuario solo pueda cambiar su propia contraseña
    // A menos que sea un admin
    if (session.user.id !== userId && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "No tienes permiso para cambiar esta contraseña" },
        { status: 403 }
      )
    }

    // Obtener el usuario y su contraseña actual
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        email: true,
        name: true,
      }
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Verificar la contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "La contraseña actual no es correcta" },
        { status: 401 }
      )
    }

    // Verificar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(newPassword, user.password)
    if (isSamePassword) {
      return NextResponse.json(
        { error: "La nueva contraseña debe ser diferente a la actual" },
        { status: 400 }
      )
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Actualizar la contraseña
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      }
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'password.changed',
        entity: 'User',
        entityId: userId,
        metadata: {
          changedBy: session.user.email,
          changedFor: user.email,
          timestamp: new Date().toISOString(),
        }
      }
    })

    return NextResponse.json({
      message: "Contraseña actualizada exitosamente",
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error en cambio de contraseña:", error)
    return NextResponse.json(
      { error: "Error al cambiar la contraseña" },
      { status: 500 }
    )
  }
}