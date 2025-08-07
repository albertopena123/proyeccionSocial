// app/api/auth/verify-email/route.ts

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendWelcomeEmail } from "@/lib/email"

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token requerido"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validatedData = verifyEmailSchema.parse(body)
    const { token } = validatedData

    // Buscar usuario con este token de verificación
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        isActive: false, // Solo verificar usuarios inactivos
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Token inválido o ya utilizado" },
        { status: 400 }
      )
    }

    // Verificar si el token no ha expirado (24 horas)
    const tokenAge = Date.now() - user.createdAt.getTime()
    const twentyFourHours = 24 * 60 * 60 * 1000

    if (tokenAge > twentyFourHours) {
      return NextResponse.json(
        { error: "El token ha expirado. Por favor, solicita un nuevo enlace de verificación." },
        { status: 400 }
      )
    }

    // Activar el usuario y limpiar el token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        emailVerified: new Date(),
        verificationToken: null, // Limpiar el token después de usarlo
      },
    })

    // Enviar email de bienvenida
    try {
      await sendWelcomeEmail(updatedUser.email, updatedUser.name || 'Usuario')
    } catch (emailError) {
      console.error("Error enviando email de bienvenida:", emailError)
      // No fallar la verificación si el email de bienvenida no se envía
    }

    return NextResponse.json({
      message: "Email verificado exitosamente. Ya puedes iniciar sesión.",
      success: true,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error verificando email:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}