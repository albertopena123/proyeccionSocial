import { prisma } from "../lib/prisma"

async function verifyPermissions() {
    console.log("🔍 Verificando permisos en el sistema...")
    
    try {
        // Verificar que no existan permisos antiguos
        const oldPermissions = await prisma.permission.findMany({
            where: {
                code: {
                    in: ['users.manage', 'users.view', 'roles.manage', 'modules.manage', 'modules.view']
                }
            }
        })
        
        if (oldPermissions.length > 0) {
            console.log("⚠️  Se encontraron permisos antiguos:")
            oldPermissions.forEach(p => console.log(`   - ${p.code}`))
            console.log("\n   Ejecuta 'npm run db:seed' para actualizar")
            return
        }
        
        // Verificar permisos nuevos
        const newPermissions = await prisma.permission.findMany({
            where: {
                code: {
                    in: ['users.access', 'roles.access', 'modules.access']
                }
            }
        })
        
        if (newPermissions.length === 0) {
            console.log("❌ No se encontraron los permisos nuevos")
            console.log("   Ejecuta 'npm run db:seed' para crear los permisos")
            return
        }
        
        console.log("✅ Permisos nuevos encontrados:")
        newPermissions.forEach(p => {
            console.log(`   - ${p.code}: ${p.name}`)
            console.log(`     Acciones: ${p.actions.join(', ')}`)
        })
        
        // Verificar usuarios con permisos
        const users = await prisma.user.findMany({
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        })
        
        console.log("\n👥 Usuarios y sus permisos:")
        for (const user of users) {
            console.log(`\n   ${user.email} (${user.role})`)
            const permissionCodes = user.permissions.map(up => up.permission.code)
            
            // Verificar permisos clave
            const hasUsersAccess = permissionCodes.includes('users.access')
            const hasRolesAccess = permissionCodes.includes('roles.access')
            const hasModulesAccess = permissionCodes.includes('modules.access')
            
            console.log(`     - users.access: ${hasUsersAccess ? '✅' : '❌'}`)
            console.log(`     - roles.access: ${hasRolesAccess ? '✅' : '❌'}`)
            console.log(`     - modules.access: ${hasModulesAccess ? '✅' : '❌'}`)
        }
        
        console.log("\n✅ Verificación completada")
        
    } catch (error) {
        console.error("❌ Error:", error)
    }
}

verifyPermissions()
    .then(() => prisma.$disconnect())
    .catch(console.error)