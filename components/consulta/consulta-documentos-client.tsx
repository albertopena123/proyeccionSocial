"use client"

import * as React from "react"
import { Search, FileText, Download, Calendar, User, Hash, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { formatDateShort } from "@/lib/date-utils"

interface Constancia {
  id: string
  constanciaNumber: string
  studentCode: string
  fullName: string
  dni: string
  year: number
  observation?: string | null
  fileName?: string | null
  fileUrl?: string | null
  status: string
  type: string
  createdAt: string
}

interface Resolucion {
  id: string
  numeroResolucion: string
  tipoResolucion: string
  modalidad: string
  tituloProyecto: string
  fechaResolucion: string
  nombreAsesor: string
  esFinanciado: boolean
  monto?: string | null
  status: string
  facultad: { nombre: string }
  departamento: { nombre: string }
  estudiantes: Array<{
    nombres: string
    apellidos: string
    codigo: string
    dni: string
  }>
  archivos?: Array<{
    id: string
    fileName: string
    fileUrl: string
    tipo?: string | null
  }>
}

export function ConsultaDocumentosClient() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)
  const [constancias, setConstancias] = React.useState<Constancia[]>([])
  const [resoluciones, setResoluciones] = React.useState<Resolucion[]>([])
  const [hasSearched, setHasSearched] = React.useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Por favor ingrese un término de búsqueda")
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const response = await fetch("/api/public/documentos/buscar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: searchQuery.trim() }),
      })

      if (!response.ok) {
        throw new Error("Error al buscar documentos")
      }

      const data = await response.json()
      setConstancias(data.constancias || [])
      setResoluciones(data.resoluciones || [])

      if (data.constancias.length === 0 && data.resoluciones.length === 0) {
        toast.info("No se encontraron documentos con los criterios de búsqueda")
      } else {
        toast.success(`Se encontraron ${data.constancias.length + data.resoluciones.length} documento(s)`)
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al buscar documentos")
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      PENDIENTE: { variant: "secondary", label: "Pendiente" },
      APROBADO: { variant: "default", label: "Aprobado" },
      RECHAZADO: { variant: "destructive", label: "Rechazado" },
      ANULADO: { variant: "outline", label: "Anulado" }
    }
    const config = statusConfig[status] || { variant: "outline", label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

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
      ACTIVIDAD: "Actividad",
      EXTERNOS: "Externos"
    }
    return labels[modalidad] || modalidad
  }

  const totalDocumentos = constancias.length + resoluciones.length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Barra de búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Búsqueda de Documentos</CardTitle>
          <CardDescription>
            Ingrese el nombre completo, código de estudiante o número de documento (DNI)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ej: Juan Pérez, 2020123456, 12345678"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-9"
                disabled={isSearching}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle>
              Resultados de la búsqueda
              {totalDocumentos > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({totalDocumentos} documento{totalDocumentos !== 1 ? 's' : ''} encontrado{totalDocumentos !== 1 ? 's' : ''})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalDocumentos === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No se encontraron documentos con los criterios de búsqueda
                </p>
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">
                    Todos ({totalDocumentos})
                  </TabsTrigger>
                  <TabsTrigger value="constancias">
                    Constancias ({constancias.length})
                  </TabsTrigger>
                  <TabsTrigger value="resoluciones">
                    Resoluciones ({resoluciones.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  {/* Mostrar constancias */}
                  {constancias.map((constancia) => (
                    <Card key={`constancia-${constancia.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              Constancia #{constancia.constanciaNumber}
                            </CardTitle>
                            <CardDescription className="mt-2 space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {constancia.fullName}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Hash className="h-4 w-4" />
                                  Código: {constancia.studentCode}
                                </span>
                                <span>DNI: {constancia.dni}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Año: {constancia.year} | Emitido: {formatDateShort(constancia.createdAt)}
                              </div>
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(constancia.status)}
                            {constancia.fileUrl && constancia.status === "APROBADO" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(constancia.fileUrl!, '_blank')}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Descargar
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {constancia.observation && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            <strong>Observación:</strong> {constancia.observation}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  ))}

                  {/* Mostrar resoluciones */}
                  {resoluciones.map((resolucion) => (
                    <Card key={`resolucion-${resolucion.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              Resolución #{resolucion.numeroResolucion}
                            </CardTitle>
                            <CardDescription className="mt-2 space-y-1">
                              <div className="font-medium text-foreground">
                                {resolucion.tituloProyecto}
                              </div>
                              <div className="flex items-center gap-4 flex-wrap">
                                <Badge variant="outline">
                                  {getTipoResolucionLabel(resolucion.tipoResolucion)}
                                </Badge>
                                <Badge variant="outline">
                                  {getModalidadLabel(resolucion.modalidad)}
                                </Badge>
                                {resolucion.esFinanciado && (
                                  <Badge variant="secondary">
                                    Financiado: S/. {resolucion.monto}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm">
                                <strong>Asesor:</strong> {resolucion.nombreAsesor}
                              </div>
                              <div className="text-sm">
                                <strong>Facultad:</strong> {resolucion.facultad.nombre} - {resolucion.departamento.nombre}
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Fecha: {formatDateShort(resolucion.fechaResolucion)}
                              </div>
                              {resolucion.estudiantes.length > 0 && (
                                <div className="text-sm">
                                  <strong>Estudiantes:</strong>{" "}
                                  {resolucion.estudiantes.map((est, idx) => (
                                    <span key={idx}>
                                      {est.apellidos} {est.nombres} ({est.codigo})
                                      {idx < resolucion.estudiantes.length - 1 ? ", " : ""}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(resolucion.status)}
                            {resolucion.archivos && resolucion.archivos.length > 0 && resolucion.status === "APROBADO" && (
                              <div className="flex flex-col gap-1">
                                {resolucion.archivos.map((archivo) => (
                                  <Button
                                    key={archivo.id}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(archivo.fileUrl, '_blank')}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    {archivo.tipo || "Descargar"}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="constancias" className="space-y-4">
                  {constancias.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No se encontraron constancias
                    </p>
                  ) : (
                    constancias.map((constancia) => (
                      <Card key={constancia.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Constancia #{constancia.constanciaNumber}
                              </CardTitle>
                              <CardDescription className="mt-2 space-y-1">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {constancia.fullName}
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="flex items-center gap-1">
                                    <Hash className="h-4 w-4" />
                                    Código: {constancia.studentCode}
                                  </span>
                                  <span>DNI: {constancia.dni}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  Año: {constancia.year} | Emitido: {formatDateShort(constancia.createdAt)}
                                </div>
                              </CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getStatusBadge(constancia.status)}
                              {constancia.fileUrl && constancia.status === "APROBADO" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(constancia.fileUrl!, '_blank')}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Descargar
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        {constancia.observation && (
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              <strong>Observación:</strong> {constancia.observation}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="resoluciones" className="space-y-4">
                  {resoluciones.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No se encontraron resoluciones
                    </p>
                  ) : (
                    resoluciones.map((resolucion) => (
                      <Card key={resolucion.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Resolución #{resolucion.numeroResolucion}
                              </CardTitle>
                              <CardDescription className="mt-2 space-y-1">
                                <div className="font-medium text-foreground">
                                  {resolucion.tituloProyecto}
                                </div>
                                <div className="flex items-center gap-4 flex-wrap">
                                  <Badge variant="outline">
                                    {getTipoResolucionLabel(resolucion.tipoResolucion)}
                                  </Badge>
                                  <Badge variant="outline">
                                    {getModalidadLabel(resolucion.modalidad)}
                                  </Badge>
                                  {resolucion.esFinanciado && (
                                    <Badge variant="secondary">
                                      Financiado: S/. {resolucion.monto}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm">
                                  <strong>Asesor:</strong> {resolucion.nombreAsesor}
                                </div>
                                <div className="text-sm">
                                  <strong>Facultad:</strong> {resolucion.facultad.nombre} - {resolucion.departamento.nombre}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  Fecha: {formatDateShort(resolucion.fechaResolucion)}
                                </div>
                                {resolucion.estudiantes.length > 0 && (
                                  <div className="text-sm">
                                    <strong>Estudiantes:</strong>{" "}
                                    {resolucion.estudiantes.map((est, idx) => (
                                      <span key={idx}>
                                        {est.apellidos} {est.nombres} ({est.codigo})
                                        {idx < resolucion.estudiantes.length - 1 ? ", " : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getStatusBadge(resolucion.status)}
                              {resolucion.archivos && resolucion.archivos.length > 0 && resolucion.status === "APROBADO" && (
                                <div className="flex flex-col gap-1">
                                  {resolucion.archivos.map((archivo) => (
                                    <Button
                                      key={archivo.id}
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(archivo.fileUrl, '_blank')}
                                    >
                                      <Download className="mr-2 h-4 w-4" />
                                      {archivo.tipo || "Descargar"}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}