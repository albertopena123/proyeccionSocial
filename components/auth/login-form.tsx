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

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">o continúa con</span>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-gray-200 hover:bg-gray-50 transition-colors duration-200 bg-transparent"
                    onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                    disabled={isLoading}
                >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Conectando...
                        </>
                    ) : (
                        "Google"
                    )}
                </Button>
            </form>
        </CardContent>
    )
}
