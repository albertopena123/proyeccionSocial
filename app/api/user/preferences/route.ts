// app/api/user/preferences/route.ts
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

// Antes el objeto `preferences` iba tal cual a Prisma: cualquier campo del modelo
// era escribible desde el cliente. Se aceptan sólo los que la interfaz usa.
const preferencesSchema = z.object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    fontSize: z.enum(["small", "default", "large"]).optional(),
    radius: z.number().min(0).max(2).optional(),
    reducedMotion: z.boolean().optional(),
    highContrast: z.boolean().optional(),
    primaryColor: z.string().max(60).nullable().optional(),
    accentColor: z.string().max(60).nullable().optional(),
}).strict()

export async function POST(request: Request) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const body = await request.json()

        // Verificar que el usuario solo puede actualizar sus propias preferencias
        if (body?.userId !== session.user.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 })
        }

        const userId: string = session.user.id
        const preferences = preferencesSchema.parse(body?.preferences ?? {})

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
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Preferencias inválidas" }, { status: 400 })
        }
        console.error("Error guardando preferencias:", error)
        return NextResponse.json(
            { error: "Error al guardar preferencias" }, 
            { status: 500 }
        )
    }
}