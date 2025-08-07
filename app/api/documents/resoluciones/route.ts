import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction, TipoResolucion, ModalidadResolucion } from "@prisma/client"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { existsSync } from "fs"

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const canRead = await hasPermission(
            session.user.id,
            "resoluciones.access",
            PermissionAction.READ
        )

        if (!canRead) {
            return NextResponse.json({ error: "Sin permisos para ver resoluciones" }, { status: 403 })
        }

        const resoluciones = await prisma.resolucion.findMany({
            include: {
                facultad: true,
                departamento: true,
                estudiantes: true,
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

        return NextResponse.json(resoluciones)
    } catch (error) {
        console.error("Error al obtener resoluciones:", error)
        return NextResponse.json(
            { error: "Error al obtener resoluciones" },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth()
        
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const canCreate = await hasPermission(
            session.user.id,
            "resoluciones.access",
            PermissionAction.CREATE
        )

        if (!canCreate) {
            return NextResponse.json({ error: "Sin permisos para crear resoluciones" }, { status: 403 })
        }

        const formData = await request.formData()
        
        // Extraer campos del formulario
        const tipoResolucion = formData.get('tipoResolucion') as string
        const numeroResolucion = formData.get('numeroResolucion') as string
        const fechaResolucion = formData.get('fechaResolucion') as string
        const modalidad = formData.get('modalidad') as string
        const esFinanciado = formData.get('esFinanciado') === 'true'
        const monto = formData.get('monto') as string | null
        const dniAsesor = formData.get('dniAsesor') as string
        const nombreAsesor = formData.get('nombreAsesor') as string
        const tituloProyecto = formData.get('tituloProyecto') as string
        const facultadId = parseInt(formData.get('facultadId') as string)
        const departamentoId = parseInt(formData.get('departamentoId') as string)
        const estudiantesJson = formData.get('estudiantes') as string | null
        const docentesJson = formData.get('docentes') as string | null
        const file = formData.get('file') as File | null

        // Validaciones básicas
        if (!numeroResolucion || !fechaResolucion || !tipoResolucion) {
            return NextResponse.json(
                { error: "Campos requeridos faltantes" },
                { status: 400 }
            )
        }

        // Verificar que el número de resolución no exista
        const existingResolucion = await prisma.resolucion.findUnique({
            where: { numeroResolucion }
        })

        if (existingResolucion) {
            return NextResponse.json(
                { error: "El número de resolución ya existe" },
                { status: 400 }
            )
        }

        // Procesar archivo si existe
        let fileName: string | null = null
        let fileUrl: string | null = null
        let fileSize: number | null = null
        let fileMimeType: string | null = null

        if (file && file.size > 0) {
            // Validar tipo de archivo
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
            if (!allowedTypes.includes(file.type)) {
                return NextResponse.json(
                    { error: "Tipo de archivo no permitido" },
                    { status: 400 }
                )
            }

            // Validar tamaño (5MB)
            if (file.size > 5 * 1024 * 1024) {
                return NextResponse.json(
                    { error: "El archivo no debe superar los 5MB" },
                    { status: 400 }
                )
            }

            // Crear directorio si no existe
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resoluciones')
            if (!existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true })
            }

            // Generar nombre único para el archivo
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
            const fileExtension = path.extname(file.name)
            fileName = file.name
            const savedFileName = `${uniqueSuffix}${fileExtension}`
            const filePath = path.join(uploadDir, savedFileName)

            // Guardar archivo
            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)
            await writeFile(filePath, buffer)

            fileUrl = `/api/documents/files/resoluciones/${savedFileName}`
            fileSize = file.size
            fileMimeType = file.type
        }

        // Parsear docentes si existen
        let docentes: Array<{ dni: string; nombres: string; apellidos: string; email?: string; facultad?: string }> = []
        if (docentesJson) {
            try {
                docentes = JSON.parse(docentesJson)
            } catch (e) {
                console.error("Error parseando docentes:", e)
            }
        }

        // Parsear estudiantes si existen
        let estudiantes: Array<{ dni: string; codigo: string; nombres: string; apellidos: string }> = []
        if (estudiantesJson) {
            try {
                estudiantes = JSON.parse(estudiantesJson)
            } catch (e) {
                console.error("Error parseando estudiantes:", e)
            }
        }

        // Crear la resolución con todas las relaciones
        const resolucion = await prisma.resolucion.create({
            data: {
                tipoResolucion: tipoResolucion as TipoResolucion,
                numeroResolucion,
                fechaResolucion: new Date(fechaResolucion),
                modalidad: modalidad as ModalidadResolucion,
                esFinanciado,
                monto: esFinanciado && monto ? parseFloat(monto) : null,
                dniAsesor,
                nombreAsesor,
                tituloProyecto,
                facultadId,
                departamentoId,
                fileName,
                fileUrl,
                fileSize,
                fileMimeType,
                createdById: session.user.id,
                status: 'PENDIENTE',
                docentes: {
                    create: docentes.map(doc => ({
                        dni: doc.dni,
                        nombres: doc.nombres,
                        apellidos: doc.apellidos,
                        email: doc.email || null,
                        facultad: doc.facultad || null
                    }))
                },
                estudiantes: {
                    create: estudiantes.map(est => ({
                        dni: est.dni,
                        codigo: est.codigo,
                        nombres: est.nombres,
                        apellidos: est.apellidos
                    }))
                }
            },
            include: {
                facultad: true,
                departamento: true,
                docentes: true,
                estudiantes: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })

        return NextResponse.json(resolucion, { status: 201 })
    } catch (error) {
        console.error("Error al crear resolución:", error)
        return NextResponse.json(
            { error: "Error al crear la resolución" },
            { status: 500 }
        )
    }
}