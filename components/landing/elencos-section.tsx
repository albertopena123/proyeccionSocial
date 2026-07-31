import { ElencosStack } from "@/components/landing/elencos-stack"
import { Reveal } from "@/components/landing/motion/reveal"

export function ElencosSection() {
  return (
    <section id="elencos" className="bg-background scroll-mt-16 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal stagger className="mx-auto max-w-2xl text-center">
          <h2 className="text-foreground font-display text-3xl font-extrabold tracking-tight md:text-5xl">
            Elencos
          </h2>
          <div className="bg-brand mx-auto mt-6 h-1 w-16 rounded-full" />
          <p className="text-muted-foreground mt-6 text-lg text-pretty">
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
