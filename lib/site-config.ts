/**
 * Datos institucionales de la DPSEU. Fuente única para el JSON-LD del layout
 * y el footer público: si cambia un teléfono, cambia en los dos sitios a la vez.
 */
export const siteConfig = {
  name: "DPSEU - UNAMAD",
  shortName: "DPSEU",
  fullName: "Dirección de Proyección Social y Extensión Universitaria",
  university: "Universidad Nacional Amazónica de Madre de Dios",
  url: "https://proyeccionsocial.unamad.edu.pe",
  universityUrl: "https://www.unamad.edu.pe",
  contact: {
    streetAddress: "Av. Jorge Chávez 1160",
    locality: "Puerto Maldonado",
    region: "Madre de Dios",
    postalCode: "17001",
    country: "PE",
    phone: "+51-82-571199",
    email: "proyeccionsocial@unamad.edu.pe",
  },
  social: {
    facebook: "https://www.facebook.com/UNAMAD.oficial",
    twitter: "https://twitter.com/UNAMAD_oficial",
    instagram: "https://www.instagram.com/unamad.oficial",
    youtube: "https://www.youtube.com/@UNAMAD",
    linkedin: "https://www.linkedin.com/school/unamad",
  },
} as const

/**
 * Solo entradas con sección real en la página. Un enlace de anclaje a un id que
 * no existe falla en silencio, así que esta lista y los `id` de las secciones
 * deben moverse juntos.
 */
export const navItems = [
  { label: "Inicio", href: "#inicio" },
  { label: "Elencos", href: "#elencos" },
  { label: "Actividades", href: "#actividades" },
  { label: "Responsabilidad Social", href: "#responsabilidad" },
  { label: "Contacto", href: "#contacto" },
] as const
