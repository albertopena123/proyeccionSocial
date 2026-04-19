// lib/auth.ts

import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { UserRole, PermissionAction } from "@prisma/client"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

// Función helper para asignar permisos por defecto a nuevos usuarios
async function assignDefaultPermissions(userId: string, role: UserRole = UserRole.USER) {
  try {
    // Obtener permisos según el rol
    let permissionCodes: string[] = []
    
    switch (role) {
      case UserRole.USER:
        // Usuario regular - permisos básicos
        permissionCodes = ['dashboard.access', 'settings.access']
        break
    }

    const permissions = await prisma.permission.findMany({
      where: {
        code: {
          in: permissionCodes
        }
      }
    })

    if (permissions.length > 0) {
      await prisma.userPermission.createMany({
        data: permissions.map(permission => ({
          userId: userId,
          permissionId: permission.id,
          grantedBy: userId, // Auto-asignado
          actions: permission.code === 'settings.access' 
            ? [PermissionAction.READ, PermissionAction.UPDATE]
            : [PermissionAction.READ]
        }))
      })
    }
  } catch (error) {
    console.error("Error asignando permisos por defecto:", error)
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const validatedFields = loginSchema.safeParse(credentials)
          
          if (!validatedFields.success) {
            return null
          }
          
          const { email, password } = validatedFields.data
          
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
          })
          
          if (!user || !user.password) {
            return null
          }
          
          // Verificar si el usuario está activo
          if (!user.isActive) {
            throw new Error("Tu cuenta no está activada. Por favor, verifica tu correo institucional.")
          }
          
          const passwordsMatch = await bcrypt.compare(password, user.password)
          
          if (!passwordsMatch) {
            return null
          }
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image ?? undefined,
          }
        } catch (error) {
          console.error("Error en authorize:", error)
          return null
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role || "USER"
        token.image = user.image
      }

      // Siempre obtener la imagen más reciente de la base de datos
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true, image: true }
          })
          
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role || "USER"
            token.image = dbUser.image
          }
        } catch (error) {
          console.error("Error obteniendo usuario en JWT callback:", error)
        }
      }
      
      return token
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string || "USER"
        session.user.image = token.image as string
      }
      
      return session
    },
  },
  events: {
    async signIn({ user, account }) {
      console.log(`Usuario ${user.email} inició sesión con ${account?.provider}`)
    },
    async createUser({ user }) {
      console.log(`Nuevo usuario creado: ${user.email}`)
      if (user.id) {
        await assignDefaultPermissions(user.id, UserRole.USER)
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
})