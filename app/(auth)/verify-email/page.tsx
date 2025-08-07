"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react"
import Link from "next/link"

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get("token")
    
    const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">("loading")
    const [message, setMessage] = useState("")

    useEffect(() => {
        if (!token) {
            setStatus("no-token")
            return
        }

        const verifyEmail = async () => {
            try {
                const response = await fetch("/api/auth/verify-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                })

                const data = await response.json()

                if (response.ok) {
                    setStatus("success")
                    setMessage(data.message || "Tu cuenta ha sido activada exitosamente")
                    
                    // Redirigir al login después de 3 segundos
                    setTimeout(() => {
                        router.push("/login")
                    }, 3000)
                } else {
                    setStatus("error")
                    setMessage(data.error || "Error al verificar el email")
                }
            } catch (error) {
                setStatus("error")
                setMessage("Error de conexión. Por favor, intenta de nuevo.")
            }
        }

        verifyEmail()
    }, [token, router])

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Verificación de Email</CardTitle>
                <CardDescription>
                    {status === "loading" && "Verificando tu cuenta..."}
                    {status === "success" && "¡Verificación exitosa!"}
                    {status === "error" && "Error en la verificación"}
                    {status === "no-token" && "Token no válido"}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex justify-center">
                    {status === "loading" && (
                        <div className="text-center space-y-4">
                            <Loader2 className="h-16 w-16 animate-spin mx-auto text-blue-600" />
                            <p className="text-gray-600">Verificando tu cuenta, por favor espera...</p>
                        </div>
                    )}
                    
                    {status === "success" && (
                        <div className="text-center space-y-4">
                            <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
                            <div className="space-y-2">
                                <p className="text-green-600 font-semibold">{message}</p>
                                <p className="text-gray-600 text-sm">Serás redirigido al login en unos segundos...</p>
                            </div>
                        </div>
                    )}
                    
                    {status === "error" && (
                        <div className="text-center space-y-4">
                            <XCircle className="h-16 w-16 mx-auto text-red-600" />
                            <div className="space-y-2">
                                <p className="text-red-600 font-semibold">{message}</p>
                                <p className="text-gray-600 text-sm">
                                    El enlace puede haber expirado o ser inválido.
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {status === "no-token" && (
                        <div className="text-center space-y-4">
                            <Mail className="h-16 w-16 mx-auto text-gray-400" />
                            <div className="space-y-2">
                                <p className="text-gray-600 font-semibold">No se encontró token de verificación</p>
                                <p className="text-gray-600 text-sm">
                                    Asegúrate de usar el enlace completo del email.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {status === "success" && (
                        <Button 
                            className="w-full" 
                            onClick={() => router.push("/login")}
                        >
                            Ir al Login
                        </Button>
                    )}
                    
                    {(status === "error" || status === "no-token") && (
                        <>
                            <Button 
                                className="w-full" 
                                onClick={() => router.push("/register")}
                            >
                                Volver a Registrarse
                            </Button>
                            <Button 
                                variant="outline" 
                                className="w-full" 
                                onClick={() => router.push("/resend-verification")}
                            >
                                Reenviar Email de Verificación
                            </Button>
                        </>
                    )}
                </div>

                <div className="text-center text-sm text-gray-600">
                    ¿Necesitas ayuda?{" "}
                    <Link href="/support" className="text-blue-600 hover:underline">
                        Contacta soporte
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <Card className="w-full max-w-md mx-auto">
                <CardContent className="pt-6">
                    <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                </CardContent>
            </Card>
        }>
            <VerifyEmailContent />
        </Suspense>
    )
}