import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir, unlink } from "fs/promises"
import path from "path"
import { existsSync } from "fs"

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

        // Validar tipo de archivo
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Solo se permiten imágenes JPG, JPEG, PNG o WEBP" },
                { status: 400 }
            )
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: "La imagen no debe superar los 5MB" },
                { status: 400 }
            )
        }

        // Obtener la imagen anterior del usuario
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { image: true }
        })

        // Generar nombre único para el archivo
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        const fileExt = path.extname(file.name)
        const fileName = `avatar_${session.user.id}_${Date.now()}${fileExt}`
        // Guardar fuera de public para servir dinámicamente
        const uploadDir = path.join(process.cwd(), "uploads", "avatars")
        
        // Crear directorio si no existe
        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (error) {
            console.log("Directory already exists or created")
        }
        
        const filePath = path.join(uploadDir, fileName)
        await writeFile(filePath, buffer)
        
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
            const oldFilePath = path.join(process.cwd(), "uploads", "avatars", oldFileName)
            
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
            const filePath = path.join(process.cwd(), "uploads", "avatars", fileName)
            
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