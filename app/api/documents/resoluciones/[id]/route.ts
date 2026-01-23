import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/services/permissions/permissions.service"
import { PermissionAction, TipoResolucion, ModalidadResolucion, TipoFinanciamiento } from "@prisma/client"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
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

        const resolucion = await prisma.resolucion.findUnique({
            where: { id },
            include: {
                facultad: true,
                departamento: true,
                estudiantes: true,
                docentes: true,
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
            }
        })

        if (!resolucion) {
            return NextResponse.json({ error: "Resolución no encontrada" }, { status: 404 })
        }

        return NextResponse.json(resolucion)
    } catch (error) {
        console.error("Error al obtener resolución:", error)
        return NextResponse.json(
            { error: "Error al obtener la resolución" },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await auth()
        
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const canUpdate = await hasPermission(
            session.user.id,
            "resoluciones.access",
            PermissionAction.UPDATE
        )

        if (!canUpdate) {
            return NextResponse.json({ error: "Sin permisos para actualizar resoluciones" }, { status: 403 })
        }

        // Obtener el usuario para verificar si es SUPER_ADMIN
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        })

        const isSuperAdmin = user?.role === 'SUPER_ADMIN'

        // Verificar que la resolución existe
        const existingResolucion = await prisma.resolucion.findUnique({
            where: { id },
            include: { 
                estudiantes: true,
                docentes: true,
                archivos: true 
            }
        })

        if (!existingResolucion) {
            return NextResponse.json({ error: "Resolución no encontrada" }, { status: 404 })
        }

        // Solo verificar el estado aprobado si NO es SUPER_ADMIN
        if (!isSuperAdmin && existingResolucion.status === 'APROBADO') {
            return NextResponse.json(
                { error: "No se puede editar una resolución aprobada" },
                { status: 400 }
            )
        }

        const formData = await request.formData()
        
        // Extraer campos del formulario
        const tipoResolucion = formData.get('tipoResolucion') as string
        const numeroResolucion = formData.get('numeroResolucion') as string
        const fechaResolucion = formData.get('fechaResolucion') as string
        const modalidad = formData.get('modalidad') as string
        const esFinanciado = formData.get('esFinanciado') === 'true'
        const tipoFinanciamiento = formData.get('tipoFinanciamiento') as string | null
        const monto = formData.get('monto') as string | null
        const dniAsesor = formData.get('dniAsesor') as string
        const nombreAsesor = formData.get('nombreAsesor') as string
        const tituloProyecto = formData.get('tituloProyecto') as string
        const facultadId = parseInt(formData.get('facultadId') as string)
        const departamentoId = parseInt(formData.get('departamentoId') as string)
        const estudiantesJson = formData.get('estudiantes') as string | null
        const docentesJson = formData.get('docentes') as string | null
        const files = formData.getAll('files') as File[]
        const filesToDeleteJson = formData.get('filesToDelete') as string | null

        // Verificar si el número de resolución cambio y no está duplicado
        if (numeroResolucion !== existingResolucion.numeroResolucion) {
            const duplicate = await prisma.resolucion.findUnique({
                where: { numeroResolucion }
            })

            if (duplicate) {
                return NextResponse.json(
                    { error: "El número de resolución ya existe" },
                    { status: 400 }
                )
            }
        }

        // Procesar archivos a eliminar
        let filesToDelete: string[] = []
        if (filesToDeleteJson) {
            try {
                filesToDelete = JSON.parse(filesToDeleteJson)
            } catch (e) {
                console.error("Error parseando archivos a eliminar:", e)
            }
        }

        // Eliminar archivos marcados para borrar
        if (filesToDelete.length > 0) {
            await prisma.archivoResolucion.deleteMany({
                where: {
                    id: { in: filesToDelete },
                    resolucionId: id
                }
            })
        }

        // Procesar nuevos archivos
        const archivosParaGuardar: Array<{
            fileName: string
            fileUrl: string
            fileSize: number
            fileMimeType: string
            tipo?: string
        }> = []

        if (files && files.length > 0) {
            // Importar módulos necesarios
            const path = await import('path')
            const { writeFile, mkdir } = await import('fs/promises')
            const { existsSync } = await import('fs')

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

        // Mantener compatibilidad con campos legacy
        let fileName = existingResolucion.fileName
        let fileUrl = existingResolucion.fileUrl
        let fileSize = existingResolucion.fileSize
        let fileMimeType = existingResolucion.fileMimeType
        
        // Si hay archivos nuevos y no hay archivos existentes, usar el primero para los campos legacy
        if (archivosParaGuardar.length > 0 && (!existingResolucion.archivos || existingResolucion.archivos.length === 0)) {
            fileName = archivosParaGuardar[0].fileName
            fileUrl = archivosParaGuardar[0].fileUrl
            fileSize = archivosParaGuardar[0].fileSize
            fileMimeType = archivosParaGuardar[0].fileMimeType
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

        // Parsear docentes si existen
        let docentes: Array<{ dni: string; nombres: string; apellidos: string; email?: string; facultad?: string }> = []
        if (docentesJson) {
            try {
                docentes = JSON.parse(docentesJson)
            } catch (e) {
                console.error("Error parseando docentes:", e)
            }
        }

        // Actualizar la resolución
        const resolucion = await prisma.resolucion.update({
            where: { id },
            data: {
                tipoResolucion: tipoResolucion as TipoResolucion,
                numeroResolucion,
                fechaResolucion: new Date(fechaResolucion),
                modalidad: modalidad as ModalidadResolucion,
                esFinanciado,
                tipoFinanciamiento: esFinanciado && tipoFinanciamiento ? tipoFinanciamiento as TipoFinanciamiento : null,
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
                // Eliminar estudiantes existentes y crear nuevos
                estudiantes: {
                    deleteMany: {},
                    create: estudiantes.map(est => ({
                        dni: est.dni,
                        codigo: est.codigo,
                        nombres: est.nombres,
                        apellidos: est.apellidos
                    }))
                },
                // Eliminar docentes existentes y crear nuevos
                docentes: {
                    deleteMany: {},
                    create: docentes.map(doc => ({
                        dni: doc.dni,
                        nombres: doc.nombres,
                        apellidos: doc.apellidos,
                        email: doc.email || null,
                        facultad: doc.facultad || null
                    }))
                },
                // Agregar nuevos archivos
                archivos: {
                    create: archivosParaGuardar
                }
            },
            include: {
                facultad: true,
                departamento: true,
                estudiantes: true,
                docentes: true,
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
            }
        })

        return NextResponse.json(resolucion)
    } catch (error) {
        console.error("Error al actualizar resolución:", error)
        return NextResponse.json(
            { error: "Error al actualizar la resolución" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await auth()
        
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const canDelete = await hasPermission(
            session.user.id,
            "resoluciones.access",
            PermissionAction.DELETE
        )

        if (!canDelete) {
            return NextResponse.json({ error: "Sin permisos para eliminar resoluciones" }, { status: 403 })
        }

        // Verificar que la resolución existe y no está aprobada
        const existingResolucion = await prisma.resolucion.findUnique({
            where: { id }
        })

        if (!existingResolucion) {
            return NextResponse.json({ error: "Resolución no encontrada" }, { status: 404 })
        }

        if (existingResolucion.status === 'APROBADO') {
            return NextResponse.json(
                { error: "No se puede eliminar una resolución aprobada" },
                { status: 400 }
            )
        }

        // Eliminar la resolución (los estudiantes y docentes se eliminan en cascada)
        // No necesitamos eliminar archivos del sistema ya que usamos data URI
        await prisma.resolucion.delete({
            where: { id }
        })

        return NextResponse.json({ message: "Resolución eliminada exitosamente" })
    } catch (error) {
        console.error("Error al eliminar resolución:", error)
        return NextResponse.json(
            { error: "Error al eliminar la resolución" },
            { status: 500 }
        )
    }
}