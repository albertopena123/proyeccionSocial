import { HeartHandshake } from "lucide-react"

import { ResponsabilidadOruga } from "@/components/landing/responsabilidad-oruga"

export function ResponsabilidadSection() {
  return (
    <section
      id="responsabilidad"
      className="bg-muted/40 scroll-mt-16 px-6 py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* Cabecera con el mismo patrón que el resto de secciones: insignia +
            título + subrayado de marca + bajada. */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="border-brand/20 bg-brand/5 text-brand dark:bg-brand/15 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold backdrop-blur-sm">
            <HeartHandshake className="text-brand size-3.5" />
            <span>Compromiso con la Región</span>
          </div>
          <h2 className="text-foreground font-display mt-4 text-3xl font-extrabold tracking-tight text-balance md:text-5xl">
            Responsabilidad Social y Voluntariado Universitario
          </h2>
          <div className="bg-brand mx-auto mt-5 h-1 w-16 rounded-full" />
          <p className="text-muted-foreground mt-4 text-pretty md:text-lg">
            Comprometidos con el desarrollo sostenible de nuestra región, formamos profesionales con
            valores éticos y responsabilidad social.
          </p>
        </div>

        <div className="mt-14 md:mt-16">
          <ResponsabilidadOruga />
        </div>
      </div>
    </section>
  )
}
