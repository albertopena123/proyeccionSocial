import { Music } from "lucide-react"

import { ElencosStack } from "@/components/landing/elencos-stack"
import { Reveal } from "@/components/landing/motion/reveal"

export function ElencosSection() {
  return (
    <section id="elencos" className="bg-background scroll-mt-16 py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Mismo patrón de cabecera que Actividades (insignia + título +
            subrayado + bajada): las secciones riman entre sí. */}
        <Reveal stagger className="mx-auto max-w-2xl text-center">
          <div className="border-brand/20 bg-brand/5 text-brand dark:bg-brand/15 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold backdrop-blur-sm">
            <Music className="text-brand size-3.5" />
            <span>Cultura y Arte</span>
          </div>
          <h2 className="text-foreground font-display mt-4 text-3xl font-extrabold tracking-tight md:text-5xl">
            Elencos
          </h2>
          <div className="bg-brand mx-auto mt-5 h-1 w-16 rounded-full" />
          <p className="text-muted-foreground mt-4 text-lg text-pretty">
            Espacios de formación artística y cultural abiertos a toda la comunidad universitaria.
          </p>
        </Reveal>

        <div className="mt-16">
          <ElencosStack />
        </div>
      </div>
    </section>
  )
}
