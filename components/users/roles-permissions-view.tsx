"use client"

import * as React from "react"
import { UserRole } from "@prisma/client"
import { toast } from "sonner"
import {
    IconLayoutGrid,
    IconSearch,
    IconLoader2,
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
        }
    }[]
}

interface User {
    id: string
    name?: string | null
    email: string
    role: string
    image?: string | null
    permissions: {
        permission: Permission
    }[]
}

interface RolesPermissionsViewProps {
    view: 'by-role' | 'by-user' | 'by-module'
    permissions: Permission[]
    usersByRole?: { role: string; _count: { role: number } }[]
    usersWithPermissions?: User[]
    permissionsByModule?: Record<string, { module: { id: string; name: string; icon?: string | null } | null, permissions: Permission[] }>
}

export function RolesPermissionsView({
    view,
    permissions,
    usersByRole = [],
    usersWithPermissions = [],
    permissionsByModule = {}
}: RolesPermissionsViewProps) {
    const [searchTerm, setSearchTerm] = React.useState("")
    const [selectedRole, setSelectedRole] = React.useState<UserRole>(UserRole.USER)
    const [selectedPermissions, setSelectedPermissions] = React.useState<Set<string>>(new Set())
    const [isLoading, setIsLoading] = React.useState(false)
    const [permissionsByRoleData, setPermissionsByRoleData] = React.useState<Record<UserRole, string[]>>({
        [UserRole.SUPER_ADMIN]: [],
        [UserRole.ADMIN]: [],
        [UserRole.MODERATOR]: [],
        [UserRole.USER]: []
    })

    // Cargar permisos por rol al montar
    const loadPermissionsByRole = React.useCallback(async () => {
        try {
            const response = await fetch('/api/permissions/by-role')
            if (response.ok) {
                const data = await response.json()
                const permissionsMap: Record<UserRole, string[]> = {
                    [UserRole.SUPER_ADMIN]: [],
                    [UserRole.ADMIN]: [],
                    [UserRole.MODERATOR]: [],
                    [UserRole.USER]: []
                }

                Object.entries(data.permissionsByRole).forEach(([role, perms]) => {
                    permissionsMap[role as UserRole] = (perms as Permission[]).map(p => p.id)
                })

                setPermissionsByRoleData(permissionsMap)
                setSelectedPermissions(new Set(permissionsMap[selectedRole]))
            }
        } catch (error) {
            console.error("Error cargando permisos por rol:", error)
        }
    }, [selectedRole])

    React.useEffect(() => {
        loadPermissionsByRole()
    }, [loadPermissionsByRole])

    const roleInfo = {
        [UserRole.SUPER_ADMIN]: {
            label: "Super Administrador",
            color: "destructive",
            description: "Acceso total al sistema"
        },
        [UserRole.ADMIN]: {
            label: "Administrador",
            color: "default",
            description: "Gestión completa excepto sistema"
        },
        [UserRole.MODERATOR]: {
            label: "Moderador",
            color: "secondary",
            description: "Gestión de contenido"
        },
        [UserRole.USER]: {
            label: "Usuario",
            color: "outline",
            description: "Acceso básico"
        }
    }

    const filteredPermissions = permissions.filter(permission =>
        permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredUsers = usersWithPermissions.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handlePermissionToggle = (permissionId: string) => {
        const newSet = new Set(selectedPermissions)
        if (newSet.has(permissionId)) {
            newSet.delete(permissionId)
        } else {
            newSet.add(permissionId)
        }
        setSelectedPermissions(newSet)
    }

    const handleSavePermissions = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/permissions/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role: selectedRole,
                    permissions: Array.from(selectedPermissions),
                    action: 'set'
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al guardar permisos')
            }

            const result = await response.json()
            toast.success(result.message)

            // Actualizar el estado local
            setPermissionsByRoleData(prev => ({
                ...prev,
                [selectedRole]: Array.from(selectedPermissions)
            }))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al guardar permisos")
        } finally {
            setIsLoading(false)
        }
    }

    // Vista por Rol
    if (view === 'by-role') {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <Select
                        value={selectedRole}
                        onValueChange={(value) => {
                            setSelectedRole(value as UserRole)
                            setSelectedPermissions(new Set(permissionsByRoleData[value as UserRole]))
                        }}
                    >
                        <SelectTrigger className="w-full sm:w-[250px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(roleInfo).map(([role, info]) => (
                                <SelectItem key={role} value={role}>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={info.color as "default" | "secondary" | "destructive" | "outline"} className="w-fit">
                                            {info.label}
                                        </Badge>
                                        <span className="text-muted-foreground text-sm">
                                            ({usersByRole.find(u => u.role === role)?._count.role || 0} usuarios)
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="relative flex-1">
                        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar permisos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Button
                        onClick={handleSavePermissions}
                        disabled={isLoading}
                    >
                        {isLoading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{roleInfo[selectedRole].label}</CardTitle>
                        <CardDescription>{roleInfo[selectedRole].description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[500px] pr-4">
                            <Accordion type="single" collapsible className="w-full">
                                {Object.entries(permissionsByModule).map(([moduleId, data]) => {
                                    const modulePermissions = data.permissions.filter(p =>
                                        filteredPermissions.some(fp => fp.id === p.id)
                                    )

                                    if (modulePermissions.length === 0) return null

                                    return (
                                        <AccordionItem key={moduleId} value={moduleId}>
                                            <AccordionTrigger>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">
                                                        {data.module?.name || 'Sin módulo'}
                                                    </span>
                                                    <Badge variant="secondary" className="ml-2">
                                                        {modulePermissions.filter(p => selectedPermissions.has(p.id)).length}/
                                                        {modulePermissions.length}
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-3 pt-2">
                                                    {modulePermissions.map(permission => (
                                                        <div
                                                            key={permission.id}
                                                            className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50"
                                                        >
                                                            <Checkbox
                                                                id={permission.id}
                                                                checked={selectedPermissions.has(permission.id)}
                                                                onCheckedChange={() => handlePermissionToggle(permission.id)}
                                                                disabled={isLoading}
                                                            />
                                                            <div className="flex-1 space-y-1">
                                                                <label
                                                                    htmlFor={permission.id}
                                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                                >
                                                                    {permission.name}
                                                                </label>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {permission.code}
                                                                </p>
                                                                {permission.description && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {permission.description}
                                                                    </p>
                                                                )}
                                                                <div className="flex gap-1 mt-1">
                                                                    {permission.actions.map(action => (
                                                                        <Badge
                                                                            key={action}
                                                                            variant="secondary"
                                                                            className="text-xs h-5"
                                                                        >
                                                                            {action}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                })}
                            </Accordion>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Vista por Usuario
    if (view === 'by-user') {
        return (
            <div className="space-y-6">
                <div className="relative">
                    <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar usuarios..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredUsers.map(user => (
                        <Card key={user.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={user.image || undefined} />
                                        <AvatarFallback>
                                            {user.name?.split(' ').map(n => n[0]).join('') || user.email[0].toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <CardTitle className="text-base">{user.name || 'Sin nombre'}</CardTitle>
                                        <CardDescription className="text-xs">{user.email}</CardDescription>
                                    </div>
                                    <Badge variant={roleInfo[user.role as UserRole]?.color as "default" | "secondary" | "destructive" | "outline"}>
                                        {roleInfo[user.role as UserRole]?.label}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Permisos asignados:</span>
                                        <span className="font-medium">{user.permissions.length}</span>
                                    </div>
                                    <Separator />
                                    <ScrollArea className="h-[120px]">
                                        <div className="space-y-1">
                                            {user.permissions.length === 0 ? (
                                                <p className="text-xs text-muted-foreground text-center py-4">
                                                    Sin permisos asignados
                                                </p>
                                            ) : (
                                                user.permissions.map(({ permission }) => (
                                                    <div key={permission.id} className="text-xs p-1">
                                                        <div className="font-medium">{permission.name}</div>
                                                        <div className="text-muted-foreground">{permission.code}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    // Vista por Módulo
    return (
        <div className="space-y-6">
            <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Buscar módulos o permisos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="space-y-4">
                {Object.entries(permissionsByModule).map(([moduleId, data]) => {
                    const modulePermissions = data.permissions.filter(p =>
                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        data.module?.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )

                    if (modulePermissions.length === 0) return null

                    return (
                        <Card key={moduleId}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <IconLayoutGrid className="h-5 w-5" />
                                        <CardTitle>{data.module?.name || 'Sin módulo'}</CardTitle>
                                    </div>
                                    <Badge>{modulePermissions.length} permisos</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 md:grid-cols-2">
                                    {modulePermissions.map(permission => (
                                        <div
                                            key={permission.id}
                                            className="rounded-lg border p-3 space-y-2"
                                        >
                                            <div>
                                                <h4 className="font-medium text-sm">{permission.name}</h4>
                                                <p className="text-xs text-muted-foreground">{permission.code}</p>
                                            </div>
                                            {permission.description && (
                                                <p className="text-xs text-muted-foreground">
                                                    {permission.description}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-1">
                                                {permission.actions.map(action => (
                                                    <Badge
                                                        key={action}
                                                        variant="secondary"
                                                        className="text-xs h-5"
                                                    >
                                                        {action}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <Separator />
                                            <div className="text-xs text-muted-foreground">
                                                Asignado a {permission.users.length} usuario(s)
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}