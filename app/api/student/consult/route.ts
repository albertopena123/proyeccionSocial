import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit"

export async function POST(request: NextRequest) {
  try {
    // Esta ruta expone la ficha completa de un estudiante (DNI, correos, carrera)
    // consultando la API de la universidad con el token del servidor. Sin sesión,
    // cualquiera podía recorrer el espacio de DNIs y extraer el padrón entero.
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const limit = rateLimit(`student-consult:${session.user.id}`, 60, 60_000)
    if (!limit.allowed) {
      return rateLimitResponse(limit, "Demasiadas consultas. Intenta de nuevo en unos segundos.")
    }

    const { dni } = await request.json()

    // El valor se interpola en la URL de la API externa: sin validar, un "../"
    // redirige la petición a otro endpoint del servidor de la universidad
    // llevándose nuestro token de autorización.
    if (typeof dni !== "string" || !/^\d{8}$/.test(dni)) {
      return NextResponse.json(
        { error: "DNI inválido. Debe tener 8 dígitos" },
        { status: 400 }
      )
    }

    // Llamada a la API externa de UNAMAD (timeout 10s para evitar OS 10054 en proxy)
    const response = await fetch(
      `https://daa-documentos.unamad.edu.pe:8081/api/data/student/${encodeURIComponent(dni)}`,
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
    if (!apiResponse.data || !Array.isArray(apiResponse.data) || apiResponse.data.length === 0) {
      return NextResponse.json(
        { error: "Formato de respuesta inesperado o estudiante no encontrado" },
        { status: 404 }
      )
    }

    // Obtener los datos del primer estudiante
    const studentData = apiResponse.data[0].info
    const totalCredits = apiResponse.data[0].totalCreditsApproved

    // Formatear los datos según la nueva estructura de la API
    const formattedData = {
      codigo: studentData.username,
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
      creditosAprobados: totalCredits
    }

    return NextResponse.json(formattedData)
  } catch (error) {
    // Sin volcar la respuesta: los logs de PM2 acababan con el DNI y los correos
    // de cada consulta en texto claro.
    console.error("Error al consultar estudiante:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Error al consultar la información del estudiante" },
      { status: 500 }
    )
  }
}
