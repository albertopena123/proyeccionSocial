import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dni = searchParams.get('dni')

    if (!dni) {
      return NextResponse.json(
        { error: "DNI es requerido" },
        { status: 400 }
      )
    }

    // Llamada a la API externa de UNAMAD
    const response = await fetch(
      `https://daa-documentos.unamad.edu.pe:8081/api/data/teacher/${dni}`,
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
          { error: "Docente no encontrado" },
          { status: 404 }
        )
      }
      throw new Error(`Error al consultar: ${response.status}`)
    }

    const teacherData = await response.json()

    // Formatear los datos según la respuesta de la API de UNAMAD
    const formattedData = {
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
    }

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("Error al consultar docente:", error)
    return NextResponse.json(
      { error: "Error al consultar la información del docente" },
      { status: 500 }
    )
  }
}

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
      `https://daa-documentos.unamad.edu.pe:8081/api/data/teacher/${dni}`,
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
          { error: "Docente no encontrado" },
          { status: 404 }
        )
      }
      throw new Error(`Error al consultar: ${response.status}`)
    }

    const teacherData = await response.json()

    // Formatear los datos según la respuesta de la API de UNAMAD
    const formattedData = {
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
    }

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("Error al consultar docente:", error)
    return NextResponse.json(
      { error: "Error al consultar la información del docente" },
      { status: 500 }
    )
  }
}