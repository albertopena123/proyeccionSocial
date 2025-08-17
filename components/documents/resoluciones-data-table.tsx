"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"
import {
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconDotsVertical,
    IconEdit,
    IconTrash,
    IconSearch,
    IconLayoutColumns,
    IconEye,
    IconDownload,
    IconCheck,
    IconX,
    IconCurrencyDollar,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { ViewResolucionDialog } from "./view-resolucion-dialog"
import { EditResolucionDialog } from "./edit-resolucion-dialog"
import { formatDateShort } from "@/lib/date-utils"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
        dni?: string
        codigo: string
        nombres: string
        apellidos: string
    }>
    docentes?: Array<{
        id?: string
        dni: string
        nombres: string
        apellidos: string
        email?: string
        facultad?: string
    }>
    archivos?: Array<{
        id: string
        fileName: string
        fileUrl: string
        fileSize?: number | null
        fileMimeType?: string | null
        tipo?: string | null
        createdAt: Date | string
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
}

interface ResolucionPermissions {
    canRead: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    canExport: boolean
}

interface ResolucionesDataTableProps {
    data: Resolucion[]
    permissions: ResolucionPermissions
    currentUserId: string
    currentUserRole?: string
    facultades?: { id: string; nombre: string; departamentos?: any[] }[]
}

