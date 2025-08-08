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
      email: 'superadmin@unamad.edu.pe',
      personalEmail: 'superadmin@example.com',
      name: 'Super Admin',
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      emailVerified: new Date(),
      isActive: true,
      studentCode: '20200001',
      documentType: 'DNI',
      documentNumber: '12345678',
      dni: '12345678',
      sex: 'M',
      faculty: 'Facultad de Ingeniería',
      career: 'Ingeniería de Sistemas e Informática',
      careerCode: 'ISI',
      enrollmentDate: '2020-1',
      preferences: {
        create: {
          theme: 'light'
        }
      }
    }
  })

  const admin = await prisma.user.create({
    data: {
      email: 'admin@unamad.edu.pe',
      personalEmail: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: UserRole.ADMIN,
      emailVerified: new Date(),
      isActive: true,
      studentCode: '20200002',
      documentType: 'DNI',
      documentNumber: '87654321',
      dni: '87654321',
      sex: 'F',
      faculty: 'Facultad de Ingeniería',
      career: 'Ingeniería de Sistemas e Informática',
      careerCode: 'ISI',
      enrollmentDate: '2020-1',
      preferences: {
        create: {
          theme: 'light'
        }
      }
    }
  })

  const moderator = await prisma.user.create({
    data: {
      email: 'moderator@unamad.edu.pe',
      personalEmail: 'moderator@example.com',
      name: 'Moderator User',
      password: hashedPassword,
      role: UserRole.MODERATOR,
      emailVerified: new Date(),
      isActive: true,
      studentCode: '20210001',
      documentType: 'CE',
      documentNumber: 'CE1122334',
      dni: '11223344',
      sex: 'M',
      faculty: 'Facultad de Educación',
      career: 'Educación Matemática y Computación',
      careerCode: 'EMC',
      enrollmentDate: '2021-1',
      preferences: {
        create: {
          theme: 'dark'
        }
      }
    }
  })

  const user = await prisma.user.create({
    data: {
      email: 'user@unamad.edu.pe',
      personalEmail: 'user@example.com',
      name: 'Regular User',
      password: hashedPassword,
      role: UserRole.USER,
      emailVerified: new Date(),
      isActive: true,
      studentCode: '20220001',
      documentType: 'DNI',
      documentNumber: '99887766',
      dni: '99887766',
      sex: 'F',
      faculty: 'Facultad de Ecoturismo',
      career: 'Administración y Negocios Internacionales',
      careerCode: 'ANI',
      enrollmentDate: '2022-1',
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

  // Módulo de Documentos
  const documentsModule = await prisma.module.create({
    data: {
      name: 'Documentos',
      slug: 'documents',
      description: 'Gestión de documentos universitarios',
      icon: 'FileText',
      type: ModuleType.FEATURE,
      isActive: true,
      order: 4,
      submodules: {
        create: [
          {
            name: 'Constancias',
            slug: 'constancias',
            description: 'Gestión de constancias universitarias',
            icon: 'FileCheck',
            isActive: true,
            order: 1
          },
          {
            name: 'Resoluciones',
            slug: 'resoluciones',
            description: 'Gestión de resoluciones universitarias',
            icon: 'FilePlus',
            isActive: true,
            order: 2
          },
          {
            name: 'UNAMAD',
            slug: 'unamad',
            description: 'Documentos oficiales de UNAMAD',
            icon: 'Building',
            isActive: true,
            order: 3
          },
          {
            name: 'DPSEC',
            slug: 'dpsec',
            description: 'Documentos de DPSEC',
            icon: 'Shield',
            isActive: true,
            order: 4
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

  // Crear permisos simplificados
  const permissions = []

  // Permisos del Dashboard
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

  // Permisos para submódulos de Documentos
  for (const submodule of documentsModule.submodules) {
    permissions.push({
      name: `Gestión de ${submodule.name}`,
      code: `${submodule.slug}.access`,
      description: `Acceso completo al módulo de ${submodule.name.toLowerCase()}`,
      moduleId: documentsModule.id,
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

  // Permisos para submódulos de Configuración
  for (const submodule of settingsModule.submodules) {
    let permissionName = ''
    let permissionCode = ''
    let permissionDesc = ''
    let actions: PermissionAction[] = []

    switch (submodule.slug) {
      case 'appearance':
        permissionName = 'Configuración de Apariencia'
        permissionCode = 'appearance.access'
        permissionDesc = 'Personalizar temas, colores y diseño de la interfaz'
        actions = [
          PermissionAction.READ,
          PermissionAction.UPDATE
        ]
        break
      case 'accessibility':
        permissionName = 'Configuración de Accesibilidad'
        permissionCode = 'accessibility.access'
        permissionDesc = 'Gestionar opciones de accesibilidad'
        actions = [
          PermissionAction.READ,
          PermissionAction.UPDATE
        ]
        break
      case 'notifications':
        permissionName = 'Configuración de Notificaciones'
        permissionCode = 'notifications.access'
        permissionDesc = 'Gestionar preferencias de notificaciones'
        actions = [
          PermissionAction.CREATE,
          PermissionAction.READ,
          PermissionAction.UPDATE,
          PermissionAction.DELETE
        ]
        break
      case 'account':
        permissionName = 'Configuración de Cuenta'
        permissionCode = 'account.access'
        permissionDesc = 'Gestionar información y seguridad de la cuenta'
        actions = [
          PermissionAction.READ,
          PermissionAction.UPDATE,
          PermissionAction.DELETE
        ]
        break
      case 'privacy':
        permissionName = 'Configuración de Privacidad'
        permissionCode = 'privacy.access'
        permissionDesc = 'Gestionar configuración de privacidad y datos'
        actions = [
          PermissionAction.READ,
          PermissionAction.UPDATE,
          PermissionAction.DELETE,
          PermissionAction.EXPORT
        ]
        break
    }

    permissions.push({
      name: permissionName,
      code: permissionCode,
      description: permissionDesc,
      moduleId: settingsModule.id,
      submoduleId: submodule.id,
      actions: actions
    })
  }

  // Permiso general para configuración (compatibilidad)
  permissions.push({
    name: 'Configuración Personal',
    code: 'settings.access',
    description: 'Acceso general a configuración personal del usuario',
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

  // ==================== CREAR FACULTADES Y DEPARTAMENTOS CORRECTOS ====================
  console.log('🏛️ Creando facultades y departamentos...')

  // FACULTAD DE ECOTURISMO
  const facultadEcoturismo = await prisma.facultad.create({
    data: {
      nombre: 'Facultad de Ecoturismo',
      codigo: 'FE',
      departamentos: {
        create: [
          { 
            nombre: 'Departamento Académico de Contabilidad y Administración', 
            codigo: 'DACA' 
          },
          { 
            nombre: 'Departamento Académico de Ecoturismo', 
            codigo: 'DAE' 
          }
        ]
      }
    },
    include: {
      departamentos: true
    }
  })

  // FACULTAD DE INGENIERÍA
  const facultadIngenieria = await prisma.facultad.create({
    data: {
      nombre: 'Facultad de Ingeniería',
      codigo: 'FI',
      departamentos: {
        create: [
          { 
            nombre: 'Departamento Académico de Ingeniería Forestal y Medio Ambiente', 
            codigo: 'DAIFMA' 
          },
          { 
            nombre: 'Departamento Académico de Ingeniería de Sistemas e Informática', 
            codigo: 'DAISI' 
          },
          { 
            nombre: 'Departamento Académico de Ingeniería Agroindustrial', 
            codigo: 'DAIA' 
          },
          { 
            nombre: 'Departamento Académico de Medicina Veterinaria - Zootecnia', 
            codigo: 'DAMVZ' 
          },
          { 
            nombre: 'Departamento Académico de Ciencias Básicas', 
            codigo: 'DACB' 
          }
        ]
      }
    },
    include: {
      departamentos: true
    }
  })

  // FACULTAD DE EDUCACIÓN
  const facultadEducacion = await prisma.facultad.create({
    data: {
      nombre: 'Facultad de Educación',
      codigo: 'FEDU',
      departamentos: {
        create: [
          // Departamentos Académicos
          { 
            nombre: 'Departamento Académico de Derecho y Ciencias Políticas', 
            codigo: 'DADCP' 
          },
          { 
            nombre: 'Departamento Académico de Enfermería', 
            codigo: 'DAE' 
          },
          { 
            nombre: 'Departamento Académico de Educación y Humanidades', 
            codigo: 'DAEH' 
          },
          // Programas Académicos (los mantengo como departamentos según tu estructura)
          { 
            nombre: 'Programa Académico de Derecho y Ciencias Políticas', 
            codigo: 'PADCP' 
          },
          { 
            nombre: 'Programa Académico de Inicial y Especialidad', 
            codigo: 'PAIE' 
          },
          { 
            nombre: 'Programa Académico de Primaria e Informática', 
            codigo: 'PAPI' 
          },
          { 
            nombre: 'Programa Académico de Matemática y Computación', 
            codigo: 'PAMC' 
          },
          { 
            nombre: 'Programa Académico de Enfermería', 
            codigo: 'PAE' 
          }
        ]
      }
    },
    include: {
      departamentos: true
    }
  })

  console.log('✅ Facultades y departamentos creados correctamente:')
  console.log(`  - ${facultadEcoturismo.nombre}: ${facultadEcoturismo.departamentos.length} departamentos`)
  console.log(`  - ${facultadIngenieria.nombre}: ${facultadIngenieria.departamentos.length} departamentos`)
  console.log(`  - ${facultadEducacion.nombre}: ${facultadEducacion.departamentos.length} departamentos/programas`)

  // Obtener todos los permisos creados
  const allPermissions = await prisma.permission.findMany()

  // Asignar permisos según roles
  console.log('🔐 Asignando permisos por rol...')

  // SUPER_ADMIN - Todos los permisos
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

  // ADMIN - Todos los permisos excepto administración del sistema
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

  // MODERATOR - Solo gestión de contenido y dashboard
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
        : [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE]
    }))
  })
  console.log('  ✓ Moderator: Dashboard y contenido')

  // USER - Solo dashboard y configuración personal
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
        ? [PermissionAction.READ, PermissionAction.UPDATE]
        : [PermissionAction.READ]
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
  console.log(`  - ${await prisma.facultad.count()} facultades`)
  console.log(`  - ${await prisma.departamento.count()} departamentos/programas`)

  console.log('\n🎉 Seed completado exitosamente!')
  console.log('\n📝 Usuarios de prueba:')
  console.log('  - superadmin@unamad.edu.pe / password123 (SUPER_ADMIN)')
  console.log('  - admin@unamad.edu.pe / password123 (ADMIN)')
  console.log('  - moderator@unamad.edu.pe / password123 (MODERATOR)')
  console.log('  - user@unamad.edu.pe / password123 (USER)')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })