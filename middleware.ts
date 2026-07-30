// middleware.ts

import { NextResponse, type NextRequest } from "next/server"

/**
 * Los archivos migrados viven en public/uploads/, que Next sirve como estático:
 * cualquiera con la URL se descargaba constancias y resoluciones sin sesión, sin
 * importar el estado del documento. Aquí se reescribe /uploads/... a las rutas de
 * API, que sí comprueban permisos, de modo que los enlaces antiguos guardados en
 * la base de datos siguen funcionando pero ya pasan por autorización.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/uploads/")) {
    const rest = pathname.slice("/uploads/".length)
    const url = request.nextUrl.clone()

    url.pathname = rest.startsWith("avatars/")
      ? `/api/files/${rest}`
      : `/api/documents/files/${rest}`

    return NextResponse.rewrite(url)
  }

  // NextAuth maneja la protección en los layouts
  return NextResponse.next()
}

export const config = {
  // /uploads se lista aparte porque la exclusión general deja pasar los .png y
  // esos archivos deben atravesar el middleware siempre.
  matcher: [
    "/uploads/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
}
