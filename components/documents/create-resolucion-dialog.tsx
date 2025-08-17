"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { format } from "date-fns"
import { CalendarIcon, Plus, Search, Trash2, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

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
    fechaResolucion: z.date(),
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
    dni: string
    codigo: string
    nombres: string
    apellidos: string
}

interface Docente {
    id?: string
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

interface CreateResolucionDialogProps {
    children: React.ReactNode
    facultades: Facultad[]
    onSuccess?: (newResolucion: any) => void
}

export function CreateResolucionDialog({ children, facultades, onSuccess }: CreateResolucionDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)
    const [files, setFiles] = React.useState<File[]>([])
    const [estudiantes, setEstudiantes] = React.useState<Estudiante[]>([])
    const [docentes, setDocentes] = React.useState<Docente[]>([])
    const [selectedFacultad, setSelectedFacultad] = React.useState<string>("")
    const [searchingAsesor, setSearchingAsesor] = React.useState(false)
    const [showDocentes, setShowDocentes] = React.useState(false)
    const [showEstudiantes, setShowEstudiantes] = React.useState(false)
    const searchTimeouts = React.useRef<{ [key: string]: NodeJS.Timeout }>({})
    const lastSearched = React.useRef<{ [key: string]: string }>({})

    const form = useForm<ResolucionFormValues>({

        resolver: zodResolver(resolucionSchema),
        defaultValues: {
            tipoResolucion: "APROBACION_PROYECTO",
            numeroResolucion: "",
            modalidad: "ESTUDIANTES",
            esFinanciado: false,
            monto: "",
            dniAsesor: "",
            nombreAsesor: "",
            tituloProyecto: "",
            facultadId: "",
            departamentoId: "",
        },
    })

    const departamentosDisponibles = React.useMemo(() => {
        if (!selectedFacultad) return []
        const facultad = facultades.find(f => f.id.toString() === selectedFacultad)
        return facultad?.departamentos || []
    }, [selectedFacultad, facultades])

