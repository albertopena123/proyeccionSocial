# Contexto del Proyecto - Sistema de Login

## Resumen
Sistema de autenticación y autorización con Next.js 14, NextAuth v5, Prisma y PostgreSQL.

## Stack Tecnológico
- **Framework**: Next.js 14 (App Router)
- **Autenticación**: NextAuth v5 (Credenciales + Google OAuth)
- **Base de Datos**: PostgreSQL con Prisma ORM
- **UI**: Shadcn/ui + Tailwind CSS
- **Lenguaje**: TypeScript

## Arquitectura de Datos

### Usuarios y Roles
- 4 roles: `SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `USER`
- Autenticación con email/contraseña (bcrypt) o Google OAuth
- Sesiones JWT de 30 días

### Sistema Modular
- Módulos dinámicos con submódulos
- Permisos granulares (CREATE, READ, UPDATE, DELETE, EXECUTE)
- Navegación generada según permisos del usuario

### Módulos Principales
1. **Dashboard**: Panel principal con métricas
2. **Gestión de Usuarios**: Lista de usuarios y roles/permisos
3. **Gestión de Contenido**: Artículos y categorías
4. **Configuración**: Apariencia, accesibilidad, notificaciones, cuenta, privacidad

## Diseño Responsivo y Accesibilidad

### Principios de Diseño
- **Mobile-first**: Diseño adaptativo con Tailwind CSS
- **Componentes Shadcn/ui**: Totalmente responsivos
- **Padding consistente**: Usar clases `px-4 lg:px-6` para espaciado lateral
- **Botones apilados en móvil**: Usar `flex flex-col sm:flex-row` para layouts de botones
- **Textos adaptivos**: Tamaños de fuente responsivos con `text-sm md:text-base`

### Patrones Comunes de UI
```tsx
// Contenedor responsivo
<div className="px-4 lg:px-6 py-4 md:py-6">

// Botones apilados en móvil
<div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
  <Button>Acción 1</Button>
  <Button>Acción 2</Button>
</div>

// Textos adaptivos
<h1 className="text-2xl md:text-3xl lg:text-4xl">
<p className="text-sm md:text-base">
```

### Sistema de Colores
- Color primario: Naranja (hue: 25)
- Colores personalizables por usuario usando OKLCH
- Temas: light, dark, system
- Alto contraste y modo de movimiento reducido disponibles

## Servicios Clave

### Autenticación (`lib/auth.ts`)
- NextAuth con adaptador Prisma
- Callbacks personalizados para JWT y sesión
- Manejo de errores con toast notifications

### Servicios de Usuario (`lib/services/`)
- `getUserModules()`: Obtiene módulos según rol/permisos
- `getUserPreferences()`: Preferencias visuales del usuario
- `hasPermission()`: Verifica permisos específicos

## Flujos Principales

### Login
1. Usuario ingresa credenciales o usa Google OAuth
2. Validación con Zod
3. Verificación bcrypt o OAuth
4. Redirección a `/dashboard`

### Dashboard
1. Verificación de sesión en layout protegido
2. Carga de módulos según permisos
3. Aplicación de preferencias de usuario (tema, colores)
4. Renderizado de sidebar dinámico con iconos Lucide

## Usuarios de Prueba
- `superadmin@example.com` / `password123` - SUPER_ADMIN
- `admin@example.com` / `password123` - ADMIN
- `moderator@example.com` / `password123` - MODERATOR
- `user@example.com` / `password123` - USER

## Comandos Importantes
```bash
npm run dev          # Desarrollo
npm run build        # Build producción
npm run lint         # Linting
npx prisma db seed   # Poblar base de datos
npx prisma studio    # GUI de base de datos
```

## Consideraciones de Desarrollo

### Seguridad
- No modificar código para usos maliciosos
- Validación estricta de inputs
- Protección de rutas sensibles
- Auditoría de todas las acciones importantes

### Performance
- Lazy loading de componentes pesados
- Optimización de consultas Prisma
- Caché de permisos y módulos cuando sea posible

### Accesibilidad
- Soporte completo de teclado
- ARIA labels apropiados
- Contraste de colores WCAG AA
- Textos alternativos para imágenes

## Estructura de Carpetas
```
/app
  /(auth)         # Rutas públicas de autenticación
  /(protected)    # Rutas protegidas
  /api           # API routes
