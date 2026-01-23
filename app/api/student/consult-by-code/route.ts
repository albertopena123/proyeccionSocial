import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { codigo } = await request.json()

    if (!codigo) {
      return NextResponse.json(
        { error: "Código de estudiante es requerido" },
        { status: 400 }
      )
    }

    // Llamada a la API externa de UNAMAD (v2 - por código)
    const response = await fetch(
      `https://daa-documentos.unamad.edu.pe:8081/api/data/student/v2/${codigo}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.UNAMAD_API_TOKEN}`,
        },
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
    console.log("Respuesta del API UNAMAD (v2):", apiResponse)

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
    console.log("Datos formateados (v2):", formattedData)

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("Error al consultar estudiante por código:", error)
    return NextResponse.json(
      { error: "Error al consultar la información del estudiante" },
      { status: 500 }
    )
  }
}