export function ResolucionesDataTable({ data: initialData, permissions, currentUserId, currentUserRole, facultades = [] }: ResolucionesDataTableProps) {
    const [data, setData] = React.useState(initialData)
    
    // Actualizar los datos cuando cambien los datos iniciales
    React.useEffect(() => {
        setData(initialData)
    }, [initialData])
    const [sorting, setSorting] = React.useState<SortingState>([
        {
            id: "createdAt",
            desc: true
        }
    ])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
        modalidad: false,
        esFinanciado: false,
        estudiantes: false,
        createdAt: false,
    })
    const [rowSelection, setRowSelection] = React.useState({})
    const [globalFilter, setGlobalFilter] = React.useState("")
    const [deleteResolucionId, setDeleteResolucionId] = React.useState<string | null>(null)
    const [viewResolucion, setViewResolucion] = React.useState<Resolucion | null>(null)
    const [editResolucion, setEditResolucion] = React.useState<Resolucion | null>(null)

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

    const handleDeleteResolucion = async (resolucionId: string) => {
        try {
            const response = await fetch(`/api/documents/resoluciones/${resolucionId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al eliminar resolución')
            }

            toast.success("Resolución eliminada correctamente")
            setData(data.filter(r => r.id !== resolucionId))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al eliminar resolución")
        }
    }

    const handleApproveResolucion = async (resolucionId: string) => {
        try {
            const response = await fetch(`/api/documents/resoluciones/${resolucionId}/approve`, {
                method: 'POST',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al aprobar resolución')
            }

            toast.success("Resolución aprobada correctamente")

            setData(data.map(r =>
                r.id === resolucionId
                    ? { ...r, status: 'APROBADO' }
                    : r
            ))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al aprobar resolución")
        }
    }

    const handleRejectResolucion = async (resolucionId: string) => {
        try {
            const response = await fetch(`/api/documents/resoluciones/${resolucionId}/reject`, {
                method: 'POST',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al rechazar resolución')
            }

            toast.success("Resolución rechazada")
            setData(data.map(r =>
                r.id === resolucionId
                    ? { ...r, status: 'RECHAZADO' }
                    : r
            ))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al rechazar resolución")
        }
    }

    const columns: ColumnDef<Resolucion>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && "indeterminate")
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Seleccionar todo"
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Seleccionar fila"
                        disabled={!permissions.canDelete}
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "numeroResolucion",
            header: "N° Resolución",
            cell: ({ row }) => {
                return (
                    <div className="font-mono font-medium">
                        {row.original.numeroResolucion}
                    </div>
                )
            },
        },
        {
            accessorKey: "tipoResolucion",
            header: "Tipo",
            cell: ({ row }) => {
                const tipo = row.original.tipoResolucion
                return (
                    <Badge variant={tipo === "APROBACION_PROYECTO" ? "default" : "secondary"}>
                        {getTipoResolucionLabel(tipo)}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "tituloProyecto",
            header: "Proyecto",
            cell: ({ row }) => {
                return (
                    <div className="max-w-[300px]">
                        <p className="truncate font-medium" title={row.original.tituloProyecto}>
                            {row.original.tituloProyecto}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Asesor: {row.original.nombreAsesor}
                        </p>
                    </div>
                )
            },
        },
        {
            accessorKey: "modalidad",
            header: "Modalidad",
            cell: ({ row }) => {
                return <span>{getModalidadLabel(row.original.modalidad)}</span>
            },
        },
        {
            accessorKey: "facultad",
            header: "Facultad",
            cell: ({ row }) => {
                return (
                    <div>
                        <p className="text-sm">{row.original.facultad.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                            {row.original.departamento.nombre}
                        </p>
                    </div>
                )
            },
        },
        {
            accessorKey: "fechaResolucion",
            header: "Fecha",
            cell: ({ row }) => {
                return formatDateShort(row.original.fechaResolucion)
            },
        },
        {
            accessorKey: "esFinanciado",
            header: "Financiamiento",
            cell: ({ row }) => {
                const esFinanciado = row.original.esFinanciado
                const monto = row.original.monto

                if (!esFinanciado) {
                    return <span className="text-muted-foreground">No financiado</span>
                }

                return (
                    <div className="flex items-center gap-1">
                        <IconCurrencyDollar className="h-4 w-4 text-green-600" />
                        <span className="font-medium">
                            S/. {typeof monto === 'string' ? parseFloat(monto).toFixed(2) : monto?.toFixed(2) || '0.00'}
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: "estudiantes",
            header: "Estudiantes",
            cell: ({ row }) => {
                const estudiantes = row.original.estudiantes
                if (!estudiantes || estudiantes.length === 0) {
                    return <span className="text-muted-foreground">-</span>
                }
                return <span>{estudiantes.length} estudiante(s)</span>
            },
        },
        {
            accessorKey: "docentes",
            header: "Docentes",
            cell: ({ row }) => {
                const docentes = row.original.docentes
                if (!docentes || docentes.length === 0) {
                    return <span className="text-muted-foreground">-</span>
                }
                return <span>{docentes.length} docente(s)</span>
            },
        },
        {
            accessorKey: "status",
            header: "Estado",
            cell: ({ row }) => {
                const status = row.original.status
                const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
                    PENDIENTE: { variant: "secondary", label: "Pendiente" },
                    APROBADO: { variant: "default", label: "Aprobado" },
                    RECHAZADO: { variant: "destructive", label: "Rechazado" },
                    ANULADO: { variant: "outline", label: "Anulado" }
                }
                const config = statusConfig[status] || { variant: "outline", label: status }

                return (
                    <Badge variant={config.variant}>
                        {config.label}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "createdAt",
            header: "Fecha Creación",
            cell: ({ row }) => {
                return formatDateShort(row.original.createdAt)
            },
            enableSorting: true,
        },
        {
            accessorKey: "archivos",
            header: "Archivos",
            cell: ({ row }) => {
                const archivos = row.original.archivos || []
                const fileName = row.original.fileName
                const fileUrl = row.original.fileUrl

                // Si no hay archivos en el array pero sí en los campos legacy
                if (archivos.length === 0 && fileName) {
                    return (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                if (fileUrl) {
                                    window.open(fileUrl, '_blank')
                                }
                            }}
                            disabled={!fileUrl}
                        >
                            <IconDownload className="mr-1 h-3 w-3" />
                            1 archivo
                        </Button>
                    )
                }

                if (archivos.length === 0) {
                    return <span className="text-muted-foreground">Sin archivos</span>
                }

                if (archivos.length === 1) {
                    return (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                window.open(archivos[0].fileUrl, '_blank')
                            }}
                        >
                            <IconDownload className="mr-1 h-3 w-3" />
                            1 archivo
                        </Button>
                    )
                }

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <IconDownload className="mr-1 h-3 w-3" />
                                {archivos.length} archivos
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {archivos.map((archivo, index) => (
                                <DropdownMenuItem
                                    key={archivo.id}
                                    onClick={() => window.open(archivo.fileUrl, '_blank')}
                                >
                                    <IconDownload className="mr-2 h-4 w-4" />
                                    {archivo.tipo || `Archivo ${index + 1}`}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const resolucion = row.original
                const isPending = resolucion.status === "PENDIENTE"
                const isApproved = resolucion.status === "APROBADO"
                const isSuperAdmin = currentUserRole === "SUPER_ADMIN"
                const canEditApproved = isSuperAdmin && isApproved
                const canDelete = permissions.canDelete && (!isApproved || isSuperAdmin)

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <IconDotsVertical className="h-4 w-4" />
                                <span className="sr-only">Abrir menú</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewResolucion(resolucion)}>
                                <IconEye className="mr-2 h-4 w-4" />
                                Ver Detalles
                            </DropdownMenuItem>

                            {permissions.canUpdate && (
                                <>
                                    <DropdownMenuItem
                                        disabled={isApproved && !isSuperAdmin}
                                        onClick={() => ((!isApproved || isSuperAdmin) && setEditResolucion(resolucion))}
                                    >
                                        <IconEdit className="mr-2 h-4 w-4" />
                                        {isApproved && !isSuperAdmin ? "No editable (Aprobado)" : "Editar"}
                                    </DropdownMenuItem>

                                    {isPending && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-green-600"
                                                onClick={() => handleApproveResolucion(resolucion.id)}
                                            >
                                                <IconCheck className="mr-2 h-4 w-4" />
                                                Aprobar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={() => handleRejectResolucion(resolucion.id)}
                                            >
                                                <IconX className="mr-2 h-4 w-4" />
                                                Rechazar
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </>
                            )}

                            {canDelete && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => setDeleteResolucionId(resolucion.id)}
                                    >
                                        <IconTrash className="mr-2 h-4 w-4" />
                                        Eliminar
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        globalFilterFn: "includesString",
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
    })

    return (
        <>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="relative w-full sm:w-auto">
                        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar resoluciones..."
                            value={globalFilter}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                            className="pl-10 w-full sm:w-[300px]"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <IconLayoutColumns className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Columnas</span>
                                    <IconChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanHide())
                                    .map((column) => {
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                className="capitalize"
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) =>
                                                    column.toggleVisibility(!!value)
                                                }
                                            >
                                                {column.id}
                                            </DropdownMenuCheckboxItem>
                                        )
                                    })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        No se encontraron resoluciones.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                        {table.getFilteredSelectedRowModel().rows.length} de{" "}
                        {table.getFilteredRowModel().rows.length} resolución(es) seleccionada(s).
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="rows-per-page" className="text-sm">
                                Filas por página
                            </Label>
                            <Select
                                value={`${table.getState().pagination.pageSize}`}
                                onValueChange={(value) => {
                                    table.setPageSize(Number(value))
                                }}
                            >
                                <SelectTrigger className="h-8 w-[70px]" id="rows-per-page">
                                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 20, 30, 40, 50].map((pageSize) => (
                                        <SelectItem key={pageSize} value={`${pageSize}`}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <IconChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <IconChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="flex items-center gap-1 text-sm">
                                <span>Página</span>
                                <strong>
                                    {table.getState().pagination.pageIndex + 1} de{" "}
                                    {table.getPageCount()}
                                </strong>
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                <IconChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                <IconChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <AlertDialog open={!!deleteResolucionId} onOpenChange={() => setDeleteResolucionId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente
                            la resolución y todos sus datos asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (deleteResolucionId) {
                                    handleDeleteResolucion(deleteResolucionId)
                                    setDeleteResolucionId(null)
                                }
                            }}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Diálogo de Ver Detalles */}
            <ViewResolucionDialog
                resolucion={viewResolucion}
                open={!!viewResolucion}
                onOpenChange={(open) => !open && setViewResolucion(null)}
            />

            {/* Diálogo de Editar */}
            {editResolucion && (
                <EditResolucionDialog
                    resolucion={editResolucion}
                    facultades={facultades}
                    open={!!editResolucion}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditResolucion(null)
                        }
                    }}
                    onSuccess={(updatedResolucion) => {
                        // Actualizar la resolución en el estado local
                        setData(prevData => 
                            prevData.map(r => 
                                r.id === updatedResolucion.id 
                                    ? { ...updatedResolucion, monto: updatedResolucion.monto?.toString() }
                                    : r
                            )
                        )
                        setEditResolucion(null)
                    }}
                />
            )}
        </>
    )
}