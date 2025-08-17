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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import {
    IconCalendar,
    IconCurrencyDollar,
    IconFile,
    IconSchool,
    IconUser,
    IconUsers,
    IconDownload,
    IconExternalLink,
} from "@tabler/icons-react"

interface ResolucionDetailModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    resolucion: any
}

export function ResolucionDetailModal({ open, onOpenChange, resolucion }: ResolucionDetailModalProps) {
    if (!resolucion) return null

    const getTipoResolucionLabel = (tipo: string) => {
        const labels: Record<string, string> = {
            APROBACION_PROYECTO: "Aprobación de Proyecto",
            APROBACION_INFORME_FINAL: "Aprobación de Informe Final"
        }
        return labels[tipo] || tipo
    }

    const getModalidadLabel = (modalidad: string) => {
        const labels: Record<string, string> = {
            DOCENTES: "Docentes",
            ESTUDIANTES: "Estudiantes",
            VOLUNTARIADO: "Voluntariado",
            ACTIVIDAD: "Actividad"
        }
        return labels[modalidad] || modalidad
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
            <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Resolución {resolucion.numeroResolucion}
                        <Badge variant={statusConfig.variant}>
                            {statusConfig.label}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription>
                        {getTipoResolucionLabel(resolucion.tipoResolucion)}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
                    <div className="space-y-6">
                        {/* Información General */}
                        <div>
                            <h3 className="text-sm font-semibold mb-3">Información General</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-2">
                                    <IconCalendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">Fecha de Resolución</p>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(resolucion.fechaResolucion), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <IconUsers className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">Modalidad</p>
                                        <p className="text-sm text-muted-foreground">
                                            {getModalidadLabel(resolucion.modalidad)}
                                        </p>
                                    </div>
                                </div>

                                {resolucion.esFinanciado && (
                                    <div className="flex items-start gap-2">
                                        <IconCurrencyDollar className="h-4 w-4 mt-0.5 text-green-600" />
                                        <div>
                                            <p className="text-sm font-medium">Financiamiento</p>
                                            <p className="text-sm text-muted-foreground">
                                                S/. {typeof resolucion.monto === 'string' 
                                                    ? parseFloat(resolucion.monto).toFixed(2) 
                                                    : resolucion.monto?.toFixed(2) || '0.00'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Datos del Proyecto */}
                        <div>
                            <h3 className="text-sm font-semibold mb-3">Datos del Proyecto</h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm font-medium">Título del Proyecto</p>
                                    <p className="text-sm text-muted-foreground">{resolucion.tituloProyecto}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium">Facultad</p>
                                        <p className="text-sm text-muted-foreground">{resolucion.facultad?.nombre}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Departamento</p>
                                        <p className="text-sm text-muted-foreground">{resolucion.departamento?.nombre}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Datos del Asesor */}
                        <div>
                            <h3 className="text-sm font-semibold mb-3">Datos del Asesor</h3>
                            <div className="flex items-start gap-2">
                                <IconUser className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">{resolucion.nombreAsesor}</p>
                                    <p className="text-sm text-muted-foreground">DNI: {resolucion.dniAsesor}</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Docentes Participantes */}
                        {resolucion.docentes && resolucion.docentes.length > 0 && (
                            <>
                                <div>
                                    <h3 className="text-sm font-semibold mb-3">
                                        Docentes Participantes ({resolucion.docentes.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {resolucion.docentes.map((docente: any, index: number) => (
                                            <Card key={index} className="p-3">
                                                <div className="flex items-start gap-2">
                                                    <IconUser className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">
                                                            {docente.nombres} {docente.apellidos}
                                                        </p>
                                                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                                                            <span>DNI: {docente.dni}</span>
                                                            {docente.email && <span>Email: {docente.email}</span>}
                                                            {docente.facultad && <span>Facultad: {docente.facultad}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                                <Separator />
                            </>
                        )}

                        {/* Estudiantes Participantes */}
                        {resolucion.estudiantes && resolucion.estudiantes.length > 0 && (
                            <>
                                <div>
                                    <h3 className="text-sm font-semibold mb-3">
                                        Estudiantes Participantes ({resolucion.estudiantes.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {resolucion.estudiantes.map((estudiante: any, index: number) => (
                                            <Card key={index} className="p-3">
                                                <div className="flex items-start gap-2">
                                                    <IconSchool className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">
                                                            {estudiante.nombres} {estudiante.apellidos}
                                                        </p>
                                                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                                                            <span>DNI: {estudiante.dni}</span>
                                                            <span>Código: {estudiante.codigo}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                                <Separator />
                            </>
                        )}

                        {/* Archivos */}
                        {(resolucion.archivos?.length > 0 || resolucion.fileUrl) && (
                            <div>
                                <h3 className="text-sm font-semibold mb-3">Archivos Adjuntos</h3>
                                <div className="space-y-2">
                                    {/* Archivo principal (legacy) */}
                                    {resolucion.fileUrl && (
                                        <Card className="p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <IconFile className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {resolucion.fileName || 'Resolución'}
                                                        </p>
                                                        {resolucion.fileSize && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {(resolucion.fileSize / 1024 / 1024).toFixed(2)} MB
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(resolucion.fileUrl, '_blank')}
                                                    >
                                                        <IconExternalLink className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <a href={resolucion.fileUrl} download>
                                                            <IconDownload className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    )}

                                    {/* Archivos adicionales */}
                                    {resolucion.archivos?.map((archivo: any, index: number) => (
                                        <Card key={index} className="p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <IconFile className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {archivo.fileName}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {(archivo.fileSize / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(archivo.fileUrl, '_blank')}
                                                    >
                                                        <IconExternalLink className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <a href={archivo.fileUrl} download>
                                                            <IconDownload className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Información de Auditoría */}
                        <div>
                            <h3 className="text-sm font-semibold mb-3">Información de Auditoría</h3>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                    Creado por: {resolucion.createdBy?.name || resolucion.createdBy?.email} el{' '}
                                    {format(new Date(resolucion.createdAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                                </p>
                                {resolucion.updatedAt && (
                                    <p>
                                        Última actualización:{' '}
                                        {format(new Date(resolucion.updatedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                                    </p>
                                )}
                                {resolucion.approvedBy && resolucion.approvedAt && (
                                    <p>
                                        Aprobado por: {resolucion.approvedBy.name || resolucion.approvedBy.email} el{' '}
                                        {format(new Date(resolucion.approvedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                                    </p>
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