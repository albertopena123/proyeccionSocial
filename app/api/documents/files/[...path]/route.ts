import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"
import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import nodePath from "path"
import { existsSync } from "fs"
import {
    LEGACY_UPLOADS_ROOT,
    UPLOADS_ROOT,
    isInlineSafe,
    resolveWithinRoot,
    serveContentType,
} from "@/lib/security/uploads"

const ALLOWED_DIRECTORIES = ["constancias", "resoluciones"]

/**
 * ¿El archivo pertenece a un documento APROBADO?
 *
 * La consulta pública (/consulta-documentos) sólo lista documentos aprobados, así
 * que sus archivos son públicos por diseño. El resto exige sesión y permiso: antes
 * bastaba conocer el nombre del archivo, y los documentos migrados eran además
 * descargables sin sesión desde /uploads/ porque Next sirve /public en estático.
 */
async function belongsToApprovedDocument(relativePath: string): Promise<boolean> {
    // Un mismo archivo puede estar referenciado con la URL de la API o con la
    // ruta estática heredada de las migraciones.
    const candidateUrls = [`/api/documents/files/${relativePath}`, `/uploads/${relativePath}`]

    const [constancia, resolucion, archivo] = await Promise.all([
        prisma.constancia.findFirst({
            where: { status: "APROBADO", fileUrl: { in: candidateUrls } },
            select: { id: true },
        }),
        prisma.resolucion.findFirst({
            where: { status: "APROBADO", fileUrl: { in: candidateUrls } },
            select: { id: true },
        }),
        prisma.archivoResolucion.findFirst({
            where: {
                fileUrl: { in: candidateUrls },
                resolucion: { status: "APROBADO" },
            },
            select: { id: true },
        }),
    ])

    return Boolean(constancia || resolucion || archivo)
}

async function canReadPrivately(directory: string): Promise<boolean> {
    const session = await auth()
    if (!session) return false

    const permissionCode = directory === "constancias" ? "constancias.access" : "resoluciones.access"

    return hasPermission(session.user.id, permissionCode, PermissionAction.READ)
}

// GET /api/documents/files/[...path] - Servir archivos
export async function GET(
    request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathSegments } = await params

        if (!ALLOWED_DIRECTORIES.includes(pathSegments[0])) {
            return NextResponse.json({ error: "Ruta no permitida" }, { status: 403 })
        }

        // Comprobar la ruta ya resuelta: los segmentos llegan decodificados y un
        // path.join con "constancias/../../.env" se sale de la carpeta.
        const currentPath = resolveWithinRoot(UPLOADS_ROOT, pathSegments)
        const legacyPath = resolveWithinRoot(LEGACY_UPLOADS_ROOT, pathSegments)

        if (!currentPath || !legacyPath) {
            return NextResponse.json({ error: "Ruta no permitida" }, { status: 403 })
        }

        const relativePath = pathSegments.join("/")

        if (!(await belongsToApprovedDocument(relativePath))) {
            if (!(await canReadPrivately(pathSegments[0]))) {
                return NextResponse.json({ error: "No autorizado" }, { status: 401 })
            }
        }

        const resolved = existsSync(currentPath)
            ? currentPath
            : existsSync(legacyPath)
              ? legacyPath
              : null

        if (!resolved) {
            return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
        }

        const fileBuffer = await readFile(resolved)
        const ext = nodePath.extname(resolved).toLowerCase()
        const fileName = nodePath.basename(resolved)

        return new Response(new Uint8Array(fileBuffer), {
            headers: {
                "Content-Type": serveContentType(ext),
                // Nunca se muestran en línea formatos que ejecutan código en
                // nuestro origen (SVG, HTML): esos se fuerzan a descarga.
                "Content-Disposition": `${isInlineSafe(ext) ? "inline" : "attachment"}; filename="${fileName}"`,
                "Cache-Control": "private, max-age=3600",
                "X-Content-Type-Options": "nosniff",
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
