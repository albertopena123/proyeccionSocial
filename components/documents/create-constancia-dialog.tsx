"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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

const constanciaSchema = z.object({
    dni: z.string().min(1, "El número de documento es requerido"),
    studentCode: z.string().min(1, "El código de estudiante es requerido"),
    fullName: z.string().min(1, "El nombre completo es requerido"),
    constanciaNumber: z.string().min(1, "El número de constancia es requerido"),
    year: z.string().min(4, "El año es requerido").max(4, "El año debe tener 4 dígitos"),
    observation: z.string().optional(),
})

type ConstanciaFormValues = z.infer<typeof constanciaSchema>

interface CreateConstanciaDialogProps {
    children: React.ReactNode
    onSuccess?: (newConstancia: any) => void
}

export function CreateConstanciaDialog({ children, onSuccess }: CreateConstanciaDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)
    const [file, setFile] = React.useState<File | null>(null)
    const [fileName, setFileName] = React.useState<string>("")

    const form = useForm<ConstanciaFormValues>({
        resolver: zodResolver(constanciaSchema),
        defaultValues: {
            dni: "",
            studentCode: "",
            fullName: "",
            constanciaNumber: "",
            year: new Date().getFullYear().toString(),
            observation: "",
        },
    })

    async function onSubmit(values: ConstanciaFormValues) {
        setIsLoading(true)
        try {
            // Crear FormData para enviar archivo y datos
            const formData = new FormData()
            formData.append("studentCode", values.studentCode)
            formData.append("fullName", values.fullName)
            formData.append("dni", values.dni)
            formData.append("constanciaNumber", values.constanciaNumber)
            formData.append("year", values.year)
            formData.append("type", "CONSTANCIA") // Tipo fijo
            // Solo agregar observation si tiene contenido
            if (values.observation && values.observation.trim() !== "") {
                formData.append("observation", values.observation)
            }
            if (file) {
                formData.append("file", file)
            }

            const response = await fetch("/api/documents/constancias", {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Error al crear la constancia")
            }

            const newConstancia = await response.json()
            
            toast.success("Constancia creada exitosamente")
            
            // Llamar al callback si existe para actualizar la tabla
            if (onSuccess) {
                onSuccess(newConstancia)
            }
            
            // Cerrar el diálogo y resetear el formulario
            setOpen(false)
            form.reset()
            setFile(null)
            setFileName("")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al crear la constancia")
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

    // Auto-completar datos del estudiante basado en código
    const handleStudentCodeBlur = async () => {
        const studentCode = form.getValues("studentCode")
        if (!studentCode) return

        try {
            const response = await fetch(`/api/student/by-code/${studentCode}`)
            if (response.ok) {
                const data = await response.json()
                form.setValue("fullName", data.name || "")
                form.setValue("dni", data.dni || "")
            }
        } catch (error) {
            // Silenciosamente fallar si no se encuentra el estudiante
            console.log("No se pudo obtener datos del estudiante")
        }
    }

    // Auto-completar datos del estudiante basado en DNI
    const handleDniBlur = async () => {
        const dni = form.getValues("dni")
        if (!dni || dni.length !== 8) return

        try {
            const response = await fetch(`/api/student/by-dni/${dni}`)
            if (response.ok) {
                const data = await response.json()
                form.setValue("fullName", data.name || "")
                form.setValue("studentCode", data.studentCode || "")
            }
        } catch (error) {
            // Silenciosamente fallar si no se encuentra el estudiante
            console.log("No se pudo obtener datos del estudiante")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Nueva Constancia</DialogTitle>
                    <DialogDescription>
                        Registra una nueva constancia universitaria
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
                                                onBlur={() => {
                                                    field.onBlur()
                                                    handleDniBlur()
                                                }}
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
                                                onBlur={() => {
                                                    field.onBlur()
                                                    handleStudentCodeBlur()
                                                }}
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
                                        <Input {...field} placeholder="Juan Pérez García" />
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
                                            <Input {...field} placeholder="CONST-2024-001" />
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
                                            <Input {...field} placeholder="2024" maxLength={4} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Campo de Archivo */}
                        <div className="space-y-2">
                            <FormLabel>Archivo de Constancia</FormLabel>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                    disabled={isLoading}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="flex items-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer transition-colors"
                                >
                                    <IconUpload className="h-4 w-4" />
                                    <span>{fileName || "Seleccionar archivo"}</span>
                                </label>
                                {file && (
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
                                onClick={() => setOpen(false)}
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Creando..." : "Crear Constancia"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}