import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { UserRole, PermissionAction } from "@prisma/client"

const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  name: z.string().min(1, "El nombre es requerido"),
  role: z.nativeEnum(UserRole),
  permissions: z.array(z.string()).optional()
})

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

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        password: hashedPassword,
        name: validatedData.name,
        role: validatedData.role,
        emailVerified: new Date(),
        preferences: {
          create: {
            theme: 'system',
            radius: 0.5,
            fontSize: 'default'
          }
        }
      }
    })

    // Asignar permisos si se especificaron
    if (validatedData.permissions && validatedData.permissions.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: {
          id: {
            in: validatedData.permissions
          }
        }
      })

      await prisma.userPermission.createMany({
        data: permissions.map(permission => ({
          userId: newUser.id,
          permissionId: permission.id,
          grantedBy: session.user.id
        }))
      })
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

    return NextResponse.json({ success: true, user: newUser }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 })
    }
    console.error("Error creando usuario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}