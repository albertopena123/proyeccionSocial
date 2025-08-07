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
    IconKey,
    IconLayoutColumns,
    IconPower,
    IconSearch,
    IconTrash,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EditUserDialog } from "./edit-user-dialog"
import { ResetPasswordDialog } from "./reset-password-dialog"
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

interface User {
    id: string
    name: string
    email: string
    role: string
    emailVerified: Date | null
    createdAt: Date
    lastActive: string
    permissions: string
    image?: string | null
}

interface UserPermissions {
    canRead: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    canExport: boolean
}

interface UsersDataTableProps {
    data: User[]
    permissions: UserPermissions
    currentUserId: string
}

export function UsersDataTable({ data: initialData, permissions, currentUserId }: UsersDataTableProps) {
    // DEBUG: Ver qué datos llegan al componente
    React.useEffect(() => {
        console.log("=== DATOS EN UsersDataTable ===")
        console.log("Total usuarios:", initialData.length)
        initialData.forEach(user => {
            console.log({
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
                permissions: user.permissions
            })
        })
        console.log("================================")
    }, [initialData])

    const [data, setData] = React.useState(initialData)
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [globalFilter, setGlobalFilter] = React.useState("")
    const [deleteUserId, setDeleteUserId] = React.useState<string | null>(null)

    const handleDeleteUser = async (userId: string) => {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al eliminar usuario')
            }

            toast.success("Usuario eliminado correctamente")
            setData(data.filter(user => user.id !== userId))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al eliminar usuario")
        }
    }

    const handleToggleStatus = async (userId: string) => {
        try {
            const response = await fetch(`/api/users/${userId}/toggle-status`, {
                method: 'POST',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al cambiar estado')
            }

            const result = await response.json()
            toast.success(result.message)

            // Actualizar el estado local
            setData(data.map(user =>
                user.id === userId
                    ? { ...user, emailVerified: result.isActive ? new Date() : null }
                    : user
            ))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al cambiar estado")
        }
    }

    const columns: ColumnDef<User>[] = [
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
                        disabled={!permissions.canDelete || row.original.id === currentUserId}
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "name",
            header: "Usuario",
            cell: ({ row }) => {
                const user = row.original
                // DEBUG: Ver datos de imagen
                console.log(`Usuario ${user.name}: imagen = "${user.image}"`)
                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image || undefined} alt={user.name} />
                            <AvatarFallback>
                                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                    </div>
                )
            },
        },
        {
            accessorKey: "role",
            header: "Rol",
            cell: ({ row }) => {
                const roleColors: Record<string, string> = {
                    SUPER_ADMIN: "destructive",
                    ADMIN: "default",
                    MODERATOR: "secondary",
                    USER: "outline"
                }
                const roleLabels: Record<string, string> = {
                    SUPER_ADMIN: "Super Admin",
                    ADMIN: "Administrador",
                    MODERATOR: "Moderador",
                    USER: "Usuario"
                }
                return (
                    <Badge variant={roleColors[row.original.role] as "destructive" | "default" | "secondary" | "outline" | undefined}>
                        {roleLabels[row.original.role] || row.original.role}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "emailVerified",
            header: "Estado",
            cell: ({ row }) => {
                const isActive = !!row.original.emailVerified
                return (
                    <Badge variant={isActive ? "default" : "destructive"}>
                        {isActive ? "Activo" : "Inactivo"}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "createdAt",
            header: "Fecha de Registro",
            cell: ({ row }) => {
                return format(new Date(row.original.createdAt), "dd MMM yyyy", { locale: es })
            },
        },
        {
            accessorKey: "lastActive",
            header: "Última Actividad",
            cell: ({ row }) => {
                const lastActive = row.original.lastActive
                const isActive = lastActive === "Activo ahora"
                
                return (
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                            isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                        }`} />
                        <span className={`text-sm ${
                            isActive ? 'text-green-600 font-medium' : 'text-muted-foreground'
                        }`}>
                            {lastActive}
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: "permissions",
            header: "Permisos",
            cell: ({ row }) => {
                const permissions = row.original.permissions
                if (!permissions || permissions === "Sin permisos") {
                    return <span className="text-muted-foreground text-sm">Sin permisos</span>
                }
                const permissionList = permissions.split(", ")
                return (
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {permissionList.slice(0, 2).map((perm, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                                {perm}
                            </Badge>
                        ))}
                        {permissionList.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                                +{permissionList.length - 2} más
                            </Badge>
                        )}
                    </div>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original
                const isCurrentUser = user.id === currentUserId

                if (!permissions.canUpdate && !permissions.canDelete && !isCurrentUser) return null

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-8 w-8 p-0"
                            >
                                <IconDotsVertical className="h-4 w-4" />
                                <span className="sr-only">Abrir menú</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {(permissions.canUpdate || permissions.canDelete) && (
                                <>
                                    {permissions.canUpdate && (
                                        <>
                                            <EditUserDialog user={user} onSuccess={(updatedUser) => {
                                                setData(data.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
                                            }}>
                                                <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full">
                                                    <IconEdit className="mr-2 h-4 w-4" />
                                                    Editar
                                                </button>
                                            </EditUserDialog>

                                            <ResetPasswordDialog userId={user.id} userName={user.name}>
                                                <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full">
                                                    <IconKey className="mr-2 h-4 w-4" />
                                                    Restablecer Contraseña
                                                </button>
                                            </ResetPasswordDialog>

                                            {!isCurrentUser && (
                                                <DropdownMenuItem onClick={() => handleToggleStatus(user.id)}>
                                                    <IconPower className="mr-2 h-4 w-4" />
                                                    {user.emailVerified ? "Desactivar" : "Activar"}
                                                </DropdownMenuItem>
                                            )}
                                        </>
                                    )}

                                    {permissions.canDelete && !isCurrentUser && (
                                        <>
                                            {permissions.canUpdate && <DropdownMenuSeparator />}

                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => setDeleteUserId(user.id)}
                                            >
                                                <IconTrash className="mr-2 h-4 w-4" />
                                                Eliminar
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </>
                            )}

                            {isCurrentUser && (
                                <ResetPasswordDialog userId={user.id} userName={user.name}>
                                    <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full">
                                        <IconKey className="mr-2 h-4 w-4" />
                                        Cambiar mi Contraseña
                                    </button>
                                </ResetPasswordDialog>
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
                            placeholder="Buscar usuarios..."
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
                                        No se encontraron usuarios.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                        {table.getFilteredSelectedRowModel().rows.length} de{" "}
                        {table.getFilteredRowModel().rows.length} usuario(s) seleccionado(s).
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

            <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente
                            al usuario y todos sus datos asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (deleteUserId) {
                                    handleDeleteUser(deleteUserId)
                                    setDeleteUserId(null)
                                }
                            }}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}