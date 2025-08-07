import { NextResponse } from "next/server"

// Bearer token para la API de UNAMAD desde variable de entorno
const UNAMAD_API_TOKEN = process.env.UNAMAD_API_TOKEN || ""

// Mapear nombres de facultades para mantener consistencia
const FACULTY_MAP: Record<string, string> = {
  'INGENIERIA': 'Facultad de Ingeniería',
  'EDUCACION': 'Facultad de Educación',
  'SALUD': 'Facultad de Ciencias de la Salud',
  'ECONOMICAS': 'Facultad de Ciencias Económicas y Empresariales',
  'DERECHO': 'Facultad de Derecho y Ciencias Políticas',
}

// Mapear nombres de carreras para mantener consistencia
const CAREER_MAP: Record<string, string> = {
  'INGENIERÍA DE SISTEMAS E INFORMÁTICA': 'Ingeniería de Sistemas e Informática',
  'INGENIERÍA FORESTAL Y MEDIO AMBIENTE': 'Ingeniería Forestal y Medio Ambiente',
  'INGENIERÍA AGROINDUSTRIAL': 'Ingeniería Agroindustrial',
  // Agregar más mapeos según sea necesario
}

// Validar formato de periodo de admisión (2018-2)
function validateAdmissionDate(admisionDate: string): string {
  if (!admisionDate) return ''
  
  // Verificar formato año-semestre (ej: 2018-2)
  if (/^\d{4}-[1-2]$/.test(admisionDate)) {
    return admisionDate
  }
  
  // Si no tiene el formato esperado, retornar vacío
  return ''
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // Validar que el código tenga el formato correcto (6-10 dígitos)
    if (!/^\d{6,10}$/.test(code)) {
      return NextResponse.json(
        { error: "Código de estudiante inválido" },
        { status: 400 }
      )
    }

    // Llamar a la API externa con autenticación
    const response = await fetch(
      `https://daa-documentos.unamad.edu.pe:8081/api/getStudentInfo/${code}`,
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
          { error: "No se encontraron datos para este código de estudiante" },
          { status: 404 }
        )
      }
      throw new Error(`Error al obtener datos: ${response.status}`)
    }

    const data = await response.json()

    // La API devuelve un array, tomamos el primer elemento
    const studentData = Array.isArray(data) ? data[0] : data

    if (!studentData) {
      return NextResponse.json(
        { error: "No se encontraron datos del estudiante" },
        { status: 404 }
      )
    }

    // Parsear el nombre completo (formato: APELLIDO APELLIDO, NOMBRES)
    let fullName = studentData.fullName || ''
    
    if (fullName.includes(',')) {
      const [surnames, names] = fullName.split(',')
      fullName = `${names.trim()} ${surnames.trim()}`
    }

    // Mapear los datos al formato esperado por el formulario
    const mappedData = {
      studentCode: studentData.userName || code,
      name: fullName,
      sex: studentData.sex === 1 ? 'M' : studentData.sex === 0 ? 'F' : '',
      career: CAREER_MAP[studentData.carrerName] || studentData.carrerName || '',
      faculty: FACULTY_MAP[studentData.facultyName] || `Facultad de ${studentData.facultyName}` || '',
      careerCode: studentData.carrerCode || '',
      enrollmentDate: validateAdmissionDate(studentData.admisionDate),
      // Campos adicionales que necesitarían venir de otra fuente o ser ingresados manualmente
      documentType: 'DNI',
      documentNumber: '',
      email: '',
      personalEmail: '',
    }

    return NextResponse.json(mappedData)
  } catch (error) {
    console.error("Error fetching student data by code:", error)
    return NextResponse.json(
      { error: "Error al obtener datos del estudiante" },
      { status: 500 }
    )
  }
}