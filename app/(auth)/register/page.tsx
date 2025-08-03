import { RegisterForm } from "@/components/auth/register-form"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function RegisterPage() {
    return (
        <Card>
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">Crear cuenta</CardTitle>
                <CardDescription className="text-center">
                    Ingresa tus datos para crear una nueva cuenta
                </CardDescription>
            </CardHeader>
            <RegisterForm />
            <div className="px-8 pb-8">
                <p className="text-center text-sm text-gray-600">
                    ¿Ya tienes cuenta?{" "}
                    <Link href="/login" className="text-blue-600 hover:underline">
                        Inicia sesión aquí
                    </Link>
                </p>
            </div>
        </Card>
    )
}