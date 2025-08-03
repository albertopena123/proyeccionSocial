// lib/auth.ts

import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account) return true
      
      if (account.provider === "google") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: { accounts: true }
          })
          
          if (existingUser) {
            const googleAccount = existingUser.accounts.find(
              acc => acc.provider === "google"
            )
            
            if (!googleAccount) {
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state !== undefined && account.session_state !== null
                    ? String(account.session_state)
                    : account.session_state,
                },
              })
            }
            
            // Actualizar imagen siempre que Google proporcione una nueva
            if (profile?.picture) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { 
                  image: profile.picture as string,
                  emailVerified: new Date()
                }
              })
            }
            
            user.id = existingUser.id
            user.role = existingUser.role
            user.image = (profile?.picture ?? existingUser.image) ?? undefined
            
            return true
          }
          
          return true
        } catch (error) {
          console.error("Error en signIn callback:", error)
          return false
        }
      }
      
      return true
    },
    
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id
        token.role = user.role || "USER"
        token.image = user.image
      }
      
      if (account?.provider === "google" && profile) {
        token.image = profile.picture as string
      }
      
      if (account?.provider === "google" && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
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
    },
  },
  debug: process.env.NODE_ENV === "development",
})