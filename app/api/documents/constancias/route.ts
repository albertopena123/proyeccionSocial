import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import {
    DOCUMENT_MIME_TYPES,
    UPLOADS_ROOT,
    sanitizeFileNameSegment,
    sanitizeOriginalFileName,
    validateUpload,
} from "@/lib/security/uploads"

// Se rechazan separadores de ruta y caracteres de control: este valor termina
// formando parte del nombre del archivo en disco.
const documentNumber = z
    .string()
    .min(1)
    .max(60)
    // Lista blanca: cualquier cosa fuera de esto (separadores de ruta incluidos)
    // se rechaza antes de llegar al nombre del archivo.
    .regex(/^[A-Za-z0-9 ._#-]+$/, "El numero de documento contiene caracteres no permitidos")
    .refine((value) => !value.includes(".."), "El numero de documento contiene caracteres no permitidos")

const createConstanciaSchema = z.object({
    dni: z.string().max(20).optional().nullable().transform(val => val === "" ? null : val),
    studentCode: z.string().min(1).max(20),
    fullName: z.string().min(1).max(200),
    constanciaNumber: documentNumber,
    year: z.string().regex(/^\d{4}$/, "Año inválido").transform(val => parseInt(val)),
    observation: z.string().max(2000).optional().nullable().transform(val => val === "" ? null : val),
})

// GET /api/documents/constancias - Obtener todas las constancias
export async function GET() {
    try {
        const session = await auth()

        if (!session) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            )
        }

        // Las constancias contienen datos personales (nombre, DNI, código). Antes
        // bastaba con tener sesión, así que cualquier estudiante recién registrado
        // podía volcar el listado completo.
        const canRead = await hasPermission(session.user.id, "constancias.access", PermissionAction.READ)
        if (!canRead) {
            return NextResponse.json(
                { error: "Sin permisos para ver constancias" },
                { status: 403 }
            )
        }

        const constancias = await prisma.constancia.findMany({
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                approvedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(constancias)
    } catch (error) {
        console.error("Error fetching constancias:", error)
        return NextResponse.json(
            { error: "Error al obtener las constancias" },
            { status: 500 }
        )
    }
}

// POST /api/documents/constancias - Crear nueva constancia
export async function POST(request: Request) {
    try {
        const session = await auth()

        if (!session) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            )
        }

        const canCreate = await hasPermission(session.user.id, "constancias.access", PermissionAction.CREATE)
        if (!canCreate) {
            return NextResponse.json(
                { error: "Sin permisos para crear constancias" },
                { status: 403 }
            )
        }

        const formData = await request.formData()

        // Extraer datos del FormData
        const rawData = {
            studentCode: formData.get("studentCode") as string,
            fullName: formData.get("fullName") as string,
            dni: formData.get("dni") as string,
            constanciaNumber: formData.get("constanciaNumber") as string,
            year: formData.get("year") as string,
            observation: formData.get("observation") as string | null,
        }

        // Validar datos
        const validatedData = createConstanciaSchema.parse(rawData)

        // Verificar si el número de constancia ya existe
        const existingConstancia = await prisma.constancia.findUnique({
            where: {
                constanciaNumber: validatedData.constanciaNumber
            }
        })

        if (existingConstancia) {
            return NextResponse.json(
                { error: "El número de constancia ya existe" },
                { status: 400 }
            )
        }

        // Procesar archivo si existe
        let fileData = {}
        const file = formData.get("file") as File | null

        if (file && file.size > 0) {
            const validation = await validateUpload(file, DOCUMENT_MIME_TYPES)
            if (!validation.ok) {
                return NextResponse.json({ error: validation.error }, { status: 400 })
            }

            // El nombre se construye con el número saneado y la extensión derivada
            // del tipo MIME verificado. Tomarlos del cliente permitía escribir
            // fuera de la carpeta (constanciaNumber con "../") y dejar en el
            // servidor archivos con extensiones ejecutables en el navegador.
            const safeNumber = sanitizeFileNameSegment(validatedData.constanciaNumber, "constancia")
            const fileName = `${safeNumber}_${Date.now()}${validation.extension}`
            const uploadDir = path.join(UPLOADS_ROOT, "constancias")

            await mkdir(uploadDir, { recursive: true })
            await writeFile(path.join(uploadDir, fileName), validation.buffer)

            fileData = {
                fileName: sanitizeOriginalFileName(file.name, validation.extension),
                fileUrl: `/api/documents/files/constancias/${fileName}`,
                fileSize: file.size,
                fileMimeType: file.type
            }
        }

        // Crear la constancia
        const constancia = await prisma.constancia.create({
            data: {
                ...validatedData,
                ...fileData,
                type: "CONSTANCIA", // Tipo fijo
                createdById: session.user.id,
                status: "PENDIENTE"
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })

        return NextResponse.json(constancia, { status: 201 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Datos inválidos", details: error.issues },
                { status: 400 }
            )
        }

        console.error("Error creating constancia:", error)
        return NextResponse.json(
            { error: "Error al crear la constancia" },
            { status: 500 }
        )
    }
}
