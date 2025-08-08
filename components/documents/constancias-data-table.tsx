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
} from "@tabler/icons-react"
import { toast } from "sonner"
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
import { EditConstanciaDialog } from "./edit-constancia-dialog"
import { ViewConstanciaDialog } from "./view-constancia-dialog"

interface Constancia {
    id: string
    studentCode: string
    fullName: string
    dni: string
    constanciaNumber: string
    year: number
    observation: string | null
    fileName: string | null
    fileUrl: string | null
    status: string
    type: string
    createdAt: Date
    updatedAt: Date
    approvedAt: Date | null
    createdBy: {
        id: string
        name: string | null
        email: string
    }
    approvedBy: {
        id: string
        name: string | null
        email: string
    } | null
}

interface ConstanciaPermissions {
    canRead: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    canExport: boolean
}

interface ConstanciasDataTableProps {
    data: Constancia[]
    permissions: ConstanciaPermissions
    currentUserId: string
    currentUserRole?: string
}

export function ConstanciasDataTable({ data: initialData, permissions, currentUserId, currentUserRole }: ConstanciasDataTableProps) {
    const [data, setData] = React.useState(initialData)
    
    // Actualizar los datos cuando cambien los datos iniciales
    React.useEffect(() => {
        setData(initialData)
    }, [initialData])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [globalFilter, setGlobalFilter] = React.useState("")
    const [deleteConstanciaId, setDeleteConstanciaId] = React.useState<string | null>(null)
    const [editingConstancia, setEditingConstancia] = React.useState<Constancia | null>(null)
    const [viewingConstancia, setViewingConstancia] = React.useState<Constancia | null>(null)

    const handleDeleteConstancia = async (constanciaId: string) => {
        try {
            const response = await fetch(`/api/documents/constancias/${constanciaId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al eliminar constancia')
            }

            toast.success("Constancia eliminada correctamente")
            setData(data.filter(c => c.id !== constanciaId))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al eliminar constancia")
        }
    }

    const handleApproveConstancia = async (constanciaId: string) => {
        try {
            const response = await fetch(`/api/documents/constancias/${constanciaId}/approve`, {
                method: 'POST',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al aprobar constancia')
            }

            const updatedConstancia = await response.json()
            toast.success("Constancia aprobada correctamente")
            
            setData(data.map(c => 
                c.id === constanciaId 
                    ? { ...c, status: 'APROBADO', approvedAt: new Date(), approvedBy: updatedConstancia.approvedBy }
                    : c
            ))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al aprobar constancia")
        }
    }

    const handleRejectConstancia = async (constanciaId: string) => {
        try {
            const response = await fetch(`/api/documents/constancias/${constanciaId}/reject`, {
                method: 'POST',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al rechazar constancia')
            }

            toast.success("Constancia rechazada")
            setData(data.map(c => 
                c.id === constanciaId 
                    ? { ...c, status: 'RECHAZADO' }
                    : c
            ))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al rechazar constancia")
        }
    }

    const columns: ColumnDef<Constancia>[] = [
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
            accessorKey: "constanciaNumber",
            header: "N° Constancia",
            cell: ({ row }) => {
                return (
                    <div className="font-mono font-medium">
                        {row.original.constanciaNumber}
                    </div>
                )
            },
        },
        {
            accessorKey: "fullName",
            header: "Estudiante",
            cell: ({ row }) => {
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{row.original.fullName}</span>
                        <span className="text-xs text-muted-foreground">
                            Código: {row.original.studentCode} | DNI: {row.original.dni}
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: "year",
            header: "Año",
            cell: ({ row }) => {
                return <span>{row.original.year}</span>
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
        },
        {
            accessorKey: "createdBy",
            header: "Creado Por",
            cell: ({ row }) => {
                const createdBy = row.original.createdBy
                return (
                    <div className="text-sm">
                        <span>{createdBy.name || createdBy.email}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: "fileName",
            header: "Archivo",
            cell: ({ row }) => {
                const fileName = row.original.fileName
                const fileUrl = row.original.fileUrl
                
                if (!fileName) return <span className="text-muted-foreground">Sin archivo</span>
                
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
                        Descargar
                    </Button>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const constancia = row.original
                const isPending = constancia.status === "PENDIENTE"
                const isApproved = constancia.status === "APROBADO"
                const isSuperAdmin = currentUserRole === "SUPER_ADMIN"
                const canEditApproved = isSuperAdmin && isApproved
                const canDelete = permissions.canDelete && !isApproved // No permitir eliminar si está aprobado

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <IconDotsVertical className="h-4 w-4" />
                                <span className="sr-only">Abrir menú</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingConstancia(constancia)}>
                                <IconEye className="mr-2 h-4 w-4" />
                                Ver Detalles
                            </DropdownMenuItem>

                            {permissions.canUpdate && (
                                <>
                                    <DropdownMenuItem 
                                        onClick={() => setEditingConstancia(constancia)}
                                        disabled={isApproved && !isSuperAdmin} // SUPER_ADMIN puede editar aprobados
                                    >
                                        <IconEdit className="mr-2 h-4 w-4" />
                                        {isApproved && !isSuperAdmin ? "No editable (Aprobado)" : canEditApproved ? "Editar (Admin)" : "Editar"}
                                    </DropdownMenuItem>

                                    {isPending && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                                className="text-green-600"
                                                onClick={() => handleApproveConstancia(constancia.id)}
                                            >
                                                <IconCheck className="mr-2 h-4 w-4" />
                                                Aprobar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                                className="text-red-600"
                                                onClick={() => handleRejectConstancia(constancia.id)}
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
                                        onClick={() => setDeleteConstanciaId(constancia.id)}
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
                            placeholder="Buscar constancias..."
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
                                        No se encontraron constancias.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                        {table.getFilteredSelectedRowModel().rows.length} de{" "}
                        {table.getFilteredRowModel().rows.length} constancia(s) seleccionada(s).
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

            <AlertDialog open={!!deleteConstanciaId} onOpenChange={() => setDeleteConstanciaId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente
                            la constancia y todos sus datos asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (deleteConstanciaId) {
                                    handleDeleteConstancia(deleteConstanciaId)
                                    setDeleteConstanciaId(null)
                                }
                            }}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Diálogo de Edición */}
            {editingConstancia && (
                <EditConstanciaDialog
                    constancia={editingConstancia}
                    open={!!editingConstancia}
                    onOpenChange={(open) => {
                        if (!open) setEditingConstancia(null)
                    }}
                    currentUserRole={currentUserRole}
                />
            )}

            {/* Diálogo de Ver Detalles */}
            {viewingConstancia && (
                <ViewConstanciaDialog
                    constancia={viewingConstancia}
                    open={!!viewingConstancia}
                    onOpenChange={(open) => {
                        if (!open) setViewingConstancia(null)
                    }}
                />
            )}
        </>
    )
}