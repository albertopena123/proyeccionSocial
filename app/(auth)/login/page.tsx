import { LoginForm } from "@/components/auth/login-form"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Suspense } from "react"

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <div className="w-full max-w-md">
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="space-y-2 pb-6">
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                </svg>
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-center text-gray-900">Iniciar sesión</CardTitle>
                        <CardDescription className="text-center text-gray-600">
                            Ingresa tus credenciales para acceder a tu cuenta
                        </CardDescription>
                    </CardHeader>

                    <Suspense
                        fallback={
                            <CardContent>
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    <span className="ml-2 text-gray-600">Cargando...</span>
                                </div>
                            </CardContent>
                        }
                    >
                        <LoginForm />
                    </Suspense>

                    <div className="px-6 pb-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-gray-500">o</span>
                            </div>
                        </div>

                        <p className="text-center text-sm text-gray-600 mt-4">
                            ¿No tienes cuenta?{" "}
                            <Link
                                href="/register"
                                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                            >
                                Regístrate aquí
                            </Link>
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    )
}
