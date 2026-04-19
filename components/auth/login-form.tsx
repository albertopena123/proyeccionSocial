"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react"
import Link from "next/link"

export function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        remember: false,
    })

    // Detectar errores en la URL
    const urlError = searchParams.get("error")

    // Mostrar error de URL cuando cambie
    useEffect(() => {
        if (urlError) {
            const errorMessages: Record<string, string> = {
                Configuration: "Error de configuración del servidor",
                CredentialsSignin: "Email o contraseña incorrectos",
                OAuthAccountNotLinked: "Esta cuenta ya existe con otro método de inicio de sesión",
                Default: "Error al iniciar sesión",
            }
            const message = errorMessages[urlError] || errorMessages["Default"]
            toast.error(message, {
                id: `url-error-${urlError}`, // ID único para evitar duplicados
            })
        }
    }, [urlError])

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)

        try {
            const result = await signIn("credentials", {
                email: formData.email.toLowerCase().trim(),
                password: formData.password,
                redirect: false,
                callbackUrl: "/dashboard",
            })

            if (result?.error) {
                // Manejar diferentes tipos de errores
                if (result.error === "CredentialsSignin" || result.error.includes("Credenciales")) {
                    toast.error("Email o contraseña incorrectos", {
                        description: "Por favor, verifica tus credenciales",
                    })
                } else {
                    toast.error("Error al iniciar sesión", {
                        description: "Por favor, intenta de nuevo",
                    })
                }
            } else if (result?.ok) {
                toast.success("¡Bienvenido!", {
                    description: "Iniciando sesión...",
                })
                // Pequeño delay para mostrar el mensaje
                setTimeout(() => {
                    router.push("/dashboard")
                    router.refresh()
                }, 500)
            }
        } catch (error) {
            console.error("Error inesperado:", error)
            toast.error("Error inesperado", {
                description: "Algo salió mal. Intenta de nuevo.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <CardContent className="space-y-6">
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Correo electrónico
                    </Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="tu@ejemplo.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            required
                            disabled={isLoading}
                            autoComplete="email"
                            autoFocus
                        />
                    </div>
                </div>

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
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            required
                            disabled={isLoading}
                            autoComplete="current-password"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                            <span className="sr-only">{showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <input
                            id="remember"
                            name="remember"
                            type="checkbox"
                            checked={formData.remember}
                            onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            disabled={isLoading}
                        />
                        <Label htmlFor="remember" className="text-sm text-gray-600">
                            Recordarme
                        </Label>
                    </div>
                    <Link
                        href="/forgot-password"
                        className="text-sm text-blue-600 hover:text-blue-500 transition-colors duration-200"
                    >
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-200 transform hover:scale-[1.02]"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Iniciando sesión...
                        </>
                    ) : (
                        "Iniciar sesión"
                    )}
                </Button>
            </form>
        </CardContent>
    )
}
