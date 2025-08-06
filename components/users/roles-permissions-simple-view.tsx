"use client"

import * as React from "react"
import { UserRole, PermissionAction } from "@prisma/client"
import {
    IconChevronRight,
    IconChevronDown,
    IconSearch,
    IconLoader2,
    IconX,
    IconPlus,
    IconEye,
    IconEdit,
    IconTrash,
    IconFileExport
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Collapsible,
    CollapsibleContent,
} from "@/components/ui/collapsible"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface Permission {
    id: string
    name: string
    code: string
    description?: string | null
    actions: string[]
    submoduleId?: string | null
}

interface Submodule {
    id: string
    name: string
    slug: string
    description?: string | null
    icon?: string | null
    permissions: Permission[]
}

interface Module {
    id: string
    name: string
    slug: string
    icon?: string | null
    submodules: Submodule[]
}

interface RolePermission {
    roleId: string
    permissionId: string
    actions: string[]
}

interface RolesPermissionsSimpleViewProps {
    modules: Module[]
    rolePermissions: RolePermission[]
    currentUserId?: string
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

const ROLES = [
    { value: UserRole.SUPER_ADMIN, label: "Super Admin", color: "destructive" as BadgeVariant },
    { value: UserRole.ADMIN, label: "Admin", color: "default" as BadgeVariant },
    { value: UserRole.MODERATOR, label: "Moderador", color: "secondary" as BadgeVariant },
    { value: UserRole.USER, label: "Usuario", color: "outline" as BadgeVariant }
] as const

const ACTIONS = [
    { value: PermissionAction.CREATE, label: "Crear", icon: IconPlus },
    { value: PermissionAction.READ, label: "Ver", icon: IconEye },
    { value: PermissionAction.UPDATE, label: "Editar", icon: IconEdit },
    { value: PermissionAction.DELETE, label: "Eliminar", icon: IconTrash },
    { value: PermissionAction.EXPORT, label: "Exportar", icon: IconFileExport }
] as const

export function RolesPermissionsSimpleView({
    modules,
    rolePermissions: initialRolePermissions
}: RolesPermissionsSimpleViewProps) {
    const [searchTerm, setSearchTerm] = React.useState("")
    const [expandedModules, setExpandedModules] = React.useState<Set<string>>(new Set())
    const [expandedSubmodules, setExpandedSubmodules] = React.useState<Set<string>>(new Set())
    const [isLoading, setIsLoading] = React.useState(false)
    const [pendingChanges, setPendingChanges] = React.useState<Map<string, RolePermission[]>>(new Map())
    const [rolePermissions, setRolePermissions] = React.useState(initialRolePermissions)

    // Filtrar módulos y submódulos basado en búsqueda
    const filteredModules = React.useMemo(() => {
        if (!searchTerm) return modules

        const term = searchTerm.toLowerCase()
        return modules.filter(module =>
            module.name.toLowerCase().includes(term) ||
            module.submodules.some(sub =>
                sub.name.toLowerCase().includes(term) ||
                sub.permissions.some(perm =>
                    perm.name.toLowerCase().includes(term) ||
                    perm.code.toLowerCase().includes(term)
                )
            )
        )
    }, [modules, searchTerm])

    // Toggle módulo expandido
    const toggleModule = (moduleId: string) => {
        setExpandedModules(prev => {
            const next = new Set(prev)
            if (next.has(moduleId)) {
                next.delete(moduleId)
            } else {
                next.add(moduleId)
            }
            return next
        })
    }

    // Toggle submódulo expandido
    const toggleSubmodule = (submoduleId: string) => {
        setExpandedSubmodules(prev => {
            const next = new Set(prev)
            if (next.has(submoduleId)) {
                next.delete(submoduleId)
            } else {
                next.add(submoduleId)
            }
            return next
        })
    }

    // Obtener permisos actuales para un rol y permiso
    const getRolePermissionActions = (roleId: string, permissionId: string): string[] => {
        // Primero verificar cambios pendientes
        const key = `${roleId}-${permissionId}`
        const pending = pendingChanges.get(key)
        if (pending && pending.length > 0) {
            return pending[0].actions
        }

        // Luego verificar permisos actuales
        const rolePermission = rolePermissions.find(
            rp => rp.roleId === roleId && rp.permissionId === permissionId
        )
        return rolePermission?.actions || []
    }

    // Manejar cambio de acción
    const handleActionChange = (roleId: string, permissionId: string, action: string, checked: boolean) => {
        const key = `${roleId}-${permissionId}`
        const currentActions = getRolePermissionActions(roleId, permissionId)
        
        let newActions: string[]
        if (checked) {
            newActions = [...new Set([...currentActions, action])]
        } else {
            newActions = currentActions.filter(a => a !== action)
        }

        // Actualizar cambios pendientes
        setPendingChanges(prev => {
            const next = new Map(prev)
            next.set(key, [{
                roleId,
                permissionId,
                actions: newActions
            }])
            return next
        })
    }

    // Guardar cambios
    const saveChanges = async () => {
        if (pendingChanges.size === 0) {
            toast.info("No hay cambios pendientes")
            return
        }

        setIsLoading(true)
        try {
            const changes = Array.from(pendingChanges.values()).flat()
            
            const response = await fetch('/api/permissions/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ changes })
            })

            if (!response.ok) {
                throw new Error('Error al actualizar permisos')
            }

            // Crear un mensaje más descriptivo
            const uniqueRoles = new Set(changes.map(c => c.roleId))
            const rolesCount = uniqueRoles.size
            
            let message = "Permisos actualizados correctamente"
            if (rolesCount === 1) {
                const roleName = ROLES.find(r => r.value === changes[0].roleId)?.label
                message = `Permisos de ${roleName} actualizados correctamente`
            } else if (rolesCount > 1) {
                message = `Permisos de ${rolesCount} roles actualizados correctamente`
            }
            
            toast.success(message, {
                duration: 3000
            })
            
            // Actualizar el estado local con los cambios guardados
            const newRolePermissions = [...rolePermissions]
            
            // Aplicar cada cambio al estado local
            changes.forEach(change => {
                const existingIndex = newRolePermissions.findIndex(
                    rp => rp.roleId === change.roleId && rp.permissionId === change.permissionId
                )
                
                if (change.actions.length === 0) {
                    // Si no hay acciones, eliminar el permiso
                    if (existingIndex !== -1) {
                        newRolePermissions.splice(existingIndex, 1)
                    }
                } else {
                    // Si hay acciones, actualizar o agregar
                    if (existingIndex !== -1) {
                        newRolePermissions[existingIndex] = change
                    } else {
                        newRolePermissions.push(change)
                    }
                }
            })
            
            setRolePermissions(newRolePermissions)
            setPendingChanges(new Map())
        } catch (error) {
            toast.error('Error al guardar los cambios')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-4 md:space-y-6 px-4 lg:px-6 py-4 md:py-6">
            {/* Header */}
            <div>
                <h1 className="text-xl md:text-2xl font-bold">Gestión de Roles y Permisos</h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1">
                    Administra los permisos de cada rol por submódulo y acción
                </p>
            </div>

            {/* Barra de herramientas */}
            <Card>
                <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col gap-3">
                        <div className="relative">
                            <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar módulos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 text-sm"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                            {/* Leyenda de roles */}
                            <div className="flex flex-wrap gap-2">
                                {ROLES.map(role => (
                                    <Badge key={role.value} variant={role.color} className="text-xs">
                                        {role.label}
                                    </Badge>
                                ))}
                            </div>
                            <Button
                                onClick={saveChanges}
                                disabled={isLoading || pendingChanges.size === 0}
                                className="w-full sm:w-auto"
                            >
                                {isLoading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar ({pendingChanges.size})
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de módulos */}
            <Card>
                <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-300px)] md:h-[600px]">
                        <div className="p-4 md:p-6 space-y-4">
                            {filteredModules.map(module => (
                                <div key={module.id} className="border rounded-lg">
                                    {/* Módulo header */}
                                    <button
                                        onClick={() => toggleModule(module.id)}
                                        className="w-full p-3 md:p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 md:gap-3">
                                            {expandedModules.has(module.id) ? (
                                                <IconChevronDown className="h-4 w-4 flex-shrink-0" />
                                            ) : (
                                                <IconChevronRight className="h-4 w-4 flex-shrink-0" />
                                            )}
                                            <span className="font-semibold text-sm md:text-base">{module.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {module.submodules.length}
                                            </Badge>
                                        </div>
                                    </button>

                                    {/* Submódulos */}
                                    <Collapsible open={expandedModules.has(module.id)}>
                                        <CollapsibleContent>
                                            <div className="border-t">
                                                {module.submodules.map(submodule => (
                                                    <div key={submodule.id} className="border-b last:border-0">
                                                        {/* Submódulo header */}
                                                        <button
                                                            onClick={() => toggleSubmodule(submodule.id)}
                                                            className="w-full p-3 md:p-4 pl-8 md:pl-12 flex items-center justify-between hover:bg-muted/30 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2 md:gap-3">
                                                                {expandedSubmodules.has(submodule.id) ? (
                                                                    <IconChevronDown className="h-4 w-4 flex-shrink-0" />
                                                                ) : (
                                                                    <IconChevronRight className="h-4 w-4 flex-shrink-0" />
                                                                )}
                                                                <div className="text-left">
                                                                    <span className="font-medium text-sm md:text-base">{submodule.name}</span>
                                                                    {submodule.description && (
                                                                        <span className="hidden md:inline text-sm text-muted-foreground ml-2">
                                                                            - {submodule.description}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>

                                                        {/* Permisos del submódulo */}
                                                        <Collapsible open={expandedSubmodules.has(submodule.id)}>
                                                            <CollapsibleContent>
                                                                <div className="p-3 md:p-4 pl-8 md:pl-16 space-y-4 bg-muted/10">
                                                                    {submodule.permissions.map(permission => (
                                                                        <div key={permission.id} className="space-y-3">
                                                                            <div>
                                                                                <h5 className="font-medium text-sm md:text-base">{permission.name}</h5>
                                                                                {permission.description && (
                                                                                    <p className="text-xs md:text-sm text-muted-foreground">
                                                                                        {permission.description}
                                                                                    </p>
                                                                                )}
                                                                                <code className="text-xs bg-muted px-2 py-1 rounded inline-block mt-1">
                                                                                    {permission.code}
                                                                                </code>
                                                                            </div>

                                                                            {/* Grid de roles y acciones */}
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                                                {ROLES.map(role => {
                                                                                    const actions = getRolePermissionActions(role.value, permission.id)
                                                                                    const hasChanges = pendingChanges.has(`${role.value}-${permission.id}`)

                                                                                    return (
                                                                                        <div
                                                                                            key={role.value}
                                                                                            className={`p-3 border rounded-lg ${hasChanges ? 'border-primary' : ''}`}
                                                                                        >
                                                                                            <div className="flex items-center justify-between mb-2">
                                                                                                <Badge variant={role.color} className="text-xs px-2 py-0.5">
                                                                                                    {role.label}
                                                                                                </Badge>
                                                                                                <div className="flex items-center gap-1">
                                                                                                    {hasChanges && (
                                                                                                        <Badge variant="outline" className="text-xs px-1 py-0 hidden sm:inline-flex">
                                                                                                            Mod
                                                                                                        </Badge>
                                                                                                    )}
                                                                                                    {actions.length > 0 && role.value !== UserRole.SUPER_ADMIN && (
                                                                                                        <TooltipProvider>
                                                                                                            <Tooltip>
                                                                                                                <TooltipTrigger asChild>
                                                                                                                    <Button
                                                                                                                        variant="ghost"
                                                                                                                        size="icon"
                                                                                                                        className="h-5 w-5"
                                                                                                                        onClick={() => {
                                                                                                                            const key = `${role.value}-${permission.id}`
                                                                                                                            setPendingChanges(prev => {
                                                                                                                                const next = new Map(prev)
                                                                                                                                next.set(key, [{
                                                                                                                                    roleId: role.value,
                                                                                                                                    permissionId: permission.id,
                                                                                                                                    actions: []
                                                                                                                                }])
                                                                                                                                return next
                                                                                                                            })
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        <IconX className="h-3 w-3" />
                                                                                                                    </Button>
                                                                                                                </TooltipTrigger>
                                                                                                                <TooltipContent side="top">
                                                                                                                    <p className="text-xs">Quitar todos</p>
                                                                                                                </TooltipContent>
                                                                                                            </Tooltip>
                                                                                                        </TooltipProvider>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="space-y-1.5">
                                                                                                {ACTIONS.map(action => {
                                                                                                    return (
                                                                                                        <TooltipProvider key={action.value}>
                                                                                                            <Tooltip>
                                                                                                                <TooltipTrigger asChild>
                                                                                                                    <div className="flex items-center space-x-2">
                                                                                                                        <Checkbox
                                                                                                                            id={`${role.value}-${permission.id}-${action.value}`}
                                                                                                                            checked={actions.includes(action.value)}
                                                                                                                            onCheckedChange={(checked) =>
                                                                                                                                handleActionChange(
                                                                                                                                    role.value,
                                                                                                                                    permission.id,
                                                                                                                                    action.value,
                                                                                                                                    checked as boolean
                                                                                                                                )
                                                                                                                            }
                                                                                                                            disabled={role.value === UserRole.SUPER_ADMIN}
                                                                                                                    />
                                                                                                                    <label
                                                                                                                        htmlFor={`${role.value}-${permission.id}-${action.value}`}
                                                                                                                        className="text-xs sm:text-sm cursor-pointer select-none flex items-center gap-1"
                                                                                                                    >
                                                                                                                        <action.icon className="h-3.5 w-3.5 sm:h-3 sm:w-3 flex-shrink-0" />
                                                                                                                        <span className="hidden sm:inline">{action.label}</span>
                                                                                                                    </label>
                                                                                                                </div>
                                                                                                            </TooltipTrigger>
                                                                                                            <TooltipContent>
                                                                                                                <p>{action.label} en {permission.name}</p>
                                                                                                            </TooltipContent>
                                                                                                        </Tooltip>
                                                                                                    </TooltipProvider>
                                                                                                    )
                                                                                                })}
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </CollapsibleContent>
                                                        </Collapsible>
                                                    </div>
                                                ))}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}