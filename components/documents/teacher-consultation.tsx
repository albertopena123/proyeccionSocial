"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Search, User, Building, Mail, Phone, CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface TeacherData {
  dni: string
  nombres: string
  apellidos: string
  nombreCompleto: string
  facultad: string
  departamento: string
  categoria: string
  regimen: string
  email: string
  telefono: string
  activo: boolean
}

export function TeacherConsultation() {
  const [dni, setDni] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null)

  const handleConsult = async () => {
    if (!dni || dni.length !== 8) {
      setError("Por favor ingrese un DNI válido de 8 dígitos")
      return
    }

    setLoading(true)
    setError(null)
    setTeacherData(null)

    try {
      const response = await fetch("/api/teacher/consult", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dni }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al consultar docente")
      }

      const data = await response.json()
      setTeacherData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al consultar la información")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleConsult()
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Consulta de Docente</CardTitle>
          <CardDescription>
            Ingrese el DNI del docente para consultar su información
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="dni" className="sr-only">
                DNI del Docente
              </Label>
              <Input
                id="dni"
                type="text"
                placeholder="Ingrese DNI (8 dígitos)"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleConsult}
              disabled={loading || !dni}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Consultar
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {teacherData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Información del Docente</span>
              <Badge variant={teacherData.activo ? "default" : "secondary"}>
                {teacherData.activo ? (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Activo
                  </>
                ) : (
                  <>
                    <XCircle className="mr-1 h-3 w-3" />
                    Inactivo
                  </>
                )}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Nombre Completo</p>
                    <p className="text-sm text-muted-foreground">{teacherData.nombreCompleto}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Building className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Facultad</p>
                    <p className="text-sm text-muted-foreground">{teacherData.facultad}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Building className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Departamento</p>
                    <p className="text-sm text-muted-foreground">{teacherData.departamento}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{teacherData.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Teléfono</p>
                    <p className="text-sm text-muted-foreground">{teacherData.telefono}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm font-medium">Categoría</p>
                    <Badge variant="outline" className="mt-1">
                      {teacherData.categoria}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Régimen</p>
                    <Badge variant="outline" className="mt-1">
                      {teacherData.regimen}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}