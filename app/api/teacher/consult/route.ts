import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit"

type TeacherLookup =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; response: Response }

/**
 * Consulta la ficha de un docente en la API de la universidad.
 *
 * Devuelve datos personales (DNI, correos, departamento) usando el token del
 * servidor, así que exige sesión: sin ella cualquiera podía recorrer el espacio
 * de DNIs y extraer la plantilla docente completa.
 */
async function lookupTeacher(dni: unknown): Promise<TeacherLookup> {
  const session = await auth()
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }

  const limit = rateLimit(`teacher-consult:${session.user.id}`, 60, 60_000)
  if (!limit.allowed) {
    return {
      ok: false,
      response: rateLimitResponse(limit, "Demasiadas consultas. Intenta de nuevo en unos segundos."),
    }
  }

  // El DNI se interpola en la URL de la API externa: sin validar, un "../"
  // redirige la petición a otro endpoint del servidor de la universidad
  // llevándose nuestro token de autorización.
  if (typeof dni !== "string" || !/^\d{8}$/.test(dni)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "DNI inválido. Debe tener 8 dígitos" }, { status: 400 }),
    }
  }

  const response = await fetch(
    `https://daa-documentos.unamad.edu.pe:8081/api/data/teacher/${encodeURIComponent(dni)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.UNAMAD_API_TOKEN}`,
      },
      signal: AbortSignal.timeout(10000),
    }
  )

  if (!response.ok) {
    if (response.status === 404) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Docente no encontrado" }, { status: 404 }),
      }
    }
    throw new Error(`Error al consultar: ${response.status}`)
  }

  const teacherData = await response.json()

  // Formatear los datos según la respuesta de la API de UNAMAD
  return {
    ok: true,
    data: {
      codigo: teacherData.userName,
      dni: teacherData.dni,
      nombres: teacherData.name,
      apellidoPaterno: teacherData.paternalSurname,
      apellidoMaterno: teacherData.maternalSurname,
      apellidos: `${teacherData.paternalSurname} ${teacherData.maternalSurname}`,
      nombreCompleto: `${teacherData.paternalSurname} ${teacherData.maternalSurname} ${teacherData.name}`,
      email: teacherData.email,
      emailPersonal: teacherData.personalEmail,
      departamento: teacherData.academicDepartament,
      facultad: teacherData.facultyName,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const dni = new URL(request.url).searchParams.get('dni')

    const result = await lookupTeacher(dni)
    if (!result.ok) return result.response

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("Error al consultar docente:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Error al consultar la información del docente" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { dni } = await request.json()

    const result = await lookupTeacher(dni)
    if (!result.ok) return result.response

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("Error al consultar docente:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Error al consultar la información del docente" },
      { status: 500 }
    )
  }
}
