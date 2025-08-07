import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountInfo } from "@/components/settings/account-info"
import { ChangePasswordForm } from "@/components/settings/change-password-form"
import { User, Lock } from "lucide-react"

export default async function AccountPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  // Obtener datos completos del usuario
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      personalEmail: true,
      name: true,
      image: true,
      documentType: true,
      documentNumber: true,
      sex: true,
      studentCode: true,
      faculty: true,
      career: true,
      careerCode: true,
      enrollmentDate: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    }
  })

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-6 px-4 lg:px-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mi Cuenta</h1>
        <p className="text-muted-foreground">
          Gestiona tu información personal y seguridad
        </p>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Información</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Seguridad</span>
            <span className="sm:hidden">Seg.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Estos son tus datos registrados en el sistema. Algunos campos no pueden ser modificados por seguridad.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountInfo user={user} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cambiar Contraseña</CardTitle>
              <CardDescription>
                Actualiza tu contraseña regularmente para mantener tu cuenta segura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm userId={user.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}