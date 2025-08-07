import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import { existsSync } from "fs"
import { auth } from "@/lib/auth"

// GET - Servir archivos dinámicamente
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        // Await the params
        const { path: pathSegments } = await params
        
        // Verificar autenticación para archivos privados
        const session = await auth()
        
        // Para avatares, permitir acceso público o autenticado
        const isConstancia = pathSegments[0] === 'constancias'
        const isResolucion = pathSegments[0] === 'resoluciones'
        
        // Si es un archivo de constancia o resolución, requiere autenticación
        if ((isConstancia || isResolucion) && !session) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            )
        }
        
        // Construir la ruta del archivo
        // Los archivos se guardan en la carpeta 'uploads' en la raíz del proyecto
        const filePath = path.join(process.cwd(), "uploads", ...pathSegments)
        
        // Verificar que el archivo existe
        if (!existsSync(filePath)) {
            // Si no existe, intentar con la carpeta public como fallback (para archivos antiguos)
            const publicPath = path.join(process.cwd(), "public", "uploads", ...pathSegments)
            if (existsSync(publicPath)) {
                const file = await readFile(publicPath)
                return serveFile(file, publicPath)
            }
            
            return NextResponse.json(
                { error: "Archivo no encontrado" },
                { status: 404 }
            )
        }
        
        // Leer el archivo
        const file = await readFile(filePath)
        
        return serveFile(file, filePath)
    } catch (error) {
        console.error("Error sirviendo archivo:", error)
        return NextResponse.json(
            { error: "Error al obtener el archivo" },
            { status: 500 }
        )
    }
}

// Función auxiliar para servir el archivo con el content-type correcto
function serveFile(file: Buffer, filePath: string) {
    // Determinar el content-type basado en la extensión
    const ext = path.extname(filePath).toLowerCase()
    const contentType = getContentType(ext)
    
    // Configurar headers para caché
    const headers: HeadersInit = {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cachear por 1 año
    }
    
    // Para PDFs, agregar header para inline display
    if (ext === '.pdf') {
        headers['Content-Disposition'] = 'inline'
    }
    
    // Convertir Buffer a Uint8Array que es compatible con NextResponse
    const uint8Array = new Uint8Array(file)
    
    return new NextResponse(uint8Array, { headers })
}

// Función para obtener el content-type basado en la extensión
function getContentType(ext: string): string {
    const mimeTypes: Record<string, string> = {
        // Imágenes
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        
        // Documentos
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        
        // Otros
        '.txt': 'text/plain',
        '.json': 'application/json',
        '.xml': 'application/xml',
    }
    
    return mimeTypes[ext] || 'application/octet-stream'
}