import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const updateConstanciaSchema = z.object({
    dni: z.string().min(1).optional(),
    studentCode: z.string().min(1).optional(),
    fullName: z.string().min(1).optional(),
    constanciaNumber: z.string().min(1).optional(),
    year: z.string().transform(val => parseInt(val)).optional(),
    observation: z.string().nullable().optional(),
    status: z.enum(["PENDIENTE", "APROBADO", "RECHAZADO", "ANULADO"]).optional(),
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
        
        // Validar datos
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
            // Validar tipo de archivo
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
            if (!allowedTypes.includes(file.type)) {
                return NextResponse.json(
                    { error: "Tipo de archivo no permitido" },
                    { status: 400 }
                )
            }

            // Validar tamaño (máximo 5MB)
            if (file.size > 5 * 1024 * 1024) {
                return NextResponse.json(
                    { error: "El archivo supera el tamaño máximo de 5MB" },
                    { status: 400 }
                )
            }

            // Generar nombre único para el archivo
            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)
            
            const fileExt = path.extname(file.name)
            const fileName = `${validatedData.constanciaNumber || existingConstancia.constanciaNumber}_${Date.now()}${fileExt}`
            const uploadDir = path.join(process.cwd(), "public", "uploads", "constancias")
            
            // Crear directorio si no existe
            try {
                await mkdir(uploadDir, { recursive: true })
            } catch (error) {
                console.log("Directory already exists or created")
            }
            
            const filePath = path.join(uploadDir, fileName)
            await writeFile(filePath, buffer)
            
            fileData = {
                fileName: file.name,
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