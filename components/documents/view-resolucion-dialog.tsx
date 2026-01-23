"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IconDownload, IconUser, IconCalendar, IconCash } from "@tabler/icons-react"

interface ViewResolucionDialogProps {
    resolucion: {
        id: string
        numeroResolucion: string
        tipoResolucion: string
        fechaResolucion: Date | string
        modalidad: string
        esFinanciado: boolean
        tipoFinanciamiento?: string | null
        monto?: number | string | null
        dniAsesor: string
        nombreAsesor: string
        tituloProyecto: string
        fileName?: string | null
        fileUrl?: string | null
        fileSize?: number | null
        status: string
        createdAt: Date | string
        updatedAt?: Date | string
        approvedAt?: Date | string | null
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
            dni?: string
        }>
        docentes?: Array<{
            nombres: string
            apellidos: string
            dni: string
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
    } | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ViewResolucionDialog({ resolucion, open, onOpenChange }: ViewResolucionDialogProps) {
    if (!resolucion) return null

    const getTipoResolucionLabel = (tipo: string) => {
        const tipos: Record<string, string> = {
            APROBACION_PROYECTO: "Aprobación de Proyecto",
            APROBACION_INFORME_FINAL: "Aprobación de Informe Final",
            APROBACION_VIABILIDAD: "Aprobación de Viabilidad",
            RECONOCIMIENTO: "Reconocimiento"
        }
        return tipos[tipo] || tipo
    }

    const getModalidadLabel = (modalidad: string) => {
        const modalidades: Record<string, string> = {
            DOCENTES: "Docentes",
            ESTUDIANTES: "Estudiantes",
            VOLUNTARIADO: "Voluntariado",
            ACTIVIDAD: "Actividad",
            EXTERNOS: "Externos",
            ADMINISTRATIVOS: "Administrativos",
            AUTODIAGNOSTICO: "Autodiagnóstico",
            EXTENSION_CULTURAL_ARTISTICA: "Extensión Cultural y Artística"
        }
        return modalidades[modalidad] || modalidad
    }

    const getTipoFinanciamientoLabel = (tipo: string) => {
        const tipos: Record<string, string> = {
            FINANCIADO: "Financiado",
            COFINANCIADO: "Cofinanciado",
            AUTOFINANCIADO: "Autofinanciado"
        }
        return tipos[tipo] || tipo
    }

    const getStatusConfig = (status: string) => {
        const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
            PENDIENTE: { variant: "secondary", label: "Pendiente" },
            APROBADO: { variant: "default", label: "Aprobado" },
            RECHAZADO: { variant: "destructive", label: "Rechazado" },
            ANULADO: { variant: "outline", label: "Anulado" }
        }
        return statusConfig[status] || { variant: "outline", label: status }
    }

    const statusConfig = getStatusConfig(resolucion.status)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Detalles de Resolución</DialogTitle>
                    <DialogDescription>
                        {resolucion.numeroResolucion}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="space-y-6">
                        {/* Estado y Tipo */}
                        <div className="flex items-center gap-2">
                            <Badge variant={statusConfig.variant}>
                                {statusConfig.label}
                            </Badge>
                            <Badge variant="outline">
                                {getTipoResolucionLabel(resolucion.tipoResolucion)}
                            </Badge>
                            <Badge variant="outline">
                                {getModalidadLabel(resolucion.modalidad)}
                            </Badge>
                        </div>

