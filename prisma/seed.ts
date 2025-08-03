// prisma/seed.ts
import { PrismaClient, UserRole, ModuleType, PermissionAction } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Limpiar datos existentes
  await prisma.userPermission.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.submodule.deleteMany()
  await prisma.module.deleteMany()
  await prisma.userPreferences.deleteMany()
  await prisma.account.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  // Crear usuarios
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@example.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      emailVerified: new Date(),
      preferences: {
        create: {
          theme: 'system',
          radius: 0.5,
          primaryColor: '25', // Naranja (hue)
          accentColor: '200', // Azul
          fontSize: 'default',
          reducedMotion: false,
          highContrast: false
        }
      }
    }
  })

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
      emailVerified: new Date(),
      preferences: {
        create: {
          theme: 'light',
          radius: 0.75,
          primaryColor: '25', // Naranja
          fontSize: 'default'
        }
      }
    }
  })

  const moderator = await prisma.user.create({
    data: {
      email: 'moderator@example.com',
      password: hashedPassword,
      name: 'Moderator User',
      role: UserRole.MODERATOR,
      emailVerified: new Date()
    }
  })

  const normalUser = await prisma.user.create({
    data: {
      email: 'user@example.com',
      password: hashedPassword,
      name: 'Normal User',
      role: UserRole.USER,
      emailVerified: new Date()
    }
  })

  console.log('✅ Usuarios creados')

  // Crear módulos principales
  const dashboardModule = await prisma.module.create({
    data: {
      name: 'Dashboard',
      slug: 'dashboard',
      description: 'Panel principal y estadísticas',
      icon: 'LayoutDashboard',
      type: ModuleType.CORE,
      isActive: true,
      order: 1,
      config: {
        showMetrics: true,
        refreshInterval: 60000
      },
      routes: {
        main: '/dashboard',
        analytics: '/dashboard/analytics'
      }
    }
  })

  const usersModule = await prisma.module.create({
    data: {
      name: 'Gestión de Usuarios',
      slug: 'users',
      description: 'Administración de usuarios y permisos',
      icon: 'Users',
      type: ModuleType.CORE,
      isActive: true,
      order: 2,
      submodules: {
        create: [
          {
            name: 'Lista de Usuarios',
            slug: 'users-list',
            description: 'Ver y gestionar usuarios',
            icon: 'UserCog',
            isActive: true,
            order: 1
          },
          {
            name: 'Roles y Permisos',
            slug: 'roles-permissions',
            description: 'Configurar roles y permisos',
            icon: 'Shield',
            isActive: true,
            order: 2
          }
        ]
      }
    }
  })

  const contentModule = await prisma.module.create({
    data: {
      name: 'Gestión de Contenido',
      slug: 'content',
      description: 'CMS para contenido del sitio',
      icon: 'FileText',
      type: ModuleType.FEATURE,
      isActive: true,
      order: 3,
      submodules: {
        create: [
          {
            name: 'Artículos',
            slug: 'articles',
            description: 'Gestionar artículos y blogs',
            icon: 'Newspaper',
            isActive: true,
            order: 1
          },
          {
            name: 'Categorías',
            slug: 'categories',
            description: 'Organizar contenido',
            icon: 'FolderTree',
            isActive: true,
            order: 2
          }
        ]
      }
    }
  })

  // Agregar esto en el seed.ts después de crear settingsModule

// Actualizar settingsModule con submódulos
const settingsModule = await prisma.module.create({
    data: {
        name: 'Configuración',
        slug: 'settings',
        description: 'Configuración del sistema',
        icon: 'Settings',
        type: ModuleType.CORE,
        isActive: true,
        order: 99,
        submodules: {
            create: [
                {
                    name: 'Apariencia',
                    slug: 'appearance',
                    description: 'Personaliza colores, temas y diseño',
                    icon: 'Palette',
                    isActive: true,
                    order: 1,
                    config: {
                        showThemeSelector: true,
                        showColorPicker: true,
                        showRadiusControl: true,
                        showFontSize: true
                    }
                },
                {
                    name: 'Accesibilidad',
                    slug: 'accessibility',
                    description: 'Opciones de accesibilidad',
                    icon: 'Accessibility',
                    isActive: true,
                    order: 2
                },
                {
                    name: 'Notificaciones',
                    slug: 'notifications',
                    description: 'Gestiona tus notificaciones',
                    icon: 'Bell',
                    isActive: true,
                    order: 3
                },
                {
                    name: 'Cuenta',
                    slug: 'account',
                    description: 'Información y seguridad de tu cuenta',
                    icon: 'User',
                    isActive: true,
                    order: 4
                },
                {
                    name: 'Privacidad',
                    slug: 'privacy',
                    description: 'Configuración de privacidad y datos',
                    icon: 'Shield',
                    isActive: true,
                    order: 5
                }
            ]
        }
    }
})

