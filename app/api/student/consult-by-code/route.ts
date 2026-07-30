import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit"

export async function POST(request: NextRequest) {
  try {
    // Igual que /api/student/consult: devuelve datos personales usando el token de
    // la universidad, así que exige sesión.
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const limit = rateLimit(`student-consult-code:${session.user.id}`, 60, 60_000)
    if (!limit.allowed) {
      return rateLimitResponse(limit, "Demasiadas consultas. Intenta de nuevo en unos segundos.")
    }

    const { codigo } = await request.json()

    // El código se interpola en la URL de la API externa; sin validar permite
    // redirigir la petición a otro endpoint con nuestro token.
    if (typeof codigo !== "string" || !/^\d{6,10}$/.test(codigo)) {
      return NextResponse.json(
        { error: "Código de estudiante inválido" },
        { status: 400 }
      )
    }

    // Llamada a la API externa de UNAMAD (v2 - por código) con timeout 10s
    const response = await fetch(
      `https://daa-documentos.unamad.edu.pe:8081/api/data/student/v2/${encodeURIComponent(codigo)}`,
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
        return NextResponse.json(
          { error: "Estudiante no encontrado" },
          { status: 404 }
        )
      }
      throw new Error(`Error al consultar: ${response.status}`)
    }

    const apiResponse = await response.json()

    // Verificar si la respuesta tiene el formato esperado
    if (!apiResponse.infoStudent) {
      return NextResponse.json(
        { error: "Formato de respuesta inesperado o estudiante no encontrado" },
        { status: 404 }
      )
    }

    const studentData = apiResponse.infoStudent

    // Formatear los datos según la estructura de la API v2
    const formattedData = {
      codigo: studentData.userName,
      dni: studentData.dni,
      nombres: studentData.name,
      apellidoPaterno: studentData.paternalSurname,
      apellidoMaterno: studentData.maternalSurname,
      apellidos: `${studentData.paternalSurname} ${studentData.maternalSurname}`,
      nombreCompleto: `${studentData.paternalSurname} ${studentData.maternalSurname} ${studentData.name}`,
      email: studentData.email,
      emailPersonal: studentData.personalEmail,
      carrera: studentData.carrerName,
      facultad: studentData.facultyName,
      ultimoPeriodo: apiResponse.lastAcademicPeriodEnrolled?.text || null
    }

    return NextResponse.json(formattedData)
  } catch (error) {
    // Sin volcar la respuesta: los datos personales no deben quedar en los logs.
    console.error("Error al consultar estudiante por código:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Error al consultar la información del estudiante" },
      { status: 500 }
    )
  }
}
