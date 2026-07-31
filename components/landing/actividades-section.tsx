import { ActividadesGrid } from "@/components/landing/actividades-grid"
import { Reveal } from "@/components/landing/motion/reveal"

export function ActividadesSection() {
  return (
    <section id="actividades" className="bg-background scroll-mt-16 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal stagger className="mx-auto max-w-2xl text-center">
          <h2 className="text-foreground font-display text-3xl font-extrabold tracking-tight md:text-5xl">
            Nuestras Actividades en Acción
          </h2>
          <div className="bg-brand mx-auto mt-6 h-1 w-16 rounded-full" />
          <p className="text-muted-foreground mt-6 text-lg text-pretty">
            Momentos reales de la proyección social y los elencos de la UNAMAD.
          </p>
        </Reveal>

        <Reveal className="mt-14">
          <ActividadesGrid />
        </Reveal>
      </div>
    </section>
  )
}
