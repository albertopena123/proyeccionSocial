"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { X } from "lucide-react"

import { ACTIVIDADES } from "@/lib/actividades"
import { Flip, gsap, useIsomorphicLayoutEffect, usePrefersReducedMotion } from "@/lib/gsap"

/**
 * Valores tomados de la demo de GSAP: el Flip dura 0.7s con power1.inOut, y el
 * telón entra en 0.35s hasta 0.65 de opacidad —la mitad de tiempo que el Flip—.
 * Ese desfase es deliberado: el fondo se oscurece rápido y la foto sigue
 * creciendo un rato más. Con ambos a la misma duración se pierde.
 */
const FLIP_S = 0.7
const FLIP_EASE = "power1.inOut"
const TELON_S = 0.35
const TELON_OPACIDAD = 0.65

export function ActividadesGrid() {
  const [abierta, setAbierta] = useState<number | null>(null)
  const [montado, setMontado] = useState(false)
  const reduced = usePrefersReducedMotion()

  const telon = useRef<HTMLDivElement>(null)
  const cerrarRef = useRef<HTMLButtonElement>(null)
  const disparador = useRef<HTMLButtonElement | null>(null)
  const estadoFlip = useRef<ReturnType<typeof Flip.getState> | null>(null)

  useEffect(() => setMontado(true), [])

  // Flip empareja por data-flip-id. Al abrir, el id lo lleva la foto de la
  // tarjeta; al pintar el modal, la tarjeta lo suelta y lo recoge el modal, así
  // que Flip anima de una al otro aunque sean elementos distintos.
  const capturar = useCallback(
    (i: number) => {
      if (reduced) return
      const el = document.querySelector(`[data-flip-id="act-${i}"]`)
      if (el) estadoFlip.current = Flip.getState(el)
    },
    [reduced]
  )

  const abrir = (i: number, boton: HTMLButtonElement) => {
    disparador.current = boton
    capturar(i)
    setAbierta(i)
  }

  const cerrar = useCallback(() => {
    if (abierta === null) return
    capturar(abierta)
    setAbierta(null)
  }, [abierta, capturar])

  useIsomorphicLayoutEffect(() => {
    const estado = estadoFlip.current
    estadoFlip.current = null

    if (estado) {
      Flip.from(estado, {
        duration: FLIP_S,
        ease: FLIP_EASE,
        // absolute solo al cerrar, como en la demo: saca la foto del flujo
        // mientras vuelve, para que la rejilla no le reserve sitio a medio
        // camino y dé un salto.
        absolute: abierta === null,
      })
    }

    if (!telon.current) return
    const destino = abierta === null ? 0 : TELON_OPACIDAD
    if (reduced) gsap.set(telon.current, { autoAlpha: destino })
    else gsap.to(telon.current, { autoAlpha: destino, duration: TELON_S, ease: "power1.inOut" })
  }, [abierta, reduced])

  // El foco vuelve a la foto desde la que se abrió, pero en un efecto y no
  // dentro de cerrar(): allí corría antes de que React repintara y el foco se
  // perdía. Sin esto, quien navega con teclado acaba al principio de la página.
  useEffect(() => {
    if (abierta === null && disparador.current) {
      disparador.current.focus()
      disparador.current = null
    }
  }, [abierta])

  useEffect(() => {
    if (abierta === null) return
    cerrarRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cerrar()
        return
      }
      // Trampa de foco. El modal solo tiene el botón de cerrar, así que basta
      // con devolverle el foco: el tabulador no puede escaparse a la página de
      // detrás, que es lo que hay que evitar.
      if (e.key === "Tab") {
        e.preventDefault()
        cerrarRef.current?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    // Sin scroll de fondo mientras el modal está abierto.
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
  }, [abierta, cerrar])

  const act = abierta === null ? null : ACTIVIDADES[abierta]

  return (
    <>
      {/* El modal va en un portal a body A PROPÓSITO, y no como clase sobre la
          propia figura: la rejilla cuelga de un <Reveal>, que anima `y` y deja
          un transform vivo en su envoltorio (con toggleActions reverse no llega
          a limpiarse). Un position:fixed dentro de un ancestro transformado se
          ancla a ESE ancestro, no al viewport, así que la foto ampliada saldría
          centrada sobre la rejilla en vez de sobre la pantalla. Fuera del
          subárbol, se comporta. */}
      {montado &&
        createPortal(
          <>
            {/* Telón siempre montado y controlado por GSAP: así entra y sale con
                su propia curva y su propio tiempo (0.35s), desfasado del Flip
                (0.7s). Si se montara y desmontara con React no habría transición
                al cerrar. autoAlpha lo deja en visibility:hidden, así que cerrado
                no traga clics. z-[60] por encima de la cabecera (z-50). */}
            <div
              ref={telon}
              onClick={cerrar}
              aria-hidden={abierta === null}
              className="invisible fixed inset-0 z-[60] bg-black opacity-0 backdrop-blur-sm"
            />

            {act && (
              <figure
                role="dialog"
                aria-modal
                aria-label={act.titulo}
                className="fixed top-1/2 left-1/2 z-70 w-[min(92vw,62rem)] -translate-x-1/2 -translate-y-1/2"
              >
                {/* Ampliada se ve entera: la primera foto es un panorama 2.46:1
                    y recortada deja gente fuera. */}
                <Image
                  data-flip-id={`act-${abierta}`}
                  src={act.src}
                  alt={act.pie}
                  width={act.width}
                  height={act.height}
                  sizes="92vw"
                  className="max-h-[72vh] w-full rounded-2xl border-2 object-contain"
                  style={{ borderColor: act.color }}
                />
                <figcaption className="bg-card mt-3 rounded-xl p-4">
                  <p className="text-card-foreground font-display font-bold">{act.titulo}</p>
                  <p className="text-muted-foreground mt-1 text-sm text-pretty">{act.pie}</p>
                </figcaption>
                <button
                  ref={cerrarRef}
                  type="button"
                  onClick={cerrar}
                  className="bg-background/90 text-foreground hover:bg-background focus-visible:ring-brand-ring absolute top-3 right-3 flex size-9 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <X className="size-4" />
                  <span className="sr-only">Cerrar</span>
                </button>
              </figure>
            )}
          </>,
          document.body
        )}

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIVIDADES.map((a, i) => (
          <li key={a.key}>
            {/* border-2 con el color de la actividad, igual que las cartas de
                elencos: es lo que da la fila de colores. */}
            <figure
              className="bg-card overflow-hidden rounded-2xl border-2"
              style={{ borderColor: a.color }}
            >
              <button
                type="button"
                onClick={(e) => abrir(i, e.currentTarget)}
                className="focus-visible:ring-brand-ring block w-full cursor-zoom-in focus-visible:ring-2 focus-visible:outline-none"
              >
                {/* En la rejilla la foto va recortada a 4:3 porque las tres
                    tienen proporciones distintas. */}
                <Image
                  data-flip-id={abierta === i ? undefined : `act-${i}`}
                  src={a.src}
                  alt={a.pie}
                  width={a.width}
                  height={a.height}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="aspect-[4/3] w-full object-cover"
                />
                <span className="sr-only">Ampliar: {a.titulo}</span>
              </button>

              <figcaption className="bg-card p-4">
                <p className="text-card-foreground font-display font-bold">{a.titulo}</p>
                <p className="text-muted-foreground mt-1 text-sm text-pretty">{a.pie}</p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </>
  )
}
