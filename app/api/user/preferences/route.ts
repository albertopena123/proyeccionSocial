// app/api/user/preferences/route.ts
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const { userId, preferences } = await request.json()
        
        // Verificar que el usuario solo puede actualizar sus propias preferencias
        if (userId !== session.user.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 })
        }

        // Buscar preferencias existentes
        const existing = await prisma.userPreferences.findUnique({
            where: { userId }
        })

        if (existing) {
            // Actualizar
            await prisma.userPreferences.update({
                where: { userId },
                data: preferences
            })
        } else {
            // Crear nuevas
            await prisma.userPreferences.create({
                data: {
                    userId,
                    ...preferences
                }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error guardando preferencias:", error)
        return NextResponse.json(
            { error: "Error al guardar preferencias" }, 
            { status: 500 }
        )
    }
}