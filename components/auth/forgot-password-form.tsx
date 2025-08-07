"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Mail, Loader2, ArrowRight, CheckCircle } from "lucide-react"

export function ForgotPasswordForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validateEmail = (email: string): boolean => {
    const regex = /^[a-zA-Z0-9._%+-]+@unamad\.edu\.pe$/
    return regex.test(email.toLowerCase())
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!email) {
      toast.error("Por favor, ingresa tu correo institucional")
      return
    }

    if (!validateEmail(email)) {
      toast.error("Debe ser un correo institucional @unamad.edu.pe")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          // Por seguridad, no revelamos si el email existe o no
          setIsSuccess(true)
        } else {
          toast.error("Error al procesar solicitud", {
            description: data.error || "Por favor, intenta de nuevo",
          })
        }
        return
      }

      setIsSuccess(true)
      toast.success("¡Correo enviado!", {
        description: "Revisa tu bandeja de entrada y sigue las instrucciones",
        duration: 5000,
      })

    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-lg">¡Revisa tu correo!</h3>
          <p className="text-sm text-gray-600">
            Si existe una cuenta con el correo <strong>{email}</strong>, 
            recibirás un enlace para restablecer tu contraseña.
          </p>
          <p className="text-sm text-gray-500">
            El enlace expirará en 1 hora por seguridad.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => {
              setIsSuccess(false)
              setEmail("")
            }}
            variant="outline"
            className="w-full"
          >
            Enviar a otro correo
          </Button>
          
          <Button
            onClick={() => router.push("/login")}
            className="w-full"
          >
            Volver al inicio de sesión
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500">
          ¿No recibiste el correo? Revisa tu carpeta de spam o 
          espera unos minutos antes de intentar nuevamente.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          Correo Institucional
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="tu.nombre@unamad.edu.pe"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 h-12"
            required
            disabled={isLoading}
            autoComplete="email"
          />
        </div>
        {email && !validateEmail(email) && (
          <p className="text-sm text-red-500">
            Debe ser un correo @unamad.edu.pe válido
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-200"
        disabled={isLoading || !email || !validateEmail(email)}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando instrucciones...
          </>
        ) : (
          <>
            Enviar instrucciones
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Ayuda</span>
        </div>
      </div>

      <div className="space-y-2 text-xs text-gray-500">
        <p>• El enlace se enviará a tu correo institucional</p>
        <p>• El enlace expirará en 1 hora</p>
        <p>• Si no recibes el correo, revisa tu carpeta de spam</p>
        <p>• Asegúrate de que tu cuenta esté activa</p>
      </div>
    </form>
  )
}