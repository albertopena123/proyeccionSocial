"use client"

import * as React from "react"
import {
    IconCube,
    IconPlus,
    IconEdit,
    IconTrash,
    IconDots,
    IconChevronRight,
    IconChevronDown,
    IconShield,
    IconFolder,
    IconSearch,
    IconRefresh
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateModuleDialog } from "./create-module-dialog"
import { EditModuleDialog } from "./edit-module-dialog"
import { CreateSubmoduleDialog } from "./create-submodule-dialog"
import { EditSubmoduleDialog } from "./edit-submodule-dialog"

interface Module {
    id: string
    name: string
    slug: string
    description?: string | null
    icon?: string | null
    isActive: boolean
    order: number
    submodules: Submodule[]
    permissions: Permission[]
    MenuItem: unknown[] // Replace 'unknown' with a more specific type if available
    ModuleSettings?: unknown
    _count: {
        permissions: number
        submodules: number
    }
}

interface Submodule {
    id: string
    name: string
    slug: string
    description?: string | null
    icon?: string | null
    isActive: boolean
    order: number
    permissions: Permission[]
}

interface Permission {
    id: string
    name: string
    code: string
    description?: string | null
    actions: string[]
}

interface Stats {
    totalModules: number
    activeModules: number
    totalSubmodules: number
    totalPermissions: number
}

interface ModulesManagementViewProps {
    modules: Module[]
    stats: Stats
}

