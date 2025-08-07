import nodemailer from 'nodemailer'
import { generateEmailTemplate } from './email-templates'

// Crear transportador de email
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
})

// Verificar conexión con el servidor de email
transporter.verify(function (error, success) {
  if (error) {
    console.error('Error conectando con el servidor de email:', error)
  } else {
    console.log('✅ Servidor de email listo para enviar mensajes')
  }
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to,
      subject,
      text: text || '',
      html,
    })

    console.log('Email enviado exitosamente:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error enviando email:', error)
    return { success: false, error }
  }
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`
  
  const html = generateEmailTemplate({
    type: 'verification',
    data: {
      name,
      verificationUrl,
      email,
    },
  })

  const text = `
Hola ${name},

Gracias por registrarte en el Sistema de Proyección Social de UNAMAD.

Para activar tu cuenta, por favor visita el siguiente enlace:
${verificationUrl}

Este enlace expirará en 24 horas.

Si no solicitaste esta cuenta, puedes ignorar este mensaje.

Saludos,
El equipo de UNAMAD
  `.trim()

  return sendEmail({
    to: email,
    subject: 'Activa tu cuenta - Sistema de Proyección Social UNAMAD',
    html,
    text,
  })
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`
  
  const html = generateEmailTemplate({
    type: 'passwordReset',
    data: {
      name,
      resetUrl,
      email,
    },
  })

  const text = `
Hola ${name},

Recibimos una solicitud para restablecer tu contraseña.

Para crear una nueva contraseña, visita el siguiente enlace:
${resetUrl}

Este enlace expirará en 1 hora.

Si no solicitaste este cambio, puedes ignorar este mensaje y tu contraseña permanecerá sin cambios.

Saludos,
El equipo de UNAMAD
  `.trim()

  return sendEmail({
    to: email,
    subject: 'Restablecer contraseña - Sistema de Proyección Social UNAMAD',
    html,
    text,
  })
}

export async function sendWelcomeEmail(email: string, name: string) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
  
  const html = generateEmailTemplate({
    type: 'welcome',
    data: {
      name,
      loginUrl,
      email,
    },
  })

  const text = `
¡Bienvenido ${name}!

Tu cuenta en el Sistema de Proyección Social de UNAMAD ha sido activada exitosamente.

Ahora puedes iniciar sesión en: ${loginUrl}

Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.

Saludos,
El equipo de UNAMAD
  `.trim()

  return sendEmail({
    to: email,
    subject: '¡Bienvenido! - Sistema de Proyección Social UNAMAD',
    html,
    text,
  })
}