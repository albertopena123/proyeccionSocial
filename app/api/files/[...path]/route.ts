import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import { existsSync } from "fs"
import { auth } from "@/lib/auth"
import {
    LEGACY_UPLOADS_ROOT,
    UPLOADS_ROOT,
    isInlineSafe,
    resolveWithinRoot,
    serveContentType,
} from "@/lib/security/uploads"

// Sólo estas carpetas son alcanzables por esta ruta.
const SERVED_DIRECTORIES = ["avatars", "constancias", "resoluciones"]

// GET - Servir archivos dinámicamente
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathSegments } = await params

        // Todos los archivos servidos por aquí requieren sesión. Los avatares no
        // son públicos: la URL contiene el id del usuario y permitía enumerar la
        // plantilla completa sin autenticarse.
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        if (!SERVED_DIRECTORIES.includes(pathSegments[0])) {
            return NextResponse.json({ error: "Ruta no permitida" }, { status: 403 })
        }

        // Los segmentos llegan ya decodificados, así que hay que comprobar la
        // ruta resuelta contra la raíz en lugar de confiar en path.join.
        const filePath = resolveWithinRoot(UPLOADS_ROOT, pathSegments)
        const legacyPath = resolveWithinRoot(LEGACY_UPLOADS_ROOT, pathSegments)

        if (!filePath || !legacyPath) {
            return NextResponse.json({ error: "Ruta no permitida" }, { status: 403 })
        }

        const resolved = existsSync(filePath)
            ? filePath
            : existsSync(legacyPath)
              ? legacyPath
              : null

        if (!resolved) {
            return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
        }

        const file = await readFile(resolved)

        return serveFile(file, resolved)
    } catch (error) {
        console.error("Error sirviendo archivo:", error)
        return NextResponse.json(
            { error: "Error al obtener el archivo" },
            { status: 500 }
        )
    }
}

function serveFile(file: Buffer, filePath: string) {
    const ext = path.extname(filePath).toLowerCase()
    const contentType = serveContentType(ext)

    const headers: HeadersInit = {
        'Content-Type': contentType,
        // Los archivos son privados: no deben quedar en cachés compartidas.
        'Cache-Control': 'private, max-age=3600',
        // Sin esto el navegador puede reinterpretar el contenido y ejecutar como
        // HTML algo que enviamos como binario.
        'X-Content-Type-Options': 'nosniff',
        // Sólo se muestran en el navegador los formatos que no ejecutan código
        // (nunca SVG ni HTML); el resto se descarga.
        'Content-Disposition': isInlineSafe(ext)
            ? `inline; filename="${path.basename(filePath)}"`
            : `attachment; filename="${path.basename(filePath)}"`,
    }

    return new NextResponse(new Uint8Array(file), { headers })
}
