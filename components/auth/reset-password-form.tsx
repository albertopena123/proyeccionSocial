"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Lock, Loader2, Eye, EyeOff, Check, X, CheckCircle, XCircle } from "lucide-react"

interface PasswordStrength {
  score: number
  label: string
  color: string
}

const PASSWORD_STRENGTHS: PasswordStrength[] = [
  { score: 0, label: "Muy débil", color: "bg-red-500" },
  { score: 1, label: "Débil", color: "bg-red-400" },
  { score: 2, label: "Regular", color: "bg-yellow-500" },
  { score: 3, label: "Buena", color: "bg-blue-500" },
  { score: 4, label: "Fuerte", color: "bg-green-500" },
  { score: 5, label: "Muy fuerte", color: "bg-green-600" },
]

const VALIDATION_RULES = [
  { key: 'minLength', test: (pwd: string) => pwd.length >= 8, label: '8+ caracteres' },
  { key: 'hasUppercase', test: (pwd: string) => /[A-Z]/.test(pwd), label: 'Mayúscula' },
  { key: 'hasLowercase', test: (pwd: string) => /[a-z]/.test(pwd), label: 'Minúscula' },
  { key: 'hasNumber', test: (pwd: string) => /[0-9]/.test(pwd), label: 'Número' },
]

const ValidationIndicator = ({ valid, label }: { valid: boolean; label: string }) => (
  <div className={`flex items-center space-x-1 ${valid ? "text-green-600" : "text-gray-400"}`}>
    {valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
    <span className="text-xs">{label}</span>
  </div>
)

const getPasswordStrength = (password: string): PasswordStrength => {
  const score = VALIDATION_RULES.filter(rule => rule.test(password)).length + (password.length >= 8 ? 1 : 0)
  return PASSWORD_STRENGTHS[Math.min(score, PASSWORD_STRENGTHS.length - 1)]
}

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isInvalidToken, setIsInvalidToken] = useState(false)

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const passwordsMatch = useMemo(
    () => password && confirmPassword && password === confirmPassword,
    [password, confirmPassword]
  )

  const validations = useMemo(() =>
    VALIDATION_RULES.map(rule => ({
      ...rule,
      valid: rule.test(password)
    })),
    [password]
  )

  const isFormValid = validations[0].valid && passwordsMatch

  useEffect(() => {
    if (!token) {
      setIsInvalidToken(true)
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!token) {
      toast.error("Token inválido", {
        description: "El enlace de recuperación no es válido",
      })
      return
    }

    if (!isFormValid) {
      toast.error("Por favor, completa todos los requisitos de la contraseña")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 400 && data.error?.includes("expirado")) {
          setIsInvalidToken(true)
          toast.error("Enlace expirado", {
            description: "Este enlace ha expirado. Por favor, solicita uno nuevo.",
          })
        } else if (response.status === 404) {
          setIsInvalidToken(true)
          toast.error("Enlace inválido", {
            description: "Este enlace no es válido o ya fue utilizado.",
          })
        } else {
          toast.error("Error al restablecer contraseña", {
            description: data.error || "Por favor, intenta de nuevo",
          })
        }
        return
      }

      setIsSuccess(true)
      toast.success("¡Contraseña actualizada!", {
        description: "Tu contraseña ha sido restablecida exitosamente",
        duration: 5000,
      })

      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push("/login")
      }, 3000)

    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servidor",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isInvalidToken) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-lg">Enlace inválido o expirado</h3>
          <p className="text-sm text-gray-600">
            Este enlace de recuperación no es válido o ha expirado.
          </p>
          <p className="text-sm text-gray-500">
            Los enlaces expiran después de 1 hora por seguridad.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => router.push("/forgot-password")}
            className="w-full"
          >
            Solicitar nuevo enlace
          </Button>
          
          <Button
            onClick={() => router.push("/login")}
            variant="outline"
            className="w-full"
          >
            Volver al inicio de sesión
          </Button>
        </div>
      </div>
    )
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
          <h3 className="font-semibold text-lg">¡Contraseña actualizada!</h3>
          <p className="text-sm text-gray-600">
            Tu contraseña ha sido restablecida exitosamente.
          </p>
          <p className="text-sm text-gray-500">
            Serás redirigido al inicio de sesión...
          </p>
        </div>

        <Button
          onClick={() => router.push("/login")}
          className="w-full"
        >
          Ir al inicio de sesión
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nueva contraseña */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
          Nueva contraseña
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10 h-12"
            required
            disabled={isLoading}
            autoComplete="new-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            {showPassword ? 
              <EyeOff className="h-4 w-4 text-gray-400" /> : 
              <Eye className="h-4 w-4 text-gray-400" />
            }
          </Button>
        </div>

        {/* Indicador de fortaleza */}
        {password && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                  style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600">{passwordStrength.label}</span>
            </div>

            <div className="grid grid-cols-2 gap-1">
              {validations.map(validation => (
                <ValidationIndicator
                  key={validation.key}
                  valid={validation.valid}
                  label={validation.label}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmar contraseña */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
          Confirmar nueva contraseña
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`pl-10 pr-10 h-12 ${
              confirmPassword && !passwordsMatch
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
            required
            disabled={isLoading}
            autoComplete="new-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={isLoading}
          >
            {showConfirmPassword ? 
              <EyeOff className="h-4 w-4 text-gray-400" /> : 
              <Eye className="h-4 w-4 text-gray-400" />
            }
          </Button>
        </div>

        {confirmPassword && (
          <ValidationIndicator
            valid={!!passwordsMatch}
            label={passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
          />
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-200"
        disabled={isLoading || !isFormValid}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Restableciendo contraseña...
          </>
        ) : (
          "Restablecer contraseña"
        )}
      </Button>
    </form>
  )
}