/components
  /auth          # Componentes de autenticación
  /dashboard     # Componentes del dashboard
  /ui            # Componentes Shadcn/ui
/lib
  /services      # Servicios de negocio
/prisma
  schema.prisma  # Modelo de datos
  seed.ts        # Datos iniciales
```

## Estructura de Layouts para Módulos

### Layout Principal con Sidebar
Cada módulo dentro de `(protected)` debe tener su propio `layout.tsx` que incluye el sidebar y header. Ejemplo:

```tsx
// app/(protected)/[modulo]/layout.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserModules, getUserPreferences } from "@/lib/services"
import { $Enums } from "@prisma/client"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

export default async function ModuleLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    
    if (!session) {
        redirect("/login")
    }
    
    // Obtener módulos y preferencias
    const [modules, rawUserPreferences] = await Promise.all([
        getUserModules(session.user.id, session.user.role as $Enums.UserRole),
        getUserPreferences(session.user.id)
    ])
    
    // Normalizar datos...
    
    return (
        <SidebarProvider>
            <AppSidebar
                variant="inset"
                session={normalizedSession}
                modules={modules}
                userPreferences={userPreferences}
            />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="container mx-auto">
                        {children}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
```

### Módulos con Layout
- `/dashboard` - Usa su propio layout en `page.tsx`
- `/settings` - Tiene `layout.tsx` con sidebar
- `/users` - Tiene `layout.tsx` con sidebar

**IMPORTANTE**: Siempre crear un `layout.tsx` para nuevos módulos para mantener la navegación consistente.

### Navegación Activa en Sidebar
El componente `NavMain` detecta automáticamente la ruta actual usando `usePathname()` y:
- Marca el módulo/submódulo activo con el estado `isActive`
- Expande automáticamente el módulo si un submódulo está activo
- Usa `Link` de Next.js para navegación optimizada

Ejemplo de cómo funciona:
- Si estás en `/users/users-list`, el módulo "Gestión de Usuarios" estará expandido y "Lista de Usuarios" estará marcado como activo
- La detección funciona con rutas anidadas: `/users/users-list/edit/123` mantendrá el submódulo activo

## Componentes del Dashboard

### DataTable - Tabla de Datos Avanzada
El sistema incluye una tabla de datos completa con las siguientes características:

#### Características Principales
- **Drag & Drop**: Reordenar filas arrastrando con @dnd-kit
- **Selección múltiple**: Checkbox para seleccionar filas
- **Paginación**: Control de páginas y filas por página
- **Ordenamiento**: Ordenar por columnas
- **Filtros**: Sistema de filtrado por columnas
- **Edición inline**: Editar valores directamente en las celdas
- **Drawer/Modal**: Ver y editar detalles en un drawer lateral/inferior
- **Responsivo**: Se adapta a móvil con drawer inferior

#### Estructura de Datos
```typescript
const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
})
```

#### Uso Típico
```tsx
import { DataTable } from "@/components/dashboard/data-table"
import data from "./data.json"

<DataTable data={data} />
```

#### Patrones de UI en la Tabla
- **Padding consistente**: `px-4 lg:px-6` en contenedores
- **Botones responsivos**: Texto completo en desktop, abreviado en móvil
- **Drawer adaptativo**: Lateral en desktop, inferior en móvil
- **Inputs inline**: Campos de edición con estilo transparente
- **Estados visuales**: Badges para status, iconos para acciones

### ChartAreaInteractive - Gráficos Interactivos
- Gráficos de área con Recharts
- Tooltip interactivo
- Colores basados en variables CSS del tema
- Configuración mediante `ChartConfig`

## Notas Adicionales
- El middleware está deshabilitado, la protección se hace en layouts
- Los colores del sidebar se aplican dinámicamente con CSS variables
- El sistema es completamente tipado con TypeScript
- Usar `Task` para búsquedas complejas en el código
- La tabla del dashboard es un ejemplo completo de componente empresarial