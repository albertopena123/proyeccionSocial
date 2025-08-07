"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CalendarIcon, Plus, Search, Trash2, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

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
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const resolucionSchema = z.object({
    tipoResolucion: z.enum(["APROBACION_PROYECTO", "APROBACION_INFORME_FINAL"]),
    numeroResolucion: z.string().min(1, "El número de resolución es requerido"),
    fechaResolucion: z.date().refine(
        (date) => date instanceof Date && !isNaN(date.getTime()),
        { message: "La fecha de resolución es requerida" }
    ),
    modalidad: z.enum(["DOCENTES", "ESTUDIANTES", "VOLUNTARIADO", "ACTIVIDAD"]),
    esFinanciado: z.boolean().default(false),
    monto: z.string().optional(),
    dniAsesor: z.string().min(1, "El número de documento es requerido"),
    nombreAsesor: z.string().min(1, "El nombre del asesor es requerido"),
    tituloProyecto: z.string().min(1, "El título del proyecto es requerido"),
    facultadId: z.string().min(1, "Debe seleccionar una facultad"),
    departamentoId: z.string().min(1, "Debe seleccionar un departamento"),
})

type ResolucionFormValues = z.infer<typeof resolucionSchema>

interface Estudiante {
    id?: string
    dni?: string
    codigo: string
    nombres: string
    apellidos: string
}

interface Docente {
    dni: string
    nombres: string
    apellidos: string
    email?: string
    facultad?: string
}

interface Facultad {
    id: number
    nombre: string
    codigo?: string | null
    departamentos: Array<{
        id: number
        nombre: string
        codigo?: string | null
    }>
}

interface Resolucion {
    id: string
    tipoResolucion: string
    numeroResolucion: string
    fechaResolucion: Date | string
    modalidad: string
    esFinanciado: boolean
    monto?: number | string | null
    dniAsesor: string
    nombreAsesor: string
    tituloProyecto: string
    fileName?: string | null
    fileUrl?: string | null
    status: string
    createdAt: Date | string
    facultad: {
        id: number
        nombre: string
    }
    departamento: {
        id: number
        nombre: string
    }
    estudiantes: Array<{
        id: string
        codigo: string
        nombres: string
        apellidos: string
    }>
    createdBy: {
        id: string
        name: string | null
        email: string
    }
    approvedBy?: {
        id: string
        name: string | null
        email: string
    } | null
    facultadId?: string | number
    departamentoId?: string | number
    docentes?: Docente[]
}

interface EditResolucionDialogProps {
    resolucion: Resolucion
    facultades: { id: string; nombre: string; departamentos?: any[] }[]
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditResolucionDialog({ resolucion, facultades, open, onOpenChange }: EditResolucionDialogProps) {
    const [isLoading, setIsLoading] = React.useState(false)
    const [file, setFile] = React.useState<File | null>(null)
    const [fileName, setFileName] = React.useState<string>(resolucion?.fileName || "")
    const [estudiantes, setEstudiantes] = React.useState<Estudiante[]>(resolucion?.estudiantes || [])
    const [docentes, setDocentes] = React.useState<Docente[]>(resolucion?.docentes || [])
    const [selectedFacultad, setSelectedFacultad] = React.useState<string>(resolucion?.facultad?.id?.toString() || resolucion?.facultadId?.toString() || "")
    const [searchingAsesor, setSearchingAsesor] = React.useState(false)
    const [showDocentes, setShowDocentes] = React.useState((resolucion?.docentes ?? []).length > 0)
    const [showEstudiantes, setShowEstudiantes] = React.useState((resolucion?.estudiantes ?? []).length > 0)
    const router = useRouter()

    const form = useForm<ResolucionFormValues>({
        resolver: zodResolver(resolucionSchema),
        defaultValues: {
            tipoResolucion: (resolucion?.tipoResolucion as "APROBACION_PROYECTO" | "APROBACION_INFORME_FINAL") || "APROBACION_PROYECTO",
            numeroResolucion: resolucion?.numeroResolucion || "",
            fechaResolucion: resolucion?.fechaResolucion ? new Date(resolucion.fechaResolucion) : new Date(),
            modalidad: (resolucion?.modalidad as "DOCENTES" | "ESTUDIANTES" | "VOLUNTARIADO" | "ACTIVIDAD") || "ESTUDIANTES",
            esFinanciado: resolucion?.esFinanciado || false,
            monto: typeof resolucion?.monto === 'string' ? resolucion.monto : resolucion?.monto?.toString() || "",
            dniAsesor: resolucion?.dniAsesor || "",
            nombreAsesor: resolucion?.nombreAsesor || "",
            tituloProyecto: resolucion?.tituloProyecto || "",
            facultadId: resolucion?.facultad?.id?.toString() || resolucion?.facultadId?.toString() || "",
            departamentoId: resolucion?.departamento?.id?.toString() || resolucion?.departamentoId?.toString() || "",
        },
    })

    const departamentosDisponibles = React.useMemo(() => {
        if (!selectedFacultad) return []
        const facultad = facultades.find(f => f.id === selectedFacultad)
        return facultad?.departamentos || []
    }, [selectedFacultad, facultades])

    // Buscar asesor por DNI en la API
    const buscarAsesor = async () => {
        const dni = form.getValues("dniAsesor")
        if (!dni) {
            toast.error("Ingrese un número de documento válido")
            return
        }

        setSearchingAsesor(true)
        try {
            const response = await fetch("/api/teacher/consult", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ dni }),
            })

