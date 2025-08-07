interface EmailTemplateData {
  verification: {
    name: string
    verificationUrl: string
    email: string
  }
  passwordReset: {
    name: string
    resetUrl: string
    email: string
  }
  welcome: {
    name: string
    loginUrl: string
    email: string
  }
}

interface EmailTemplateOptions<T extends keyof EmailTemplateData> {
  type: T
  data: EmailTemplateData[T]
}

export function generateEmailTemplate<T extends keyof EmailTemplateData>(
  options: EmailTemplateOptions<T>
): string {
  const baseStyles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      }
      
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px 30px;
        text-align: center;
      }
      
      .logo {
        width: 80px;
        height: 80px;
        background: white;
        border-radius: 50%;
        margin: 0 auto 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        font-weight: bold;
        color: #667eea;
      }
      
      .header h1 {
        color: white;
        font-size: 28px;
        font-weight: 700;
        margin: 0;
      }
      
      .header p {
        color: rgba(255, 255, 255, 0.9);
        font-size: 16px;
        margin-top: 8px;
      }
      
      .content {
        padding: 40px 30px;
      }
      
      .greeting {
        font-size: 20px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 20px;
      }
      
      .message {
        font-size: 16px;
        color: #555;
        margin-bottom: 30px;
        line-height: 1.8;
      }
      
      .button-container {
        text-align: center;
        margin: 40px 0;
      }
      
      .button {
        display: inline-block;
        padding: 16px 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white !important;
        text-decoration: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        transition: transform 0.2s;
      }
      
      .button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
      }
      
      .info-box {
        background: #f8f9fa;
        border-left: 4px solid #667eea;
        padding: 20px;
        margin: 30px 0;
        border-radius: 4px;
      }
      
      .info-box h3 {
        color: #333;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 10px;
      }
      
      .info-box p {
        color: #666;
        font-size: 14px;
        line-height: 1.6;
      }
      
      .divider {
        height: 1px;
        background: #e5e5e5;
        margin: 30px 0;
      }
      
      .footer {
        background: #f8f9fa;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e5e5e5;
      }
      
      .footer p {
        color: #999;
        font-size: 14px;
        margin: 5px 0;
      }
      
      .footer a {
        color: #667eea;
        text-decoration: none;
      }
      
      .social-links {
        margin-top: 20px;
      }
      
      .social-links a {
        display: inline-block;
        margin: 0 10px;
        color: #999;
        text-decoration: none;
      }
      
      .warning {
        background: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
        font-size: 14px;
        color: #856404;
      }
      
      @media only screen and (max-width: 600px) {
        .container {
          margin: 0;
          border-radius: 0;
        }
        
        .header, .content, .footer {
          padding: 20px;
        }
        
        .header h1 {
          font-size: 24px;
        }
        
        .button {
          padding: 14px 30px;
          font-size: 15px;
        }
      }
    </style>
  `

  const header = `
    <div class="header">
      <div class="logo">U</div>
      <h1>UNAMAD</h1>
      <p>Sistema de Proyección Social</p>
    </div>
  `

  const footer = `
    <div class="footer">
      <p>© ${new Date().getFullYear()} Universidad Nacional Amazónica de Madre de Dios</p>
      <p>Av. Jorge Chávez N° 1160, Puerto Maldonado - Madre de Dios</p>
      <p>
        <a href="mailto:${process.env.MAIL_FROM_ADDRESS}">${process.env.MAIL_FROM_ADDRESS}</a>
      </p>
      <div class="social-links">
        <a href="https://www.unamad.edu.pe">Sitio Web</a>
        <a href="https://www.facebook.com/unamad">Facebook</a>
      </div>
    </div>
  `

  let content = ''

  switch (options.type) {
    case 'verification':
      const verificationData = options.data as EmailTemplateData['verification']
      content = `
        <div class="content">
          <h2 class="greeting">¡Hola ${verificationData.name}!</h2>
          
          <p class="message">
            Gracias por registrarte en el Sistema de Proyección Social de UNAMAD. 
            Para completar tu registro y activar tu cuenta, necesitamos verificar tu dirección de correo electrónico.
          </p>
          
          <div class="button-container">
            <a href="${verificationData.verificationUrl}" class="button">
              Activar mi cuenta
            </a>
          </div>
          
          <div class="info-box">
            <h3>Información importante:</h3>
            <p>• Este enlace expirará en 24 horas</p>
            <p>• Tu cuenta: ${verificationData.email}</p>
            <p>• Una vez activada, podrás acceder con tu correo institucional y contraseña</p>
          </div>
          
          <div class="divider"></div>
          
          <p style="font-size: 14px; color: #999; text-align: center;">
            Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
            <br>
            <a href="${verificationData.verificationUrl}" style="color: #667eea; word-break: break-all;">
              ${verificationData.verificationUrl}
            </a>
          </p>
          
          <div class="warning">
            <strong>¿No solicitaste esta cuenta?</strong><br>
            Si no creaste una cuenta en nuestro sistema, puedes ignorar este mensaje de forma segura.
          </div>
        </div>
      `
      break

    case 'passwordReset':
      const resetData = options.data as EmailTemplateData['passwordReset']
      content = `
        <div class="content">
          <h2 class="greeting">Hola ${resetData.name},</h2>
          
          <p class="message">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en el Sistema de Proyección Social de UNAMAD.
            Si realizaste esta solicitud, haz clic en el botón de abajo para crear una nueva contraseña.
          </p>
          
          <div class="button-container">
            <a href="${resetData.resetUrl}" class="button">
              Restablecer contraseña
            </a>
          </div>
          
          <div class="info-box">
            <h3>Detalles de seguridad:</h3>
            <p>• Este enlace expirará en 1 hora</p>
            <p>• Solo puede ser usado una vez</p>
            <p>• Tu cuenta: ${resetData.email}</p>
          </div>
          
          <div class="divider"></div>
          
          <p style="font-size: 14px; color: #999; text-align: center;">
            Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
            <br>
            <a href="${resetData.resetUrl}" style="color: #667eea; word-break: break-all;">
              ${resetData.resetUrl}
            </a>
          </p>
          
          <div class="warning">
            <strong>¿No solicitaste este cambio?</strong><br>
            Si no solicitaste restablecer tu contraseña, puedes ignorar este mensaje. 
            Tu contraseña no será modificada y tu cuenta permanecerá segura.
          </div>
        </div>
      `
      break

    case 'welcome':
      const welcomeData = options.data as EmailTemplateData['welcome']
      content = `
        <div class="content">
          <h2 class="greeting">¡Bienvenido ${welcomeData.name}! 🎉</h2>
          
          <p class="message">
            Tu cuenta en el Sistema de Proyección Social de UNAMAD ha sido activada exitosamente.
            Ahora tienes acceso completo a todas las funcionalidades del sistema.
          </p>
          
          <div class="button-container">
            <a href="${welcomeData.loginUrl}" class="button">
              Iniciar sesión
            </a>
          </div>
          
          <div class="info-box">
            <h3>¿Qué puedes hacer ahora?</h3>
            <p>• Acceder al dashboard con estadísticas y métricas</p>
            <p>• Gestionar tu perfil y preferencias</p>
            <p>• Participar en proyectos de proyección social</p>
            <p>• Colaborar con otros estudiantes y docentes</p>
          </div>
          
          <div class="divider"></div>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <h3 style="color: #0066cc; margin-bottom: 10px;">Información de tu cuenta:</h3>
            <p style="color: #555; margin: 5px 0;">
              <strong>Correo institucional:</strong> ${welcomeData.email}
            </p>
            <p style="color: #555; margin: 5px 0;">
              <strong>Rol asignado:</strong> Usuario
            </p>
            <p style="color: #555; margin: 5px 0;">
              <strong>Estado:</strong> <span style="color: #28a745;">✓ Activo</span>
            </p>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
            Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos en
            <a href="mailto:${process.env.MAIL_FROM_ADDRESS}" style="color: #667eea;">
              ${process.env.MAIL_FROM_ADDRESS}
            </a>
          </p>
        </div>
      `
      break
  }

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>UNAMAD - Sistema de Proyección Social</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        ${header}
        ${content}
        ${footer}
      </div>
    </body>
    </html>
  `
}