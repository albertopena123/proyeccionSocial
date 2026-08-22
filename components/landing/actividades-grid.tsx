"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Maximize2, X, ArrowUpRight } from "lucide-react"

import { ACTIVIDADES } from "@/lib/actividades"
import { Flip, gsap, useIsomorphicLayoutEffect, usePrefersReducedMotion } from "@/lib/gsap"
import { useSwipe } from "@/hooks/use-swipe"

const N = ACTIVIDADES.length
const FLIP_S = 0.7
const FLIP_EASE = "power1.inOut"
const TELON_S = 0.35
const TELON_OPACIDAD = 0.75

export function ActividadesGrid() {
  const [abierta, setAbierta] = useState<number | null>(null)
  const [montado, setMontado] = useState(false)
  const reduced = usePrefersReducedMotion()

  const telon = useRef<HTMLDivElement>(null)
  const dialogoRef = useRef<HTMLElement>(null)
  const cerrarRef = useRef<HTMLButtonElement>(null)
  const disparador = useRef<HTMLButtonElement | null>(null)
  const estadoFlip = useRef<ReturnType<typeof Flip.getState> | null>(null)

  // Espejo de `abierta` para que cerrar/navegarModal sean estables: sin él,
  // cada cambio de foto recreaba los callbacks y con ellos el efecto de
  // teclado, que desmontaba el listener, re-bloqueaba el body y arrastraba el
  // foco al botón de cerrar a mitad de navegación.
  const abiertaRef = useRef<number | null>(null)
  useEffect(() => {
    abiertaRef.current = abierta
  }, [abierta])

  useEffect(() => setMontado(true), [])

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
    const curr = abiertaRef.current
    if (curr === null) return
    capturar(curr)
    setAbierta(null)
  }, [capturar])

  const navegarModal = useCallback((dir: number) => {
    setAbierta((curr) => (curr === null ? null : (curr + dir + N) % N))
  }, [])

  useIsomorphicLayoutEffect(() => {
    const estado = estadoFlip.current
    estadoFlip.current = null

    if (estado) {
      Flip.from(estado, {
        duration: FLIP_S,
        ease: FLIP_EASE,
        absolute: abierta === null,
      })
    }

    if (!telon.current) return
    const destino = abierta === null ? 0 : TELON_OPACIDAD
    if (reduced) gsap.set(telon.current, { autoAlpha: destino })
    else gsap.to(telon.current, { autoAlpha: destino, duration: TELON_S, ease: "power1.inOut" })
  }, [abierta, reduced])

  useEffect(() => {
    if (abierta === null && disparador.current) {
      disparador.current.focus()
      disparador.current = null
    }
  }, [abierta])

  // Al navegar DENTRO del modal, el disparador se muda a la tarjeta de la foto
  // actual: así el Flip de cierre y la restauración de foco aterrizan en la
  // misma tarjeta que se ve animarse, no en la que abrió el modal.
  useEffect(() => {
    if (abierta === null) return
    const btn = document.querySelector<HTMLButtonElement>(`[data-abrir="${abierta}"]`)
    if (btn) disparador.current = btn
  }, [abierta])

  const abierto = abierta !== null

  // Teclado y bloqueo de scroll, montado UNA vez por apertura (los callbacks
  // son estables): el foco solo salta al botón de cerrar al abrir, no en cada
  // cambio de foto.
  useEffect(() => {
    if (!abierto) return
    cerrarRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cerrar()
      } else if (e.key === "ArrowRight") {
        navegarModal(1)
      } else if (e.key === "ArrowLeft") {
        navegarModal(-1)
      } else if (e.key === "Tab") {
        // Trampa de foco: el diálogo es aria-modal y la página de detrás queda
        // tapada por el telón e inalcanzable con scroll bloqueado, así que Tab
        // cicla entre los controles del diálogo y nunca escapa.
        const dialogo = dialogoRef.current
        if (!dialogo) return
        const focusables = dialogo.querySelectorAll<HTMLElement>(
          "button, [href], [tabindex]:not([tabindex='-1'])"
        )
        if (!focusables.length) return
        const primero = focusables[0]
        const ultimo = focusables[focusables.length - 1]
        const activo = document.activeElement
        if (e.shiftKey && (activo === primero || !dialogo.contains(activo))) {
          e.preventDefault()
          ultimo.focus()
        } else if (!e.shiftKey && (activo === ultimo || !dialogo.contains(activo))) {
          e.preventDefault()
          primero.focus()
        }
      }
    }
    document.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
  }, [abierto, cerrar, navegarModal])

  // Gestos táctiles dentro del modal
  const swipeModal = useSwipe({
    onLeft: () => navegarModal(1),
    onRight: () => navegarModal(-1),
  })

  const act = abierta === null ? null : ACTIVIDADES[abierta]

  return (
    <>
      {montado &&
        createPortal(
          <>
            {/* opacity-0 es el estado de reposo que el primer tween de GSAP
                necesita leer (autoAlpha anima desde lo computado), y aquí no va
                transition-* alguno: GSAP escribe opacity por frame y una
                transición CSS re-interpolaría cada escritura, además de
                posponer visibility:hidden y dejar el overlay tragando clics
                tras cerrar. */}
            <div
              ref={telon}
              onClick={cerrar}
              aria-hidden={abierta === null}
              className="invisible fixed inset-0 z-[60] bg-black/80 opacity-0 backdrop-blur-md"
            />

            {act && (
              <figure
                ref={dialogoRef}
                role="dialog"
                aria-modal
                aria-label={act.titulo}
                onTouchStart={swipeModal.onTouchStart}
                onTouchEnd={swipeModal.onTouchEnd}
                className="fixed top-1/2 left-1/2 z-70 flex w-[min(94vw,64rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3"
              >
                {/* Imagen principal con marco estilizado */}
                <div
                  className="relative overflow-hidden rounded-2xl border-2 bg-black/95 shadow-2xl"
                  style={{ borderColor: act.color }}
                >
                  <Image
                    key={act.key}
                    data-flip-id={`act-${abierta}`}
                    src={act.src}
                    alt={act.pie}
                    width={act.width}
                    height={act.height}
                    sizes="94vw"
                    className="max-h-[66vh] w-full object-contain"
                  />

                  {/* Controles flotantes de navegación */}
                  <button
                    type="button"
                    onClick={() => navegarModal(-1)}
                    className="bg-black/50 text-white hover:bg-black/80 focus-visible:ring-brand-ring absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 backdrop-blur-md transition-all active:scale-90 focus-visible:ring-2 focus-visible:outline-none"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="size-6" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navegarModal(1)}
                    className="bg-black/50 text-white hover:bg-black/80 focus-visible:ring-brand-ring absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 backdrop-blur-md transition-all active:scale-90 focus-visible:ring-2 focus-visible:outline-none"
                    aria-label="Foto siguiente"
                  >
                    <ChevronRight className="size-6" />
                  </button>

                  {/* Botón cerrar flotante */}
                  <button
                    ref={cerrarRef}
                    type="button"
                    onClick={cerrar}
                    className="bg-black/60 text-white hover:bg-black/90 focus-visible:ring-brand-ring absolute top-3 right-3 flex size-10 items-center justify-center rounded-full border border-white/20 backdrop-blur-md shadow-lg transition-transform active:scale-90 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <X className="size-5" />
                    <span className="sr-only">Cerrar</span>
                  </button>
                </div>

                {/* Pie de foto y miniaturas interactivas */}
                <div className="bg-card/95 border-border flex flex-col gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: act.color }}
                      />
                      <p className="text-card-foreground font-display text-lg font-bold">{act.titulo}</p>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm text-pretty">{act.pie}</p>
                  </div>

                  {/* Selector de miniaturas */}
                  <div className="flex shrink-0 items-center gap-2" aria-label="Miniaturas de la galería">
                    {ACTIVIDADES.map((item, idx) => {
                      const esActiva = idx === abierta
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setAbierta(idx)}
                          aria-label={`Ver foto ${item.titulo}`}
                          className={`relative h-12 w-16 overflow-hidden rounded-lg border-2 transition-all ${
                            esActiva
                              ? "ring-brand/80 scale-105 opacity-100 ring-2"
                              : "opacity-50 hover:opacity-90"
                          }`}
                          style={{ borderColor: item.color }}
                        >
                          <Image
                            src={item.src}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </figure>
            )}
          </>,
          document.body
        )}

      {/* Cuadrícula de actividades enriquecida */}
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIVIDADES.map((a, i) => (
          <li key={a.key}>
            <figure
              className="bg-card group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
              style={{ borderColor: a.color }}
            >
              {/* Botón contenedor de imagen interactiva */}
              <button
                type="button"
                data-abrir={i}
                onClick={(e) => abrir(i, e.currentTarget)}
                className="focus-visible:ring-brand-ring group/btn relative block w-full cursor-zoom-in overflow-hidden focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  <Image
                    data-flip-id={abierta === i ? undefined : `act-${i}`}
                    src={a.src}
                    alt={a.pie}
                    width={a.width}
                    height={a.height}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/btn:scale-108"
                  />

                  {/* Gradiente oscuro sobre la imagen en hover */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-40 transition-opacity duration-300 group-hover/btn:opacity-80" />

                  {/* Badge de categoría superior */}
                  <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: a.color }} />
                    <span>{a.titulo}</span>
                  </div>

                  {/* Icono de ampliación en esquina superior derecha */}
                  <div className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white opacity-0 backdrop-blur-md transition-all duration-300 group-hover/btn:scale-100 group-hover/btn:opacity-100 scale-75">
                    <Maximize2 className="size-4" />
                  </div>
                </div>
                <span className="sr-only">Ampliar: {a.titulo}</span>
              </button>

              {/* Pie de tarjeta con micro-interacción */}
              <figcaption className="bg-card flex flex-1 flex-col justify-between p-5">
                <div>
                  <h3 className="text-card-foreground font-display text-lg font-bold tracking-tight">
                    {a.titulo}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                    {a.pie}
                  </p>
                </div>

                <div className="border-border/60 mt-4 flex items-center justify-between border-t pt-3.5">
                  <span className="text-muted-foreground text-xs font-medium">
                    UNAMAD • DPSEU
                  </span>
                  <button
                    type="button"
                    onClick={(e) => abrir(i, e.currentTarget)}
                    className="text-brand inline-flex items-center gap-1 text-xs font-semibold transition-transform duration-200 group-hover:translate-x-1"
                  >
                    Ver foto
                    <ArrowUpRight className="size-3.5" />
                  </button>
                </div>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </>
  )
}
