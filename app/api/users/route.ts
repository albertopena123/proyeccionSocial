import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { UserRole, PermissionAction } from "@prisma/client"
import crypto from "crypto"
import { sendVerificationEmail } from "@/lib/email"

const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  name: z.string().min(1, "El nombre es requerido"),
  role: z.nativeEnum(UserRole),
  permissions: z.array(z.string()).optional()
})

// Función helper para determinar las acciones según el rol y el permiso
function getActionsForRoleAndPermission(role: UserRole, permissionCode: string): PermissionAction[] {
  // SUPER_ADMIN tiene todas las acciones en todos los permisos
  if (role === UserRole.SUPER_ADMIN) {
    return [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.EXPORT
    ]
  }

  // ADMIN tiene todas las acciones excepto en ciertos permisos críticos
  if (role === UserRole.ADMIN) {
    // Para la mayoría de permisos, dar todas las acciones
    return [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.EXPORT
    ]
  }

  // MODERATOR tiene acciones limitadas según el tipo de permiso
  if (role === UserRole.MODERATOR) {
    if (permissionCode === 'dashboard.access') {
      return [PermissionAction.READ, PermissionAction.EXPORT]
    }
    // Para contenido, constancias y resoluciones
    if (permissionCode.includes('articles') || permissionCode.includes('categories') || 
        permissionCode.includes('constancias') || permissionCode.includes('resoluciones')) {
      return [
        PermissionAction.CREATE,
        PermissionAction.READ,
        PermissionAction.UPDATE,
        PermissionAction.EXPORT
      ]
    }
    // Por defecto para moderador
    return [PermissionAction.READ]
  }

  // USER tiene las acciones más limitadas
  if (role === UserRole.USER) {
    if (permissionCode === 'settings.access') {
      return [PermissionAction.READ, PermissionAction.UPDATE]
    }
    // Por defecto para usuario regular
    return [PermissionAction.READ]
  }

  // Por defecto, solo lectura
  return [PermissionAction.READ]
}

// GET /api/users - Obtener todos los usuarios
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const canView = await hasPermission(session.user.id, "users.access", PermissionAction.READ) || 
                    await hasPermission(session.user.id, "users.access", PermissionAction.READ)

    if (!canView) {
      return NextResponse.json({ error: "Sin permisos para ver usuarios" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        preferences: true,
        _count: {
          select: {
            sessions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/users - Crear nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const canCreate = await hasPermission(session.user.id, "users.access", PermissionAction.CREATE)
    if (!canCreate) {
      return NextResponse.json({ error: "Sin permisos para crear usuarios" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 })
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Generar token de verificación
    const verificationToken = crypto.randomBytes(32).toString('hex')

    // Crear usuario (inactivo hasta que verifique su email)
    const newUser = await prisma.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        password: hashedPassword,
        name: validatedData.name,
        role: validatedData.role,
        isActive: false, // Usuario inactivo hasta verificación
        verificationToken,
        emailVerified: null, // No verificado aún
        preferences: {
          create: {
            theme: 'system',
            radius: 0.5,
            fontSize: 'default'
          }
        }
      }
    })

    // Obtener todos los permisos disponibles
    const allPermissions = await prisma.permission.findMany()

    // Definir los permisos por defecto según el rol
    let defaultPermissions: typeof allPermissions = []
    
    switch (validatedData.role) {
      case UserRole.SUPER_ADMIN:
        // SUPER_ADMIN - Todos los permisos con todas las acciones
        defaultPermissions = allPermissions
        break
        
      case UserRole.ADMIN:
        // ADMIN - Todos los permisos excepto administración del sistema
        defaultPermissions = allPermissions.filter(p => p.code !== 'system.admin')
        break
        
      case UserRole.MODERATOR:
        // MODERATOR - Dashboard, contenido (artículos y categorías), constancias y resoluciones
        defaultPermissions = allPermissions.filter(p => 
          p.code === 'dashboard.access' ||
          p.code === 'articles.access' ||
          p.code === 'categories.access' ||
          p.code === 'constancias.access' ||
          p.code === 'resoluciones.access'
        )
        break
        
      case UserRole.USER:
        // USER - Solo dashboard y configuración personal
        defaultPermissions = allPermissions.filter(p => 
          p.code === 'dashboard.access' ||
          p.code === 'settings.access'
        )
        break
    }

    // Si se especificaron permisos adicionales, combinarlos con los por defecto
    if (validatedData.permissions && validatedData.permissions.length > 0) {
      const additionalPermissions = await prisma.permission.findMany({
        where: {
          id: {
            in: validatedData.permissions
          }
        }
      })
      // Combinar y eliminar duplicados
      const combinedPermissionIds = new Set([
        ...defaultPermissions.map(p => p.id),
        ...additionalPermissions.map(p => p.id)
      ])
      defaultPermissions = allPermissions.filter(p => combinedPermissionIds.has(p.id))
    }

    // Asignar los permisos al usuario
    if (defaultPermissions.length > 0) {
      await prisma.userPermission.createMany({
        data: defaultPermissions.map(permission => ({
          userId: newUser.id,
          permissionId: permission.id,
          grantedBy: session.user.id,
          // Definir las acciones según el rol y el tipo de permiso
          actions: getActionsForRoleAndPermission(validatedData.role, permission.code)
        }))
      })
    }

    // Enviar email de verificación
    try {
      const emailResult = await sendVerificationEmail(newUser.email, newUser.name || 'Usuario', verificationToken)
      if (!emailResult.success) {
        console.error("Error enviando email de verificación:", emailResult.error)
      }
    } catch (emailError) {
      console.error("Error enviando email de verificación:", emailError)
      // No fallar la creación si el email no se envía, pero notificar al usuario
    }

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'users.created',
        entity: 'User',
        entityId: newUser.id,
        changes: {
          after: { email: newUser.email, role: newUser.role }
        },
        metadata: {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      user: newUser,
      message: "Usuario creado exitosamente. Se ha enviado un correo de verificación a su dirección de email."
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 })
    }
    console.error("Error creando usuario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}