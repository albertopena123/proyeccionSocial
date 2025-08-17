"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { IconDownload, IconPlus } from "@tabler/icons-react"
import { ResolucionesDataTable } from "@/components/documents/resoluciones-data-table"
import { CreateResolucionDialog } from "@/components/documents/create-resolucion-dialog"

interface ResolucionesPageClientProps {
    initialData: any[]
    permissions: {
        canCreate: boolean
        canUpdate: boolean
        canDelete: boolean
        canExport: boolean
        canRead: boolean
    }
    currentUserId: string
    currentUserRole?: string
    facultades: any[]
    facultadesParaTabla: any[]
}

export function ResolucionesPageClient({ 
    initialData, 
    permissions, 
    currentUserId,
    currentUserRole,
    facultades,
    facultadesParaTabla
}: ResolucionesPageClientProps) {
    const [resoluciones, setResoluciones] = React.useState(initialData)
    const [refreshKey, setRefreshKey] = React.useState(0)

    // Función para actualizar la lista de resoluciones
    const refreshResoluciones = React.useCallback(async () => {
        try {
            const response = await fetch("/api/documents/resoluciones", {
                cache: 'no-store'
            })
            if (response.ok) {
                const data = await response.json()
                // Convertir Decimal a string
                const resolucionesSerializables = data.map((res: any) => ({
                    ...res,
                    monto: res.monto ? res.monto.toString() : null
                }))
                setResoluciones(resolucionesSerializables)
                setRefreshKey(prev => prev + 1)
            }
        } catch (error) {
            console.error("Error al actualizar resoluciones:", error)
        }
    }, [])

    // Función para agregar una nueva resolución localmente
    const onResolucionCreated = React.useCallback((newResolucion: any) => {
        // Convertir monto a string si existe
        const resolucionSerializable = {
            ...newResolucion,
            monto: newResolucion.monto ? newResolucion.monto.toString() : null
        }
        // Actualización inmediata con los datos completos
        if (resolucionSerializable) {
            setResoluciones(prev => [resolucionSerializable, ...prev])
        }
        // También actualizar desde el servidor para sincronizar
        setTimeout(() => {
            refreshResoluciones()
        }, 500)
    }, [refreshResoluciones])

    return (
        <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex items-center justify-between px-4 lg:px-6">
                <div>
                    <h1 className="text-2xl font-bold">Gestión de Resoluciones</h1>
                    <p className="text-muted-foreground text-sm">
                        Administra las resoluciones de proyección social
                    </p>
                </div>
                <div className="flex gap-2">
                    {permissions.canExport && (
                        <Button variant="outline">
                            <IconDownload className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Exportar</span>
                            <span className="sm:hidden">
                                <IconDownload className="h-4 w-4" />
                            </span>
                        </Button>
                    )}
                    {permissions.canCreate && (
                        <CreateResolucionDialog 
                            facultades={facultades}
                            onSuccess={onResolucionCreated}
                        >
                            <Button>
                                <IconPlus className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Nueva Resolución</span>
                                <span className="sm:hidden">Nueva</span>
                            </Button>
                        </CreateResolucionDialog>
                    )}
                </div>
            </div>

            <div className="px-4 lg:px-6">
                <ResolucionesDataTable
                    key={refreshKey}
                    data={resoluciones}
                    permissions={permissions}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    facultades={facultades}
                />
            </div>
        </div>
    )
}