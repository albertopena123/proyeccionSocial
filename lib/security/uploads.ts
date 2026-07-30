// lib/security/uploads.ts
// Utilidades para guardar y servir archivos subidos sin exponer el sistema de
// archivos del servidor.

import path from "path"

// Los archivos se guardan FUERA de /public. Todo lo que vive en /public lo sirve
// Next.js estáticamente y sin pasar por ninguna comprobación de sesión, así que
// un archivo subido ahí queda accesible para cualquiera que adivine su nombre.
export const UPLOADS_ROOT = path.join(process.cwd(), "uploads")

// Raíz heredada: las migraciones antiguas dejaron archivos en public/uploads.
// Se sigue leyendo de ahí, pero ya no se escribe.
export const LEGACY_UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads")

// Extensión canónica por tipo MIME. La extensión NUNCA se toma del nombre que
// envía el cliente: un archivo llamado "foo.html" servido desde nuestro origen
// ejecuta JavaScript con la sesión de quien lo abre.
const EXTENSION_BY_MIME: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

export const DOCUMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function extensionForMimeType(mimeType: string): string | null {
    return EXTENSION_BY_MIME[mimeType] ?? null
}

// El Content-Type de un multipart lo elige el cliente, así que se comprueba
// además la firma real del contenido.
export function matchesMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 12) return false

    switch (mimeType) {
        case "application/pdf":
            return buffer.subarray(0, 4).toString("latin1") === "%PDF"
        case "image/jpeg":
        case "image/jpg":
            return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
        case "image/png":
            return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        case "image/webp":
            return (
                buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
                buffer.subarray(8, 12).toString("latin1") === "WEBP"
            )
        default:
            return false
    }
}

export type UploadValidationResult =
    | { ok: true; buffer: Buffer; extension: string }
    | { ok: false; error: string }

export async function validateUpload(
    file: File,
    allowedMimeTypes: string[]
): Promise<UploadValidationResult> {
    if (!allowedMimeTypes.includes(file.type)) {
        return { ok: false, error: "Tipo de archivo no permitido" }
    }

    if (file.size > MAX_UPLOAD_BYTES) {
        return { ok: false, error: "El archivo supera el tamaño máximo de 5MB" }
    }

    const extension = extensionForMimeType(file.type)
    if (!extension) {
        return { ok: false, error: "Tipo de archivo no permitido" }
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    if (!matchesMagicBytes(buffer, file.type)) {
        return { ok: false, error: "El contenido del archivo no corresponde a su tipo declarado" }
    }

    return { ok: true, buffer, extension }
}

// Reduce cualquier texto a algo utilizable como parte de un nombre de archivo.
// Sin esto, un campo como constanciaNumber = "../../../app/page" convierte un
// upload en escritura arbitraria en el árbol del proyecto.
export function sanitizeFileNameSegment(segment: string, fallback = "archivo"): string {
    const cleaned = segment
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/^[._]+/, "")
        .slice(0, 80)

    return cleaned.length > 0 ? cleaned : fallback
}

// Nombre visible del archivo original, para mostrarlo y para Content-Disposition.
export function sanitizeOriginalFileName(name: string, extension: string): string {
    const base = sanitizeFileNameSegment(path.basename(name).replace(/\.[^.]*$/, ""), "archivo")
    return `${base}${extension}`
}

/**
 * Resuelve segmentos de ruta controlados por el usuario dentro de una raíz y
 * devuelve null si el resultado se sale de ella.
 *
 * Next.js decodifica los segmentos de una ruta catch-all, de modo que una
 * petición a /api/files/%2e%2e/%2e%2e/.env llega como ["..", "..", ".env"] y
 * un path.join directo leería cualquier archivo del servidor.
 */
export function resolveWithinRoot(root: string, segments: string[]): string | null {
    if (segments.length === 0) return null

    if (segments.some((segment) => segment.length === 0 || segment === "." || segment === ".." || segment.includes("\0"))) {
        return null
    }

    const resolvedRoot = path.resolve(root)
    const candidate = path.resolve(resolvedRoot, ...segments)

    if (candidate !== resolvedRoot && !candidate.startsWith(resolvedRoot + path.sep)) {
        return null
    }

    return candidate
}

// Content-Type de salida. Sólo se reconocen los tipos que aceptamos al subir:
// cualquier otra cosa se descarga como binario opaco en lugar de ejecutarse en
// el navegador (SVG y HTML son ejecutables desde nuestro propio origen).
const SERVE_CONTENT_TYPES: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}

export function serveContentType(extension: string): string {
    return SERVE_CONTENT_TYPES[extension.toLowerCase()] ?? "application/octet-stream"
}

export function isInlineSafe(extension: string): boolean {
    return extension.toLowerCase() in SERVE_CONTENT_TYPES
}