            if (response.ok) {
                const data = await response.json()
                form.setValue("nombreAsesor", data.nombreCompleto)
                toast.success("Asesor encontrado")
            } else {
                toast.error("No se encontró el docente con ese DNI")
            }
        } catch (error) {
            toast.error("Error al buscar el docente")
        } finally {
            setSearchingAsesor(false)
        }
    }

    // Funciones para manejar docentes y estudiantes (similar al create)
    const agregarDocente = () => {
        const nuevoDocente: Docente = {
            dni: "",
            nombres: "",
            apellidos: "",
            email: "",
            facultad: ""
        }
        setDocentes([...docentes, nuevoDocente])
    }

    const eliminarDocente = (index: number) => {
        setDocentes(docentes.filter((_, i) => i !== index))
    }

    const buscarDocente = async (index: number) => {
        const dni = docentes[index].dni
        if (!dni) {
            toast.error("Ingrese un número de documento válido")
            return
        }

        try {
            const response = await fetch("/api/teacher/consult", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ dni }),
            })

            if (response.ok) {
                const data = await response.json()
                const nuevosDocentes = [...docentes]
                nuevosDocentes[index] = {
                    ...nuevosDocentes[index],
                    nombres: data.nombres,
                    apellidos: data.apellidos,
                    email: data.email || "",
                    facultad: data.facultad || ""
                }
                setDocentes(nuevosDocentes)
                toast.success("Docente encontrado")
            } else {
                toast.error("No se encontró el docente")
            }
        } catch (error) {
            toast.error("Error al buscar el docente")
        }
    }

    const actualizarDocente = (index: number, field: keyof Docente, value: string) => {
        const nuevosDocentes = [...docentes]
        nuevosDocentes[index] = {
            ...nuevosDocentes[index],
            [field]: value
        }
        setDocentes(nuevosDocentes)
    }

    const agregarEstudiante = () => {
        const nuevoEstudiante: Estudiante = {
            dni: "",
            codigo: "",
            nombres: "",
            apellidos: ""
        }
        setEstudiantes([...estudiantes, nuevoEstudiante])
    }

    const eliminarEstudiante = (index: number) => {
        setEstudiantes(estudiantes.filter((_, i) => i !== index))
    }

    const buscarEstudiante = async (index: number) => {
        const dni = estudiantes[index].dni
        if (!dni) {
            toast.error("Ingrese un número de documento válido")
            return
        }

        try {
            const response = await fetch("/api/student/consult", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ dni }),
            })

            if (response.ok) {
                const data = await response.json()
                const nuevosEstudiantes = [...estudiantes]
                nuevosEstudiantes[index] = {
                    ...nuevosEstudiantes[index],
                    codigo: data.codigo,
                    nombres: data.nombres,
                    apellidos: data.apellidos
                }
                setEstudiantes(nuevosEstudiantes)
                toast.success("Estudiante encontrado")
            } else {
                toast.error("No se encontró el estudiante")
            }
        } catch (error) {
            toast.error("Error al buscar el estudiante")
        }
    }

    const actualizarEstudiante = (index: number, field: keyof Estudiante, value: string) => {
        const nuevosEstudiantes = [...estudiantes]
        nuevosEstudiantes[index] = {
            ...nuevosEstudiantes[index],
            [field]: value
        }
        setEstudiantes(nuevosEstudiantes)
    }

    async function onSubmit(values: ResolucionFormValues) {
        setIsLoading(true)
        try {
            // Validaciones
            if (values.esFinanciado && (!values.monto || parseFloat(values.monto) <= 0)) {
                toast.error("Debe ingresar un monto válido si el proyecto es financiado")
                setIsLoading(false)
                return
            }

            if (file && file.size > 5 * 1024 * 1024) {
                toast.error("El archivo no debe superar los 5MB")
                setIsLoading(false)
                return
            }

            // Crear FormData
            const formData = new FormData()

            // Agregar campos del formulario
            Object.entries(values).forEach(([key, value]) => {
                if (key === 'fechaResolucion' && value instanceof Date) {
                    formData.append(key, value.toISOString())
                } else if (key === 'esFinanciado') {
                    formData.append(key, value ? 'true' : 'false')
                } else if (value !== undefined && value !== null) {
                    formData.append(key, value.toString())
                }
            })

            // Agregar participantes
            if (docentes.length > 0) {
                const docentesValidos = docentes.filter(d =>
                    d.dni && d.nombres && d.apellidos
                )
                if (docentesValidos.length > 0) {
                    formData.append('docentes', JSON.stringify(docentesValidos))
                }
            }

            if (estudiantes.length > 0) {
                const estudiantesValidos = estudiantes.filter(e =>
                    e.dni && e.codigo && e.nombres && e.apellidos
                )
                if (estudiantesValidos.length > 0) {
                    formData.append('estudiantes', JSON.stringify(estudiantesValidos))
                }
            }

            // Agregar archivo si hay uno nuevo
            if (file) {
                formData.append('file', file)
            }

            const response = await fetch(`/api/documents/resoluciones/${resolucion.id}`, {
                method: "PUT",
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Error al actualizar la resolución")
            }

            toast.success("Resolución actualizada exitosamente")
            onOpenChange(false)
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al actualizar la resolución")
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
            if (!allowedTypes.includes(selectedFile.type)) {
                toast.error("Solo se permiten archivos PDF, JPG, JPEG o PNG")
                e.target.value = ''
                setFile(null)
                return
            }
            if (selectedFile.size > 5 * 1024 * 1024) {
                toast.error("El archivo no debe superar los 5MB")
                e.target.value = ''
                setFile(null)
                return
            }
            setFile(selectedFile)
            setFileName(selectedFile.name)
        }
    }

    if (!resolucion) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1200px] max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Editar Resolución</DialogTitle>
                    <DialogDescription>
                        Modifica los datos de la resolución {resolucion.numeroResolucion}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[75vh] pr-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Los campos del formulario son similares al create */}
                            {/* Solo incluyo las secciones principales para mantener el código más corto */}

                            {/* Información básica */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold">Información de la Resolución</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="tipoResolucion"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo de Resolución</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecciona el tipo" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="APROBACION_PROYECTO">
                                                            Aprobación de Proyecto
                                                        </SelectItem>
                                                        <SelectItem value="APROBACION_INFORME_FINAL">
                                                            Aprobación de Informe Final
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="numeroResolucion"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Número de Resolución</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="RES-2024-001" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="fechaResolucion"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fecha de Resolución</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    "w-full pl-3 text-left font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? (
                                                                    format(field.value, "dd/MM/yyyy")
                                                                ) : (
                                                                    <span>Selecciona una fecha</span>
                                                                )}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            disabled={(date) =>
                                                                date > new Date() || date < new Date("1900-01-01")
                                                            }
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="modalidad"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Modalidad</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecciona la modalidad" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="DOCENTES">Docentes</SelectItem>
                                                        <SelectItem value="ESTUDIANTES">Estudiantes</SelectItem>
                                                        <SelectItem value="VOLUNTARIADO">Voluntariado</SelectItem>
                                                        <SelectItem value="ACTIVIDAD">Actividad</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Financiamiento */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold">Financiamiento</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="esFinanciado"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>
                                                        Proyecto Financiado
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Marcar si el proyecto cuenta con financiamiento
                                                    </FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    {form.watch("esFinanciado") && (
                                        <FormField
                                            control={form.control}
                                            name="monto"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Monto (S/.)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Datos del Proyecto */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold">Datos del Proyecto</h3>

                                <FormField
                                    control={form.control}
                                    name="tituloProyecto"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Título del Proyecto</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="Ingrese el título completo del proyecto"
                                                    className="resize-none"
                                                    rows={3}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="facultadId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Facultad</FormLabel>
                                                <Select
                                                    onValueChange={(value) => {
                                                        field.onChange(value)
                                                        setSelectedFacultad(value)
                                                        form.setValue("departamentoId", "")
                                                    }}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecciona una facultad" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {facultades.map((facultad) => (
                                                            <SelectItem
                                                                key={facultad.id}
                                                                value={facultad.id.toString()}
                                                            >
                                                                {facultad.nombre}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="departamentoId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Departamento</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    disabled={!selectedFacultad}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecciona un departamento" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {departamentosDisponibles.map((depto) => (
                                                            <SelectItem
                                                                key={depto.id}
                                                                value={depto.id.toString()}
                                                            >
                                                                {depto.nombre}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Datos del Asesor */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold">Datos del Asesor</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="dniAsesor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Número de Documento del Asesor</FormLabel>
                                                <div className="flex gap-2">
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="Número de documento"
                                                        />
                                                    </FormControl>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={buscarAsesor}
                                                        disabled={searchingAsesor}
                                                    >
                                                        <Search className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="nombreAsesor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nombre del Asesor</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Nombre completo del asesor" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Participantes Opcionales */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold">Participantes (Opcional)</h3>

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="show-docentes"
                                            checked={showDocentes}
                                            onCheckedChange={(checked) => setShowDocentes(checked as boolean)}
                                        />
                                        <label
                                            htmlFor="show-docentes"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Agregar Docentes Participantes
                                        </label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="show-estudiantes"
                                            checked={showEstudiantes}
                                            onCheckedChange={(checked) => setShowEstudiantes(checked as boolean)}
                                        />
                                        <label
                                            htmlFor="show-estudiantes"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Agregar Estudiantes Participantes
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Lista de Docentes (Opcional) */}
                            {showDocentes && (
                                <>
                                    <Separator />
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold">
                                                Docentes Participantes
                                            </h3>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={agregarDocente}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Agregar Docente
                                            </Button>
                                        </div>

                                        {docentes.length > 0 && (
                                            <div className="space-y-2">
                                                {docentes.map((docente, index) => (
                                                    <Card key={index} className="p-3">
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                                                <div className="flex gap-1">
                                                                    <Input
                                                                        placeholder="N° Documento"
                                                                        value={docente.dni}
                                                                        onChange={(e) => actualizarDocente(index, 'dni', e.target.value.replace(/\D/g, ''))}
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => buscarDocente(index)}
                                                                    >
                                                                        <Search className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                                <Input
                                                                    placeholder="Nombres"
                                                                    value={docente.nombres}
                                                                    onChange={(e) => actualizarDocente(index, 'nombres', e.target.value)}
                                                                />
                                                                <Input
                                                                    placeholder="Apellidos"
                                                                    value={docente.apellidos}
                                                                    onChange={(e) => actualizarDocente(index, 'apellidos', e.target.value)}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => eliminarDocente(index)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                <Input
                                                                    placeholder="Email"
                                                                    value={docente.email || ''}
                                                                    onChange={(e) => actualizarDocente(index, 'email', e.target.value)}
                                                                />
                                                                <Input
                                                                    placeholder="Facultad"
                                                                    value={docente.facultad || ''}
                                                                    onChange={(e) => actualizarDocente(index, 'facultad', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Lista de Estudiantes (Opcional) */}
                            {showEstudiantes && (
                                <>
                                    <Separator />
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold">
                                                Estudiantes Participantes
                                            </h3>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={agregarEstudiante}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Agregar Estudiante
                                            </Button>
                                        </div>

                                        {estudiantes.length > 0 && (
                                            <div className="space-y-2">
                                                {estudiantes.map((estudiante, index) => (
                                                    <Card key={index} className="p-3">
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                                                <div className="flex gap-1">
                                                                    <Input
                                                                        placeholder="N° Documento"
                                                                        value={estudiante.dni}
                                                                        onChange={(e) => actualizarEstudiante(index, 'dni', e.target.value.replace(/\D/g, ''))}
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => buscarEstudiante(index)}
                                                                    >
                                                                        <Search className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                                <Input
                                                                    placeholder="Código"
                                                                    value={estudiante.codigo}
                                                                    onChange={(e) => actualizarEstudiante(index, 'codigo', e.target.value)}
                                                                />
                                                                <Input
                                                                    placeholder="Nombres"
                                                                    value={estudiante.nombres}
                                                                    onChange={(e) => actualizarEstudiante(index, 'nombres', e.target.value)}
                                                                />
                                                                <Input
                                                                    placeholder="Apellidos"
                                                                    value={estudiante.apellidos}
                                                                    onChange={(e) => actualizarEstudiante(index, 'apellidos', e.target.value)}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => eliminarEstudiante(index)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <Separator />

                            {/* Archivo */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold">Archivo de Resolución</h3>
                                {resolucion.fileName && (
                                    <p className="text-sm text-muted-foreground">
                                        Archivo actual: {resolucion.fileName}
                                    </p>
                                )}
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="file-upload-edit"
                                        disabled={isLoading}
                                    />
                                    <label
                                        htmlFor="file-upload-edit"
                                        className="flex items-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer transition-colors"
                                    >
                                        <Upload className="h-4 w-4" />
                                        <span>{fileName || "Cambiar archivo"}</span>
                                    </label>
                                    {file && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setFile(null)
                                                setFileName(resolucion.fileName || "")
                                            }}
                                        >
                                            Quitar
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Formatos permitidos: PDF, JPG, PNG (máx. 5MB). Dejar vacío para mantener el archivo actual.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isLoading}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Actualizando..." : "Actualizar Resolución"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}