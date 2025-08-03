// types/next-auth.d.ts

import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role?: string
      image?: string  // Agregado explícitamente
    } & DefaultSession["user"]
  }
  
  interface User {
    role?: string
    image?: string  // También aquí por consistencia
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role?: string
    image?: string  // Y en el JWT también
  }
}