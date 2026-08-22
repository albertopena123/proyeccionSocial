"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

    // Colores por tokens del tema, no grises/azules cableados: el formulario
    // vive sobre bg-background (funciona en claro y oscuro) y el acento es el
    // magenta institucional, como en el resto del sitio.
    return (
        <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                    <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        id="email"
                        type="email"
                        placeholder="tu@unamad.edu.pe"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-12 pl-10"
                        required
                        disabled={isLoading}
                        autoComplete="email"
                        autoFocus
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                    <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="h-12 pr-10 pl-10"
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-0 right-0 h-12 px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                    >
                        {showPassword ? (
                            <EyeOff className="text-muted-foreground size-4" />
                        ) : (
                            <Eye className="text-muted-foreground size-4" />
                        )}
                        <span className="sr-only">
                            {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        </span>
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <input
                        id="remember"
                        name="remember"
                        type="checkbox"
                        checked={formData.remember}
                        onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                        className="accent-brand border-border size-4 rounded"
                        disabled={isLoading}
                    />
                    <Label htmlFor="remember" className="text-muted-foreground font-normal">
                        Recordarme
                    </Label>
                </div>
                <Link
                    href="/forgot-password"
                    className="text-brand hover:text-brand-hover text-sm font-medium transition-colors hover:underline"
                >
                    ¿Olvidaste tu contraseña?
                </Link>
            </div>

            <Button
                type="submit"
                className="bg-brand text-brand-foreground hover:bg-brand-hover h-12 w-full text-base font-semibold"
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Iniciando sesión...
                    </>
                ) : (
                    "Iniciar sesión"
                )}
            </Button>
        </form>
    )
}
