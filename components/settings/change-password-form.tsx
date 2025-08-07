"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Lock, Loader2, Eye, EyeOff, Check, X, CheckCircle } from "lucide-react"

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

interface ChangePasswordFormProps {
  userId: string
}

export function ChangePasswordForm({ userId }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword])
  const passwordsMatch = useMemo(
    () => newPassword && confirmPassword && newPassword === confirmPassword,
    [newPassword, confirmPassword]
  )

  const validations = useMemo(() =>
    VALIDATION_RULES.map(rule => ({
      ...rule,
      valid: rule.test(newPassword)
    })),
    [newPassword]
  )

  const isFormValid = currentPassword && validations[0].valid && passwordsMatch

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isFormValid) {
      toast.error("Por favor, completa todos los campos correctamente")
      return
    }

    if (currentPassword === newPassword) {
      toast.error("La nueva contraseña debe ser diferente a la actual")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId,
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Contraseña incorrecta", {
            description: "La contraseña actual no es correcta",
          })
        } else {
          toast.error("Error al cambiar contraseña", {
            description: data.error || "Por favor, intenta de nuevo",
          })
        }
        return
      }

      setIsSuccess(true)
      toast.success("¡Contraseña actualizada!", {
        description: "Tu contraseña ha sido cambiada exitosamente",
        duration: 5000,
      })

      // Limpiar el formulario
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => {
        setIsSuccess(false)
      }, 5000)

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
          <h3 className="font-semibold text-lg">¡Contraseña actualizada!</h3>
          <p className="text-sm text-gray-600">
            Tu contraseña ha sido cambiada exitosamente.
          </p>
        </div>

        <Button
          onClick={() => setIsSuccess(false)}
          variant="outline"
          className="w-full"
        >
          Cambiar contraseña nuevamente
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contraseña actual */}
      <div className="space-y-2">
        <Label htmlFor="currentPassword" className="text-sm font-medium">
          Contraseña Actual
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="currentPassword"
            type={showCurrent ? "text" : "password"}
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="pl-10 pr-10 h-12"
            required
            disabled={isLoading}
            autoComplete="current-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
            onClick={() => setShowCurrent(!showCurrent)}
            disabled={isLoading}
          >
            {showCurrent ? 
              <EyeOff className="h-4 w-4 text-gray-400" /> : 
              <Eye className="h-4 w-4 text-gray-400" />
            }
          </Button>
        </div>
      </div>

      {/* Nueva contraseña */}
      <div className="space-y-2">
        <Label htmlFor="newPassword" className="text-sm font-medium">
          Nueva Contraseña
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="newPassword"
            type={showNew ? "text" : "password"}
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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
            onClick={() => setShowNew(!showNew)}
            disabled={isLoading}
          >
            {showNew ? 
              <EyeOff className="h-4 w-4 text-gray-400" /> : 
              <Eye className="h-4 w-4 text-gray-400" />
            }
          </Button>
        </div>

        {/* Indicador de fortaleza */}
        {newPassword && (
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
        <Label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirmar Nueva Contraseña
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
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
            onClick={() => setShowConfirm(!showConfirm)}
            disabled={isLoading}
          >
            {showConfirm ? 
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

      {/* Nota de seguridad */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-xs text-amber-800 dark:text-amber-200">
          <strong>Tip de seguridad:</strong> Usa una contraseña única que no uses en otros sitios. 
          Considera usar un gestor de contraseñas.
        </p>
      </div>

      <Button
        type="submit"
        className="w-full h-12"
        disabled={isLoading || !isFormValid}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cambiando contraseña...
          </>
        ) : (
          "Cambiar contraseña"
        )}
      </Button>
    </form>
  )
}