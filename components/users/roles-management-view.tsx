"use client"

import * as React from "react"
import { UserRole } from "@prisma/client"
import {
    IconShield,
    IconUsers,
    IconLayoutGrid,

    IconEdit,
    IconSearch,
    IconFilter,

    IconUserPlus,

    IconInfoCircle
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { ManageUserPermissionsDialog } from "./manage-user-permissions-dialog"
import { PermissionDetailsDialog } from "./permission-details-dialog"
import { BulkAssignPermissionsDialog } from "./bulk-assign-permissions-dialog"

interface Permission {
    id: string
    name: string
    code: string
    description?: string | null
    moduleId?: string | null
    module?: {
        id: string
        name: string
        icon?: string | null
    } | null
    actions: string[]
    users: {
        user: {
            id: string
            name?: string | null
            email: string
            role: string
            image?: string | null
        }
    }[]
}

interface User {
    id: string
    name?: string | null
    email: string
    role: string
    image?: string | null
    emailVerified?: Date | null
    permissions: {
        permission: Permission
    }[]
    _count?: {
        sessions: number
    }
}

interface Module {
    id: string
    name: string
    slug: string
    icon?: string | null
    permissions: Permission[]
    submodules?: unknown[]
}

interface AuditLog {
    id: string
    userId?: string | null
    action: string
    entity: string
    entityId: string
    timestamp: Date
    changes?: {
        permissions?: string[]
        [key: string]: unknown
    }
    metadata?: unknown
}

interface Stats {
    totalUsers: number
    totalPermissions: number
    activeModules: number
    usersByRole: Record<string, number>
}

interface RolesManagementViewProps {
    permissions: Permission[]
    users: User[]
    modules: Module[]
    auditLogs: AuditLog[]
    stats: Stats
    currentUserId: string
}

export function RolesManagementView({
    permissions,
    users,
    modules,
    auditLogs,
    stats,
    currentUserId
}: RolesManagementViewProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = React.useState("overview")
    const [searchTerm, setSearchTerm] = React.useState("")
    const [selectedRole, setSelectedRole] = React.useState<UserRole | "all">("all")
    const [selectedModule, setSelectedModule] = React.useState<string>("all")
    const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(new Set())
    const [isLoading, setIsLoading] = React.useState(false)

    const roleInfo = {
        [UserRole.SUPER_ADMIN]: {
            label: "Super Admin",
            color: "destructive",
            icon: IconShield,
            description: "Acceso total al sistema"
        },
        [UserRole.ADMIN]: {
            label: "Administrador",
            color: "default",
            icon: IconShield,
            description: "Gestión completa excepto sistema"
        },
        [UserRole.MODERATOR]: {
            label: "Moderador",
            color: "secondary",
            icon: IconUsers,
            description: "Gestión de contenido"
        },
        [UserRole.USER]: {
            label: "Usuario",
            color: "outline",
            icon: IconUsers,
            description: "Acceso básico"
        }
    }

    // Filtrar usuarios
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesRole = selectedRole === "all" || user.role === selectedRole
        return matchesSearch && matchesRole
    })

    // Filtrar permisos
    const filteredPermissions = permissions.filter(permission => {
        const matchesSearch =
            permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            permission.code.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesModule = selectedModule === "all" || permission.moduleId === selectedModule
        return matchesSearch && matchesModule
    })

    // Matriz de permisos por rol
    const permissionMatrix = React.useMemo(() => {
        const matrix: Record<string, Record<UserRole, boolean>> = {}

        permissions.forEach(permission => {
            matrix[permission.id] = {
                [UserRole.SUPER_ADMIN]: false,
                [UserRole.ADMIN]: false,
                [UserRole.MODERATOR]: false,
                [UserRole.USER]: false
            }

            permission.users.forEach(({ user }) => {
                if (user.role in UserRole) {
                    matrix[permission.id][user.role as UserRole] = true
                }
            })
        })

        return matrix
    }, [permissions])

    const handleBulkAction = async (action: 'grant' | 'revoke', targetUsers: string[], targetPermissions: string[]) => {
        setIsLoading(true)
        try {
            const promises = targetUsers.map(userId =>
                fetch('/api/permissions/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        permissions: targetPermissions,
                        action: action === 'grant' ? 'add' : 'remove'
                    })
                })
            )

            await Promise.all(promises)
            toast.success(`Permisos ${action === 'grant' ? 'otorgados' : 'revocados'} correctamente`)
            router.refresh()
        } catch {
            toast.error("Error al procesar la acción")
        } finally {
            setIsLoading(false)
            setSelectedUsers(new Set())
            setSelectedUsers(new Set())
        }
    }
    return (
        <TooltipProvider>
            <div className="flex flex-1 flex-col gap-6">
                {/* Header con estadísticas */}
                <div className="px-4 lg:px-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">Gestión de Roles y Permisos</h1>
                            <p className="text-muted-foreground text-sm">
                                Administra los roles del sistema y asigna permisos a usuarios
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <BulkAssignPermissionsDialog
                                users={users}
                                permissions={permissions}
                                modules={modules}
                                onSuccess={() => router.refresh()}
                            >
                                <Button>
                                    <IconUserPlus className="mr-2 h-4 w-4" />
                                    Asignar Permisos
                                </Button>
                            </BulkAssignPermissionsDialog>
                        </div>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid gap-4 md:grid-cols-4 mt-6">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Total Usuarios</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {Object.entries(stats.usersByRole).map(([role, count]) => (
                                        <span key={role} className="mr-2">
                                            {roleInfo[role as UserRole]?.label}: {count}
                                        </span>
                                    ))}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Permisos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalPermissions}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    En {stats.activeModules} módulos activos
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Más Usado</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {permissions.reduce((max, p) =>
                                        p.users.length > max.users.length ? p : max
                                    ).code}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Asignado a {permissions.reduce((max, p) =>
                                        p.users.length > max.users.length ? p : max
                                    ).users.length} usuarios
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Actividad</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{auditLogs.length}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Cambios en últimos 30 días
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Contenido principal con tabs */}
                <div className="px-4 lg:px-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-4">
                            <TabsTrigger value="overview">Vista General</TabsTrigger>
                            <TabsTrigger value="users">Usuarios</TabsTrigger>
                            <TabsTrigger value="permissions">Permisos</TabsTrigger>
                            <TabsTrigger value="history">Historial</TabsTrigger>
                        </TabsList>

                        {/* Tab: Vista General - Matriz de Roles */}
                        <TabsContent value="overview" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Matriz de Permisos por Rol</CardTitle>
                                    <CardDescription>
                                        Vista consolidada de todos los permisos asignados a cada rol
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-4 mb-4">
                                        <div className="flex-1">
                                            <Label htmlFor="search-permissions">Buscar permisos</Label>
                                            <div className="relative">
                                                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="search-permissions"
                                                    placeholder="Buscar por nombre o código..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>
                                        <div className="w-[200px]">
                                            <Label htmlFor="filter-module">Filtrar por módulo</Label>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-between">
                                                        <span className="truncate">
                                                            {selectedModule === "all"
                                                                ? "Todos los módulos"
                                                                : modules.find(m => m.id === selectedModule)?.name}
                                                        </span>
                                                        <IconFilter className="ml-2 h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[200px]">
                                                    <DropdownMenuItem onClick={() => setSelectedModule("all")}>
                                                        Todos los módulos
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {modules.map(module => (
                                                        <DropdownMenuItem
                                                            key={module.id}
                                                            onClick={() => setSelectedModule(module.id)}
                                                        >
                                                            {module.name}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[300px]">Permiso</TableHead>
                                                    <TableHead className="text-center">Super Admin</TableHead>
                                                    <TableHead className="text-center">Admin</TableHead>
                                                    <TableHead className="text-center">Moderador</TableHead>
                                                    <TableHead className="text-center">Usuario</TableHead>
                                                    <TableHead className="w-[100px]">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredPermissions.map(permission => (
                                                    <TableRow key={permission.id}>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <div className="font-medium">{permission.name}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {permission.code}
                                                                </div>
                                                                {permission.module && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {permission.module.name}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        {Object.values(UserRole).map(role => (
                                                            <TableCell key={role} className="text-center">
                                                                <Checkbox
                                                                    checked={permissionMatrix[permission.id]?.[role] || false}
                                                                    onCheckedChange={async (checked) => {
                                                                        const usersWithRole = users.filter(u => u.role === role)
                                                                        if (usersWithRole.length === 0) {
                                                                            toast.error("No hay usuarios con este rol")
                                                                            return
                                                                        }

                                                                        await handleBulkAction(
                                                                            checked ? 'grant' : 'revoke',
                                                                            usersWithRole.map(u => u.id),
                                                                            [permission.id]
                                                                        )
                                                                    }}
                                                                    disabled={isLoading}
                                                                />
                                                            </TableCell>
                                                        ))}
                                                        <TableCell>
                                                            <PermissionDetailsDialog permission={permission}>
                                                                <Button variant="ghost" size="sm">
                                                                    <IconInfoCircle className="h-4 w-4" />
                                                                </Button>
                                                            </PermissionDetailsDialog>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab: Usuarios */}
                        <TabsContent value="users" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Gestión de Permisos por Usuario</CardTitle>
                                    <CardDescription>
                                        Asigna o revoca permisos individualmente a cada usuario
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-4 mb-4">
                                        <div className="flex-1">
                                            <div className="relative">
                                                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    placeholder="Buscar usuarios..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline">
                                                    <IconFilter className="mr-2 h-4 w-4" />
                                                    {selectedRole === "all" ? "Todos los roles" : roleInfo[selectedRole]?.label}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => setSelectedRole("all")}>
                                                    Todos los roles
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {Object.entries(roleInfo).map(([role, info]) => (
                                                    <DropdownMenuItem
                                                        key={role}
                                                        onClick={() => setSelectedRole(role as UserRole)}
                                                    >
                                                        <Badge variant={info.color as "default" | "secondary" | "outline" | "destructive"} className="mr-2">
                                                            {info.label}
                                                        </Badge>
                                                        {stats.usersByRole[role]} usuarios
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[50px]">
                                                        <Checkbox
                                                            checked={
                                                                filteredUsers.length > 0 &&
                                                                filteredUsers.every(u => selectedUsers.has(u.id))
                                                            }
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
                                                                } else {
                                                                    setSelectedUsers(new Set())
                                                                }
                                                            }}
                                                        />
                                                    </TableHead>
                                                    <TableHead>Usuario</TableHead>
                                                    <TableHead>Rol</TableHead>
                                                    <TableHead>Permisos</TableHead>
                                                    <TableHead>Estado</TableHead>
                                                    <TableHead>Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredUsers.map(user => (
                                                    <TableRow key={user.id}>
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={selectedUsers.has(user.id)}
                                                                onCheckedChange={(checked) => {
                                                                    const newSet = new Set(selectedUsers)
                                                                    if (checked) {
                                                                        newSet.add(user.id)
                                                                    } else {
                                                                        newSet.delete(user.id)
                                                                    }
                                                                    setSelectedUsers(newSet)
                                                                }}
                                                                disabled={user.id === currentUserId}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={user.image || undefined} />
                                                                    <AvatarFallback>
                                                                        {user.name?.split(' ').map(n => n[0]).join('') || user.email[0].toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <div className="font-medium">{user.name || 'Sin nombre'}</div>
                                                                    <div className="text-xs text-muted-foreground">{user.email}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={roleInfo[user.role as UserRole]?.color as "default" | "secondary" | "outline" | "destructive"}>
                                                                {roleInfo[user.role as UserRole]?.label}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm">
                                                                    {user.permissions.length} permisos
                                                                </span>
                                                                {user.permissions.length > 0 && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger>
                                                                            <IconInfoCircle className="h-4 w-4 text-muted-foreground" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <div className="max-w-[300px] space-y-1">
                                                                                {user.permissions.slice(0, 5).map(({ permission }) => (
                                                                                    <div key={permission.id} className="text-xs">
                                                                                        {permission.name}
                                                                                    </div>
                                                                                ))}
                                                                                {user.permissions.length > 5 && (
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        +{user.permissions.length - 5} más
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={user.emailVerified ? "default" : "destructive"}>
                                                                {user.emailVerified ? "Activo" : "Inactivo"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <ManageUserPermissionsDialog
                                                                user={user}
                                                                allPermissions={permissions}
                                                                modules={modules}
                                                                onSuccess={() => router.refresh()}
                                                            >
                                                                <Button variant="outline" size="sm">
                                                                    <IconEdit className="mr-2 h-4 w-4" />
                                                                    Gestionar
                                                                </Button>
                                                            </ManageUserPermissionsDialog>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {selectedUsers.size > 0 && (
                                        <div className="flex items-center justify-between mt-4 p-4 bg-muted rounded-lg">
                                            <span className="text-sm">
                                                {selectedUsers.size} usuario(s) seleccionado(s)
                                            </span>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedUsers(new Set())}
                                                >
                                                    Cancelar
                                                </Button>
                                                <BulkAssignPermissionsDialog
                                                    selectedUserIds={Array.from(selectedUsers)}
                                                    users={users}
                                                    permissions={permissions}
                                                    modules={modules}
                                                    onSuccess={() => {
                                                        router.refresh()
                                                        setSelectedUsers(new Set())
                                                    }}
                                                >
                                                    <Button size="sm">
                                                        Asignar Permisos
                                                    </Button>
                                                </BulkAssignPermissionsDialog>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab: Permisos */}
                        <TabsContent value="permissions" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Catálogo de Permisos</CardTitle>
                                    <CardDescription>
                                        Todos los permisos disponibles en el sistema organizados por módulo
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[600px]">
                                        {modules.map(module => (
                                            <div key={module.id} className="mb-6">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <IconLayoutGrid className="h-5 w-5" />
                                                    <h3 className="font-semibold">{module.name}</h3>
                                                    <Badge variant="secondary">
                                                        {module.permissions.length} permisos
                                                    </Badge>
                                                </div>
                                                <div className="grid gap-2">
                                                    {permissions
                                                        .filter(p => p.moduleId === module.id)
                                                        .map(permission => (
                                                            <div
                                                                key={permission.id}
                                                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                                                            >
                                                                <div className="space-y-1">
                                                                    <div className="font-medium">{permission.name}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {permission.code}
                                                                    </div>
                                                                    {permission.description && (
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {permission.description}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex gap-1">
                                                                        {permission.actions.map(action => (
                                                                            <Badge
                                                                                key={action}
                                                                                variant="secondary"
                                                                                className="text-xs"
                                                                            >
                                                                                {action === 'CREATE' && '➕ Crear'}
                                                                                {action === 'READ' && '👁️ Ver'}
                                                                                {action === 'UPDATE' && '✏️ Editar'}
                                                                                {action === 'DELETE' && '🗑️ Eliminar'}
                                                                                {action === 'EXECUTE' && '⚡ Ejecutar'}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline">
                                                                        {permission.users.length} usuarios
                                                                    </Badge>
                                                                    <PermissionDetailsDialog permission={permission}>
                                                                        <Button variant="ghost" size="sm">
                                                                            <IconInfoCircle className="h-4 w-4" />
                                                                        </Button>
                                                                    </PermissionDetailsDialog>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab: Historial */}
                        <TabsContent value="history" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Historial de Cambios</CardTitle>
                                    <CardDescription>
                                        Registro de todas las modificaciones de permisos realizadas
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[600px]">
                                        <div className="space-y-2">
                                            {auditLogs.map(log => {
                                                const user = users.find(u => u.id === log.userId)
                                                const targetUser = users.find(u => u.id === log.entityId)

                                                return (
                                                    <div
                                                        key={log.id}
                                                        className="flex items-center justify-between p-3 rounded-lg border"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={user?.image || undefined} />
                                                                <AvatarFallback>
                                                                    {user?.name?.charAt(0) || '?'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="text-sm">
                                                                    <span className="font-medium">
                                                                        {user?.name || 'Usuario desconocido'}
                                                                    </span>
                                                                    {' '}
                                                                    {log.action === 'permissions.add' && 'otorgó permisos a'}
                                                                    {log.action === 'permissions.remove' && 'revocó permisos de'}
                                                                    {log.action === 'permissions.set' && 'actualizó permisos de'}
                                                                    {log.action === 'users.role_changed' && 'cambió el rol de'}
                                                                    {' '}
                                                                    <span className="font-medium">
                                                                        {targetUser?.name || targetUser?.email || 'usuario'}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {new Date(log.timestamp).toLocaleString('es-ES')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {log.changes?.permissions && (
                                                            <Badge variant="secondary">
                                                                {log.changes.permissions.length} permisos
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </TooltipProvider>
    )
}