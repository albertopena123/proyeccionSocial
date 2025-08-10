'use client'
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Menu, ChevronLeft, ChevronRight, Users, Heart, Award, LogIn, FileSearch, Home, Info, Phone, Calendar, ArrowLeftToLine } from 'lucide-react'
export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({})

  const slides = [
    {
      image: '/images/main1.jpg',
      title: 'Responsabilidad Social UNAMAD',
      subtitle: 'Universidad Nacional Amazónica de Madre de Dios'
    },
    {
      image: '/images/main2.jpg',
      title: 'Proyección Social Universitaria',
      subtitle: 'Comprometidos con el desarrollo de Madre de Dios'
    },
    {
      image: '/images/main3.jpg',
      title: 'Voluntariado Universitario',
      subtitle: 'Formando profesionales con valores y compromiso social'
    }
  ]

  const elencos = [
    {
      name: 'Baile Moderno',
      icon: '💃',
      color: 'from-pink-400 to-purple-400',
      description: 'Expresión artística contemporánea'
    },
    {
      name: 'Teatro y Oratoria',
      icon: '🎭',
      color: 'from-amber-400 to-orange-400',
      description: 'Desarrollo de habilidades comunicativas'
    },
    {
      name: 'Danzas Folklóricas Peruanas',
      icon: '🎪',
      color: 'from-red-400 to-pink-400',
      description: 'Preservando nuestras tradiciones'
    },
    {
      name: 'Canto y Música',
      icon: '🎵',
      color: 'from-yellow-400 to-amber-400',
      description: 'Armonía y talento vocal'
    },
    {
      name: 'Artes Plásticas',
      icon: '🎨',
      color: 'from-purple-400 to-pink-400',
      description: 'Creatividad visual y expresión'
    },
    {
      name: 'TUNA UNAMAD',
      icon: '🎸',
      color: 'from-orange-400 to-red-400',
      description: 'Tradición universitaria musical'
    }
  ]

  const menuItems = [
    { icon: Home, label: 'Inicio', href: '/' },
    { icon: Info, label: 'Nosotros', href: '#nosotros' },
    { icon: Users, label: 'Elencos', href: '#elencos' },
    { icon: Calendar, label: 'Eventos', href: '#eventos' },
    { icon: Award, label: 'Responsabilidad Social', href: '#responsabilidad' },
    { icon: Phone, label: 'Contacto', href: '#contacto' }
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  interface NavigationHandler {
    (href: string): void
  }

  const handleNavigation: NavigationHandler = (href) => {
    if (href.startsWith('#')) {
      // Scroll to section
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      // Navigate to page (in a real app, this would use Next.js router)
      window.location.href = href
    }
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 via-transparent to-purple-600/10"></div>
        </div>
        
        <div className="relative flex flex-col h-full">
          {/* Logo Section with Close Button */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-purple-600 rounded-xl flex items-center justify-center shadow-xl">
                    <span className="text-white font-bold text-2xl">U</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-900 animate-pulse"></div>
                </div>
                <div>
                  <h2 className="text-white font-bold text-xl">UNAMAD</h2>
                  <p className="text-orange-400 text-xs font-medium">DPSEU</p>
                </div>
              </div>
              {/* Hide Sidebar Button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg p-2 transition-all duration-200"
                title="Ocultar menú"
              >
                <ArrowLeftToLine className="w-5 h-5" />
              </button>
            </div>
            
            {/* User Welcome Section */}
            <div className="bg-gradient-to-r from-orange-500/20 to-purple-600/20 rounded-xl p-4 border border-white/10">
              <p className="text-xs text-gray-400 mb-1">Bienvenido a</p>
              <p className="text-sm font-semibold text-white">Proyección Social</p>
              <p className="text-xs text-gray-400 mt-1">Extensión Universitaria</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 overflow-y-auto">
            <div className="space-y-1">
              {menuItems.map((item, index) => {
                const isActive = false // You can implement active state logic here
                return (
                  <button
                    key={index}
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-gradient-to-r from-orange-500/20 to-purple-600/20 text-white border border-white/10' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className={`p-2 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'bg-gradient-to-br from-orange-500 to-purple-600' 
                        : 'bg-gray-700/50 group-hover:bg-gradient-to-br group-hover:from-orange-500/50 group-hover:to-purple-600/50'
                    }`}>
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-medium">{item.label}</span>
                      {item.label === 'Eventos' && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                )
              })}
            </div>
            
            {/* UNAMAD Logo Section */}
            <div className="mt-6 p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50">
              <div className="flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/images/unamad-logo.png" 
                  alt="UNAMAD Logo" 
                  className="h-20 w-auto opacity-80 hover:opacity-100 transition-opacity duration-300"
                  onError={(e) => {
                    // Si no existe el logo, mostrar texto alternativo
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = document.getElementById('logo-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div id="logo-fallback" className="hidden flex-col items-center" style={{ display: 'none' }}>
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center mb-3">
                    <span className="text-white font-bold text-2xl">U</span>
                  </div>
                </div>
                <div className="text-center mt-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Universidad Nacional
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Amazónica de Madre de Dios
                  </p>
                  <div className="mt-3 h-0.5 w-16 mx-auto bg-gradient-to-r from-orange-500 to-purple-600"></div>
                </div>
              </div>
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="p-4 space-y-3">
            {/* Help Link */}
            <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200">
              <Info className="w-5 h-5" />
              <span className="text-sm">Centro de Ayuda</span>
            </button>
            
            {/* Session Button */}
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full relative overflow-hidden bg-gradient-to-r from-orange-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25 group"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
              <div className="relative flex items-center justify-center space-x-2">
                <LogIn className="w-5 h-5" />
                <span>INICIAR SESIÓN</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
        {/* Top Bar */}
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-700 hover:text-gray-900 transition-colors duration-200"
                title={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
              >
                {/* Desktop: Show arrow when open, menu when closed */}
                <div className="hidden lg:block">
                  {sidebarOpen ? (
                    <ArrowLeftToLine className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </div>
                {/* Mobile: Always show menu icon */}
                <Menu className="w-6 h-6 lg:hidden" />
              </button>
            </div>

            <div className="flex-1 text-center lg:text-left lg:ml-4">
              <h1 className="text-xl font-bold text-gray-800">
                Dirección de Proyección Social y Extensión Universitaria
              </h1>
            </div>

            <button
              onClick={() => window.location.href = '/consulta-documentos'}
              className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200"
            >
              <FileSearch className="w-4 h-4" />
              <span className="text-sm font-medium">Consultar Documentos</span>
            </button>
          </div>
        </header>

        {/* Hero Carousel */}
        <section className="relative h-[500px] md:h-[600px] overflow-hidden bg-gray-900">
          {/* Image Container with Transition */}
          <div className="absolute inset-0">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
                  }`}
              >
                <Image
                  src={imageErrors[index]
                    ? `https://via.placeholder.com/1920x600/1f2937/ffffff?text=${encodeURIComponent(slide.title)}`
                    : slide.image
                  }
                  alt={slide.title}
                  fill
                  priority={index === 0}
                  className="object-cover"
                  sizes="100vw"
                  onError={() => {
                    setImageErrors(prev => ({ ...prev, [index]: true }))
                  }}
                />
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
          </div>

          <div className="relative h-full flex items-center justify-center text-center px-6">
            <div className="max-w-4xl">
              <div className="mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/unamad-logo.png"
                  alt="UNAMAD Logo"
                  className="h-20 mx-auto mb-6 opacity-90"
                  onError={(e) => {
                    // Hide logo if it doesn't exist
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
                {slides[currentSlide].title}
              </h2>
              <p className="text-lg md:text-xl lg:text-2xl text-gray-100 drop-shadow-md">
                {slides[currentSlide].subtitle}
              </p>
              <div className="mt-8">
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-2">
                  <span className="text-white text-sm">DPSEU - UNAMAD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Carousel Controls */}
          <button
            onClick={prevSlide}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all duration-200 group"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all duration-200 group"
            aria-label="Siguiente imagen"
          >
            <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-3">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide
                  ? 'bg-white w-12 shadow-lg'
                  : 'bg-white/40 w-2 hover:bg-white/60'
                  }`}
                aria-label={`Ir a imagen ${index + 1}`}
              />
            ))}
          </div>
        </section>

        {/* Welcome Section with Action Buttons */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Bienvenido</h2>
            <p className="text-gray-600 mb-8">Sistema de Proyección Social - UNAMAD</p>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => window.location.href = '/login'}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-700 transition-all duration-200"
                >
                  Iniciar sesión
                </button>
                <button
                  onClick={() => window.location.href = '/register'}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-gray-400 transition-all duration-200"
                >
                  Crear cuenta
                </button>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => window.location.href = '/consulta-documentos'}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-200 inline-flex items-center space-x-2"
                >
                  <FileSearch className="w-5 h-5" />
                  <span>Consultar Constancias y Resoluciones</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Elencos Section */}
        <section id="elencos" className="py-16 px-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">ELENCOS</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-600 mx-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {elencos.map((elenco, index) => (
                <div
                  key={index}
                  className="group relative bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${elenco.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  <div className="p-6">
                    <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full group-hover:scale-110 transition-transform duration-300">
                      <span className="text-4xl">{elenco.icon}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 text-center mb-2">
                      {elenco.name}
                    </h3>
                    <p className="text-sm text-gray-600 text-center">
                      {elenco.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Responsabilidad Social Section */}
        <section id="responsabilidad" className="py-16 px-6 bg-gradient-to-br from-pink-50 to-purple-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                RESPONSABILIDAD SOCIAL Y VOLUNTARIADO UNIVERSITARIO
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-600 mx-auto mb-8" />
              <p className="text-gray-600 max-w-3xl mx-auto">
                Comprometidos con el desarrollo sostenible de nuestra región, formamos profesionales
                con valores éticos y responsabilidad social, promoviendo el voluntariado y la
                participación activa en proyectos que benefician a nuestra comunidad.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <Heart className="w-12 h-12 text-pink-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Compromiso Social</h3>
                <p className="text-gray-600">
                  Trabajamos por el bienestar de las comunidades más vulnerables
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <Users className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Voluntariado</h3>
                <p className="text-gray-600">
                  Más de 500 estudiantes participan activamente en programas sociales
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <Award className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Impacto Positivo</h3>
                <p className="text-gray-600">
                  Generando cambios significativos en la sociedad amazónica
                </p>
              </div>
            </div>

            {/* Photo Gallery */}
            <div className="mt-12">
              <h3 className="text-2xl font-bold text-center text-gray-800 mb-8">
                Nuestras Actividades en Acción
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop',
                    title: 'Voluntariado Comunitario'
                  },
                  {
                    url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
                    title: 'Apoyo Educativo'
                  },
                  {
                    url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400&h=300&fit=crop',
                    title: 'Trabajo en Equipo'
                  },
                  {
                    url: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=400&h=300&fit=crop',
                    title: 'Desarrollo Social'
                  },
                  {
                    url: 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=400&h=300&fit=crop',
                    title: 'Capacitación'
                  },
                  {
                    url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=300&fit=crop',
                    title: 'Integración Universitaria'
                  },
                  {
                    url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop',
                    title: 'Proyectos Colaborativos'
                  },
                  {
                    url: 'https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=400&h=300&fit=crop',
                    title: 'Impacto Social'
                  }
                ].map((photo, index) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Image
                      src={photo.url}
                      alt={photo.title}
                      width={400}
                      height={300}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white text-sm font-medium">{photo.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}