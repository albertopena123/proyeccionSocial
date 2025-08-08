"use client"
import { Suspense } from "react"
import { ConsultaDocumentosClient } from "@/components/consulta/consulta-documentos-client"
import { FileSearch, Award, Users, Heart, GraduationCap, BookOpen, ShieldCheck, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ConsultaDocumentosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">
      {/* Hero Section con gradiente */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-purple-600/10" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
        
        <div className="relative">
          {/* Navigation Bar */}
          <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <Link 
                  href="/" 
                  className="flex items-center gap-2 text-gray-700 hover:text-orange-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">Volver al inicio</span>
                </Link>
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                    <ShieldCheck className="w-4 h-4 text-orange-500" />
                    <span>Sistema Oficial UNAMAD</span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Header Section */}
          <div className="container mx-auto px-4 py-12 lg:py-16">
            <div className="text-center max-w-4xl mx-auto">
              {/* Logo y título institucional */}
              <div className="flex justify-center mb-6">
                <div className="bg-gradient-to-br from-orange-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                  <FileSearch className="w-12 h-12 text-white" />
                </div>
              </div>
              
              <h2 className="text-sm font-semibold text-orange-600 uppercase tracking-wider mb-2">
                Dirección de Proyección Social y Extensión Universitaria
              </h2>
              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent">
                Sistema de Consulta de Documentos
              </h1>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Portal oficial para la verificación de constancias y resoluciones emitidas por la 
                Universidad Nacional Amazónica de Madre de Dios en el marco de las actividades de 
                Proyección Social y Extensión Universitaria.
              </p>

              {/* Badges informativos */}
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
                  <GraduationCap className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Documentos Oficiales</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
                  <Award className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">Verificación Instantánea</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
                  <BookOpen className="w-5 h-5 text-pink-500" />
                  <span className="text-sm font-medium text-gray-700">Acceso Público</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="container mx-auto px-4 pb-12 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-8 bg-gradient-to-b from-orange-500 to-purple-600 rounded-full" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">Búsqueda de Documentos</h3>
              <p className="text-sm text-gray-600">
                Ingrese cualquiera de los siguientes datos para iniciar la búsqueda
              </p>
            </div>
          </div>

          {/* Componente de búsqueda */}
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              <div className="text-gray-500">Cargando sistema de búsqueda...</div>
            </div>
          }>
            <ConsultaDocumentosClient />
          </Suspense>
        </div>
      </div>

      {/* Info Cards Section */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-orange-500">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-8 h-8 text-orange-500" />
              <h4 className="font-bold text-gray-900">Responsabilidad Social</h4>
            </div>
            <p className="text-sm text-gray-600">
              Comprometidos con el desarrollo sostenible y el bienestar de nuestra comunidad amazónica.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-purple-500">
            <div className="flex items-center gap-3 mb-3">
              <Heart className="w-8 h-8 text-purple-500" />
              <h4 className="font-bold text-gray-900">Voluntariado Universitario</h4>
            </div>
            <p className="text-sm text-gray-600">
              Formando profesionales con valores éticos y compromiso social activo.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-pink-500">
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-8 h-8 text-pink-500" />
              <h4 className="font-bold text-gray-900">Extensión Universitaria</h4>
            </div>
            <p className="text-sm text-gray-600">
              Proyectando el conocimiento académico hacia el desarrollo regional.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h3 className="text-lg font-bold mb-2">UNAMAD - DPSEU</h3>
            <p className="text-sm text-gray-400">
              Universidad Nacional Amazónica de Madre de Dios
            </p>
            <p className="text-xs text-gray-500 mt-2">
              © 2024 Dirección de Proyección Social y Extensión Universitaria
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}