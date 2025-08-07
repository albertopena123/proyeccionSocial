// app/api/auth/register/route.ts

import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import crypto from "crypto"
import { sendVerificationEmail } from "@/lib/email"

const registerSchema = z.object({
  studentCode: z.string()
    .regex(/^\d{6,10}$/, "Código de estudiante inválido (6-10 dígitos)"),
  name: z.string()
    .min(3, "El nombre debe tener al menos 3 caracteres"),
  documentType: z.enum(["DNI", "CE", "PASAPORTE", "PTP", "CPP"] as const).refine(
    val => ["DNI", "CE", "PASAPORTE", "PTP", "CPP"].includes(val),
    { message: "Tipo de documento inválido" }
  ),
  documentNumber: z.string()
    .min(6, "Número de documento inválido")
    .max(12, "Número de documento inválido")
    .transform(val => val.toUpperCase()),
  sex: z.enum(["M", "F"] as const).refine(
    val => ["M", "F"].includes(val),
    { message: "Debe seleccionar el sexo" }
  ),
  faculty: z.string()
    .min(1, "Debe seleccionar una facultad"),
  career: z.string()
    .min(1, "Debe seleccionar una carrera"),
  careerCode: z.string()
    .min(1, "Código de carrera requerido"),
  enrollmentDate: z.string()
    .regex(/^\d{4}-[1-2]$/, "Periodo de ingreso inválido (ej: 2018-1)"),
  email: z.string()
    .email("Email inválido")
    .regex(/^[a-zA-Z0-9._%+-]+@unamad\.edu\.pe$/, "Debe ser un correo institucional @unamad.edu.pe"),
  personalEmail: z.string()
    .email("Email personal inválido"),
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
}).refine((data) => {
  // Validación específica según tipo de documento
  switch (data.documentType) {
    case "DNI":
      return /^\d{8}$/.test(data.documentNumber)
    case "CE":
    case "PTP":
    case "CPP":
      return /^[A-Z0-9]{9,12}$/.test(data.documentNumber)
    case "PASAPORTE":
      return /^[A-Z0-9]{6,12}$/.test(data.documentNumber)
    default:
      return false
  }
}, {
  message: "Número de documento inválido para el tipo seleccionado",
  path: ["documentNumber"]
})

// Función para generar token de verificación
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validatedData = registerSchema.parse(body)
    
    const { 
      studentCode,
      name,
      documentType,
      documentNumber,
      sex,
      faculty,
      career,
      careerCode,
      enrollmentDate,
      email,
      personalEmail,
      password 
    } = validatedData

    // Verificar si el usuario ya existe por email institucional
    const existsByEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existsByEmail) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con este correo institucional" },
        { status: 400 }
      )
    }

    // Verificar si el usuario ya existe por código de estudiante
    const existsByStudentCode = await prisma.user.findUnique({
      where: { studentCode },
    })

    if (existsByStudentCode) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con este código de estudiante" },
        { status: 400 }
      )
    }

    // Verificar si el usuario ya existe por número de documento
    const existsByDocument = await prisma.user.findUnique({
      where: { documentNumber },
    })

    if (existsByDocument) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con este número de documento" },
        { status: 400 }
      )
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Generar token de verificación
    const verificationToken = generateVerificationToken()

    // Crear usuario (inactivo por defecto)
    const user = await prisma.user.create({
      data: {
        studentCode,
        name,
        documentType,
        documentNumber,
        sex,
        dni: documentType === "DNI" ? documentNumber : null, // Mantener compatibilidad con campo dni
        faculty,
        career,
        careerCode,
        enrollmentDate, // Ahora es string, no necesita conversión
        email: email.toLowerCase(),
        personalEmail: personalEmail.toLowerCase(),
        password: hashedPassword,
        isActive: false, // Usuario inactivo hasta verificación
        verificationToken,
        role: 'USER', // Rol por defecto
        // Crear preferencias por defecto
        preferences: {
          create: {
            theme: 'system',
            radius: 0.5,
            fontSize: 'default',
            reducedMotion: false,
            highContrast: false,
          }
        }
      },
      include: {
        preferences: true
      }
    })

    // Enviar email de verificación
    try {
      const emailResult = await sendVerificationEmail(user.email, user.name || 'Usuario', verificationToken)
      if (!emailResult.success) {
        console.error("Error enviando email de verificación:", emailResult.error)
      }
    } catch (emailError) {
      console.error("Error enviando email de verificación:", emailError)
      // No fallar el registro si el email no se envía, pero notificar al usuario
    }

    return NextResponse.json({
      message: "Usuario registrado exitosamente. Revisa tu correo institucional para activar tu cuenta.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        studentCode: user.studentCode,
        isActive: user.isActive,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error en registro:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}