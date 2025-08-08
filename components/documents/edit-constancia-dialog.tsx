"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import { Button } from "@/components/ui/button"
import { IconUpload } from "@tabler/icons-react"

const editConstanciaSchema = z.object({
    dni: z.string().min(1, "El número de documento es requerido"),
    studentCode: z.string().min(1, "El código de estudiante es requerido"),
    fullName: z.string().min(1, "El nombre completo es requerido"),
    constanciaNumber: z.string().min(1, "El número de constancia es requerido"),
    year: z.string().min(4, "El año es requerido").max(4, "El año debe tener 4 dígitos"),
    observation: z.string().optional(),
})

type EditConstanciaFormValues = z.infer<typeof editConstanciaSchema>

interface Constancia {
    id: string
    studentCode: string
    fullName: string
    dni: string
    constanciaNumber: string
    year: number
    observation: string | null
    fileName?: string | null
    fileUrl?: string | null
    status: string
}

interface EditConstanciaDialogProps {
    constancia: Constancia
    open: boolean
    onOpenChange: (open: boolean) => void
    currentUserRole?: string
}

export function EditConstanciaDialog({ constancia, open, onOpenChange, currentUserRole }: EditConstanciaDialogProps) {
    const [isLoading, setIsLoading] = React.useState(false)
    const [file, setFile] = React.useState<File | null>(null)
    const [fileName, setFileName] = React.useState<string>("")
    const router = useRouter()

    const form = useForm<EditConstanciaFormValues>({
        resolver: zodResolver(editConstanciaSchema),
        defaultValues: {
            studentCode: constancia?.studentCode || "",
            fullName: constancia?.fullName || "",
            dni: constancia?.dni || "",
            constanciaNumber: constancia?.constanciaNumber || "",
            year: constancia?.year?.toString() || "",
            observation: constancia?.observation || "",
        },
    })

    // Actualizar valores cuando cambie la constancia
    React.useEffect(() => {
        if (constancia) {
            form.reset({
                studentCode: constancia.studentCode,
                fullName: constancia.fullName,
                dni: constancia.dni,
                constanciaNumber: constancia.constanciaNumber,
                year: constancia.year.toString(),
                observation: constancia.observation || "",
            })
        }
    }, [constancia, form])

    async function onSubmit(values: EditConstanciaFormValues) {
        setIsLoading(true)
        try {
            // Crear FormData para enviar archivo y datos
            const formData = new FormData()
            formData.append("studentCode", values.studentCode)
            formData.append("fullName", values.fullName)
            formData.append("dni", values.dni)
            formData.append("constanciaNumber", values.constanciaNumber)
            formData.append("year", values.year)
            if (values.observation) {
                formData.append("observation", values.observation)
            }
            if (file) {
                formData.append("file", file)
            }

            const response = await fetch(`/api/documents/constancias/${constancia.id}`, {
                method: "PATCH",
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Error al actualizar la constancia")
            }

            toast.success("Constancia actualizada exitosamente")
            onOpenChange(false)
            setFile(null)
            setFileName("")
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al actualizar la constancia")
        } finally {
            setIsLoading(false)
        }
    }

    // Manejar la selección de archivo
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            // Validar tipo de archivo (PDF, imagen, etc.)
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
            if (!allowedTypes.includes(selectedFile.type)) {
                toast.error("Solo se permiten archivos PDF, JPG, JPEG o PNG")
                return
            }
            // Validar tamaño (máximo 5MB)
            if (selectedFile.size > 5 * 1024 * 1024) {
                toast.error("El archivo no debe superar los 5MB")
                return
            }
            setFile(selectedFile)
            setFileName(selectedFile.name)
        }
    }

    // No permitir edición si está aprobado (excepto para SUPER_ADMIN)
    const isApproved = constancia?.status === "APROBADO"
    const isSuperAdmin = currentUserRole === "SUPER_ADMIN"
    const isDisabled = isLoading || (isApproved && !isSuperAdmin)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Editar Constancia</DialogTitle>
                    <DialogDescription>
                        {isApproved && !isSuperAdmin
                            ? "Esta constancia está aprobada y no puede ser editada"
                            : isApproved && isSuperAdmin
                            ? "Editando constancia aprobada (Modo Administrador)"
                            : "Actualiza los datos de la constancia"}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="dni"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Número de Documento</FormLabel>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                placeholder="Ingrese número de documento"
                                                disabled={isDisabled}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="studentCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Código de Estudiante</FormLabel>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                placeholder="20200001"
                                                disabled={isDisabled}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre Completo</FormLabel>
                                    <FormControl>
                                        <Input 
                                            {...field} 
                                            placeholder="Juan Pérez García"
                                            disabled={isDisabled}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="constanciaNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>N° de Constancia</FormLabel>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                placeholder="CONST-2024-001"
                                                disabled={isDisabled}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Número único de la constancia
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="year"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Año</FormLabel>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                placeholder="2024" 
                                                maxLength={4}
                                                disabled={isDisabled}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Campo de Archivo */}
                        <div className="space-y-2">
                            <FormLabel>
                                Archivo de Constancia 
                                {constancia?.fileName && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                        (Actual: {constancia.fileName})
                                    </span>
                                )}
                            </FormLabel>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload-edit"
                                    disabled={isDisabled}
                                />
                                <label
                                    htmlFor="file-upload-edit"
                                    className={`flex items-center gap-2 px-4 py-2 border border-input bg-background rounded-md transition-colors ${
                                        isDisabled 
                                            ? 'opacity-50 cursor-not-allowed' 
                                            : 'hover:bg-accent hover:text-accent-foreground cursor-pointer'
                                    }`}
                                >
                                    <IconUpload className="h-4 w-4" />
                                    <span>{fileName || "Cambiar archivo"}</span>
                                </label>
                                {file && !isDisabled && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setFile(null)
                                            setFileName("")
                                        }}
                                    >
                                        Quitar
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Formatos permitidos: PDF, JPG, PNG (máx. 5MB)
                            </p>
                        </div>

                        <FormField
                            control={form.control}
                            name="observation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observaciones (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            {...field} 
                                            placeholder="Notas adicionales..."
                                            className="resize-none"
                                            rows={3}
                                            disabled={isDisabled}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            {!isApproved && (
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Actualizando..." : "Actualizar Constancia"}
                                </Button>
                            )}
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}