                        {/* Información General */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold">Información General</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Número de Resolución</p>
                                    <p className="font-medium">{resolucion.numeroResolucion}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Fecha de Resolución</p>
                                    <p className="font-medium">
                                        {format(new Date(resolucion.fechaResolucion), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Tipo</p>
                                    <p className="font-medium">{getTipoResolucionLabel(resolucion.tipoResolucion)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Modalidad</p>
                                    <p className="font-medium">{getModalidadLabel(resolucion.modalidad)}</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Proyecto */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold">Información del Proyecto</h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Título del Proyecto</p>
                                    <p className="font-medium">{resolucion.tituloProyecto}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-muted-foreground">Facultad</p>
                                        <p className="font-medium">{resolucion.facultad?.nombre}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Departamento</p>
                                        <p className="font-medium">{resolucion.departamento?.nombre}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Asesor */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold">Datos del Asesor</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Documento</p>
                                    <p className="font-medium">{resolucion.dniAsesor}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Nombre</p>
                                    <p className="font-medium">{resolucion.nombreAsesor}</p>
                                </div>
                            </div>
                        </div>

                        {/* Financiamiento */}
                        {resolucion.esFinanciado && (
                            <>
                                <Separator />
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold">Financiamiento</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <IconCash className="h-4 w-4 text-muted-foreground" />
                                            <span>Tipo:</span>
                                            <Badge variant="outline">
                                                {resolucion.tipoFinanciamiento
                                                    ? getTipoFinanciamientoLabel(resolucion.tipoFinanciamiento)
                                                    : "Financiado"}
                                            </Badge>
                                        </div>
                                        {resolucion.monto && (
                                            <div className="flex items-center gap-2">
                                                <span>Monto:</span>
                                                <Badge variant="secondary">
                                                    S/. {typeof resolucion.monto === 'string'
                                                        ? parseFloat(resolucion.monto).toFixed(2)
                                                        : resolucion.monto?.toFixed(2) || '0.00'}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Participantes Docentes */}
                        {resolucion.docentes && resolucion.docentes.length > 0 && (
                            <>
                                <Separator />
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold">Docentes Participantes</h3>
                                    <div className="space-y-2">
                                        {resolucion.docentes.map((docente, index) => (
                                            <div key={index} className="flex items-center gap-2 text-sm">
                                                <IconUser className="h-4 w-4 text-muted-foreground" />
                                                <span>{docente.apellidos} {docente.nombres}</span>
                                                <span className="text-muted-foreground">({docente.dni})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Participantes Estudiantes */}
                        {resolucion.estudiantes && resolucion.estudiantes.length > 0 && (
                            <>
                                <Separator />
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold">Estudiantes Participantes</h3>
                                    <div className="space-y-2">
                                        {resolucion.estudiantes.map((estudiante, index) => (
                                            <div key={index} className="flex items-center gap-2 text-sm">
                                                <IconUser className="h-4 w-4 text-muted-foreground" />
                                                <span>{estudiante.apellidos} {estudiante.nombres}</span>
                                                <span className="text-muted-foreground">
                                                    ({estudiante.codigo}{estudiante.dni ? ` - ${estudiante.dni}` : ''})
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Archivo */}
                        {resolucion.fileName && (
                            <>
                                <Separator />
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold">Archivo Adjunto</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm">
                                            <p className="font-medium">{resolucion.fileName}</p>
                                            {resolucion.fileSize && (
                                                <p className="text-muted-foreground">
                                                    {(resolucion.fileSize / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            )}
                                        </div>
                                        {resolucion.fileUrl && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => resolucion.fileUrl && window.open(resolucion.fileUrl, '_blank')}
                                            >
                                                <IconDownload className="mr-2 h-4 w-4" />
                                                Descargar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Información de Auditoría */}
                        <Separator />
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold">Información de Auditoría</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Creado por</p>
                                    <p className="font-medium">{resolucion.createdBy.name || resolucion.createdBy.email}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Fecha de Creación</p>
                                    <p className="font-medium">
                                        {format(new Date(resolucion.createdAt), "dd/MM/yyyy HH:mm")}
                                    </p>
                                </div>
                                {resolucion.approvedBy && (
                                    <>
                                        <div>
                                            <p className="text-muted-foreground">Aprobado por</p>
                                            <p className="font-medium">{resolucion.approvedBy.name}</p>
                                        </div>
                                        {resolucion.approvedAt && (
                                            <div>
                                                <p className="text-muted-foreground">Fecha de Aprobación</p>
                                                <p className="font-medium">
                                                    {format(new Date(resolucion.approvedAt), "dd/MM/yyyy HH:mm")}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}