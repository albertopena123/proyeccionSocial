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
                archivos: true,
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
        const files = formData.getAll('files') as File[]

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

        // Procesar archivos si existen
        const archivosParaGuardar: Array<{
            fileName: string
            fileUrl: string
            fileSize: number
            fileMimeType: string
            tipo?: string
        }> = []

        if (files && files.length > 0) {
            // Crear directorio si no existe
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resoluciones')
            if (!existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true })
            }

            for (const file of files) {
                if (file.size > 0) {
                    // Validar tipo de archivo
                    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
                    if (!allowedTypes.includes(file.type)) {
                        return NextResponse.json(
                            { error: `Tipo de archivo no permitido: ${file.name}` },
                            { status: 400 }
                        )
                    }

                    // Validar tamaño (5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        return NextResponse.json(
                            { error: `El archivo ${file.name} supera los 5MB` },
                            { status: 400 }
                        )
                    }

                    // Generar nombre único para el archivo
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
                    const fileExtension = path.extname(file.name)
                    const savedFileName = `${uniqueSuffix}${fileExtension}`
                    const filePath = path.join(uploadDir, savedFileName)

                    // Guardar archivo
                    const bytes = await file.arrayBuffer()
                    const buffer = Buffer.from(bytes)
                    await writeFile(filePath, buffer)

                    archivosParaGuardar.push({
                        fileName: file.name,
                        fileUrl: `/api/documents/files/resoluciones/${savedFileName}`,
                        fileSize: file.size,
                        fileMimeType: file.type,
                        tipo: file.type.includes('pdf') ? 'resolucion' : 'anexo'
                    })
                }
            }
        }

        // Mantener compatibilidad con campos legacy si hay solo un archivo
        let fileName: string | null = null
        let fileUrl: string | null = null
        let fileSize: number | null = null
        let fileMimeType: string | null = null
        
        if (archivosParaGuardar.length === 1) {
            fileName = archivosParaGuardar[0].fileName
            fileUrl = archivosParaGuardar[0].fileUrl
            fileSize = archivosParaGuardar[0].fileSize
            fileMimeType = archivosParaGuardar[0].fileMimeType
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

        // Verificar si ya existe una resolución con ese número
        const resolucionExistente = await prisma.resolucion.findUnique({
            where: { numeroResolucion }
        })

        if (resolucionExistente) {
            return NextResponse.json(
                { error: `Ya existe una resolución con el número "${numeroResolucion}". Por favor, use un número de resolución diferente.` },
                { status: 400 }
            )
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
                },
                archivos: {
                    create: archivosParaGuardar
                }
            },
            include: {
                facultad: true,
                departamento: true,
                docentes: true,
                estudiantes: true,
                archivos: true,
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
    } catch (error: any) {
        console.error("Error al crear resolución:", error)
        
        // Manejar error de duplicados
        if (error.code === 'P2002') {
            if (error.meta?.target?.includes('dni')) {
                return NextResponse.json(
                    { error: "No se puede agregar el mismo estudiante o docente dos veces en la misma resolución" },
                    { status: 400 }
                )
            }
        }
        
        return NextResponse.json(
            { error: "Error al crear la resolución" },
            { status: 500 }
        )
    }
}