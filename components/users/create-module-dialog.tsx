"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { IconLoader2 } from "@tabler/icons-react"

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
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

const formSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    slug: z.string().min(1, "El slug es requerido").regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
    description: z.string().optional(),
    icon: z.string().optional(),
    isActive: z.boolean(),
    order: z.number().int().min(0)
})

type FormData = z.infer<typeof formSchema>

interface Permission {
    id: string
    name: string
    code: string
    description?: string | null
    actions: string[]
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
    MenuItem: unknown[]
    ModuleSettings?: unknown
    _count: {
        permissions: number
        submodules: number
    }
}

interface CreateModuleDialogProps {
    children: React.ReactNode
    onSuccess?: (newModule: Module) => void
}

export function CreateModuleDialog({ children, onSuccess }: CreateModuleDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            slug: "",
            description: "",
            icon: "IconCube",
            isActive: true,
            order: 0
        }
    })

    // Auto-generar slug basado en el nombre
    React.useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'name' && value.name) {
                const slug = value.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '')
                form.setValue('slug', slug)
            }
        })
        return () => subscription.unsubscribe()
    }, [form])

    async function onSubmit(values: FormData) {
        setIsLoading(true)
        try {
            const response = await fetch('/api/modules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al crear módulo')
            }

            const newModule = await response.json()

            toast.success('Módulo creado exitosamente')
            setOpen(false)
            form.reset()
            onSuccess?.(newModule)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al crear módulo')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Módulo</DialogTitle>
                    <DialogDescription>
                        Los módulos organizan las funcionalidades del sistema
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Gestión de Usuarios"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Slug</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="gestion-usuarios"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Identificador único en la URL
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Módulo para gestionar usuarios del sistema"
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="icon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Icono</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="IconUsers"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Nombre del icono de Tabler Icons
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="order"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Orden</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            {...field}
                                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Posición en el menú (0 = automático)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Activo</FormLabel>
                                        <FormDescription>
                                            El módulo estará disponible inmediatamente
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Crear Módulo
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}