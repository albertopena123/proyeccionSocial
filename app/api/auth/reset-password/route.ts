import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Validar entrada
    const validatedData = resetPasswordSchema.parse(body)
    const { token, password } = validatedData

    // Buscar usuario con token válido
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(), // Token no expirado
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 400 }
      )
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Actualizar usuario
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      }
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'password.reset.completed',
        entity: 'User',
        entityId: user.id,
        metadata: {
          email: user.email,
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

    console.error("Error en reset password:", error)
    return NextResponse.json(
      { error: "Error al restablecer la contraseña" },
      { status: 500 }
    )
  }
}