    // Buscar asesor por DNI en la API
    const buscarAsesor = async (dniParam?: string) => {
        const dni = dniParam || form.getValues("dniAsesor")
        if (!dni || dni.length < 8) {
            return
        }

        // Evitar búsquedas duplicadas del mismo DNI
        if (lastSearched.current['asesor'] === dni) {
            return
        }
        
        lastSearched.current['asesor'] = dni
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

    // Agregar docente a la lista
    const agregarDocente = () => {
        const nuevoDocente: Docente = {
            id: `docente_${Date.now()}_${Math.random()}`,
            dni: "",
            nombres: "",
            apellidos: "",
            email: "",
            facultad: ""
        }
        setDocentes([...docentes, nuevoDocente])
    }

    // Actualizar docente
    const actualizarDocente = (index: number, field: keyof Docente, value: string) => {
        const nuevosDocentes = [...docentes]
        nuevosDocentes[index] = {
            ...nuevosDocentes[index],
            [field]: value
        }
        setDocentes(nuevosDocentes)
    }

    // Eliminar docente
    const eliminarDocente = (index: number) => {
        setDocentes(docentes.filter((_, i) => i !== index))
    }

    // Buscar docente por DNI
    const buscarDocente = async (index: number, dniParam?: string) => {
        const dni = dniParam || docentes[index]?.dni
        if (!dni || dni.length < 8) {
            return
        }

        const docenteId = docentes[index]?.id || `docente_${index}`
        const searchKey = `search_${docenteId}_${dni}`
        
        // Evitar búsquedas duplicadas del mismo DNI para el mismo docente
        if (lastSearched.current[docenteId] === dni) {
            return
        }
        
        lastSearched.current[docenteId] = dni
        
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

                // Actualizar todos los campos del docente de una vez, incluyendo el DNI
                const nuevosDocentes = [...docentes]
                nuevosDocentes[index] = {
                    ...nuevosDocentes[index],
                    dni: dni, // Mantener el DNI que se buscó
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

    // Agregar estudiante a la lista
    const agregarEstudiante = () => {
        const nuevoEstudiante: Estudiante = {
            id: `estudiante_${Date.now()}_${Math.random()}`,
            dni: "",
            codigo: "",
            nombres: "",
            apellidos: ""
        }
        setEstudiantes([...estudiantes, nuevoEstudiante])
    }

    // Actualizar estudiante
    const actualizarEstudiante = (index: number, field: keyof Estudiante, value: string) => {
        console.log(`Actualizando estudiante[${index}].${field} = ${value}`)
        const nuevosEstudiantes = [...estudiantes]
        nuevosEstudiantes[index] = {
            ...nuevosEstudiantes[index],
            [field]: value
        }
        console.log("Estudiante actualizado:", nuevosEstudiantes[index])
        setEstudiantes(nuevosEstudiantes)
    }

    // Eliminar estudiante
    const eliminarEstudiante = (index: number) => {
        setEstudiantes(estudiantes.filter((_, i) => i !== index))
    }

    // Buscar estudiante por DNI
    const buscarEstudiante = async (index: number, dniParam?: string) => {
        const dni = dniParam || estudiantes[index]?.dni
        if (!dni || dni.length < 8) {
            return
        }

        const estudianteId = estudiantes[index]?.id || `estudiante_${index}`
        const searchKey = `search_${estudianteId}_${dni}`
        
        // Evitar búsquedas duplicadas del mismo DNI para el mismo estudiante
        if (lastSearched.current[estudianteId] === dni) {
            return
        }
        
        lastSearched.current[estudianteId] = dni
        
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
                console.log("Datos recibidos del API:", data)

                // Actualizar todos los campos del estudiante de una vez, incluyendo el DNI
                const nuevosEstudiantes = [...estudiantes]
                nuevosEstudiantes[index] = {
                    ...nuevosEstudiantes[index],
                    dni: dni, // Mantener el DNI que se buscó
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

    async function onSubmit(values: ResolucionFormValues) {
        setIsLoading(true)
        try {
            // Validar que si es financiado, tenga monto
            if (values.esFinanciado && (!values.monto || parseFloat(values.monto) <= 0)) {
                toast.error("Debe ingresar un monto válido si el proyecto es financiado")
                setIsLoading(false)
                return
            }

            // Validar tamaño de los archivos antes de enviar
            for (const file of files) {
                if (file.size > 5 * 1024 * 1024) {
                    toast.error(`El archivo ${file.name} no debe superar los 5MB`)
                    setIsLoading(false)
                    return
                }
            }

            // Crear FormData para enviar archivo y datos
            const formData = new FormData()

            // Agregar todos los campos del formulario
            Object.entries(values).forEach(([key, value]) => {
                if (key === 'fechaResolucion' && value instanceof Date) {
                    formData.append(key, value.toISOString())
                } else if (key === 'esFinanciado') {
                    formData.append(key, value ? 'true' : 'false')
                } else if (value !== undefined && value !== null) {
                    formData.append(key, value.toString())
                }
            })

            // Agregar docentes como JSON
            if (docentes.length > 0) {
                const docentesValidos = docentes.filter(d =>
                    d.dni && d.nombres && d.apellidos
                )
                if (docentesValidos.length > 0) {
                    formData.append('docentes', JSON.stringify(docentesValidos))
                }
            }

            // Agregar estudiantes como JSON
            if (estudiantes.length > 0) {
                const estudiantesValidos = estudiantes.filter(e =>
                    e.dni && e.codigo && e.nombres && e.apellidos
                )
                if (estudiantesValidos.length > 0) {
                    formData.append('estudiantes', JSON.stringify(estudiantesValidos))
                }
            }

            // Agregar archivos si existen
            if (files.length > 0) {
                files.forEach((file, index) => {
                    formData.append(`files`, file)
                })
            }

            const response = await fetch("/api/documents/resoluciones", {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Error al crear la resolución")
            }

            const newResolucion = await response.json()
            
            toast.success("Resolución creada exitosamente")
            
            // Llamar al callback si existe para actualizar la tabla
            if (onSuccess) {
                onSuccess(newResolucion)
            }
            
            // Cerrar el diálogo y resetear el formulario
            setOpen(false)
            form.reset()
            setFiles([])
            setEstudiantes([])
            setDocentes([])
            setShowDocentes(false)
            setShowEstudiantes(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al crear la resolución")
        } finally {
            setIsLoading(false)
        }
    }

    // Manejar la selección de archivos
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files
        if (selectedFiles) {
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
            const newFiles: File[] = []
            
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i]
                
                if (!allowedTypes.includes(file.type)) {
                    toast.error(`El archivo ${file.name} no es un tipo permitido. Solo PDF, JPG, JPEG o PNG`)
                    continue
                }
                
                if (file.size > 5 * 1024 * 1024) {
                    toast.error(`El archivo ${file.name} supera los 5MB`)
                    continue
                }
                
                newFiles.push(file)
            }
            
            if (newFiles.length > 0) {
                setFiles([...files, ...newFiles])
                toast.success(`${newFiles.length} archivo(s) agregado(s)`)
            }
            
            e.target.value = '' // Limpiar el input para permitir seleccionar los mismos archivos nuevamente
        }
    }

    // Resetear estado cuando se cierra el diálogo
    React.useEffect(() => {
        if (!open) {
            // Resetear todo el estado cuando se cierra el diálogo
            form.reset()
            setFiles([])
            setEstudiantes([])
            setDocentes([])
            setShowDocentes(false)
            setShowEstudiantes(false)
            setSelectedFacultad("")
            // Limpiar referencias
            lastSearched.current = {}
        }
    }, [open, form])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1200px] max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Nueva Resolución</DialogTitle>
                    <DialogDescription>
                        Registra una nueva resolución de proyección social
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[75vh] pr-4">
                    <Form {...form}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
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
                                                            placeholder="Número de documento"
                                                            value={field.value}
                                                            onChange={(e) => {
                                                                const value = e.target.value
                                                                field.onChange(value)
                                                                
                                                                // Limpiar timeout anterior
                                                                if (searchTimeouts.current['asesor']) {
                                                                    clearTimeout(searchTimeouts.current['asesor'])
                                                                }
                                                                
                                                                // Buscar con debounce cuando tenga 8 dígitos o más
                                                                if (value.length >= 8) {
                                                                    searchTimeouts.current['asesor'] = setTimeout(() => {
                                                                        buscarAsesor(value)
                                                                    }, 500)
                                                                }
                                                            }}
                                                            onBlur={field.onBlur}
                                                            name={field.name}
                                                            ref={field.ref}
                                                        />
                                                    </FormControl>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => buscarAsesor()}
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
                                            onCheckedChange={(checked) => {
                                                setShowDocentes(checked as boolean)
                                                // Si se activa y no hay docentes, agregar uno vacío automáticamente
                                                if (checked && docentes.length === 0) {
                                                    agregarDocente()
                                                }
                                            }}
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
                                            onCheckedChange={(checked) => {
                                                setShowEstudiantes(checked as boolean)
                                                // Si se activa y no hay estudiantes, agregar uno vacío automáticamente
                                                if (checked && estudiantes.length === 0) {
                                                    agregarEstudiante()
                                                }
                                            }}
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
                                                                        onChange={(e) => {
                                                                            const dni = e.target.value.replace(/\D/g, '')
                                                                            actualizarDocente(index, 'dni', dni)
                                                                            
                                                                            const docenteId = docente.id || `docente_${index}`
                                                                            const timeoutKey = `timeout_${docenteId}`
                                                                            
                                                                            // Limpiar timeout anterior
                                                                            if (searchTimeouts.current[timeoutKey]) {
                                                                                clearTimeout(searchTimeouts.current[timeoutKey])
                                                                            }
                                                                            
                                                                            // Buscar con debounce cuando tenga 8 dígitos o más
                                                                            if (dni.length >= 8) {
                                                                                searchTimeouts.current[timeoutKey] = setTimeout(() => {
                                                                                    buscarDocente(index, dni)
                                                                                }, 500)
                                                                            }
                                                                        }}
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
                                                                        onChange={(e) => {
                                                                            const dni = e.target.value.replace(/\D/g, '')
                                                                            actualizarEstudiante(index, 'dni', dni)
                                                                            
                                                                            const estudianteId = estudiante.id || `estudiante_${index}`
                                                                            const timeoutKey = `timeout_${estudianteId}`
                                                                            
                                                                            // Limpiar timeout anterior
                                                                            if (searchTimeouts.current[timeoutKey]) {
                                                                                clearTimeout(searchTimeouts.current[timeoutKey])
                                                                            }
                                                                            
                                                                            // Buscar con debounce cuando tenga 8 dígitos o más
                                                                            if (dni.length >= 8) {
                                                                                searchTimeouts.current[timeoutKey] = setTimeout(() => {
                                                                                    buscarEstudiante(index, dni)
                                                                                }, 500)
                                                                            }
                                                                        }}
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
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="file-upload"
                                        multiple
                                        disabled={isLoading}
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="flex items-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer transition-colors"
                                    >
                                        <Upload className="h-4 w-4" />
                                        <span>Agregar archivos</span>
                                    </label>
                                </div>
                                
                                {/* Lista de archivos seleccionados */}
                                {files.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Archivos seleccionados:</p>
                                        <div className="space-y-1">
                                            {files.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                                                    <span className="text-sm truncate flex-1">{file.name}</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setFiles(files.filter((_, i) => i !== index))
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <p className="text-xs text-muted-foreground">
                                    Formatos permitidos: PDF, JPG, PNG (máx. 5MB por archivo)
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                    disabled={isLoading}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Creando..." : "Crear Resolución"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}