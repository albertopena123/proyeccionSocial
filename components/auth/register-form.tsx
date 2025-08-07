"use client"

import type React from "react"
import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Eye, EyeOff, Mail, Lock, User, Loader2, Check, X, Calendar, IdCard, GraduationCap, Building2, BookOpen, Hash, Search } from "lucide-react"
import Link from "next/link"

// Tipos
interface PasswordStrength {
    score: number
    label: string
    color: string
}

interface FormData {
    studentCode: string
    name: string
    documentType: string
    documentNumber: string
    sex: string
    faculty: string
    career: string
    careerCode: string
    enrollmentDate: string
    email: string
    personalEmail: string
    password: string
    confirmPassword: string
}

// Constantes - Tipos de documento para Perú
const DOCUMENT_TYPES = [
    { value: "DNI", label: "DNI - Documento Nacional de Identidad" },
    { value: "CE", label: "CE - Carnet de Extranjería" },
    { value: "PASAPORTE", label: "Pasaporte" },
    { value: "PTP", label: "PTP - Permiso Temporal de Permanencia" },
    { value: "CPP", label: "CPP - Carné de Permiso Temporal de Permanencia" },
]

const SEX_OPTIONS = [
    { value: "M", label: "Masculino" },
    { value: "F", label: "Femenino" },
]

// Constantes - Facultades y carreras de UNAMAD
const FACULTIES_AND_CAREERS = {
    "Facultad de Ingeniería": [
        { name: "Ingeniería de Sistemas e Informática", code: "ISI" },
        { name: "Ingeniería Forestal y Medio Ambiente", code: "IFMA" },
        { name: "Ingeniería Agroindustrial", code: "IAI" },
    ],
    "Facultad de Educación": [
        { name: "Educación Inicial y Especial", code: "EIE" },
        { name: "Educación Primaria e Informática", code: "EPI" },
        { name: "Educación Matemática y Computación", code: "EMC" },
    ],
    "Facultad de Ciencias de la Salud": [
        { name: "Enfermería", code: "ENF" },
        { name: "Medicina Veterinaria y Zootecnia", code: "MVZ" },
    ],
    "Facultad de Ciencias Económicas y Empresariales": [
        { name: "Administración y Negocios Internacionales", code: "ANI" },
        { name: "Contabilidad y Finanzas", code: "CF" },
    ],
    "Facultad de Derecho y Ciencias Políticas": [
        { name: "Derecho y Ciencias Políticas", code: "DCP" },
    ],
}

const PASSWORD_STRENGTHS: PasswordStrength[] = [
    { score: 0, label: "Muy débil", color: "bg-red-500" },
    { score: 1, label: "Débil", color: "bg-red-400" },
    { score: 2, label: "Regular", color: "bg-yellow-500" },
    { score: 3, label: "Buena", color: "bg-blue-500" },
    { score: 4, label: "Fuerte", color: "bg-green-500" },
    { score: 5, label: "Muy fuerte", color: "bg-green-600" },
]

const VALIDATION_RULES = [
    { key: 'minLength', test: (pwd: string) => pwd.length >= 8, label: '8+ caracteres' },
    { key: 'hasUppercase', test: (pwd: string) => /[A-Z]/.test(pwd), label: 'Mayúscula' },
    { key: 'hasLowercase', test: (pwd: string) => /[a-z]/.test(pwd), label: 'Minúscula' },
    { key: 'hasNumber', test: (pwd: string) => /[0-9]/.test(pwd), label: 'Número' },
]

