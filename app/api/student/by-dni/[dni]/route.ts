import { NextResponse } from "next/server"

// Bearer token para la API de UNAMAD desde variable de entorno
const UNAMAD_API_TOKEN = process.env.UNAMAD_API_TOKEN || ""

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dni: string }> }
) {
  try {
    const { dni } = await params

    // Validar que el DNI tenga 8 dígitos
    if (!/^\d{8}$/.test(dni)) {
      return NextResponse.json(
        { error: "DNI inválido. Debe tener 8 dígitos" },
        { status: 400 }
      )
    }

    // Llamar a la API externa con autenticación
    const response = await fetch(
      `https://daa-documentos.unamad.edu.pe:8081/api/data/student/${dni}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${UNAMAD_API_TOKEN}`,
        },
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Token de autenticación inválido o expirado")
        return NextResponse.json(
          { error: "Error de autenticación con el servidor" },
          { status: 500 }
        )
      }
      if (response.status === 404) {
        return NextResponse.json(
          { error: "No se encontraron datos para este DNI" },
          { status: 404 }
        )
      }
      throw new Error(`Error al obtener datos: ${response.status}`)
    }

    const responseData = await response.json()

    // La API ahora devuelve un objeto con status, data (array) y message
    if (responseData.status !== 'success' || !responseData.data || responseData.data.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron datos para este DNI" },
        { status: 404 }
      )
    }

    // Tomar el primer elemento del array data
    const studentData = responseData.data[0]
    const info = studentData.info

    // Mapear los datos al formato esperado por el formulario
    const mappedData = {
      studentCode: info.username || '',
      name: `${info.name || ''} ${info.paternalSurname || ''} ${info.maternalSurname || ''}`.trim(),
      documentType: 'DNI',
      documentNumber: info.dni || dni,
      email: info.email || '',
      personalEmail: info.personalEmail || '',
      career: info.carrerName || '',
      faculty: info.facultyName || '',
      totalCreditsApproved: studentData.totalCreditsApproved || 0,
      // Los siguientes campos no vienen en esta API, serán completados con la otra
      sex: '',
      careerCode: '',
      enrollmentDate: '',
    }

    return NextResponse.json(mappedData)
  } catch (error) {
    console.error("Error fetching student data by DNI:", error)
    return NextResponse.json(
      { error: "Error al obtener datos del estudiante" },
      { status: 500 }
    )
  }
}