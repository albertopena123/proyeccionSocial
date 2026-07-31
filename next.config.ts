import type { NextConfig } from "next";

// Content-Security-Policy.
//
// 'unsafe-inline' en script-src es necesario mientras el layout inyecte el
// snippet de Google Analytics y Next sus scripts de arranque en línea; para
// quitarlo hay que migrar a nonces. Lo que sí se cierra aquí es lo que no cuesta
// nada: object-src (plugins), base-uri (secuestro de rutas relativas) y
// frame-ancestors (clickjacking sobre los formularios de aprobación).
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://via.placeholder.com https://images.unsplash.com",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // La app sólo se sirve por HTTPS detrás del proxy de Apache.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Oculta la versión de Next en las respuestas.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  images: {
    remotePatterns: [
      // Solo para avatares heredados: el login con Google se eliminó, pero los
      // usuarios que entraron con él antes conservan una URL de foto en este
      // dominio guardada en User.image, y next/image la rechazaría sin esto.
      // Comprobar que ninguna fila la use antes de quitar este patrón.
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
