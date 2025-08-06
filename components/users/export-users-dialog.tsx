"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { IconDownload, IconFileTypeCsv, IconFileTypePdf, IconJson } from "@tabler/icons-react"
import { toast } from "sonner"

interface User {
    id: string
    name?: string | null
    email?: string | null
    role?: string
    emailVerified?: Date | null
    createdAt?: Date
    lastActive?: Date | null | string
    permissions?: string[] | string
    image?: string | null
    [key: string]: unknown
}

interface ExportUsersDialogProps {
    children: React.ReactNode
    data: User[]
}

type ExportFormat = "csv" | "json" | "pdf"

export function ExportUsersDialog({ children, data }: ExportUsersDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [format, setFormat] = React.useState<ExportFormat>("csv")
    const [selectedColumns, setSelectedColumns] = React.useState<string[]>([
        "name", "email", "role", "createdAt"
    ])

    const availableColumns = [
        { id: "name", label: "Nombre" },
        { id: "email", label: "Email" },
        { id: "role", label: "Rol" },
        { id: "emailVerified", label: "Email Verificado" },
        { id: "createdAt", label: "Fecha de Registro" },
        { id: "lastActive", label: "Última Actividad" },
        { id: "permissions", label: "Permisos" }
    ]

    const handleColumnToggle = (columnId: string) => {
        setSelectedColumns(prev =>
            prev.includes(columnId)
                ? prev.filter(id => id !== columnId)
                : [...prev, columnId]
        )
    }

    const exportToCSV = () => {
        // Crear encabezados
        const headers = selectedColumns
            .map(col => availableColumns.find(c => c.id === col)?.label || col)
            .join(",")

        // Crear filas
        const rows = data.map(user => {
            return selectedColumns.map(col => {
                const value = user[col]
                // Escapar valores que contengan comas
                if (typeof value === "string" && value.includes(",")) {
                    return `"${value}"`
                }
                // Formatear fechas
                if (col === "createdAt" && value) {
                    return new Date(value as string | number | Date).toLocaleDateString("es-ES")
                }
                // Formatear booleanos
                if (col === "emailVerified") {
                    return value ? "Sí" : "No"
                }
                return value || ""
            }).join(",")
        }).join("\n")

        // Crear el contenido del archivo
        const csvContent = `${headers}\n${rows}`

        // Crear blob y descargar
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `usuarios_${new Date().toISOString().split("T")[0]}.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const exportToJSON = () => {
        // Filtrar solo las columnas seleccionadas
        const filteredData = data.map(user => {
            const filteredUser: Record<string, unknown> = {}
            selectedColumns.forEach(col => {
                filteredUser[col] = user[col]
            })
            return filteredUser
        })

        const jsonContent = JSON.stringify(filteredData, null, 2)

        const blob = new Blob([jsonContent], { type: "application/json" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `usuarios_${new Date().toISOString().split("T")[0]}.json`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const exportToPDF = () => {
        // Para PDF necesitaríamos una librería como jsPDF
        // Por ahora mostramos un mensaje
        toast.info("La exportación a PDF estará disponible próximamente")
    }

    const handleExport = () => {
        if (selectedColumns.length === 0) {
            toast.error("Selecciona al menos una columna para exportar")
            return
        }

        switch (format) {
            case "csv":
                exportToCSV()
                toast.success("Archivo CSV descargado exitosamente")
                break
            case "json":
                exportToJSON()
                toast.success("Archivo JSON descargado exitosamente")
                break
            case "pdf":
                exportToPDF()
                break
        }

        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Exportar Usuarios</DialogTitle>
                    <DialogDescription>
                        Selecciona el formato y las columnas que deseas exportar
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Formato de exportación */}
                    <div className="space-y-3">
                        <Label>Formato de exportación</Label>
                        <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="csv" id="csv" />
                                <label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                                    <IconFileTypeCsv className="h-4 w-4" />
                                    CSV (Excel, Google Sheets)
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="json" id="json" />
                                <label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                                    <IconJson className="h-4 w-4" />
                                    JSON (Desarrollo, APIs)
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="pdf" id="pdf" disabled />
                                <label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer opacity-50">
                                    <IconFileTypePdf className="h-4 w-4" />
                                    PDF (Próximamente)
                                </label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Columnas a exportar */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Columnas a exportar</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    if (selectedColumns.length === availableColumns.length) {
                                        setSelectedColumns([])
                                    } else {
                                        setSelectedColumns(availableColumns.map(c => c.id))
                                    }
                                }}
                            >
                                {selectedColumns.length === availableColumns.length ? "Deseleccionar todo" : "Seleccionar todo"}
                            </Button>
                        </div>
                        <div className="space-y-2 border rounded-lg p-3 max-h-[200px] overflow-y-auto">
                            {availableColumns.map((column) => (
                                <div key={column.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={column.id}
                                        checked={selectedColumns.includes(column.id)}
                                        onCheckedChange={() => handleColumnToggle(column.id)}
                                    />
                                    <label
                                        htmlFor={column.id}
                                        className="text-sm cursor-pointer select-none flex-1"
                                    >
                                        {column.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Información */}
                    <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        Se exportarán {data.length} usuario(s) con {selectedColumns.length} columna(s) seleccionada(s)
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleExport} disabled={selectedColumns.length === 0}>
                        <IconDownload className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}