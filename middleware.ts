// middleware.ts

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

// Rutas que requieren autenticación
const protectedRoutes = ["/dashboard", "/profile", "/settings"]
// Rutas solo para usuarios no autenticados
const authRoutes = ["/login", "/register"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Por ahora permitimos todo  
  // NextAuth maneja la protección en los layouts
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}