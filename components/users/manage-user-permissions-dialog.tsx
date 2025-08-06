"use client"

import * as React from "react"
import { toast } from "sonner"
import { IconLoader2, IconSearch } from "@tabler/icons-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
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
    } | null
    actions: string[]
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

interface Module {
    id: string
    name: string
    permissions: Permission[]
}

interface ManageUserPermissionsDialogProps {
    user: User
    allPermissions: Permission[]
    modules: Module[]
    onSuccess?: () => void
    children: React.ReactNode
}

export function ManageUserPermissionsDialog({
    user,
    allPermissions,
    modules,
    onSuccess,
    children
}: ManageUserPermissionsDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [selectedPermissions, setSelectedPermissions] = React.useState<Set<string>>(
        new Set(user.permissions.map(up => up.permission.id))
    )

    const filteredPermissions = allPermissions.filter(permission =>
        permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleTogglePermission = (permissionId: string) => {
        const newSet = new Set(selectedPermissions)
        if (newSet.has(permissionId)) {
            newSet.delete(permissionId)
        } else {
            newSet.add(permissionId)
        }
        setSelectedPermissions(newSet)
    }

    const handleToggleModule = (moduleId: string) => {
        const modulePermissions = allPermissions.filter(p => p.moduleId === moduleId)
        const allSelected = modulePermissions.every(p => selectedPermissions.has(p.id))

        const newSet = new Set(selectedPermissions)
        modulePermissions.forEach(permission => {
            if (allSelected) {
                newSet.delete(permission.id)
            } else {
                newSet.add(permission.id)
            }
        })
        setSelectedPermissions(newSet)
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/permissions/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: user.id,
                    permissions: Array.from(selectedPermissions),
                    action: 'set'
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al guardar permisos')
            }

            toast.success('Permisos actualizados correctamente')
            setOpen(false)
            onSuccess?.()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al guardar permisos')
        } finally {
            setIsLoading(false)
        }
    }

    const getChangedPermissions = () => {
        const currentPermissionIds = new Set(user.permissions.map(up => up.permission.id))
        const added = Array.from(selectedPermissions).filter(id => !currentPermissionIds.has(id))
        const removed = Array.from(currentPermissionIds).filter(id => !selectedPermissions.has(id))
        return { added, removed, hasChanges: added.length > 0 || removed.length > 0 }
    }

    const { added, removed, hasChanges } = getChangedPermissions()

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Gestionar Permisos</DialogTitle>
                    <DialogDescription>
                        Administra los permisos individuales del usuario
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-3 mb-4">
                    <Avatar>
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>
                            {user.name?.split(' ').map(n => n[0]).join('') || user.email[0].toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium">{user.name || 'Sin nombre'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar permisos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {hasChanges && (
                        <div className="rounded-lg border p-3 space-y-2 bg-muted/50">
                            <p className="text-sm font-medium">Cambios pendientes:</p>
                            {added.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                        +{added.length} nuevos
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {allPermissions
                                            .filter(p => added.includes(p.id))
                                            .slice(0, 3)
                                            .map(p => p.name)
                                            .join(', ')}
                                        {added.length > 3 && ` y ${added.length - 3} más`}
                                    </span>
                                </div>
                            )}
                            {removed.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="destructive" className="text-xs">
                                        -{removed.length} eliminados
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {user.permissions
                                            .filter(up => removed.includes(up.permission.id))
                                            .slice(0, 3)
                                            .map(up => up.permission.name)
                                            .join(', ')}
                                        {removed.length > 3 && ` y ${removed.length - 3} más`}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <ScrollArea className="h-[400px] pr-4">
                        <Accordion type="multiple" className="w-full">
                            {modules.map(module => {
                                const modulePermissions = filteredPermissions.filter(p => p.moduleId === module.id)
                                if (modulePermissions.length === 0) return null

                                const selectedCount = modulePermissions.filter(p => selectedPermissions.has(p.id)).length
                                const allSelected = selectedCount === modulePermissions.length && modulePermissions.length > 0

                                return (
                                    <AccordionItem key={module.id} value={module.id}>
                                        <AccordionTrigger className="hover:no-underline">
                                            <div className="flex items-center justify-between w-full pr-4">
                                                <span className="font-medium">{module.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {selectedCount}/{modulePermissions.length}
                                                    </Badge>
                                                    <span
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleToggleModule(module.id)
                                                        }}
                                                        className="text-xs text-primary hover:underline cursor-pointer px-2 py-1"
                                                    >
                                                        {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
                                                    </span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-2 pt-2">
                                                {modulePermissions.map(permission => (
                                                    <div
                                                        key={permission.id}
                                                        className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50"
                                                    >
                                                        <Checkbox
                                                            id={permission.id}
                                                            checked={selectedPermissions.has(permission.id)}
                                                            onCheckedChange={() => handleTogglePermission(permission.id)}
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
                                                                        {action === 'CREATE' && '➕ Crear'}
                                                                        {action === 'READ' && '👁️ Ver'}
                                                                        {action === 'UPDATE' && '✏️ Editar'}
                                                                        {action === 'DELETE' && '🗑️ Eliminar'}
                                                                        {action === 'EXECUTE' && '⚡ Ejecutar'}
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
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isLoading || !hasChanges}
                    >
                        {isLoading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}