// Componente reutilizable para el botón de mostrar/ocultar contraseña
const PasswordToggle = ({ show, onToggle, disabled }: {
    show: boolean;
    onToggle: () => void;
    disabled?: boolean
}) => (
    <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
        onClick={onToggle}
        disabled={disabled}
    >
        {show ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
        <span className="sr-only">{show ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
    </Button>
)

// Componente para indicador de validación
const ValidationIndicator = ({ valid, label }: { valid: boolean; label: string }) => (
    <div className={`flex items-center space-x-1 ${valid ? "text-green-600" : "text-gray-400"}`}>
        {valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
        <span>{label}</span>
    </div>
)

// Función para evaluar la fortaleza de la contraseña
const getPasswordStrength = (password: string): PasswordStrength => {
    const score = VALIDATION_RULES.filter(rule => rule.test(password)).length + (password.length >= 8 ? 1 : 0)
    return PASSWORD_STRENGTHS[Math.min(score, PASSWORD_STRENGTHS.length - 1)]
}

// Función para validar el correo institucional
const validateInstitutionalEmail = (email: string): boolean => {
    const regex = /^[a-zA-Z0-9._%+-]+@unamad\.edu\.pe$/
    return regex.test(email.toLowerCase())
}

// Función para validar número de documento según tipo
const validateDocumentNumber = (type: string, number: string): boolean => {
    switch (type) {
        case "DNI":
            return /^\d{8}$/.test(number)
        case "CE":
        case "PTP":
        case "CPP":
            return /^[A-Z0-9]{9,12}$/.test(number)
        case "PASAPORTE":
            return /^[A-Z0-9]{6,12}$/.test(number)
        default:
            return false
    }
}

// Función para obtener placeholder según tipo de documento
const getDocumentPlaceholder = (type: string): string => {
    switch (type) {
        case "DNI":
            return "12345678"
        case "CE":
        case "PTP":
        case "CPP":
            return "000123456"
        case "PASAPORTE":
            return "ABC123456"
        default:
            return "Número de documento"
    }
}

// Función para validar código de estudiante
const validateStudentCode = (code: string): boolean => {
    return /^\d{6,10}$/.test(code)
}

export function RegisterForm() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingData, setIsFetchingData] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [acceptTerms, setAcceptTerms] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [formData, setFormData] = useState<FormData>({
        studentCode: "",
        name: "",
        documentType: "DNI",
        documentNumber: "",
        sex: "",
        faculty: "",
        career: "",
        careerCode: "",
        enrollmentDate: "",
        email: "",
        personalEmail: "",
        password: "",
        confirmPassword: "",
    })

    // Obtener carreras basadas en la facultad seleccionada
    const availableCareers = useMemo(() => {
        if (!formData.faculty) return []
        return FACULTIES_AND_CAREERS[formData.faculty as keyof typeof FACULTIES_AND_CAREERS] || []
    }, [formData.faculty])

    // Cálculos memoizados
    const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password])
    const passwordsMatch = useMemo(
        () => formData.password && formData.confirmPassword && formData.password === formData.confirmPassword,
        [formData.password, formData.confirmPassword]
    )

    const validations = useMemo(() =>
        VALIDATION_RULES.map(rule => ({
            ...rule,
            valid: rule.test(formData.password)
        })),
        [formData.password]
    )

    // Validaciones por paso
    const isStep1Valid = useMemo(() => {
        return formData.studentCode && validateStudentCode(formData.studentCode) &&
               formData.name && formData.name.length >= 3 &&
               formData.documentType && formData.documentNumber && 
               validateDocumentNumber(formData.documentType, formData.documentNumber) &&
               formData.sex
    }, [formData.studentCode, formData.name, formData.documentType, formData.documentNumber, formData.sex])

    const isStep2Valid = useMemo(() => {
        return formData.faculty && formData.career && formData.careerCode && formData.enrollmentDate
    }, [formData.faculty, formData.career, formData.careerCode, formData.enrollmentDate])

    const isStep3Valid = useMemo(() => {
        return formData.email && validateInstitutionalEmail(formData.email) &&
               formData.personalEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalEmail) &&
               validations[0].valid && passwordsMatch && acceptTerms
    }, [formData.email, formData.personalEmail, validations, passwordsMatch, acceptTerms])

    // Función para buscar datos por DNI
    const fetchDataByDNI = useCallback(async (dni: string) => {
        if (!/^\d{8}$/.test(dni)) return
        
        setIsFetchingData(true)
        try {
            const response = await fetch(`/api/student/by-dni/${dni}`)
            if (response.ok) {
                const data = await response.json()
                setFormData(prev => ({
                    ...prev,
                    ...data,
                    // Mantener campos que el usuario ya haya llenado manualmente
                    password: prev.password,
                    confirmPassword: prev.confirmPassword,
                }))
                toast.success("Datos encontrados", {
                    description: "Se han autocompletado los datos del estudiante",
                })
                
                // Si tenemos código de estudiante, buscar datos adicionales
                if (data.studentCode) {
                    fetchAdditionalDataByCode(data.studentCode)
                }
            } else if (response.status === 404) {
                toast.info("No se encontraron datos", {
                    description: "Por favor, completa el formulario manualmente",
                })
            }
        } catch (error) {
            console.error("Error fetching data by DNI:", error)
            toast.error("Error al buscar datos", {
                description: "No se pudieron obtener los datos del estudiante",
            })
        } finally {
            setIsFetchingData(false)
        }
    }, [])

    // Función para buscar datos adicionales por código de estudiante
    const fetchAdditionalDataByCode = useCallback(async (code: string) => {
        if (!/^\d{6,10}$/.test(code)) return
        
        try {
            const response = await fetch(`/api/student/by-code/${code}`)
            if (response.ok) {
                const data = await response.json()
                setFormData(prev => ({
                    ...prev,
                    // Solo actualizar campos que no estaban completos
                    sex: prev.sex || data.sex,
                    careerCode: prev.careerCode || data.careerCode,
                    enrollmentDate: prev.enrollmentDate || data.enrollmentDate,
                    faculty: data.faculty || prev.faculty,
                    career: data.career || prev.career,
                }))
            }
        } catch (error) {
            console.error("Error fetching additional data:", error)
        }
    }, [])

    // Función para buscar datos por código de estudiante
    const fetchDataByStudentCode = useCallback(async (code: string) => {
        if (!/^\d{6,10}$/.test(code)) return
        
        setIsFetchingData(true)
        try {
            const response = await fetch(`/api/student/by-code/${code}`)
            if (response.ok) {
                const data = await response.json()
                setFormData(prev => ({
                    ...prev,
                    ...data,
                    // Mantener campos sensibles
                    documentNumber: prev.documentNumber || data.documentNumber,
                    password: prev.password,
                    confirmPassword: prev.confirmPassword,
                }))
                toast.success("Datos encontrados", {
                    description: "Se han autocompletado los datos académicos",
                })
                
                // Si tenemos DNI, buscar datos adicionales
                if (data.documentNumber && data.documentType === 'DNI') {
                    fetchDataByDNI(data.documentNumber)
                }
            } else if (response.status === 404) {
                toast.info("No se encontraron datos", {
                    description: "Por favor, completa el formulario manualmente",
                })
            }
        } catch (error) {
            console.error("Error fetching data by code:", error)
            toast.error("Error al buscar datos", {
                description: "No se pudieron obtener los datos del estudiante",
            })
        } finally {
            setIsFetchingData(false)
        }
    }, [])

    // Manejador de cambios en el formulario
    const handleInputChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setFormData(prev => ({ ...prev, [field]: value }))
        
        // Autocompletar cuando se ingresa DNI completo
        if (field === 'documentNumber' && formData.documentType === 'DNI' && value.length === 8) {
            fetchDataByDNI(value)
        }
        
        // Autocompletar cuando se ingresa código de estudiante completo
        if (field === 'studentCode' && value.length >= 6) {
            // Debounce para evitar múltiples llamadas
            const timer = setTimeout(() => {
                fetchDataByStudentCode(value)
            }, 500)
            return () => clearTimeout(timer)
        }
    }

    // Manejador para selects
    const handleSelectChange = (field: keyof FormData) => (value: string) => {
        if (field === 'career') {
            const selectedCareer = availableCareers.find(c => c.name === value)
            setFormData(prev => ({ 
                ...prev, 
                [field]: value,
                careerCode: selectedCareer?.code || ''
            }))
        } else {
            setFormData(prev => ({ ...prev, [field]: value }))
        }
    }

    // Navegación entre pasos
    const nextStep = () => {
        if (currentStep === 1 && !isStep1Valid) {
            toast.error("Por favor, completa todos los campos correctamente")
            return
        }
        if (currentStep === 2 && !isStep2Valid) {
            toast.error("Por favor, completa todos los campos académicos")
            return
        }
        setCurrentStep(prev => Math.min(prev + 1, 3))
    }

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1))
    }

    // Envío del formulario
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!isStep3Valid) {
            toast.error("Por favor, completa todos los campos correctamente")
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentCode: formData.studentCode.trim(),
                    name: formData.name.trim(),
                    documentType: formData.documentType,
                    documentNumber: formData.documentNumber.trim().toUpperCase(),
                    sex: formData.sex,
                    faculty: formData.faculty,
                    career: formData.career,
                    careerCode: formData.careerCode,
                    enrollmentDate: formData.enrollmentDate.trim(), // Ahora es string, no necesita conversión
                    email: formData.email.toLowerCase().trim(),
                    personalEmail: formData.personalEmail.toLowerCase().trim(),
                    password: formData.password,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                // Manejar errores específicos
                if (data.error?.includes("correo institucional")) {
                    toast.error("Correo ya registrado", {
                        description: "Ya existe una cuenta con este correo institucional. Intenta recuperar tu contraseña.",
                    })
                } else if (data.error?.includes("código de estudiante")) {
                    toast.error("Código de estudiante duplicado", {
                        description: "Este código de estudiante ya está registrado. Verifica tus datos.",
                    })
                } else if (data.error?.includes("documento")) {
                    toast.error("Documento ya registrado", {
                        description: "Ya existe una cuenta con este número de documento. Si olvidaste tu contraseña, puedes recuperarla.",
                    })
                } else {
                    toast.error("Error al registrar", {
                        description: data.error || "Por favor, verifica tus datos e intenta de nuevo",
                    })
                }
                return
            }

            toast.success("¡Registro exitoso!", {
                description: "Revisa tu correo institucional para activar tu cuenta",
                duration: 5000,
            })

            // Resetear el formulario
            setFormData({
                studentCode: "",
                name: "",
                documentType: "DNI",
                documentNumber: "",
                sex: "",
                faculty: "",
                career: "",
                careerCode: "",
                enrollmentDate: "",
                email: "",
                personalEmail: "",
                password: "",
                confirmPassword: "",
            })
            setCurrentStep(1)

            setTimeout(() => router.push("/login"), 3000)
        } catch (error) {
            console.error("Error en registro:", error)
            toast.error("Error de conexión", {
                description: "No se pudo conectar con el servidor. Por favor, intenta de nuevo.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const baseInputClass = "pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"

    return (
        <CardContent className="space-y-6">
            {/* Indicador de pasos */}
            <div className="flex justify-between mb-8">
                {[1, 2, 3].map((step) => (
                    <div
                        key={step}
                        className={`flex items-center ${step < 3 ? 'flex-1' : ''}`}
                    >
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold
                                ${currentStep >= step
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-500'
                                }`}
                        >
                            {step}
                        </div>
                        {step < 3 && (
                            <div
                                className={`flex-1 h-0.5 mx-2
                                    ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}
                                `}
                            />
                        )}
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Paso 1: Datos Personales */}
                {currentStep === 1 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800">Datos Personales</h3>
                        
                        {/* Tipo de Documento - PRIMERO */}
                        <div className="space-y-2">
                            <Label htmlFor="documentType" className="text-sm font-medium text-gray-700">
                                Tipo de Documento
                            </Label>
                            <div className="relative">
                                <IdCard className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                                <Select value={formData.documentType} onValueChange={handleSelectChange('documentType')}>
                                    <SelectTrigger className="pl-10 h-12">
                                        <SelectValue placeholder="Selecciona tipo de documento" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DOCUMENT_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Número de Documento - SEGUNDO */}
                        <div className="space-y-2">
                            <Label htmlFor="documentNumber" className="text-sm font-medium text-gray-700">
                                Número de {formData.documentType || "Documento"}
                            </Label>
                            <div className="relative">
                                <IdCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="documentNumber"
                                    type="text"
                                    placeholder={getDocumentPlaceholder(formData.documentType)}
                                    value={formData.documentNumber}
                                    onChange={handleInputChange('documentNumber')}
                                    className={`${baseInputClass} ${isFetchingData ? 'bg-blue-50' : ''}`}
                                    required
                                    disabled={isLoading || isFetchingData}
                                    title={`Ingresa un ${formData.documentType} válido`}
                                />
                                {isFetchingData && formData.documentType === 'DNI' && (
                                    <div className="absolute right-3 top-3">
                                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                    </div>
                                )}
                            </div>
                            {formData.documentNumber && !validateDocumentNumber(formData.documentType, formData.documentNumber) && (
                                <p className="text-sm text-red-500">
                                    {formData.documentType === "DNI" 
                                        ? "El DNI debe tener 8 dígitos"
                                        : `El ${formData.documentType} debe tener el formato correcto`}
                                </p>
                            )}
                            {formData.documentType === 'DNI' && (
                                <p className="text-xs text-gray-500">
                                    Al ingresar tu DNI, se autocompletarán tus datos personales
                                </p>
                            )}
                        </div>
                        
                        {/* Código de estudiante - TERCERO */}
                        <div className="space-y-2">
                            <Label htmlFor="studentCode" className="text-sm font-medium text-gray-700">
                                Código de Estudiante
                            </Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="studentCode"
                                    type="text"
                                    placeholder="20230001"
                                    value={formData.studentCode}
                                    onChange={handleInputChange('studentCode')}
                                    className={`${baseInputClass} ${isFetchingData ? 'bg-blue-50' : ''}`}
                                    required
                                    disabled={isLoading || isFetchingData}
                                    pattern="\d{6,10}"
                                    title="Ingresa un código válido (6-10 dígitos)"
                                />
                                {isFetchingData && (
                                    <div className="absolute right-3 top-3">
                                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">
                                Al ingresar tu código, se autocompletarán tus datos académicos
                            </p>
                        </div>

                        {/* Nombre completo - CUARTO */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                                Nombre Completo
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Juan Pérez García"
                                    value={formData.name}
                                    onChange={handleInputChange('name')}
                                    className={baseInputClass}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Sexo - QUINTO */}
                        <div className="space-y-2">
                            <Label htmlFor="sex" className="text-sm font-medium text-gray-700">
                                Sexo
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                                <Select value={formData.sex} onValueChange={handleSelectChange('sex')}>
                                    <SelectTrigger className="pl-10 h-12">
                                        <SelectValue placeholder="Selecciona tu sexo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SEX_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button
                            type="button"
                            onClick={nextStep}
                            className="w-full h-12"
                            disabled={!isStep1Valid}
                        >
                            Siguiente
                        </Button>
                    </div>
                )}

                {/* Paso 2: Datos Académicos */}
                {currentStep === 2 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800">Datos Académicos</h3>
                        
                        {/* Facultad */}
                        <div className="space-y-2">
                            <Label htmlFor="faculty" className="text-sm font-medium text-gray-700">
                                Facultad
                            </Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                                <Select value={formData.faculty} onValueChange={handleSelectChange('faculty')}>
                                    <SelectTrigger className="pl-10 h-12">
                                        <SelectValue placeholder="Selecciona tu facultad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(FACULTIES_AND_CAREERS).map((faculty) => (
                                            <SelectItem key={faculty} value={faculty}>
                                                {faculty}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Carrera */}
                        <div className="space-y-2">
                            <Label htmlFor="career" className="text-sm font-medium text-gray-700">
                                Carrera Profesional
                            </Label>
                            <div className="relative">
                                <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                                <Select 
                                    value={formData.career} 
                                    onValueChange={handleSelectChange('career')}
                                    disabled={!formData.faculty}
                                >
                                    <SelectTrigger className="pl-10 h-12">
                                        <SelectValue placeholder={formData.faculty ? "Selecciona tu carrera" : "Primero selecciona una facultad"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableCareers.map((career) => (
                                            <SelectItem key={career.code} value={career.name}>
                                                {career.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Código de carrera (auto-rellenado) */}
                        <div className="space-y-2">
                            <Label htmlFor="careerCode" className="text-sm font-medium text-gray-700">
                                Código de Carrera
                            </Label>
                            <div className="relative">
                                <BookOpen className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="careerCode"
                                    type="text"
                                    value={formData.careerCode}
                                    className={`${baseInputClass} bg-gray-50`}
                                    disabled
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* Periodo de ingreso */}
                        <div className="space-y-2">
                            <Label htmlFor="enrollmentDate" className="text-sm font-medium text-gray-700">
                                Periodo de Ingreso
                            </Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="enrollmentDate"
                                    type="text"
                                    placeholder="2018-1"
                                    value={formData.enrollmentDate}
                                    onChange={handleInputChange('enrollmentDate')}
                                    className={baseInputClass}
                                    required
                                    disabled={isLoading}
                                    pattern="\d{4}-[1-2]"
                                    title="Formato: año-semestre (ej: 2018-1, 2020-2)"
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                Formato: año-semestre (ej: 2018-1 para primer semestre, 2018-2 para segundo)
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={prevStep}
                                className="flex-1 h-12"
                            >
                                Anterior
                            </Button>
                            <Button
                                type="button"
                                onClick={nextStep}
                                className="flex-1 h-12"
                                disabled={!isStep2Valid}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}

                {/* Paso 3: Credenciales */}
                {currentStep === 3 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800">Credenciales de Acceso</h3>
                        
                        {/* Correo institucional */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                Correo Institucional
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nombre.apellido@unamad.edu.pe"
                                    value={formData.email}
                                    onChange={handleInputChange('email')}
                                    className={baseInputClass}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            {formData.email && !validateInstitutionalEmail(formData.email) && (
                                <p className="text-sm text-red-500">Debe ser un correo @unamad.edu.pe válido</p>
                            )}
                        </div>

                        {/* Correo personal */}
                        <div className="space-y-2">
                            <Label htmlFor="personalEmail" className="text-sm font-medium text-gray-700">
                                Correo Personal
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="personalEmail"
                                    type="email"
                                    placeholder="tu@ejemplo.com"
                                    value={formData.personalEmail}
                                    onChange={handleInputChange('personalEmail')}
                                    className={baseInputClass}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Campo de contraseña */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                                Contraseña
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleInputChange('password')}
                                    className={`${baseInputClass} pr-10`}
                                    required
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                />
                                <PasswordToggle
                                    show={showPassword}
                                    onToggle={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Indicador de fortaleza y validaciones */}
                            {formData.password && (
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                                style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-gray-600">{passwordStrength.label}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                        {validations.map(validation => (
                                            <ValidationIndicator
                                                key={validation.key}
                                                valid={validation.valid}
                                                label={validation.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Campo de confirmación de contraseña */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                                Confirmar contraseña
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange('confirmPassword')}
                                    className={`${baseInputClass} pr-10 ${formData.confirmPassword && !passwordsMatch
                                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                            : ""
                                        }`}
                                    required
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                />
                                <PasswordToggle
                                    show={showConfirmPassword}
                                    onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={isLoading}
                                />
                            </div>

                            {formData.confirmPassword && (
                                <ValidationIndicator
                                    valid={!!passwordsMatch}
                                    label={passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                                />
                            )}
                        </div>

                        {/* Términos y condiciones */}
                        <div className="flex items-start space-x-2">
                            <input
                                id="terms"
                                name="terms"
                                type="checkbox"
                                checked={acceptTerms}
                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                                disabled={isLoading}
                            />
                            <Label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
                                Acepto los{" "}
                                <Link href="/terms" className="text-blue-600 hover:text-blue-500 underline underline-offset-2">
                                    términos
                                </Link>
                                {" y "}
                                <Link href="/privacy" className="text-blue-600 hover:text-blue-500 underline underline-offset-2">
                                    políticas
                                </Link>
                                {" de uso"}
                            </Label>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={prevStep}
                                className="flex-1 h-12"
                                disabled={isLoading}
                            >
                                Anterior
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-200"
                                disabled={isLoading || !isStep3Valid}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Registrando...
                                    </>
                                ) : (
                                    "Registrarse"
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </form>
        </CardContent>
    )
}