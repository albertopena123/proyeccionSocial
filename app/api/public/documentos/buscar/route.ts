import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        { error: "El término de búsqueda debe tener al menos 3 caracteres" },
        { status: 400 }
      )
    }

    const searchTerm = query.trim().toLowerCase()

    // Buscar constancias
    const constancias = await prisma.constancia.findMany({
      where: {
        AND: [
          { status: "APROBADO" }, // Solo mostrar documentos aprobados públicamente
          {
            OR: [
              { fullName: { contains: searchTerm, mode: 'insensitive' } },
              { studentCode: { contains: searchTerm, mode: 'insensitive' } },
              { dni: { contains: searchTerm, mode: 'insensitive' } },
              { constanciaNumber: { contains: searchTerm, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        constanciaNumber: true,
        studentCode: true,
        fullName: true,
        dni: true,
        year: true,
        observation: true,
        fileName: true,
        fileUrl: true,
        status: true,
        type: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limitar a 50 resultados
    })

    // Buscar resoluciones - por estudiantes relacionados o por asesor
    const resoluciones = await prisma.resolucion.findMany({
      where: {
        AND: [
          { status: "APROBADO" }, // Solo mostrar documentos aprobados públicamente
          {
            OR: [
              { numeroResolucion: { contains: searchTerm, mode: 'insensitive' } },
              { nombreAsesor: { contains: searchTerm, mode: 'insensitive' } },
              { dniAsesor: { contains: searchTerm, mode: 'insensitive' } },
              { tituloProyecto: { contains: searchTerm, mode: 'insensitive' } },
              {
                estudiantes: {
                  some: {
                    OR: [
                      { nombres: { contains: searchTerm, mode: 'insensitive' } },
                      { apellidos: { contains: searchTerm, mode: 'insensitive' } },
                      { codigo: { contains: searchTerm, mode: 'insensitive' } },
                      { dni: { contains: searchTerm, mode: 'insensitive' } }
                    ]
                  }
                }
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        numeroResolucion: true,
        tipoResolucion: true,
        modalidad: true,
        tituloProyecto: true,
        fechaResolucion: true,
        nombreAsesor: true,
        esFinanciado: true,
        monto: true,
        status: true,
        facultad: {
          select: {
            nombre: true
          }
        },
        departamento: {
          select: {
            nombre: true
          }
        },
        estudiantes: {
          select: {
            nombres: true,
            apellidos: true,
            codigo: true,
            dni: true
          }
        },
        archivos: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            tipo: true
          }
        }
      },
      orderBy: {
        fechaResolucion: 'desc'
      },
      take: 50 // Limitar a 50 resultados
    })

    // Si el término de búsqueda parece ser un nombre completo (contiene espacio)
    // hacer una búsqueda más específica
    if (searchTerm.includes(' ')) {
      const parts = searchTerm.split(' ')
      
      // Buscar constancias por combinación de palabras
      const constanciasAdicionales = await prisma.constancia.findMany({
        where: {
          AND: [
            { status: "APROBADO" },
            {
              AND: parts.map((part: string) => ({
                fullName: { contains: part, mode: 'insensitive' as const }
              }))
            }
          ]
        },
        select: {
          id: true,
          constanciaNumber: true,
          studentCode: true,
          fullName: true,
          dni: true,
          year: true,
          observation: true,
          fileName: true,
          fileUrl: true,
          status: true,
          type: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      })

      // Buscar resoluciones por combinación de palabras en estudiantes
      const resolucionesAdicionales = await prisma.resolucion.findMany({
        where: {
          AND: [
            { status: "APROBADO" },
            {
              estudiantes: {
                some: {
                  AND: parts.map((part: string) => ({
                    OR: [
                      { nombres: { contains: part, mode: 'insensitive' as const } },
                      { apellidos: { contains: part, mode: 'insensitive' as const } }
                    ]
                  }))
                }
              }
            }
          ]
        },
        select: {
          id: true,
          numeroResolucion: true,
          tipoResolucion: true,
          modalidad: true,
          tituloProyecto: true,
          fechaResolucion: true,
          nombreAsesor: true,
          esFinanciado: true,
          monto: true,
          status: true,
          facultad: {
            select: {
              nombre: true
            }
          },
          departamento: {
            select: {
              nombre: true
            }
          },
          estudiantes: {
            select: {
              nombres: true,
              apellidos: true,
              codigo: true,
              dni: true
            }
          },
          archivos: {
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              tipo: true
            }
          }
        },
        orderBy: {
          fechaResolucion: 'desc'
        },
        take: 50
      })

      // Combinar resultados y eliminar duplicados
      const constanciasIds = new Set(constancias.map(c => c.id))
      const resolucionesIds = new Set(resoluciones.map(r => r.id))

      constanciasAdicionales.forEach(c => {
        if (!constanciasIds.has(c.id)) {
          constancias.push(c)
        }
      })

      resolucionesAdicionales.forEach(r => {
        if (!resolucionesIds.has(r.id)) {
          resoluciones.push(r)
        }
      })
    }

    // Convertir Decimal a string para serialización
    const resolucionesSerializables = resoluciones.map(res => ({
      ...res,
      monto: res.monto ? res.monto.toString() : null
    }))

    return NextResponse.json({
      constancias,
      resoluciones: resolucionesSerializables,
      total: constancias.length + resoluciones.length
    })

  } catch (error) {
    console.error("Error al buscar documentos:", error)
    return NextResponse.json(
      { error: "Error al buscar documentos" },
      { status: 500 }
    )
  }
}