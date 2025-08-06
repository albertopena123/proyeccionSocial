"use client"

import * as React from "react"
import { IconShield } from "@tabler/icons-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Permission {
    id: string
    name: string
    code: string
    description?: string | null
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

interface PermissionDetailsDialogProps {
    permission: Permission
    children: React.ReactNode
}

export function PermissionDetailsDialog({ permission, children }: PermissionDetailsDialogProps) {
    const roleColors = {
        SUPER_ADMIN: "destructive",
        ADMIN: "default",
        MODERATOR: "secondary",
        USER: "outline"
    }

    const roleLabels = {
        SUPER_ADMIN: "Super Admin",
        ADMIN: "Administrador",
        MODERATOR: "Moderador",
        USER: "Usuario"
    }

    const usersByRole = permission.users.reduce((acc, { user }) => {
        if (!acc[user.role]) acc[user.role] = []
        acc[user.role].push(user)
        return acc
    }, {} as Record<string, typeof permission.users[0]['user'][]>)

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconShield className="h-5 w-5" />
                        {permission.name}
                    </DialogTitle>
                    <DialogDescription>
                        Detalles del permiso y usuarios asignados
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Código:</span>
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                                {permission.code}
                            </code>
                        </div>

                        {permission.description && (
                            <div>
                                <span className="text-sm font-medium">Descripción:</span>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {permission.description}
                                </p>
                            </div>
                        )}

                        {permission.module && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Módulo:</span>
                                <Badge variant="outline">{permission.module.name}</Badge>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Acciones:</span>
                            <div className="flex gap-1">
                                {permission.actions.map(action => (
                                    <Badge key={action} variant="secondary" className="text-xs">
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

                    <Separator />

                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Usuarios con este permiso ({permission.users.length})
                        </h4>

                        <ScrollArea className="h-[300px]">
                            <div className="space-y-4">
                                {Object.entries(usersByRole).map(([role, users]) => (
                                    <div key={role} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={roleColors[role as keyof typeof roleColors] as "destructive" | "default" | "secondary" | "outline"}
                                                className="text-xs"
                                            >
                                                {roleLabels[role as keyof typeof roleLabels]}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {users.length} usuario(s)
                                            </span>
                                        </div>
                                        <div className="grid gap-2 pl-4">
                                            {users.map(user => (
                                                <div
                                                    key={user.id}
                                                    className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                                                >
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={user.image || undefined} />
                                                        <AvatarFallback>
                                                            {user.name?.split(' ').map(n => n[0]).join('') || user.email[0].toUpperCase()}
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
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}