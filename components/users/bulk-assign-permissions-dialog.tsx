"use client"

import * as React from "react"
import { toast } from "sonner"
import { IconLoader2, IconSearch } from "@tabler/icons-react"
import { UserRole } from "@prisma/client"
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
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
}

interface Module {
    id: string
    name: string
    permissions: Permission[]
}

interface BulkAssignPermissionsDialogProps {
    selectedUserIds?: string[]
    users: User[]
    permissions: Permission[]
    modules: Module[]
    onSuccess?: () => void
    children: React.ReactNode
}

export function BulkAssignPermissionsDialog({
    selectedUserIds = [],
    users,
    permissions,
    modules,
    onSuccess,
    children
}: BulkAssignPermissionsDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)
    const [searchPermissions, setSearchPermissions] = React.useState("")
    const [searchUsers, setSearchUsers] = React.useState("")
    const [targetType, setTargetType] = React.useState<'users' | 'role'>('users')
    const [selectedRole, setSelectedRole] = React.useState<UserRole>(UserRole.USER)
    const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(new Set(selectedUserIds))
    const [selectedPermissions, setSelectedPermissions] = React.useState<Set<string>>(new Set())
    const [action, setAction] = React.useState<'add' | 'remove' | 'set'>('add')

    const roleInfo = {
        [UserRole.SUPER_ADMIN]: { label: "Super Admin", color: "destructive" },
        [UserRole.ADMIN]: { label: "Administrador", color: "default" },
        [UserRole.MODERATOR]: { label: "Moderador", color: "secondary" },
        [UserRole.USER]: { label: "Usuario", color: "outline" }
    }

    const filteredPermissions = permissions.filter(permission =>
        permission.name.toLowerCase().includes(searchPermissions.toLowerCase()) ||
        permission.code.toLowerCase().includes(searchPermissions.toLowerCase())
    )

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchUsers.toLowerCase()) ||
        user.email.toLowerCase().includes(searchUsers.toLowerCase())
    )

    const targetUsers = targetType === 'role'
        ? users.filter(u => u.role === selectedRole)
        : users.filter(u => selectedUsers.has(u.id))

    const handleSubmit = async () => {
        if (targetUsers.length === 0) {
            toast.error("Selecciona al menos un usuario o rol")
            return
        }

        if (selectedPermissions.size === 0) {
            toast.error("Selecciona al menos un permiso")
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch('/api/permissions/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...(targetType === 'role'
                        ? { role: selectedRole }
                        : { userId: targetUsers.length === 1 ? targetUsers[0].id : undefined }
                    ),
                    permissions: Array.from(selectedPermissions),
                    action
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al asignar permisos')
            }

            const result = await response.json()
            toast.success(result.message)
            setOpen(false)
            resetForm()
            onSuccess?.()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al asignar permisos')
        } finally {
            setIsLoading(false)
        }
    }

    const resetForm = () => {
        setSelectedPermissions(new Set())
        setSelectedUsers(new Set(selectedUserIds))
        setSearchPermissions("")
        setSearchUsers("")
        setAction('add')
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Asignación Masiva de Permisos</DialogTitle>
                    <DialogDescription>
                        Asigna o revoca permisos a múltiples usuarios o a todos los usuarios de un rol
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6">
                    {/* Columna izquierda: Selección de usuarios */}
                    <div className="space-y-4">
                        <div>
                            <Label className="text-base font-semibold">1. Seleccionar destinatarios</Label>
                            <RadioGroup
                                value={targetType}
                                onValueChange={(value) => setTargetType(value as 'users' | 'role')}
                                className="mt-3"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="users" id="users" />
                                    <Label htmlFor="users" className="cursor-pointer">
                                        Usuarios específicos
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="role" id="role" />
                                    <Label htmlFor="role" className="cursor-pointer">
                                        Todos los usuarios de un rol
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {targetType === 'role' ? (
                            <div className="space-y-3">
                                <Label>Seleccionar rol</Label>
                                <Select
                                    value={selectedRole}
                                    onValueChange={(value) => setSelectedRole(value as UserRole)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(roleInfo).map(([role, info]) => (
                                            <SelectItem key={role} value={role}>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={info.color as "default" | "secondary" | "destructive" | "outline"}>
                                                        {info.label}
                                                    </Badge>
                                                    <span className="text-muted-foreground">
                                                        ({users.filter(u => u.role === role).length} usuarios)
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="rounded-lg border p-3 bg-muted/50">
                                    <p className="text-sm font-medium mb-2">
                                        Usuarios afectados: {targetUsers.length}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {targetUsers.slice(0, 5).map(user => (
                                            <Badge key={user.id} variant="secondary" className="text-xs">
                                                {user.name || user.email}
                                            </Badge>
                                        ))}
                                        {targetUsers.length > 5 && (
                                            <Badge variant="secondary" className="text-xs">
                                                +{targetUsers.length - 5} más
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative">
                                    <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar usuarios..."
                                        value={searchUsers}
                                        onChange={(e) => setSearchUsers(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <ScrollArea className="h-[250px] rounded-lg border p-2">
                                    <div className="space-y-2">
                                        {filteredUsers.map(user => (
                                            <div
                                                key={user.id}
                                                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50"
                                            >
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
                                                />
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={user.image || undefined} />
                                                    <AvatarFallback>
                                                        {user.name?.charAt(0) || user.email[0].toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium">
                                                        {user.name || 'Sin nombre'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {user.email}
                                                    </div>
                                                </div>
                                                <Badge
                                                    variant={
                                                        roleInfo[user.role as UserRole]?.color as
                                                        | "default"
                                                        | "secondary"
                                                        | "destructive"
                                                        | "outline"
                                                    }
                                                    className="text-xs"
                                                >
                                                    {roleInfo[user.role as UserRole]?.label}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>

                                {selectedUsers.size > 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        {selectedUsers.size} usuario(s) seleccionado(s)
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Columna derecha: Selección de permisos */}
                    <div className="space-y-4">
                        <div>
                            <Label className="text-base font-semibold">2. Seleccionar permisos</Label>
                            <RadioGroup
                                value={action}
                                onValueChange={(value) => setAction(value as 'add' | 'remove' | 'set')}
                                className="mt-3"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="add" id="add" />
                                    <Label htmlFor="add" className="cursor-pointer">
                                        Agregar permisos (mantiene los existentes)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="set" id="set" />
                                    <Label htmlFor="set" className="cursor-pointer">
                                        Establecer permisos (reemplaza los existentes)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="remove" id="remove" />
                                    <Label htmlFor="remove" className="cursor-pointer">
                                        Revocar permisos
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="relative">
                            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar permisos..."
                                value={searchPermissions}
                                onChange={(e) => setSearchPermissions(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <ScrollArea className="h-[250px] rounded-lg border">
                            <Accordion type="multiple" className="w-full">
                                {modules.map(module => {
                                    const modulePermissions = filteredPermissions.filter(p => p.moduleId === module.id)
                                    if (modulePermissions.length === 0) return null

                                    return (
                                        <AccordionItem key={module.id} value={module.id}>
                                            <AccordionTrigger className="px-3">
                                                <div className="flex items-center justify-between w-full pr-4">
                                                    <span className="font-medium">{module.name}</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {modulePermissions.filter(p => selectedPermissions.has(p.id)).length}/
                                                        {modulePermissions.length}
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-2 px-3 pt-2">
                                                    {modulePermissions.map(permission => (
                                                        <div
                                                            key={permission.id}
                                                            className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50"
                                                        >
                                                            <Checkbox
                                                                checked={selectedPermissions.has(permission.id)}
                                                                onCheckedChange={(checked) => {
                                                                    const newSet = new Set(selectedPermissions)
                                                                    if (checked) {
                                                                        newSet.add(permission.id)
                                                                    } else {
                                                                        newSet.delete(permission.id)
                                                                    }
                                                                    setSelectedPermissions(newSet)
                                                                }}
                                                            />
                                                            <div className="flex-1 space-y-1">
                                                                <label className="text-sm font-medium cursor-pointer">
                                                                    {permission.name}
                                                                </label>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {permission.code}
                                                                </p>
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

                        {selectedPermissions.size > 0 && (
                            <p className="text-sm text-muted-foreground">
                                {selectedPermissions.size} permiso(s) seleccionado(s)
                            </p>
                        )}
                    </div>
                </div>

                <Separator />

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setOpen(false)
                            resetForm()
                        }}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || targetUsers.length === 0 || selectedPermissions.size === 0}
                    >
                        {isLoading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {action === 'add' && 'Agregar permisos'}
                        {action === 'set' && 'Establecer permisos'}
                        {action === 'remove' && 'Revocar permisos'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}