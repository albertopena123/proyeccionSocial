import { ResponsabilidadOruga } from "@/components/landing/responsabilidad-oruga"

export function ResponsabilidadSection() {
  return (
    <section
      id="responsabilidad"
      className="bg-muted/40 scroll-mt-16 px-6 py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-foreground font-display text-3xl font-extrabold tracking-tight text-balance md:text-5xl">
            Responsabilidad Social y Voluntariado Universitario
          </h2>
          <p className="text-muted-foreground mt-5 text-pretty md:text-lg">
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
