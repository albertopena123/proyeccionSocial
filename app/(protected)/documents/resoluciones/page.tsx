import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"
import { ResolucionesPageClient } from "@/components/documents/resoluciones-page-client"

export default async function ResolucionesPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // Verificar permisos
    const canRead = await hasPermission(session.user.id, "resoluciones.access", PermissionAction.READ)

    if (!canRead) {
        redirect("/dashboard")
    }

    // Verificar permisos específicos
    const permissions = {
        canCreate: await hasPermission(session.user.id, "resoluciones.access", PermissionAction.CREATE),
        canUpdate: await hasPermission(session.user.id, "resoluciones.access", PermissionAction.UPDATE),
        canDelete: await hasPermission(session.user.id, "resoluciones.access", PermissionAction.DELETE),
        canExport: await hasPermission(session.user.id, "resoluciones.access", PermissionAction.EXPORT),
        canRead
    }

    // Obtener resoluciones con relaciones
    const resoluciones = await prisma.resolucion.findMany({
        include: {
            facultad: true,
            departamento: true,
            docentes: true,
            estudiantes: true,
            archivos: true, // Incluir archivos relacionados
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            approvedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    // Convertir Decimal a string para serialización
    const resolucionesSerializables = resoluciones.map(res => ({
        ...res,
        monto: res.monto ? res.monto.toString() : null
    }))

    // Obtener facultades para el formulario
    const facultades = await prisma.facultad.findMany({
        where: { isActive: true },
        include: {
            departamentos: {
                where: { isActive: true }
            }
        },
        orderBy: {
            nombre: 'asc'
        }
    })

    // Convertir facultades para la tabla
    const facultadesParaTabla = facultades.map(f => ({
        id: f.id.toString(),
        nombre: f.nombre
    }))

    return (
        <ResolucionesPageClient
            initialData={resolucionesSerializables}
            permissions={permissions}
            currentUserId={session.user.id}
            currentUserRole={session.user.role}
            facultades={facultades}
            facultadesParaTabla={facultadesParaTabla}
        />
    )
}