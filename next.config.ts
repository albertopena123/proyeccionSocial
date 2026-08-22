import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy.
//
// 'unsafe-inline' en script-src es necesario mientras el layout inyecte el
// snippet de Google Analytics y Next sus scripts de arranque en línea; para
// quitarlo hay que migrar a nonces. En desarrollo, React Refresh / Webpack
// requieren 'unsafe-eval' para la recarga en caliente y el runtime de Next.js.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com"
  : "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com";

const contentSecurityPolicy = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://via.placeholder.com https://images.unsplash.com",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // La app sólo se sirve por HTTPS detrás del proxy de Apache en producción.
  ...(!isDev ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
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
