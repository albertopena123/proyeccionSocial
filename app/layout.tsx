import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";

// Fuentes optimizadas para mejor legibilidad
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

// Configuración de Viewport (separado de metadata en Next.js 14)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
};

// Metadatos mejorados para SEO
export const metadata: Metadata = {
  title: {
    default: "Dirección de Proyección Social y Extensión Universitaria | UNAMAD",
    template: "%s | DPSEU - UNAMAD"
  },
  description: "Dirección de Proyección Social y Extensión Universitaria de la Universidad Nacional Amazónica de Madre de Dios. Comprometidos con el desarrollo sostenible y la responsabilidad social en la región amazónica.",
  keywords: [
    "UNAMAD",
    "Universidad Nacional Amazónica de Madre de Dios",
    "Proyección Social",
    "Extensión Universitaria",
    "Responsabilidad Social Universitaria",
    "RSU",
    "Puerto Maldonado",
    "Madre de Dios",
    "Amazonia",
    "Educación Superior",
    "Desarrollo Sostenible",
    "Voluntariado Universitario",
    "Servicio Comunitario"
  ],
  authors: [
    {
      name: "UNAMAD",
      url: "https://www.unamad.edu.pe"
    }
  ],
  creator: "Universidad Nacional Amazónica de Madre de Dios",
  publisher: "UNAMAD",

  // Open Graph para redes sociales
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: "https://proyeccionsocial.unamad.edu.pe",
    siteName: "DPSEU - UNAMAD",
    title: "Dirección de Proyección Social y Extensión Universitaria | UNAMAD",
    description: "Promoviendo el desarrollo sostenible y la responsabilidad social universitaria en la Amazonia peruana",
    images: [
      {
        url: "/banner/icon.png",
        width: 512,
        height: 512,
        alt: "UNAMAD - Proyección Social y Extensión Universitaria",
      }
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "DPSEU - UNAMAD",
    description: "Dirección de Proyección Social y Extensión Universitaria",
    site: "@UNAMAD_oficial",
    creator: "@UNAMAD_oficial",
    images: ["/banner/icon.png"],
  },

  // Información adicional para SEO
  alternates: {
    canonical: "https://proyeccionsocial.unamad.edu.pe",
    languages: {
      'es-PE': 'https://proyeccionsocial.unamad.edu.pe',
    },
  },

  // Robots y políticas de indexación
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Verificación de motores de búsqueda (reemplaza con tus códigos reales)
  verification: {
    google: "tu-codigo-de-verificacion-google",
    yandex: "tu-codigo-de-verificacion-yandex",
  },

  // Categoría y clasificación
  category: 'education',
  classification: 'Universidad Pública',

  // Información de la aplicación
  applicationName: "DPSEU - UNAMAD",

  // Generador
  generator: "Next.js",

  // Iconos y manifest - Usando el icono de UNAMAD
  icons: {
    icon: [
      { url: '/banner/icon.png', type: 'image/png' },
      { url: '/banner/icon.png', sizes: '16x16', type: 'image/png' },
      { url: '/banner/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/banner/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: ['/banner/icon.png'],
    apple: [
      { url: '/banner/icon.png' },
      { url: '/banner/icon.png', sizes: '180x180' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/banner/icon.png',
        color: '#1e5f3e', // Verde institucional UNAMAD
      },
    ],
  },

  manifest: '/manifest.json',
};

// Datos estructurados para SEO (Schema.org)
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Dirección de Proyección Social y Extensión Universitaria - UNAMAD',
  alternateName: 'DPSEU UNAMAD',
  url: 'https://proyeccionsocial.unamad.edu.pe',
  logo: 'https://proyeccionsocial.unamad.edu.pe/banner/icon.png',
  description: 'Dirección encargada de promover la responsabilidad social universitaria y la extensión cultural en la Universidad Nacional Amazónica de Madre de Dios',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Av. Jorge Chávez 1160',
    addressLocality: 'Puerto Maldonado',
    addressRegion: 'Madre de Dios',
    postalCode: '17001',
    addressCountry: 'PE'
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Atención al público',
    telephone: '+51-82-571199',
    email: 'proyeccionsocial@unamad.edu.pe',
    availableLanguage: ['Español'],
    areaServed: 'PE',
  },
  sameAs: [
    'https://www.facebook.com/UNAMAD.oficial',
    'https://twitter.com/UNAMAD_oficial',
    'https://www.instagram.com/unamad.oficial',
    'https://www.youtube.com/@UNAMAD',
    'https://www.linkedin.com/school/unamad'
  ],
  parentOrganization: {
    '@type': 'CollegeOrUniversity',
    name: 'Universidad Nacional Amazónica de Madre de Dios',
    url: 'https://www.unamad.edu.pe'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-PE" suppressHydrationWarning>
      <head>
        {/* Favicon principal */}
        <link rel="icon" type="image/png" href="/banner/icon.png" />
        <link rel="shortcut icon" type="image/png" href="/banner/icon.png" />

        {/* Datos estructurados JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Meta tags adicionales para SEO local */}
        <meta name="geo.region" content="PE-MDD" />
        <meta name="geo.placename" content="Puerto Maldonado" />
        <meta name="geo.position" content="-12.5933;-69.1891" />
        <meta name="ICBM" content="-12.5933, -69.1891" />

        {/* Meta tags de contenido */}
        <meta name="author" content="Universidad Nacional Amazónica de Madre de Dios" />
        <meta name="copyright" content="© 2024 UNAMAD. Todos los derechos reservados." />
        <meta name="language" content="Spanish" />
        <meta name="revisit-after" content="7 days" />
        <meta name="distribution" content="global" />
        <meta name="rating" content="general" />

        {/* Preconexión a dominios externos para mejorar performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS Prefetch para recursos externos */}
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body
        className={`${inter.variable} ${plusJakarta.variable} font-sans antialiased min-h-screen bg-background`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {/* Skip to content para accesibilidad */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
          >
            Saltar al contenido principal
          </a>

          {/* Contenido principal */}
          <div id="main-content">
            {children}
          </div>

          {/* Notificaciones */}
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              duration: 5000,
              classNames: {
                error: 'bg-red-600',
                success: 'bg-green-600',
                warning: 'bg-yellow-600',
                info: 'bg-blue-600',
              },
            }}
          />
        </ThemeProvider>

        {/* Scripts de Analytics (reemplaza con tu ID real) */}
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Google Analytics */}
            <script
              async
              src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', 'G-XXXXXXXXXX');
                `,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}