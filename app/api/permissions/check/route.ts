import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"

export async function POST(request: Request) {
    try {
        const session = await auth()
        
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { permissionCode, action } = await request.json()

        if (!permissionCode) {
            return new NextResponse("Permission code is required", { status: 400 })
        }

        const hasAccess = await hasPermission(
            session.user.id, 
            permissionCode,
            action as PermissionAction | undefined
        )

        return NextResponse.json({ hasPermission: hasAccess })
    } catch (error) {
        console.error("[PERMISSION_CHECK]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}