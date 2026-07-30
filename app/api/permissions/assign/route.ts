import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { z } from "zod"
import { UserRole, PermissionAction } from "@prisma/client"
import { actorRole, canGrantRole, roleRank } from "@/lib/security/authz"

const assignPermissionsSchema = z.object({
  userId: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  permissions: z.array(z.string()),
  action: z.enum(['add', 'remove', 'set'])
}).refine(data => data.userId || data.role, {
  message: "Debe especificar userId o role"
})

// POST /api/permissions/assign - Asignar permisos a usuario o rol
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // hasPermission sin acción se conforma con READ: alguien con acceso de sólo
    // lectura a roles podía concederse cualquier permiso del sistema.
    const canManageRoles = await hasPermission(session.user.id, "roles.access", PermissionAction.UPDATE)
    if (!canManageRoles) {
      return NextResponse.json({ error: "Sin permisos para asignar permisos" }, { status: 403 })
    }

    // Repartir permisos es, en la práctica, repartir privilegios: se reserva a
    // administradores en lugar de a cualquier portador de roles.access.
    const currentRole = await actorRole(session.user.id)
    if (!currentRole || roleRank(currentRole) < roleRank(UserRole.ADMIN)) {
      return NextResponse.json({ error: "Sin permisos para asignar permisos" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = assignPermissionsSchema.parse(body)

    // No se puede repartir permisos a un rol igual o superior al propio.
    if (validatedData.role && !canGrantRole(currentRole, validatedData.role)) {
      return NextResponse.json(
        { error: "No puedes modificar los permisos de un rol igual o superior al tuyo" },
        { status: 403 }
      )
    }

    // Si es por rol, obtener todos los usuarios con ese rol
    let userIds: string[] = []
    if (validatedData.role) {
      const users = await prisma.user.findMany({
        where: { role: validatedData.role },
        select: { id: true }
      })
      userIds = users.map(u => u.id)
    } else if (validatedData.userId) {
      const target = await prisma.user.findUnique({
        where: { id: validatedData.userId },
        select: { role: true }
      })

      if (!target) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
      }

      if (validatedData.userId !== session.user.id && !canGrantRole(currentRole, target.role)) {
        return NextResponse.json(
          { error: "No puedes modificar los permisos de un usuario con un rol igual o superior al tuyo" },
          { status: 403 }
        )
      }

      userIds = [validatedData.userId]
    }

    // Verificar que los permisos existen
    const permissions = await prisma.permission.findMany({
      where: {
        id: {
          in: validatedData.permissions
        }
      }
    })

    if (permissions.length !== validatedData.permissions.length) {
      return NextResponse.json({ error: "Algunos permisos no existen" }, { status: 400 })
    }

    // Ejecutar la acción según el tipo
    for (const userId of userIds) {
      if (validatedData.action === 'set') {
        // Eliminar todos los permisos existentes
        await prisma.userPermission.deleteMany({
          where: { userId }
        })
        
        // Asignar los nuevos permisos
        if (validatedData.permissions.length > 0) {
          await prisma.userPermission.createMany({
            data: validatedData.permissions.map(permissionId => ({
              userId,
              permissionId,
              grantedBy: session.user.id
            }))
          })
        }
      } else if (validatedData.action === 'add') {
        // Obtener permisos existentes
        const existingPermissions = await prisma.userPermission.findMany({
          where: { userId },
          select: { permissionId: true }
        })
        
        const existingPermissionIds = existingPermissions.map(p => p.permissionId)
        const newPermissions = validatedData.permissions.filter(
          p => !existingPermissionIds.includes(p)
        )
        
        if (newPermissions.length > 0) {
          await prisma.userPermission.createMany({
            data: newPermissions.map(permissionId => ({
              userId,
              permissionId,
              grantedBy: session.user.id
            }))
          })
        }
      } else if (validatedData.action === 'remove') {
        await prisma.userPermission.deleteMany({
          where: {
            userId,
            permissionId: {
              in: validatedData.permissions
            }
          }
        })
      }

      // Registrar en auditoría
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: `permissions.${validatedData.action}`,
          entity: 'UserPermission',
          entityId: userId,
          changes: {
            permissions: validatedData.permissions,
            role: validatedData.role
          },
          metadata: {
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Permisos ${validatedData.action === 'add' ? 'agregados' : validatedData.action === 'remove' ? 'eliminados' : 'actualizados'} correctamente`,
      affectedUsers: userIds.length
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 })
    }
    console.error("Error asignando permisos:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}