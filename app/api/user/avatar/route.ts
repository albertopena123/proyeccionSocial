import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir, unlink } from "fs/promises"
import path from "path"
import { existsSync } from "fs"
import {
    IMAGE_MIME_TYPES,
    UPLOADS_ROOT,
    sanitizeFileNameSegment,
    validateUpload,
} from "@/lib/security/uploads"

// GET - Obtener la imagen del usuario
export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { image: true }
        })

        return NextResponse.json({ image: user?.image || null })
    } catch (error) {
        console.error("Error al obtener avatar:", error)
        return NextResponse.json(
            { error: "Error al obtener la imagen" },
            { status: 500 }
        )
    }
}

// POST - Actualizar la imagen del usuario
export async function POST(request: Request) {
    try {
        const session = await auth()
        
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            return NextResponse.json(
                { error: "No se proporcionó ningún archivo" },
                { status: 400 }
            )
        }

        // Comprueba tipo, tamaño y firma real del contenido. El Content-Type de un
        // multipart lo elige el cliente, así que por sí solo no prueba nada.
        const validation = await validateUpload(file, IMAGE_MIME_TYPES)
        if (!validation.ok) {
            return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        // Obtener la imagen anterior del usuario
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { image: true }
        })

        // La extensión se deriva del tipo MIME verificado. Tomarla de file.name
        // permitía guardar un "avatar.svg" con contenido declarado como PNG: al
        // abrirlo, el SVG ejecuta JavaScript en el origen de la aplicación.
        const fileName = `avatar_${sanitizeFileNameSegment(session.user.id, "user")}_${Date.now()}${validation.extension}`
        // Guardar fuera de public para servir dinámicamente
        const uploadDir = path.join(UPLOADS_ROOT, "avatars")

        await mkdir(uploadDir, { recursive: true })

        const filePath = path.join(uploadDir, fileName)
        await writeFile(filePath, validation.buffer)

        // URL usando la nueva API route
        const fileUrl = `/api/files/avatars/${fileName}`

        // Actualizar la base de datos con la nueva imagen
        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: { image: fileUrl },
            select: { 
                id: true,
                name: true,
                email: true,
                image: true 
            }
        })

        // Eliminar la imagen anterior si existe
        if (currentUser?.image && (currentUser.image.startsWith('/uploads/avatars/') || currentUser.image.startsWith('/api/files/avatars/'))) {
            const oldFileName = path.basename(currentUser.image)
            const oldFilePath = path.join(UPLOADS_ROOT, "avatars", oldFileName)
            
            try {
                if (existsSync(oldFilePath)) {
                    await unlink(oldFilePath)
                }
            } catch (error) {
                console.error("Error al eliminar imagen anterior:", error)
            }
        }

        return NextResponse.json({
            success: true,
            user: updatedUser,
            message: "Foto de perfil actualizada exitosamente"
        })
    } catch (error) {
        console.error("Error al actualizar avatar:", error)
        return NextResponse.json(
            { error: "Error al actualizar la foto de perfil" },
            { status: 500 }
        )
    }
}

// DELETE - Eliminar la imagen del usuario
export async function DELETE(request: Request) {
    try {
        const session = await auth()
        
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        // Obtener la imagen actual del usuario
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { image: true }
        })

        // Eliminar el archivo si existe
        if (user?.image && (user.image.startsWith('/uploads/avatars/') || user.image.startsWith('/api/files/avatars/'))) {
            const fileName = path.basename(user.image)
            const filePath = path.join(UPLOADS_ROOT, "avatars", fileName)
            
            try {
                if (existsSync(filePath)) {
                    await unlink(filePath)
                }
            } catch (error) {
                console.error("Error al eliminar archivo:", error)
            }
        }

        // Actualizar la base de datos para eliminar la referencia a la imagen
        await prisma.user.update({
            where: { id: session.user.id },
            data: { image: null }
        })

        return NextResponse.json({
            success: true,
            message: "Foto de perfil eliminada exitosamente"
        })
    } catch (error) {
        console.error("Error al eliminar avatar:", error)
        return NextResponse.json(
            { error: "Error al eliminar la foto de perfil" },
            { status: 500 }
        )
    }
}