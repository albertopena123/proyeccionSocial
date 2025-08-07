import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { sendPasswordResetEmail } from "@/lib/email"
import { z } from "zod"

const forgotPasswordSchema = z.object({
  email: z.string()
    .email("Email inválido")
    .regex(/^[a-zA-Z0-9._%+-]+@unamad\.edu\.pe$/, "Debe ser un correo institucional @unamad.edu.pe"),
})

// Generar token seguro
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Validar entrada
    const validatedData = forgotPasswordSchema.parse(body)
    const { email } = validatedData

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { 
        email: email.toLowerCase() 
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      }
    })

    // Por seguridad, siempre devolvemos éxito aunque el usuario no exista
    if (!user) {
      return NextResponse.json({
        message: "Si el correo existe, recibirás instrucciones para restablecer tu contraseña",
      })
    }

    // Verificar que la cuenta esté activa
    if (!user.isActive) {
      // Aún así enviamos respuesta de éxito por seguridad
      return NextResponse.json({
        message: "Si el correo existe, recibirás instrucciones para restablecer tu contraseña",
      })
    }

    // Generar token y fecha de expiración (1 hora)
    const resetToken = generateResetToken()
    const resetExpires = new Date(Date.now() + 3600000) // 1 hora

    // Actualizar usuario con token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      }
    })

    // Enviar email
    try {
      const emailResult = await sendPasswordResetEmail(
        user.email, 
        user.name || 'Usuario',
        resetToken
      )
      
      if (!emailResult.success) {
        console.error("Error enviando email de recuperación:", emailResult.error)
        // No fallar la operación si el email no se envía
      }
    } catch (emailError) {
      console.error("Error enviando email:", emailError)
      // Continuar aunque el email falle
    }

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'password.reset.requested',
        entity: 'User',
        entityId: user.id,
        metadata: {
          email: user.email,
          timestamp: new Date().toISOString(),
        }
      }
    })

    return NextResponse.json({
      message: "Si el correo existe, recibirás instrucciones para restablecer tu contraseña",
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error en forgot password:", error)
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    )
  }
}