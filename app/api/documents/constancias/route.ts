import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const createConstanciaSchema = z.object({
    dni: z.string().min(1),
    studentCode: z.string().min(1),
    fullName: z.string().min(1),
    constanciaNumber: z.string().min(1),
    year: z.string().transform(val => parseInt(val)),
    observation: z.string().optional().nullable().transform(val => val === "" ? null : val),
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
        
        if (file) {
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
            const fileName = `${validatedData.constanciaNumber}_${Date.now()}${fileExt}`
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