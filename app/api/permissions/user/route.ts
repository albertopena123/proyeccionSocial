import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { getUserPermissions } from "@/lib/services/permissions/permissions.service"

export async function GET() {
    try {
        const session = await auth()
        
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const permissions = await getUserPermissions(session.user.id)

        return NextResponse.json({ permissions })
    } catch (error) {
        console.error("[USER_PERMISSIONS]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}