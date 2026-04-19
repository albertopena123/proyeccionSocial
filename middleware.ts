// middleware.ts

import { NextResponse } from "next/server"

export function middleware() {
  // NextAuth maneja la protección en los layouts
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}