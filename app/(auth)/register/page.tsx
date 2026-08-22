import { RegisterForm } from "@/components/auth/register-form"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function RegisterPage() {
    // El centrado que antes ponía el layout de auth vive ahora en cada página.
    return (
        <div className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md">
        <Card>
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">Crear cuenta</CardTitle>
                <CardDescription className="text-center">
                    Ingresa tus datos para crear una nueva cuenta
                </CardDescription>
            </CardHeader>
            <RegisterForm />
            <div className="px-8 pb-8">
                <p className="text-muted-foreground text-center text-sm">
                    ¿Ya tienes cuenta?{" "}
                    <Link href="/login" className="text-brand hover:text-brand-hover font-medium hover:underline">
                        Inicia sesión aquí
                    </Link>
                </p>
            </div>
        </Card>
            </div>
        </div>
    )
}