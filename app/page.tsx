import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Bienvenido</h1>
        <p className="text-gray-600">Sistema de autenticación con Next.js 14</p>
        <div className="space-x-4">
          <Link href="/login">
            <Button>Iniciar sesión</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline">Crear cuenta</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}