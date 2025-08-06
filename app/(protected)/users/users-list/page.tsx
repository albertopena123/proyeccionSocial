import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { UsersDataTable } from "@/components/users/users-data-table"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { Button } from "@/components/ui/button"
import { IconDownload, IconPlus } from "@tabler/icons-react"
import { CreateUserDialog } from "@/components/users/create-user-dialog"
import { ExportUsersDialog } from "@/components/users/export-users-dialog"
import { PermissionAction } from "@prisma/client"

export default async function UsersListPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // Verificar permisos granulares - ahora usando el nuevo sistema simplificado
    const canRead = await hasPermission(session.user.id, "users.access", PermissionAction.READ)
    
    if (!canRead) {
        redirect("/dashboard")
    }

    // Verificar permisos específicos para cada acción usando el sistema granular
    const permissions = {
        canCreate: await hasPermission(session.user.id, "users.access", PermissionAction.CREATE),
        canUpdate: await hasPermission(session.user.id, "users.access", PermissionAction.UPDATE),
        canDelete: await hasPermission(session.user.id, "users.access", PermissionAction.DELETE),
        canExport: await hasPermission(session.user.id, "users.access", PermissionAction.EXPORT),
        canRead
    }

    // Obtener usuarios con sus permisos
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

    // DEBUG: Ver qué datos vienen de la base de datos
    console.log("=== DATOS DE USUARIOS DESDE LA BD ===")
    users.forEach(user => {
        console.log({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            permissions: user.permissions.length,
            preferences: user.preferences
        })
    })
    console.log("=====================================")

    // Transformar datos para la tabla
    const tableData = users.map(user => ({
        id: user.id,
        name: user.name || "Sin nombre",
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastActive: user._count.sessions > 0 ? "Activo" : "Inactivo",
        permissions: user.permissions.map(up => up.permission.name).join(", ") || "Sin permisos",
        image: user.image
    }))

    return (
        <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex items-center justify-between px-4 lg:px-6">
                <div>
                    <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
                    <p className="text-muted-foreground text-sm">
                        Administra los usuarios del sistema y sus permisos
                    </p>
                </div>
                <div className="flex gap-2">
                    {permissions.canExport && (
                        <ExportUsersDialog data={tableData}>
                            <Button variant="outline">
                                <IconDownload className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Exportar</span>
                                <span className="sm:hidden">
                                    <IconDownload className="h-4 w-4" />
                                </span>
                            </Button>
                        </ExportUsersDialog>
                    )}
                    {permissions.canCreate && (
                        <CreateUserDialog>
                            <Button>
                                <IconPlus className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Nuevo Usuario</span>
                                <span className="sm:hidden">Nuevo</span>
                            </Button>
                        </CreateUserDialog>
                    )}
                </div>
            </div>
            
            <div className="px-4 lg:px-6">
                <UsersDataTable 
                    data={tableData} 
                    permissions={permissions}
                    currentUserId={session.user.id}
                />
            </div>
        </div>
    )
}