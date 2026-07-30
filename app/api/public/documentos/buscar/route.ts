import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/security/rate-limit"

// Deja visibles los dos últimos dígitos, suficiente para que quien ya conoce su
// documento reconozca el suyo, inútil para construir un listado de DNIs.
function maskDni(dni: string | null): string | null {
  if (!dni) return dni
  if (dni.length <= 2) return "*".repeat(dni.length)
  return "*".repeat(dni.length - 2) + dni.slice(-2)
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    // Endpoint sin autenticar: sin límite se puede recorrer el abecedario y
    // vaciar el registro de documentos aprobados, 50 fichas por petición.
    const limit = rateLimit(`documentos-buscar:${clientIp(request)}`, 20, 5 * 60_000)
    if (!limit.allowed) {
      return rateLimitResponse(limit, "Demasiadas búsquedas. Intenta de nuevo en unos minutos.")
    }

    // typeof: sin esta comprobación un número o un objeto revientan en .trim() y
    // devuelven un 500.
    if (typeof query !== "string" || query.trim().length < 3) {
      return NextResponse.json(
        { error: "El término de búsqueda debe tener al menos 3 caracteres" },
        { status: 400 }
      )
    }

    if (query.trim().length > 100) {
      return NextResponse.json(
        { error: "El término de búsqueda es demasiado largo" },
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

    // Convertir Decimal a string para serialización y enmascarar documentos de
    // identidad: la consulta es pública y devolvía el DNI completo de estudiantes
    // y asesores, así que servía para cosechar datos personales en bloque.
    const resolucionesSerializables = resoluciones.map(res => ({
      ...res,
      monto: res.monto ? res.monto.toString() : null,
      estudiantes: res.estudiantes.map(est => ({ ...est, dni: maskDni(est.dni) }))
    }))

    const constanciasPublicas = constancias.map(c => ({ ...c, dni: maskDni(c.dni) }))

    return NextResponse.json({
      constancias: constanciasPublicas,
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