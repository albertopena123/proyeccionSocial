"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { IconDownload, IconPlus } from "@tabler/icons-react"
import { ConstanciasDataTable } from "@/components/documents/constancias-data-table"
import { CreateConstanciaDialog } from "@/components/documents/create-constancia-dialog"

interface ConstanciasPageClientProps {
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
}

export function ConstanciasPageClient({ 
    initialData, 
    permissions, 
    currentUserId,
    currentUserRole 
}: ConstanciasPageClientProps) {
    const [constancias, setConstancias] = React.useState(initialData)
    const [refreshKey, setRefreshKey] = React.useState(0)

    // Función para actualizar la lista de constancias
    const refreshConstancias = React.useCallback(async () => {
        try {
            const response = await fetch("/api/documents/constancias", {
                cache: 'no-store'
            })
            if (response.ok) {
                const data = await response.json()
                setConstancias(data)
                setRefreshKey(prev => prev + 1)
            }
        } catch (error) {
            console.error("Error al actualizar constancias:", error)
        }
    }, [])

    // Función para agregar una nueva constancia localmente
    const onConstanciaCreated = React.useCallback((newConstancia: any) => {
        // Actualización inmediata con los datos completos
        if (newConstancia) {
            setConstancias(prev => [newConstancia, ...prev])
        }
        // También actualizar desde el servidor para sincronizar
        setTimeout(() => {
            refreshConstancias()
        }, 500)
    }, [refreshConstancias])

    return (
        <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex items-center justify-between px-4 lg:px-6">
                <div>
                    <h1 className="text-2xl font-bold">Gestión de Constancias</h1>
                    <p className="text-muted-foreground text-sm">
                        Administra las constancias universitarias
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
                        <CreateConstanciaDialog onSuccess={onConstanciaCreated}>
                            <Button>
                                <IconPlus className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Nueva Constancia</span>
                                <span className="sm:hidden">Nueva</span>
                            </Button>
                        </CreateConstanciaDialog>
                    )}
                </div>
            </div>

            <div className="px-4 lg:px-6">
                <ConstanciasDataTable
                    key={refreshKey}
                    data={constancias}
                    permissions={permissions}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                />
            </div>
        </div>
    )
}