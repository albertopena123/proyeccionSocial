import { ActividadesGrid } from "@/components/landing/actividades-grid"
import { Reveal } from "@/components/landing/motion/reveal"
import { Camera } from "lucide-react"

export function ActividadesSection() {
  return (
    <section id="actividades" className="bg-background relative scroll-mt-16 overflow-hidden py-28">
      {/* Resplandor ambiental decorativo de fondo. Sin z negativo: la sección
          no crea stacking context, así que -z-10 lo mandaba DETRÁS del
          bg-background y era invisible. Como primer hijo posicionado queda
          sobre el fondo, y el contenido (relative) se pinta encima de él. */}
      <div
        aria-hidden
        className="bg-brand/5 dark:bg-brand/10 pointer-events-none absolute -top-24 left-1/2 size-[36rem] -translate-x-1/2 rounded-full blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <Reveal stagger className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3.5 py-1 text-xs font-semibold text-brand backdrop-blur-sm dark:bg-brand/15">
            <Camera className="size-3.5 text-brand" />
            <span>Galería Institucional</span>
          </div>

          <h2 className="text-foreground font-display mt-4 text-3xl font-extrabold tracking-tight md:text-5xl">
            Nuestras Actividades en Acción
          </h2>
          <div className="bg-brand mx-auto mt-5 h-1 w-16 rounded-full" />
          <p className="text-muted-foreground mt-4 text-base text-pretty md:text-lg">
            Momentos reales del voluntariado, la extensión universitaria y los elencos artísticos de la UNAMAD.
          </p>
        </Reveal>

        <Reveal className="mt-14">
          <ActividadesGrid />
        </Reveal>
      </div>
    </section>
  )
}
