"use client"

import * as React from "react"
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
import { 
    IconDownload, 
    IconUser, 
    IconId, 
    IconHash, 
    IconCalendar, 
    IconFile,
    IconClock,
    IconCircleCheck,
    IconCircleX,
    IconAlertCircle
} from "@tabler/icons-react"
import { formatDatePeru } from "@/lib/date-utils"

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
    fileSize?: number | null
    fileMimeType?: string | null
    status: string
    createdAt: Date | string
    updatedAt: Date | string
    approvedAt?: Date | string | null
    createdBy?: {
        id: string
        name: string | null
        email: string
    }
    approvedBy?: {
        id: string
        name: string | null
        email: string
    } | null
}

interface ViewConstanciaDialogProps {
    constancia: Constancia
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ViewConstanciaDialog({ constancia, open, onOpenChange }: ViewConstanciaDialogProps) {
    if (!constancia) return null

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { icon: React.ReactNode, color: string, label: string }> = {
            PENDIENTE: {
                icon: <IconAlertCircle className="h-4 w-4" />,
                color: "text-yellow-600",
                label: "Pendiente"
            },
            APROBADO: {
                icon: <IconCircleCheck className="h-4 w-4" />,
                color: "text-green-600",
                label: "Aprobado"
            },
            RECHAZADO: {
                icon: <IconCircleX className="h-4 w-4" />,
                color: "text-red-600",
                label: "Rechazado"
            },
            ANULADO: {
                icon: <IconAlertCircle className="h-4 w-4" />,
                color: "text-gray-600",
                label: "Anulado"
            }
        }
        return configs[status] || configs.PENDIENTE
    }

    const statusConfig = getStatusConfig(constancia.status)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>Detalles de Constancia</span>
                        <Badge 
                            variant={
                                constancia.status === "APROBADO" ? "default" : 
                                constancia.status === "RECHAZADO" ? "destructive" : 
                                "secondary"
                            }
                        >
                            {statusConfig.label}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription>
                        Información completa de la constancia #{constancia.constanciaNumber}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Información del Estudiante */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">DATOS DEL ESTUDIANTE</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-start gap-2">
                                <IconUser className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Nombre Completo</p>
                                    <p className="text-sm font-medium">{constancia.fullName}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <IconHash className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Código de Estudiante</p>
                                    <p className="text-sm font-medium">{constancia.studentCode}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <IconId className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground">DNI</p>
                                    <p className="text-sm font-medium">{constancia.dni}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Información del Documento */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">DATOS DEL DOCUMENTO</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-start gap-2">
                                <IconFile className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Número de Constancia</p>
                                    <p className="text-sm font-medium font-mono">{constancia.constanciaNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <IconCalendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Año</p>
                                    <p className="text-sm font-medium">{constancia.year}</p>
                                </div>
                            </div>
                        </div>

                        {/* Observaciones */}
                        {constancia.observation && (
                            <div className="mt-4">
                                <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
                                <p className="text-sm bg-muted p-3 rounded-md">{constancia.observation}</p>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Archivo */}
                    {constancia.fileName && (
                        <>
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground">ARCHIVO ADJUNTO</h3>
                                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                                    <div className="flex items-center gap-2">
                                        <IconFile className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">{constancia.fileName}</p>
                                            {constancia.fileSize && (
                                                <p className="text-xs text-muted-foreground">
                                                    {(constancia.fileSize / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {constancia.fileUrl && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (constancia.fileUrl) {
                                                    window.open(constancia.fileUrl, '_blank')
                                                }
                                            }}
                                        >
                                            <IconDownload className="mr-2 h-4 w-4" />
                                            Descargar
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Información de Auditoría */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">INFORMACIÓN DE REGISTRO</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-start gap-2">
                                <IconUser className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Creado por</p>
                                    <p className="text-sm font-medium">
                                        {constancia.createdBy?.name || constancia.createdBy?.email}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <IconClock className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Fecha de creación</p>
                                    <p className="text-sm font-medium">
                                        {formatDatePeru(constancia.createdAt)}
                                    </p>
                                </div>
                            </div>
                            {constancia.approvedBy && (
                                <>
                                    <div className="flex items-start gap-2">
                                        <IconCircleCheck className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Aprobado por</p>
                                            <p className="text-sm font-medium">
                                                {constancia.approvedBy.name || constancia.approvedBy.email}
                                            </p>
                                        </div>
                                    </div>
                                    {constancia.approvedAt && (
                                        <div className="flex items-start gap-2">
                                            <IconClock className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Fecha de aprobación</p>
                                                <p className="text-sm font-medium">
                                                    {formatDatePeru(constancia.approvedAt)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Estado */}
                    <div className={`flex items-center gap-2 p-3 rounded-md bg-muted ${statusConfig.color}`}>
                        {statusConfig.icon}
                        <span className="text-sm font-medium">
                            Estado actual: {statusConfig.label}
                        </span>
                    </div>
                </div>

                <div className="flex justify-end mt-6">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}