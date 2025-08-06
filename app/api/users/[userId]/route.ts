import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { z } from "zod"
import { UserRole, PermissionAction } from "@prisma/client"

const updateUserSchema = z.object({
  email: z.string().email("Email inválido").optional(),
  name: z.string().min(1, "El nombre es requerido").optional(),
  role: z.nativeEnum(UserRole).optional(),
  permissions: z.array(z.string()).optional()
})

// GET /api/users/[userId] - Obtener un usuario específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const canView = await hasPermission(session.user.id, "users.access", PermissionAction.READ) || 
                    await hasPermission(session.user.id, "users.access", PermissionAction.READ)

    if (!canView && session.user.id !== userId) {
      return NextResponse.json({ error: "Sin permisos para ver usuario" }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        preferences: true,
        accounts: true,
        _count: {
          select: {
            sessions: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error obteniendo usuario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// PATCH /api/users/[userId] - Actualizar usuario
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const canUpdate = await hasPermission(session.user.id, "users.access", PermissionAction.UPDATE)
    if (!canUpdate) {
      return NextResponse.json({ error: "Sin permisos para actualizar usuarios" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Si se cambia el email, verificar que no exista
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email.toLowerCase() }
      })

      if (emailExists) {
        return NextResponse.json({ error: "El email ya está en uso" }, { status: 400 })
      }
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(validatedData.email && { email: validatedData.email.toLowerCase() }),
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.role && { role: validatedData.role })
      }
    })

    // Actualizar permisos si se especificaron
    if (validatedData.permissions !== undefined) {
      // Eliminar permisos existentes
      await prisma.userPermission.deleteMany({
        where: { userId: userId }
      })

      // Asignar nuevos permisos
      if (validatedData.permissions.length > 0) {
        const permissions = await prisma.permission.findMany({
          where: {
            id: {
              in: validatedData.permissions
            }
          }
        })

        await prisma.userPermission.createMany({
          data: permissions.map(permission => ({
            userId: userId,
            permissionId: permission.id,
            grantedBy: session.user.id
          }))
        })
      }
    }

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'users.updated',
        entity: 'User',
        entityId: userId,
        changes: {
          before: { email: existingUser.email, role: existingUser.role },
          after: { email: updatedUser.email, role: updatedUser.role }
        },
        metadata: {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 })
    }
    console.error("Error actualizando usuario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE /api/users/[userId] - Eliminar usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const canDelete = await hasPermission(session.user.id, "users.access", PermissionAction.DELETE)
    if (!canDelete) {
      return NextResponse.json({ error: "Sin permisos para eliminar usuarios" }, { status: 403 })
    }

    // No permitir eliminar su propio usuario
    if (session.user.id === userId) {
      return NextResponse.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 })
    }

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // No permitir eliminar al último SUPER_ADMIN
    if (existingUser.role === UserRole.SUPER_ADMIN) {
      const superAdminCount = await prisma.user.count({
        where: { role: UserRole.SUPER_ADMIN }
      })

      if (superAdminCount <= 1) {
        return NextResponse.json({ error: "No se puede eliminar el último super administrador" }, { status: 400 })
      }
    }

    // Eliminar usuario (las relaciones se eliminan en cascada)
    await prisma.user.delete({
      where: { id: userId }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'users.deleted',
        entity: 'User',
        entityId: userId,
        changes: {
          before: { email: existingUser.email, role: existingUser.role },
          after: null
        },
        metadata: {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error eliminando usuario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}