export function ModulesManagementView({ modules: initialModules, stats }: ModulesManagementViewProps) {
    const router = useRouter()
    const [modules, setModules] = React.useState(initialModules)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [showInactive, setShowInactive] = React.useState(true)
    const [expandedModules, setExpandedModules] = React.useState<Set<string>>(new Set())

    const filteredModules = modules.filter(module => {
        const matchesSearch =
            module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            module.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
            module.description?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesActive = showInactive || module.isActive

        return matchesSearch && matchesActive
    })

    const toggleModule = (moduleId: string) => {
        const newExpanded = new Set(expandedModules)
        if (newExpanded.has(moduleId)) {
            newExpanded.delete(moduleId)
        } else {
            newExpanded.add(moduleId)
        }
        setExpandedModules(newExpanded)
    }

    const handleToggleActive = async (moduleId: string, isActive: boolean) => {
        try {
            const response = await fetch(`/api/modules/${moduleId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive })
            })

            if (!response.ok) throw new Error('Error al actualizar módulo')

            const updatedModule = await response.json()
            
            // Actualizar el estado local inmediatamente
            setModules(prevModules => 
                prevModules.map(module => 
                    module.id === moduleId 
                        ? { ...module, isActive: updatedModule.isActive }
                        : module
                )
            )

            toast.success(`Módulo ${updatedModule.isActive ? 'activado' : 'desactivado'} correctamente`)
            
            // Refrescar para actualizar el sidebar
            router.refresh()
        } catch {
            toast.error('Error al actualizar el módulo')
        }
    }

    const handleDeleteModule = async (moduleId: string) => {
        if (!confirm('¿Estás seguro de eliminar este módulo? Esta acción no se puede deshacer.')) {
            return
        }

        try {
            const response = await fetch(`/api/modules/${moduleId}`, {
                method: 'DELETE'
            })

            if (!response.ok) throw new Error('Error al eliminar módulo')

            // Eliminar del estado local
            setModules(prevModules => prevModules.filter(module => module.id !== moduleId))

            toast.success('Módulo eliminado correctamente')
        } catch {
            toast.error('Error al eliminar el módulo')
        }
    }

    const handleToggleSubmoduleActive = async (submoduleId: string, isActive: boolean) => {
        try {
            const response = await fetch(`/api/submodules/${submoduleId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive })
            })

            if (!response.ok) throw new Error('Error al actualizar submódulo')

            const updatedSubmodule = await response.json()
            
            // Actualizar el estado local inmediatamente
            setModules(prevModules => 
                prevModules.map(module => ({
                    ...module,
                    submodules: module.submodules.map(sub => 
                        sub.id === submoduleId 
                            ? { ...sub, isActive: updatedSubmodule.isActive }
                            : sub
                    )
                }))
            )

            toast.success(`Submódulo ${updatedSubmodule.isActive ? 'activado' : 'desactivado'} correctamente`)
            
            // Refrescar para actualizar el sidebar
            router.refresh()
        } catch {
            toast.error('Error al actualizar el submódulo')
        }
    }

    const handleDeleteSubmodule = async (submoduleId: string) => {
        if (!confirm('¿Estás seguro de eliminar este submódulo? Esta acción no se puede deshacer.')) {
            return
        }

        try {
            const response = await fetch(`/api/submodules/${submoduleId}`, {
                method: 'DELETE'
            })

            if (!response.ok) throw new Error('Error al eliminar submódulo')

            // Actualizar el estado local para eliminar el submódulo
            setModules(prevModules => 
                prevModules.map(module => ({
                    ...module,
                    submodules: module.submodules.filter(sub => sub.id !== submoduleId),
                    _count: {
                        ...module._count,
                        submodules: module.submodules.filter(sub => sub.id !== submoduleId).length
                    }
                }))
            )

            toast.success('Submódulo eliminado correctamente')
        } catch {
            toast.error('Error al eliminar el submódulo')
        }
    }

    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* Header con estadísticas */}
            <div className="px-4 lg:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Gestión de Módulos</h1>
                        <p className="text-muted-foreground text-sm">
                            Administra los módulos del sistema y su estructura
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.refresh()}>
                            <IconRefresh className="mr-2 h-4 w-4" />
                            Actualizar
                        </Button>
                        <CreateModuleDialog onSuccess={(newModule) => {
                            setModules(prevModules => [...prevModules, newModule])
                        }}>
                            <Button>
                                <IconPlus className="mr-2 h-4 w-4" />
                                Nuevo Módulo
                            </Button>
                        </CreateModuleDialog>
                    </div>
                </div>

                {/* Estadísticas */}
                <div className="grid gap-4 md:grid-cols-4 mt-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Total Módulos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalModules}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats.activeModules} activos
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Submódulos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalSubmodules}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                En todos los módulos
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
                                Permisos totales
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Promedio</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.totalModules > 0
                                    ? Math.round(stats.totalPermissions / stats.totalModules)
                                    : 0}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Permisos por módulo
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Contenido principal */}
            <div className="px-4 lg:px-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Estructura de Módulos</CardTitle>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="show-inactive"
                                        checked={showInactive}
                                        onCheckedChange={setShowInactive}
                                    />
                                    <Label htmlFor="show-inactive" className="text-sm">
                                        Mostrar inactivos
                                    </Label>
                                </div>
                                <div className="relative w-[300px]">
                                    <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar módulos..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[600px]">
                            <div className="space-y-4">
                                {filteredModules.map((module) => (
                                    <div key={module.id} className="border rounded-lg">
                                        <div className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleModule(module.id)}
                                                    >
                                                        {expandedModules.has(module.id)
                                                            ? <IconChevronDown className="h-4 w-4" />
                                                            : <IconChevronRight className="h-4 w-4" />
                                                        }
                                                    </Button>
                                                    <IconCube className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-semibold">{module.name}</h3>
                                                            <Badge variant={module.isActive ? "default" : "secondary"}>
                                                                {module.isActive ? "Activo" : "Inactivo"}
                                                            </Badge>
                                                            <Badge variant="outline">
                                                                Orden: {module.order}
                                                            </Badge>
                                                        </div>
                                                        {module.description && (
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                {module.description}
                                                            </p>
                                                        )}
                                                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                                            <span>{module._count.submodules} submódulos</span>
                                                            <span>{module._count.permissions} permisos</span>
                                                            <span>Slug: {module.slug}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={module.isActive}
                                                        onCheckedChange={(checked) =>
                                                            handleToggleActive(module.id, checked)
                                                        }
                                                    />
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <IconDots className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <EditModuleDialog
                                                                module={module}
                                                                onSuccess={(updatedModule) => {
                                                                    setModules(prevModules =>
                                                                        prevModules.map(m =>
                                                                            m.id === updatedModule.id ? updatedModule : m
                                                                        )
                                                                    )
                                                                }}
                                                            >
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                    <IconEdit className="mr-2 h-4 w-4" />
                                                                    Editar
                                                                </DropdownMenuItem>
                                                            </EditModuleDialog>
                                                            <CreateSubmoduleDialog
                                                                moduleId={module.id}
                                                                onSuccess={(newSubmodule) => {
                                                                    setModules(prevModules =>
                                                                        prevModules.map(m =>
                                                                            m.id === module.id
                                                                                ? {
                                                                                    ...m,
                                                                                    submodules: [...m.submodules, newSubmodule],
                                                                                    _count: {
                                                                                        ...m._count,
                                                                                        submodules: m._count.submodules + 1
                                                                                    }
                                                                                }
                                                                                : m
                                                                        )
                                                                    )
                                                                }}
                                                            >
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                    <IconPlus className="mr-2 h-4 w-4" />
                                                                    Agregar Submódulo
                                                                </DropdownMenuItem>
                                                            </CreateSubmoduleDialog>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => handleDeleteModule(module.id)}
                                                            >
                                                                <IconTrash className="mr-2 h-4 w-4" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </div>

                                        {expandedModules.has(module.id) && (
                                            <>
                                                <Separator />
                                                <div className="p-4 bg-muted/20">
                                                    {module.submodules.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground text-center py-4">
                                                            No hay submódulos en este módulo
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {module.submodules.map((submodule) => (
                                                                <div
                                                                    key={submodule.id}
                                                                    className="flex items-center justify-between p-3 rounded-lg bg-background border"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <IconFolder className="h-4 w-4 text-muted-foreground" />
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-medium text-sm">
                                                                                    {submodule.name}
                                                                                </span>
                                                                                <Badge
                                                                                    variant={submodule.isActive ? "default" : "secondary"}
                                                                                    className="text-xs"
                                                                                >
                                                                                    {submodule.isActive ? "Activo" : "Inactivo"}
                                                                                </Badge>
                                                                            </div>
                                                                            {submodule.description && (
                                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                                    {submodule.description}
                                                                                </p>
                                                                            )}
                                                                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                                                                <span>{submodule.permissions.length} permisos</span>
                                                                                <span>Orden: {submodule.order}</span>
                                                                                <span>Slug: {submodule.slug}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Switch
                                                                            checked={submodule.isActive}
                                                                            onCheckedChange={(checked) =>
                                                                                handleToggleSubmoduleActive(submodule.id, checked)
                                                                            }
                                                                        />
                                                                        <EditSubmoduleDialog
                                                                            submodule={submodule}
                                                                            onSuccess={(updatedSubmodule) => {
                                                                                setModules(prevModules => 
                                                                                    prevModules.map(module => ({
                                                                                        ...module,
                                                                                        submodules: module.submodules.map(sub => 
                                                                                            sub.id === updatedSubmodule.id 
                                                                                                ? updatedSubmodule 
                                                                                                : sub
                                                                                        )
                                                                                    }))
                                                                                )
                                                                            }}
                                                                        >
                                                                            <Button variant="ghost" size="sm">
                                                                                <IconEdit className="h-4 w-4" />
                                                                            </Button>
                                                                        </EditSubmoduleDialog>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleDeleteSubmodule(submodule.id)}
                                                                        >
                                                                            <IconTrash className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {module.permissions.length > 0 && (
                                                        <div className="mt-4">
                                                            <h4 className="text-sm font-medium mb-2">
                                                                Permisos del módulo
                                                            </h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {module.permissions.map((permission) => (
                                                                    <Badge
                                                                        key={permission.id}
                                                                        variant="outline"
                                                                        className="text-xs"
                                                                    >
                                                                        <IconShield className="mr-1 h-3 w-3" />
                                                                        {permission.code}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}