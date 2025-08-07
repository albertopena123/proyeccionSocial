// app/api/test-email/route.ts
// NOTA: Esta es una ruta de prueba, eliminar en producción

import { NextResponse } from "next/server"
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from "@/lib/email"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'verification'
  const email = searchParams.get('email') || 'test@unamad.edu.pe'
  
  try {
    let result
    const testToken = 'test-token-123456789'
    const testName = 'Usuario de Prueba'
    
    switch (type) {
      case 'verification':
        result = await sendVerificationEmail(email, testName, testToken)
        break
      case 'welcome':
        result = await sendWelcomeEmail(email, testName)
        break
      case 'reset':
        result = await sendPasswordResetEmail(email, testName, testToken)
        break
      default:
        return NextResponse.json({ error: 'Tipo de email no válido' }, { status: 400 })
    }
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Email de ${type} enviado exitosamente a ${email}`,
        messageId: result.messageId
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Error enviando email',
        error: result.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error en test de email:', error)
    return NextResponse.json({
      success: false,
      message: 'Error en el servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}