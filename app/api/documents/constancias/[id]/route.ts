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

const updateConstanciaSchema = z.object({
    dni: z.string().max(20).min(1).optional(),
    studentCode: z.string().max(20).min(1).optional(),
    fullName: z.string().max(200).min(1).optional(),
    constanciaNumber: z
        .string()
        .min(1)
        .max(60)
        .regex(/^[A-Za-z0-9 ._#-]+$/, "El numero de constancia contiene caracteres no permitidos")
        .refine((value) => !value.includes(".."), "El numero de constancia contiene caracteres no permitidos")
        .optional(),
    year: z.string().regex(/^\d{4}$/, "Año inválido").transform(val => parseInt(val)).optional(),
    observation: z.string().max(2000).nullable().optional(),
})

// GET /api/documents/constancias/[id] - Obtener una constancia
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()

        if (!session) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            )
        }

        const canRead = await hasPermission(session.user.id, "constancias.access", PermissionAction.READ)
        if (!canRead) {
            return NextResponse.json(
                { error: "Sin permisos para ver constancias" },
                { status: 403 }
            )
        }

        const { id } = await params

        const constancia = await prisma.constancia.findUnique({
            where: {
                id: id
            },
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
            }
        })

        if (!constancia) {
            return NextResponse.json(
                { error: "Constancia no encontrada" },
                { status: 404 }
            )
        }

        return NextResponse.json(constancia)
    } catch (error) {
        console.error("Error fetching constancia:", error)
        return NextResponse.json(
            { error: "Error al obtener la constancia" },
            { status: 500 }
        )
    }
}

// PATCH /api/documents/constancias/[id] - Actualizar una constancia
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()

        if (!session) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            )
        }

        const canUpdate = await hasPermission(session.user.id, "constancias.access", PermissionAction.UPDATE)
        if (!canUpdate) {
            return NextResponse.json(
                { error: "Sin permisos para actualizar constancias" },
                { status: 403 }
            )
        }

        const { id } = await params

        // Obtener el usuario para verificar si es SUPER_ADMIN
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        })

        const isSuperAdmin = user?.role === 'SUPER_ADMIN'

        // Verificar si la constancia existe
        const existingConstancia = await prisma.constancia.findUnique({
            where: {
                id: id
            }
        })

        if (!existingConstancia) {
            return NextResponse.json(
                { error: "Constancia no encontrada" },
                { status: 404 }
            )
        }

        // No permitir editar constancias aprobadas (excepto para SUPER_ADMIN)
        if (!isSuperAdmin && existingConstancia.status === "APROBADO") {
            return NextResponse.json(
                { error: "No se pueden editar constancias aprobadas" },
                { status: 400 }
            )
        }

        const formData = await request.formData()

        // Extraer datos del FormData
        const rawData: Record<string, string | null> = {}
        const textFields = ['studentCode', 'fullName', 'dni', 'constanciaNumber', 'year', 'observation']

        for (const field of textFields) {
            const value = formData.get(field)
            if (value !== null) {
                rawData[field] = value as string
            }
        }

        // `status` no se acepta aquí: aprobar o rechazar pasa por sus propias
        // rutas, que además registran quién lo hizo.
        const validatedData = updateConstanciaSchema.parse(rawData)

        // Si se está cambiando el número de constancia, verificar que no exista
        if (validatedData.constanciaNumber && validatedData.constanciaNumber !== existingConstancia.constanciaNumber) {
            const duplicateConstancia = await prisma.constancia.findUnique({
                where: {
                    constanciaNumber: validatedData.constanciaNumber
                }
            })

            if (duplicateConstancia) {
                return NextResponse.json(
                    { error: "El número de constancia ya existe" },
                    { status: 400 }
                )
            }
        }

        // Procesar archivo si existe
        let fileData = {}
        const file = formData.get("file") as File | null

        if (file && file.size > 0) {
            const validation = await validateUpload(file, DOCUMENT_MIME_TYPES)
            if (!validation.ok) {
                return NextResponse.json({ error: validation.error }, { status: 400 })
            }

            const numberForFile = validatedData.constanciaNumber || existingConstancia.constanciaNumber
            const safeNumber = sanitizeFileNameSegment(numberForFile, "constancia")
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

        // Actualizar la constancia
        const constancia = await prisma.constancia.update({
            where: {
                id: id
            },
            data: {
                ...validatedData,
                ...fileData
            },
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
            }
        })

        return NextResponse.json(constancia)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Datos inválidos", details: error.issues },
                { status: 400 }
            )
        }

        console.error("Error updating constancia:", error)
        return NextResponse.json(
            { error: "Error al actualizar la constancia" },
            { status: 500 }
        )
    }
}

// DELETE /api/documents/constancias/[id] - Eliminar una constancia
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()

        if (!session) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            )
        }

        const canDelete = await hasPermission(session.user.id, "constancias.access", PermissionAction.DELETE)
        if (!canDelete) {
            return NextResponse.json(
                { error: "Sin permisos para eliminar constancias" },
                { status: 403 }
            )
        }

        const { id } = await params

        // Verificar si la constancia existe
        const existingConstancia = await prisma.constancia.findUnique({
            where: {
                id: id
            }
        })

        if (!existingConstancia) {
            return NextResponse.json(
                { error: "Constancia no encontrada" },
                { status: 404 }
            )
        }

        // No permitir eliminar constancias aprobadas
        if (existingConstancia.status === "APROBADO") {
            return NextResponse.json(
                { error: "No se pueden eliminar constancias aprobadas" },
                { status: 400 }
            )
        }

        // Eliminar la constancia
        await prisma.constancia.delete({
            where: {
                id: id
            }
        })

        return NextResponse.json({ message: "Constancia eliminada exitosamente" })
    } catch (error) {
        console.error("Error deleting constancia:", error)
        return NextResponse.json(
            { error: "Error al eliminar la constancia" },
            { status: 500 }
        )
    }
}
