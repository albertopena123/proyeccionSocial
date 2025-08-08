import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { dni } = await request.json()

    if (!dni) {
      return NextResponse.json(
        { error: "DNI es requerido" },
        { status: 400 }
      )
    }

    // Llamada a la API externa de UNAMAD
    const response = await fetch(
      `https://daa-documentos.unamad.edu.pe:8081/api/data/student/${dni}`,
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
    console.log("Respuesta del API UNAMAD:", apiResponse)

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
    console.log("Datos formateados:", formattedData)

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("Error al consultar estudiante:", error)
    return NextResponse.json(
      { error: "Error al consultar la información del estudiante" },
      { status: 500 }
    )
  }
}