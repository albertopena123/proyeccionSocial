"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Eye, EyeOff, Mail, Lock, User, Loader2, Check, X } from "lucide-react"
import Link from "next/link"

// Tipos
interface PasswordStrength {
    score: number
    label: string
    color: string
}

interface FormData {
    name: string
    email: string
    password: string
    confirmPassword: string
}

// Constantes
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

// Componente reutilizable para el botón de mostrar/ocultar contraseña
const PasswordToggle = ({ show, onToggle, disabled }: {
    show: boolean;
    onToggle: () => void;
    disabled?: boolean
}) => (
    <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
        onClick={onToggle}
        disabled={disabled}
    >
        {show ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
        <span className="sr-only">{show ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
    </Button>
)

// Componente para indicador de validación
const ValidationIndicator = ({ valid, label }: { valid: boolean; label: string }) => (
    <div className={`flex items-center space-x-1 ${valid ? "text-green-600" : "text-gray-400"}`}>
        {valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
        <span>{label}</span>
    </div>
)

// Función para evaluar la fortaleza de la contraseña
const getPasswordStrength = (password: string): PasswordStrength => {
    const score = VALIDATION_RULES.filter(rule => rule.test(password)).length + (password.length >= 8 ? 1 : 0)
    return PASSWORD_STRENGTHS[Math.min(score, PASSWORD_STRENGTHS.length - 1)]
}

export function RegisterForm() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [acceptTerms, setAcceptTerms] = useState(false)
    const [formData, setFormData] = useState<FormData>({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    })

    // Cálculos memoizados
    const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password])
    const passwordsMatch = useMemo(
        () => formData.password && formData.confirmPassword && formData.password === formData.confirmPassword,
        [formData.password, formData.confirmPassword]
    )

    const validations = useMemo(() =>
        VALIDATION_RULES.map(rule => ({
            ...rule,
            valid: rule.test(formData.password)
        })),
        [formData.password]
    )

    const isFormValid = useMemo(
        () => acceptTerms && validations[0].valid && passwordsMatch,
        [acceptTerms, validations, passwordsMatch]
    )

    // Manejador de cambios en el formulario
    const handleInputChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }))
    }

    // Envío del formulario
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!isFormValid) {
            toast.error(!acceptTerms
                ? "Debes aceptar los términos y condiciones"
                : "Por favor, completa todos los campos correctamente"
            )
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email.toLowerCase().trim(),
                    password: formData.password,
                    name: formData.name.trim(),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Error al registrar")
            }

            toast.success("¡Cuenta creada exitosamente!", {
                description: "Ahora puedes iniciar sesión con tus credenciales",
            })

            setTimeout(() => router.push("/login"), 1000)
        } catch (error) {
            toast.error("Error al crear cuenta", {
                description: error instanceof Error ? error.message : "Por favor, intenta de nuevo",
            })
        } finally {
            setIsLoading(false)
        }
    }

    // Configuración de campos del formulario
    const inputFields = [
        {
            id: "name",
            type: "text",
            label: "Nombre completo",
            placeholder: "Juan Pérez",
            icon: User,
            value: formData.name,
            onChange: handleInputChange('name'),
            autoComplete: "name",
            autoFocus: true,
        },
        {
            id: "email",
            type: "email",
            label: "Correo electrónico",
            placeholder: "tu@ejemplo.com",
            icon: Mail,
            value: formData.email,
            onChange: handleInputChange('email'),
            autoComplete: "email",
        },
    ]

    const baseInputClass = "pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"

    return (
        <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campos básicos */}
                {inputFields.map(field => (
                    <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id} className="text-sm font-medium text-gray-700">
                            {field.label}
                        </Label>
                        <div className="relative">
                            <field.icon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                {...field}
                                className={baseInputClass}
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                ))}

                {/* Campo de contraseña */}
                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Contraseña
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleInputChange('password')}
                            className={`${baseInputClass} pr-10`}
                            required
                            disabled={isLoading}
                            autoComplete="new-password"
                        />
                        <PasswordToggle
                            show={showPassword}
                            onToggle={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Indicador de fortaleza y validaciones */}
                    {formData.password && (
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

                            <div className="grid grid-cols-2 gap-1 text-xs">
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

                {/* Campo de confirmación de contraseña */}
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        Confirmar contraseña
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleInputChange('confirmPassword')}
                            className={`${baseInputClass} pr-10 ${formData.confirmPassword && !passwordsMatch
                                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                    : ""
                                }`}
                            required
                            disabled={isLoading}
                            autoComplete="new-password"
                        />
                        <PasswordToggle
                            show={showConfirmPassword}
                            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={isLoading}
                        />
                    </div>

                    {formData.confirmPassword && (
                        <ValidationIndicator
                            valid={!!passwordsMatch}
                            label={passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                        />
                    )}
                </div>

                {/* Términos y condiciones - Opción 1: Más compacto */}
                <div className="flex items-start space-x-2">
                    <input
                        id="terms"
                        name="terms"
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                        disabled={isLoading}
                    />
                    <Label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
                        Acepto los{" "}
                        <Link href="/terms" className="text-blue-600 hover:text-blue-500 underline underline-offset-2">
                            términos
                        </Link>
                        {" y "}
                        <Link href="/privacy" className="text-blue-600 hover:text-blue-500 underline underline-offset-2">
                            políticas
                        </Link>
                        {" de uso"}
                    </Label>
                </div>

                {/* Botón de envío */}
                <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-200 transform hover:scale-[1.02]"
                    disabled={isLoading || !acceptTerms}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creando cuenta...
                        </>
                    ) : (
                        "Crear cuenta"
                    )}
                </Button>


            </form>
        </CardContent>
    )
}