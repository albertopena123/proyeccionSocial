import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"
import { ConstanciasPageClient } from "@/components/documents/constancias-page-client"

export default async function ConstanciasPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // Verificar permisos
    const canRead = await hasPermission(session.user.id, "constancias.access", PermissionAction.READ)

    if (!canRead) {
        redirect("/dashboard")
    }

    // Verificar permisos específicos
    const permissions = {
        canCreate: await hasPermission(session.user.id, "constancias.access", PermissionAction.CREATE),
        canUpdate: await hasPermission(session.user.id, "constancias.access", PermissionAction.UPDATE),
        canDelete: await hasPermission(session.user.id, "constancias.access", PermissionAction.DELETE),
        canExport: await hasPermission(session.user.id, "constancias.access", PermissionAction.EXPORT),
        canRead
    }

    // Obtener constancias
    const constancias = await prisma.constancia.findMany({
        include: {
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

    return (
        <ConstanciasPageClient
            initialData={constancias}
            permissions={permissions}
            currentUserId={session.user.id}
            currentUserRole={session.user.role}
        />
    )
}