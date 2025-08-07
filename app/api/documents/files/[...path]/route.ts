import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import nodePath from "path"
import { existsSync } from "fs"

// GET /api/documents/files/[...path] - Servir archivos
export async function GET(
    request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const session = await auth()
        
        if (!session) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            )
        }

        // Obtener params de la promesa
        const { path } = await params
        
        // Reconstruir la ruta del archivo
        const filePath = path.join("/")
        
        // Validar que sea una ruta permitida (solo constancias y resoluciones)
        const allowedPaths = ["constancias", "resoluciones"]
        const pathParts = filePath.split("/")
        
        if (!allowedPaths.includes(pathParts[0])) {
            return NextResponse.json(
                { error: "Ruta no permitida" },
                { status: 403 }
            )
        }

        // Construir la ruta completa del archivo
        const fullPath = nodePath.join(process.cwd(), "public", "uploads", filePath)
        
        // Verificar que el archivo existe
        if (!existsSync(fullPath)) {
            return NextResponse.json(
                { error: "Archivo no encontrado" },
                { status: 404 }
            )
        }

        // Leer el archivo
        const fileBuffer = await readFile(fullPath)
        
        // Determinar el tipo MIME basado en la extensión
        const ext = nodePath.extname(fullPath).toLowerCase()
        let contentType = "application/octet-stream"
        
        switch (ext) {
            case ".pdf":
                contentType = "application/pdf"
                break
            case ".jpg":
            case ".jpeg":
                contentType = "image/jpeg"
                break
            case ".png":
                contentType = "image/png"
                break
        }

        // Convertir Buffer a Uint8Array para Response
        const fileData = new Uint8Array(fileBuffer)

        // Retornar el archivo con los headers apropiados
        return new Response(fileData, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${nodePath.basename(fullPath)}"`,
                "Cache-Control": "public, max-age=3600", // Cache por 1 hora
            },
        })
    } catch (error) {
        console.error("Error serving file:", error)
        return NextResponse.json(
            { error: "Error al servir el archivo" },
            { status: 500 }
        )
    }
}