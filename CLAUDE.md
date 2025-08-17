# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sistema de Proyección Social - UNAMAD

Sistema integral para gestión de proyección social universitaria con autenticación, autorización y módulos especializados para resoluciones y documentos académicos.

## Stack Tecnológico
- **Framework**: Next.js 15.4.5 (App Router)
- **Autenticación**: NextAuth v5 (Credenciales + Google OAuth)
- **Base de Datos**: PostgreSQL con Prisma ORM v6.13
- **UI**: Shadcn/ui + Tailwind CSS v4 + Radix UI
- **Validación**: Zod + React Hook Form
- **Lenguaje**: TypeScript v5

## Comandos de Desarrollo

```bash
# Desarrollo
npm run dev                    # Inicia servidor con script personalizado (puerto 3000)
npm run dev:next              # Inicia Next.js directamente
npm run stop                  # Detiene todos los procesos
npm run clean                 # Limpia y reinicia el proyecto
npm run clean:full           # Limpia completo con reinstalación de dependencias

# Base de Datos
npx prisma generate          # Genera cliente Prisma
npx prisma db push          # Sincroniza esquema con DB
npx prisma db seed          # Poblar base de datos con datos iniciales
npx prisma studio           # GUI para inspeccionar DB
npx prisma migrate dev      # Crear/aplicar migraciones
npx prisma migrate reset    # Reset completo de DB

# Calidad de Código
npm run lint                # ESLint
npm run build              # Build de producción
npm run typecheck          # Verificación de tipos (si está configurado)

# Migraciones de Datos Personalizadas
npm run migrate:prepare                    # Preparar migración
npm run migrate:constancias:dry           # Vista previa de migración de constancias
npm run migrate:constancias:execute       # Ejecutar migración de constancias
npm run migrate:constancias:verify        # Verificar migración
npm run migrate:full                      # Ejecutar flujo completo de migración
```

## Arquitectura de Alto Nivel

### Sistema de Autenticación
- **NextAuth v5** con adaptador Prisma
- Proveedores: Credenciales (bcrypt) y Google OAuth
- Sesiones JWT con duración de 30 días
- Callbacks personalizados en `lib/auth.ts` para enriquecer JWT con rol y permisos

### Sistema de Roles y Permisos
```
SUPER_ADMIN > ADMIN > MODERATOR > USER
```
- Permisos granulares: CREATE, READ, UPDATE, DELETE, EXECUTE, EXPORT
- Módulos dinámicos basados en permisos
- Middleware deshabilitado - protección en layouts

### Arquitectura Modular
Cada módulo protegido sigue este patrón:
```
app/(protected)/[modulo]/
├── layout.tsx      # Incluye sidebar y header
├── page.tsx        # Página principal del módulo
└── [submodulos]/   # Rutas anidadas
```

### Módulos Principales

#### 1. Documents (Resoluciones)
- **Modelo de Datos**: `Resolucion`, `DocenteResolucion`, `EstudianteResolucion`, `ArchivoResolucion`
- **Estados**: PENDIENTE, APROBADO, RECHAZADO, ANULADO
- **Tipos**: APROBACION_PROYECTO, APROBACION_INFORME_FINAL
- **Modalidades**: DOCENTES, ESTUDIANTES, VOLUNTARIADO, ACTIVIDAD
- **Relaciones**: Facultad, Departamento, Docentes participantes, Estudiantes participantes
- **APIs externas**: Consulta de estudiantes y docentes UNAMAD

#### 2. Dashboard
- Métricas y estadísticas
- Gráficos interactivos con Recharts
- Widgets configurables por rol

#### 3. Gestión de Usuarios
- CRUD de usuarios
- Asignación de roles y permisos
- Importación masiva

#### 4. Configuración
- Preferencias de usuario (tema, colores OKLCH)
- Accesibilidad (alto contraste, movimiento reducido)
- Notificaciones

## Patrones de Código Importantes

### Client Components vs Server Components
- Server Components por defecto en App Router
- "use client" solo cuando necesario (interactividad, hooks)
- Datos sensibles siempre en Server Components

### Manejo de Estado en Formularios
```typescript
// Patrón para formularios complejos con participantes
const [docentes, setDocentes] = useState<Docente[]>([])
const [showDocentes, setShowDocentes] = useState(false)

// UseEffect para sincronización al editar
useEffect(() => {
    if (resolucion?.docentes?.length > 0) {
        setDocentes(resolucion.docentes)
        setShowDocentes(true)
    }
}, [resolucion])
```

### APIs Internas
```typescript
// GET, POST, PUT, DELETE en route.ts
export async function POST(request: Request) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    
    const canCreate = await hasPermission(session.user.id, "module.access", PermissionAction.CREATE)
    if (!canCreate) return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    
    // Lógica de negocio...
}
```

### Consultas Prisma Optimizadas
```typescript
// Incluir relaciones necesarias
const resolucion = await prisma.resolucion.findMany({
    include: {
        facultad: true,
        departamento: true,
        docentes: true,      // Relación uno a muchos
        estudiantes: true,   // Relación uno a muchos
        archivos: true,
        createdBy: {
            select: { id: true, name: true, email: true }
        }
    },
    orderBy: { createdAt: 'desc' }
})
```

## Servicios Externos

### API UNAMAD
- `/api/student/consult`: Consulta estudiantes por DNI
- `/api/teacher/consult`: Consulta docentes por DNI
- Respuestas con estructura específica de la universidad

### Email (Nodemailer)
- Configurado para notificaciones
- Templates en `lib/email/`

## Consideraciones de Desarrollo

### Manejo de Archivos
- Uploads en `public/uploads/[tipo]/`
- Límite 5MB por archivo
- Tipos permitidos: PDF, JPG, PNG
- MultipartFormData para envío con archivos

### Tipos TypeScript
- Interfaces completas en cada componente
- Tipos compartidos en `types/`
- Validación con Zod schemas

### Optimización de Performance
- Lazy loading con dynamic imports
- Debounce en búsquedas (500ms)
- useMemo para cálculos costosos
- React.memo para componentes pesados

### Responsividad
- Mobile-first con Tailwind
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Drawer inferior en móvil, lateral en desktop
- Texto adaptativo con clases responsivas

## Base de Datos

### Conexión
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/proyeccionSocial"
```

### Modelos Principales
- User (con roles y permisos)
- Module/SubModule (navegación dinámica)
- Permission/RolePermission
- Resolucion (con relaciones a docentes/estudiantes)
- Facultad/Departamento (catálogos)

### Cascadas y Constraints
- onDelete: Cascade en relaciones dependientes
- Unique constraints en campos críticos (numeroResolucion, email)
- Índices en campos de búsqueda frecuente

## Debugging y Desarrollo

### Usuarios de Prueba
- `superadmin@unamad.edu.pe` / `password123` - SUPER_ADMIN
- `admin@example.com` / `password123` - ADMIN
- `moderator@example.com` / `password123` - MODERATOR
- `user@example.com` / `password123` - USER

### Puertos y URLs
- Desarrollo: http://localhost:3000
- Prisma Studio: http://localhost:5555
- PostgreSQL: localhost:5432

### Scripts Útiles
- `scripts/dev-server.js`: Maneja limpieza de puertos y reinicio automático
- `scripts/clean-restart.js`: Limpieza profunda del proyecto
- `scripts/migrate-*.js`: Migraciones de datos personalizadas
- The database schema is defined in the @prisma\schema.prisma  file. Reference it anytime you need to understand the structure of data stored in the database.