// Agregar permisos específicos para configuración
await prisma.permission.createMany({
    data: [
        {
            name: 'Ver Configuración',
            code: 'settings.view',
            description: 'Acceso a configuración personal',
            moduleId: settingsModule.id,
            actions: [PermissionAction.READ]
        },
        {
            name: 'Modificar Apariencia',
            code: 'settings.appearance',
            description: 'Cambiar temas y colores',
            moduleId: settingsModule.id,
            actions: [PermissionAction.UPDATE]
        },
        {
            name: 'Gestionar Notificaciones',
            code: 'settings.notifications',
            description: 'Configurar notificaciones',
            moduleId: settingsModule.id,
            actions: [PermissionAction.UPDATE]
        }
    ]
})

  console.log('✅ Módulos creados')

  // Crear permisos
  await prisma.permission.createMany({
    data: [
      // Dashboard
      {
        name: 'Ver Dashboard',
        code: 'dashboard.view',
        description: 'Acceso al dashboard principal',
        moduleId: dashboardModule.id,
        actions: [PermissionAction.READ]
      },
      {
        name: 'Ver Analytics',
        code: 'dashboard.analytics',
        description: 'Ver estadísticas avanzadas',
        moduleId: dashboardModule.id,
        actions: [PermissionAction.READ, PermissionAction.EXECUTE]
      },
      // Usuarios
      {
        name: 'Gestionar Usuarios',
        code: 'users.manage',
        description: 'CRUD completo de usuarios',
        moduleId: usersModule.id,
        actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE]
      },
      {
        name: 'Ver Usuarios',
        code: 'users.view',
        description: 'Solo lectura de usuarios',
        moduleId: usersModule.id,
        actions: [PermissionAction.READ]
      },
      {
        name: 'Gestionar Roles',
        code: 'roles.manage',
        description: 'Administrar roles y permisos',
        moduleId: usersModule.id,
        actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE]
      },
      // Contenido
      {
        name: 'Gestionar Contenido',
        code: 'content.manage',
        description: 'CRUD de contenido',
        moduleId: contentModule.id,
        actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE]
      },
      {
        name: 'Publicar Contenido',
        code: 'content.publish',
        description: 'Publicar y despublicar contenido',
        moduleId: contentModule.id,
        actions: [PermissionAction.EXECUTE]
      },
      // Configuración
      {
        name: 'Administrar Sistema',
        code: 'system.admin',
        description: 'Configuración completa del sistema',
        moduleId: settingsModule.id,
        actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE, PermissionAction.EXECUTE]
      }
    ]
  })

  console.log('✅ Permisos creados')

  // Obtener permisos creados
  const allPermissions = await prisma.permission.findMany()

  // Asignar permisos según roles
  // Super Admin - Todos los permisos
  await prisma.userPermission.createMany({
    data: allPermissions.map(permission => ({
      userId: superAdmin.id,
      permissionId: permission.id,
      grantedBy: superAdmin.id
    }))
  })

  // Admin - Todos menos configuración del sistema
  const adminPermissions = allPermissions.filter(p => p.code !== 'system.admin')
  await prisma.userPermission.createMany({
    data: adminPermissions.map(permission => ({
      userId: admin.id,
      permissionId: permission.id,
      grantedBy: superAdmin.id
    }))
  })

  // Moderator - Solo gestión de contenido
  const moderatorPermissions = allPermissions.filter(p => 
    p.code.startsWith('content.') || p.code === 'dashboard.view'
  )
  await prisma.userPermission.createMany({
    data: moderatorPermissions.map(permission => ({
      userId: moderator.id,
      permissionId: permission.id,
      grantedBy: superAdmin.id
    }))
  })

  // Usuario normal - Solo ver dashboard
  const userPermissions = allPermissions.filter(p => p.code === 'dashboard.view')
  await prisma.userPermission.createMany({
    data: userPermissions.map(permission => ({
      userId: normalUser.id,
      permissionId: permission.id,
      grantedBy: superAdmin.id
    }))
  })

  console.log('✅ Permisos asignados')

  // Crear configuración de módulos
  await prisma.moduleSettings.create({
    data: {
      moduleId: dashboardModule.id,
      features: {
        charts: true,
        realtime: true,
        export: true
      },
      limits: {
        maxWidgets: 10,
        refreshRate: 30
      },
      styles: {
        primaryColor: '25', // Naranja
        layout: 'grid'
      }
    }
  })

  console.log('✅ Configuración de módulos creada')

  // Log de auditoría
  await prisma.auditLog.createMany({
    data: [
      {
        userId: superAdmin.id,
        action: 'system.initialized',
        entity: 'System',
        entityId: 'system',
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'Seed Script'
        }
      },
      {
        userId: superAdmin.id,
        action: 'users.created',
        entity: 'User',
        entityId: admin.id,
        changes: {
          before: null,
          after: { email: admin.email, role: admin.role }
        }
      }
    ]
  })

  console.log('✅ Registros de auditoría creados')
  console.log('🎉 Seed completado exitosamente')
  
  console.log('\n📋 Usuarios creados:')
  console.log('  Super Admin: superadmin@example.com / password123')
  console.log('  Admin: admin@example.com / password123')
  console.log('  Moderator: moderator@example.com / password123')
  console.log('  User: user@example.com / password123')
  console.log('\n🎨 Color primario configurado: Naranja (hue: 25)')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })