import { PrismaClient, UserRole, PermissionAction, ModuleType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Limpiar base de datos
  await prisma.userPermission.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.userPreferences.deleteMany()
  await prisma.user.deleteMany()
  await prisma.submodule.deleteMany()
  await prisma.module.deleteMany()

  console.log('🧹 Base de datos limpia')

  // Crear usuarios de prueba
  const hashedPassword = await bcrypt.hash('password123', 10)

  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@example.com',
      name: 'Super Admin',
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      emailVerified: new Date(),
      preferences: {
        create: {
          theme: 'light'
        }
      }
    }
  })

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: UserRole.ADMIN,
      emailVerified: new Date(),
      preferences: {
        create: {
          theme: 'light'
        }
      }
    }
  })

  const moderator = await prisma.user.create({
    data: {
      email: 'moderator@example.com',
      name: 'Moderator User',
      password: hashedPassword,
      role: UserRole.MODERATOR,
      emailVerified: new Date(),
      preferences: {
        create: {
          theme: 'dark'
        }
      }
    }
  })

  const user = await prisma.user.create({
    data: {
      email: 'user@example.com',
      name: 'Regular User',
      password: hashedPassword,
      role: UserRole.USER,
      emailVerified: new Date(),
      preferences: {
        create: {
          theme: 'system'
        }
      }
    }
  })

  console.log('✅ Usuarios creados')

  // Crear módulos principales
  const dashboardModule = await prisma.module.create({
    data: {
      name: 'Dashboard',
      slug: 'dashboard',
      description: 'Panel principal con métricas y estadísticas',
      icon: 'LayoutDashboard',
      type: ModuleType.CORE,
      isActive: true,
      order: 1
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
            description: 'Ver y gestionar usuarios del sistema',
            icon: 'UserCog',
            isActive: true,
            order: 1
          },
          {
            name: 'Roles y Permisos',
            slug: 'roles-permissions',
            description: 'Configurar roles y permisos de acceso',
            icon: 'Shield',
            isActive: true,
            order: 2
          },
          {
            name: 'Gestión de Módulos',
            slug: 'modules-management',
            description: 'Administrar módulos y submódulos del sistema',
            icon: 'Cube',
            isActive: true,
            order: 3
          }
        ]
      }
    },
    include: {
      submodules: true
    }
  })

  const contentModule = await prisma.module.create({
    data: {
      name: 'Gestión de Contenido',
      slug: 'content',
      description: 'Administración de contenido del sitio',
      icon: 'FileText',
      type: ModuleType.FEATURE,
      isActive: true,
      order: 3,
      submodules: {
        create: [
          {
            name: 'Artículos',
            slug: 'articles',
            description: 'Gestionar artículos y publicaciones',
            icon: 'Newspaper',
            isActive: true,
            order: 1
          },
          {
            name: 'Categorías',
            slug: 'categories',
            description: 'Organizar contenido por categorías',
            icon: 'FolderOpen',
            isActive: true,
            order: 2
          }
        ]
      }
    },
    include: {
      submodules: true
    }
  })

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
    },
    include: {
      submodules: true
    }
  })

  console.log('✅ Módulos creados')

  // Crear permisos simplificados - UN PERMISO POR SUBMÓDULO
  const permissions = []

  // Permisos del Dashboard (a nivel de módulo)
  permissions.push({
    name: 'Acceso al Dashboard',
    code: 'dashboard.access',
    description: 'Acceso al dashboard principal',
    moduleId: dashboardModule.id,
    actions: [
      PermissionAction.READ,
      PermissionAction.EXPORT
    ]
  })

  // Permisos para submódulos de Usuarios
  for (const submodule of usersModule.submodules) {
    let permissionName = ''
    let permissionCode = ''
    let permissionDesc = ''

    switch (submodule.slug) {
      case 'users-list':
        permissionName = 'Gestión de Usuarios'
        permissionCode = 'users.access'
        permissionDesc = 'Acceso completo al módulo de gestión de usuarios'
        break
      case 'roles-permissions':
        permissionName = 'Gestión de Roles y Permisos'
        permissionCode = 'roles.access'
        permissionDesc = 'Acceso completo al módulo de roles y permisos'
        break
      case 'modules-management':
        permissionName = 'Gestión de Módulos'
        permissionCode = 'modules.access'
        permissionDesc = 'Acceso completo al módulo de gestión de módulos del sistema'
        break
    }

    permissions.push({
      name: permissionName,
      code: permissionCode,
      description: permissionDesc,
      moduleId: usersModule.id,
      submoduleId: submodule.id,
      actions: [
        PermissionAction.CREATE,
        PermissionAction.READ,
        PermissionAction.UPDATE,
        PermissionAction.DELETE,
        PermissionAction.EXPORT
      ]
    })
  }

  // Permisos para submódulos de Contenido
  for (const submodule of contentModule.submodules) {
    permissions.push({
      name: `Gestión de ${submodule.name}`,
      code: `${submodule.slug}.access`,
      description: `Acceso completo al módulo de ${submodule.name.toLowerCase()}`,
      moduleId: contentModule.id,
      submoduleId: submodule.id,
      actions: [
        PermissionAction.CREATE,
        PermissionAction.READ,
        PermissionAction.UPDATE,
        PermissionAction.DELETE,
        PermissionAction.EXPORT
      ]
    })
  }

  // Permisos para Configuración (a nivel de módulo, los submódulos son personales)
  permissions.push({
    name: 'Configuración Personal',
    code: 'settings.access',
    description: 'Acceso a configuración personal del usuario',
    moduleId: settingsModule.id,
    actions: [
      PermissionAction.READ,
      PermissionAction.UPDATE
    ]
  })

  // Permiso especial para administración del sistema
  permissions.push({
    name: 'Administración del Sistema',
    code: 'system.admin',
    description: 'Control total sobre la configuración del sistema',
    moduleId: settingsModule.id,
    actions: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.EXPORT
    ]
  })

  // Crear todos los permisos
  await prisma.permission.createMany({
    data: permissions
  })

  console.log('✅ Permisos creados (sistema simplificado)')

  // Obtener todos los permisos creados
  const allPermissions = await prisma.permission.findMany()

  // Asignar permisos según roles
  console.log('🔐 Asignando permisos por rol...')

  // SUPER_ADMIN - Todos los permisos con todas las acciones
  await prisma.userPermission.createMany({
    data: allPermissions.map(permission => ({
      userId: superAdmin.id,
      permissionId: permission.id,
      grantedBy: superAdmin.id,
      actions: [
        PermissionAction.CREATE,
        PermissionAction.READ,
        PermissionAction.UPDATE,
        PermissionAction.DELETE,
        PermissionAction.EXPORT
      ]
    }))
  })
  console.log('  ✓ Super Admin: Todos los permisos')

  // ADMIN - Todos los permisos excepto administración del sistema (todas las acciones)
  const adminPermissions = allPermissions.filter(p => p.code !== 'system.admin')
  await prisma.userPermission.createMany({
    data: adminPermissions.map(permission => ({
      userId: admin.id,
      permissionId: permission.id,
      grantedBy: superAdmin.id,
      actions: [
        PermissionAction.CREATE,
        PermissionAction.READ,
        PermissionAction.UPDATE,
        PermissionAction.DELETE,
        PermissionAction.EXPORT
      ]
    }))
  })
  console.log('  ✓ Admin: Todos excepto system.admin')

  // MODERATOR - Solo gestión de contenido y dashboard (con acciones limitadas)
  const moderatorPermissions = allPermissions.filter(p => 
    p.code === 'dashboard.access' ||
    p.code === 'articles.access' ||
    p.code === 'categories.access'
  )
  await prisma.userPermission.createMany({
    data: moderatorPermissions.map(permission => ({
      userId: moderator.id,
      permissionId: permission.id,
      grantedBy: superAdmin.id,
      actions: permission.code === 'dashboard.access' 
        ? [PermissionAction.READ, PermissionAction.EXPORT]
        : [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE] // No DELETE para moderadores
    }))
  })
  console.log('  ✓ Moderator: Dashboard y contenido')

  // USER - Solo dashboard y configuración personal (solo lectura)
  const userPermissions = allPermissions.filter(p => 
    p.code === 'dashboard.access' ||
    p.code === 'settings.access'
  )
  await prisma.userPermission.createMany({
    data: userPermissions.map(permission => ({
      userId: user.id,
      permissionId: permission.id,
      grantedBy: superAdmin.id,
      actions: permission.code === 'settings.access'
        ? [PermissionAction.READ, PermissionAction.UPDATE] // Puede actualizar su configuración
        : [PermissionAction.READ] // Solo ver dashboard
    }))
  })
  console.log('  ✓ User: Dashboard y configuración personal')

  // Crear algunos logs de auditoría de ejemplo
  await prisma.auditLog.createMany({
    data: [
      {
        userId: superAdmin.id,
        action: 'auth.login',
        entity: 'User',
        entityId: superAdmin.id,
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0'
        }
      },
      {
        userId: admin.id,
        action: 'auth.login',
        entity: 'User',
        entityId: admin.id,
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0'
        }
      }
    ]
  })

  console.log('✅ Logs de auditoría creados')

  // Resumen final
  console.log('\n📊 Resumen del seed:')
  console.log(`  - ${await prisma.user.count()} usuarios`)
  console.log(`  - ${await prisma.module.count()} módulos`)
  console.log(`  - ${await prisma.submodule.count()} submódulos`)
  console.log(`  - ${await prisma.permission.count()} permisos`)
  console.log(`  - ${await prisma.userPermission.count()} asignaciones de permisos`)

  console.log('\n🎉 Seed completado exitosamente!')
  console.log('\n📝 Usuarios de prueba:')
  console.log('  - superadmin@example.com / password123 (SUPER_ADMIN)')
  console.log('  - admin@example.com / password123 (ADMIN)')
  console.log('  - moderator@example.com / password123 (MODERATOR)')
  console.log('  - user@example.com / password123 (USER)')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })