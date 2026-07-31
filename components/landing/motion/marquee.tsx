"use client"

import { useRef, useState } from "react"
import { Pause, Play } from "lucide-react"

import { gsap, useIsomorphicLayoutEffect, withMotionPreference } from "@/lib/gsap"

type MarqueeProps = {
  items: readonly string[]
  /** Segundos por vuelta. Lokal usa 54: lento y ambiental, no reclama atención. */
  duration?: number
}

export function Marquee({ items, duration = 54 }: MarqueeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const [paused, setPaused] = useState(false)

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    return withMotionPreference(() => {
      const tracks = el.querySelectorAll("[data-marquee-track]")
      if (!tracks.length) return

      // Dos pistas idénticas pegadas: cuando la primera se ha ido -100%, la
      // segunda ocupa exactamente su hueco, así que el salto del repeat no se ve.
      tl.current = gsap
        .timeline({ repeat: -1 })
        .to(tracks, { x: "-100%", ease: "none", duration })
    })
  }, [duration])

  const toggle = () => {
    const t = tl.current
    if (!t) return
    if (t.paused()) {
      t.play()
      setPaused(false)
    } else {
      t.pause()
      setPaused(true)
    }
  }

  return (
    // overflow-hidden es obligatorio, no cosmético: las dos pistas suman ~3000px
    // y sin recortarlas estiran el documento entero, dejando toda la web con
    // scroll horizontal en cualquier pantalla.
    <div className="border-border bg-brand text-brand-foreground relative overflow-hidden border-y py-4">
      <div
        ref={ref}
        className="flex w-max"
        onMouseEnter={() => tl.current?.pause()}
        onMouseLeave={() => !paused && tl.current?.play()}
      >
        {[0, 1].map((track) => (
          <ul
            key={track}
            data-marquee-track
            // La segunda pista es un duplicado visual: que un lector de pantalla
            // no lea la lista dos veces.
            aria-hidden={track === 1}
            className="flex shrink-0 items-center"
          >
            {items.map((item) => (
              <li
                key={item}
                className="flex items-center gap-8 px-8 text-sm font-medium tracking-wide whitespace-nowrap uppercase"
              >
                {item}
                <span aria-hidden className="size-1.5 rounded-full bg-current opacity-50" />
              </li>
            ))}
          </ul>
        ))}
      </div>

      {/* WCAG 2.2.2: movimiento automático indefinido necesita un control de pausa. */}
      <button
        type="button"
        onClick={toggle}
        className="text-brand-foreground/70 hover:bg-brand-foreground/10 hover:text-brand-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 transition-colors focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
      >
        {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        <span className="sr-only">
          {paused ? "Reanudar el desplazamiento" : "Pausar el desplazamiento"}
        </span>
      </button>
    </div>
  )
}
