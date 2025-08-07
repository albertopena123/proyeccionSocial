"use client"

import { Badge } from "@/components/ui/badge"
import { formatDatePeru, formatDateTimePeru } from "@/lib/date-utils"
import { AvatarUpload } from "@/components/settings/avatar-upload"
import { useRouter } from "next/navigation"
import { 
  User, 
  Mail, 
  Hash, 
  IdCard, 
  Building2, 
  GraduationCap, 
  Calendar, 
  Clock,
  Shield,
  CheckCircle
} from "lucide-react"

interface AccountInfoProps {
  user: {
    id: string
    email: string
    personalEmail: string | null
    name: string | null
    image: string | null
    documentType: string | null
    documentNumber: string | null
    sex: string | null
    studentCode: string | null
    faculty: string | null
    career: string | null
    careerCode: string | null
    enrollmentDate: string | null
    role: string
    isActive: boolean
    emailVerified: Date | null
    createdAt: Date
    updatedAt: Date
  }
}

export function AccountInfo({ user }: AccountInfoProps) {
  const router = useRouter()

  const handleImageUpdate = (newImage: string | null) => {
    // Refrescar la página para actualizar la imagen en el nav-user
    router.refresh()
  }

  const getSexLabel = (sex: string | null) => {
    if (!sex) return "No especificado"
    return sex === "M" ? "Masculino" : sex === "F" ? "Femenino" : sex
  }

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      SUPER_ADMIN: "Super Administrador",
      ADMIN: "Administrador",
      MODERATOR: "Moderador",
      USER: "Usuario"
    }
    return roles[role] || role
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: "destructive",
      ADMIN: "default",
      MODERATOR: "secondary",
      USER: "outline"
    }
    return colors[role] || "outline"
  }

  const InfoRow = ({ 
    icon: Icon, 
    label, 
    value, 
    badge = false 
  }: { 
    icon: React.ElementType
    label: string
    value: string | null
    badge?: boolean 
  }) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground mb-1 sm:mb-0 sm:w-1/3">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="sm:w-2/3">
        {badge && value ? (
          <Badge variant={getRoleBadgeColor(value) as "default" | "secondary" | "destructive" | "outline"}>
            {getRoleLabel(value)}
          </Badge>
        ) : (
          <span className="text-sm">{value || "No disponible"}</span>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Foto de Perfil */}
      <div>
        <AvatarUpload 
          currentImage={user.image}
          userName={user.name}
          userId={user.id}
          onImageUpdate={handleImageUpdate}
        />
      </div>

      {/* Información Personal */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Datos Personales</h3>
        <div className="bg-muted/50 rounded-lg p-4">
          <InfoRow icon={User} label="Nombre Completo" value={user.name} />
          <InfoRow icon={IdCard} label="Tipo de Documento" value={user.documentType} />
          <InfoRow icon={IdCard} label="Número de Documento" value={user.documentNumber} />
          <InfoRow icon={User} label="Sexo" value={getSexLabel(user.sex)} />
        </div>
      </div>

      {/* Información Académica */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Datos Académicos</h3>
        <div className="bg-muted/50 rounded-lg p-4">
          <InfoRow icon={Hash} label="Código de Estudiante" value={user.studentCode} />
          <InfoRow icon={Building2} label="Facultad" value={user.faculty} />
          <InfoRow icon={GraduationCap} label="Carrera" value={user.career} />
          <InfoRow icon={Hash} label="Código de Carrera" value={user.careerCode} />
          <InfoRow icon={Calendar} label="Periodo de Ingreso" value={user.enrollmentDate} />
        </div>
      </div>

      {/* Información de Contacto */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Datos de Contacto</h3>
        <div className="bg-muted/50 rounded-lg p-4">
          <InfoRow icon={Mail} label="Correo Institucional" value={user.email} />
          <InfoRow icon={Mail} label="Correo Personal" value={user.personalEmail} />
        </div>
      </div>

      {/* Información de la Cuenta */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Información de la Cuenta</h3>
        <div className="bg-muted/50 rounded-lg p-4">
          <InfoRow icon={Shield} label="Rol" value={user.role} badge={true} />
          <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 sm:mb-0 sm:w-1/3">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Estado</span>
            </div>
            <div className="sm:w-2/3">
              {user.isActive ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Activa
                </Badge>
              ) : (
                <Badge variant="destructive">
                  Inactiva
                </Badge>
              )}
            </div>
          </div>
          <InfoRow 
            icon={CheckCircle} 
            label="Email Verificado" 
            value={user.emailVerified ? formatDatePeru(user.emailVerified) : "No verificado"} 
          />
          <InfoRow icon={Calendar} label="Fecha de Registro" value={formatDatePeru(user.createdAt)} />
          <InfoRow icon={Clock} label="Última Actualización" value={formatDateTimePeru(user.updatedAt)} />
        </div>
      </div>

      {/* Nota informativa */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Nota:</strong> Si necesitas actualizar alguno de estos datos, 
          por favor contacta con el administrador del sistema o dirígete a la 
          oficina de registro académico.
        </p>
      </div>
    </div>
  )
}