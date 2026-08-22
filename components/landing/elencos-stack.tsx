"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"

import { ELENCOS } from "@/lib/elencos"
import { gsap, useIsomorphicLayoutEffect, usePrefersReducedMotion } from "@/lib/gsap"
import { useSwipe } from "@/hooks/use-swipe"

const N = ELENCOS.length

/**
 * Cada cuánto pasa sola (3.5 segundos para lectura y apreciación visual cómoda).
 */
const AUTO_MS = 3500

/**
 * El abanico se mide en píxeles, así que tiene que encoger con la pantalla: a
 * ancho de móvil, la carta grande más el abanico de escritorio se salía 75px
 * por la derecha.
 */
function useEscritorio() {
  const [esc, setEsc] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const sync = () => setEsc(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return esc
}

export function ElencosStack() {
  const [frente, setFrente] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [tocado, setTocado] = useState(false)
  const cartas = useRef<(HTMLLIElement | null)[]>([])
  const anterior = useRef(0)
  const montado = useRef(false)
  const animando = useRef(false)
  const reduced = usePrefersReducedMotion()
  const escritorio = useEscritorio()

  const paso = escritorio ? 26 : 14

  useIsomorphicLayoutEffect(() => {
    const els = cartas.current.filter((c): c is HTMLLIElement => c !== null)
    if (els.length !== N) return

    const saliente = anterior.current
    anterior.current = frente
    const primeraVez = !montado.current
    montado.current = true

    els.forEach((el, i) => {
      const d = (i - frente + N) % N
      const p = { x: d * paso, y: d * -paso * 0.5, rotate: d * 1.6, scale: 1 - d * 0.03 }
      const zIndex = N - d

      if (primeraVez || reduced) {
        gsap.set(el, { ...p, zIndex })
        return
      }

      // `saliente !== frente` distingue un avance real de un re-render por
      // cambio de `paso` (la primera medición de escritorio tras montar, o un
      // resize que cruza los 768px): sin la guardia, la carta frontal
      // reproducía sola la animación de salida en cada carga de escritorio.
      if (i === saliente && saliente !== frente) {
        // La que se va sale volando y vuelve al fondo
        gsap
          .timeline({ onComplete: () => (animando.current = false) })
          .to(el, { x: -90, y: -30, rotate: -10, duration: 0.3, ease: "power2.in" })
          .set(el, { zIndex })
          .to(el, { ...p, duration: 0.55, ease: "power3.out" })
      } else {
        // El zIndex va en un set discreto, nunca dentro del tween: interpolarlo
        // hace que en los saltos multi-carta dos cartas crucen su orden a mitad
        // de animación y se pinten atravesándose.
        gsap.set(el, { zIndex })
        gsap.to(el, { ...p, duration: 0.55, ease: "power3.out", delay: 0.14 })
      }
    })
  }, [frente, reduced, paso])

  const mover = useCallback(
    (dir: number) => {
      if (animando.current) return
      if (!reduced) animando.current = true
      setFrente((f) => (f + dir + N) % N)
    },
    [reduced]
  )

  // Gestos táctiles: el swipe pausa el paso automático mientras dura el toque.
  const { onTouchStart, onTouchEnd } = useSwipe({
    onLeft: () => mover(1),
    onRight: () => mover(-1),
    onStart: () => setTocado(true),
    onEnd: () => setTocado(false),
  })

  // Navegación por teclado cuando el componente tiene foco
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      mover(1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      mover(-1)
    }
  }

  // Paso automático
  useEffect(() => {
    if (reduced || pausado || tocado) return
    const t = setTimeout(() => mover(1), AUTO_MS)
    return () => clearTimeout(t)
  }, [frente, reduced, pausado, tocado, mover])

  const activo = ELENCOS[frente]

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Pila interactiva de elencos culturales"
      className="focus-visible:ring-brand-ring flex flex-col items-center gap-8 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
      onMouseEnter={() => setTocado(true)}
      onMouseLeave={() => setTocado(false)}
      onFocus={() => setTocado(true)}
      onBlur={() => setTocado(false)}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Caja de cartas con soporte para clic y arrastre */}
      <div className="relative h-[415px] w-[330px] select-none md:h-[585px] md:w-[510px]">
        <ul className="absolute inset-0">
          {ELENCOS.map((elenco, i) => {
            const d = (i - frente + N) % N
            const esFrente = d === 0

            return (
              <li
                key={elenco.key}
                ref={(el) => {
                  cartas.current[i] = el
                }}
                onClick={() => {
                  if (!esFrente) mover(d)
                }}
                className={`bg-card absolute bottom-0 left-0 h-[380px] w-[260px] cursor-pointer overflow-hidden rounded-2xl border-2 shadow-lg transition-shadow duration-300 md:h-[520px] md:w-[380px] ${
                  esFrente ? "hover:shadow-2xl" : "hover:brightness-105"
                }`}
                style={{ borderColor: elenco.color }}
              >
                <Image
                  src={elenco.image}
                  alt={`${elenco.name}. ${elenco.description}.`}
                  fill
                  sizes="(min-width: 768px) 380px, 260px"
                  className="pointer-events-none object-cover"
                />
              </li>
            )
          })}
        </ul>
      </div>

      {/* Indicadores de puntos interactivos (Direct Jump) */}
      <div className="flex items-center gap-2" aria-label="Indicadores de elenco">
        {ELENCOS.map((elenco, i) => {
          const esActivo = i === frente
          return (
            <button
              key={elenco.key}
              type="button"
              // La guardia importa: mover(0) marcaría animando sin cambiar
              // `frente`, el efecto no correría y el flag quedaría atascado.
              onClick={() => {
                if (i !== frente) mover((i - frente + N) % N)
              }}
              aria-label={`Ver ${elenco.name}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                esActivo ? "w-8 opacity-100" : "w-2.5 opacity-40 hover:opacity-80"
              }`}
              style={{ backgroundColor: elenco.color }}
            />
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mover(-1)}
          className="border-border hover:bg-accent focus-visible:ring-brand-ring flex size-10 items-center justify-center rounded-full border transition-transform duration-200 active:scale-95 focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Elenco anterior</span>
        </button>

        {/* aria-live para anunciar cambio de carta */}
        <p aria-live="polite" className="text-muted-foreground min-w-40 text-center text-sm">
          <span className="text-foreground font-medium">{activo.name}</span>
          <span className="mt-0.5 block text-xs tabular-nums">
            {frente + 1} de {N}
          </span>
        </p>

        <button
          type="button"
          onClick={() => mover(1)}
          className="border-border hover:bg-accent focus-visible:ring-brand-ring flex size-10 items-center justify-center rounded-full border transition-transform duration-200 active:scale-95 focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">Elenco siguiente</span>
        </button>

        {!reduced && (
          <button
            type="button"
            onClick={() => setPausado((p) => !p)}
            className="border-border text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-brand-ring ml-1 flex size-10 items-center justify-center rounded-full border transition-transform duration-200 active:scale-95 focus-visible:ring-2 focus-visible:outline-none"
          >
            {pausado ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            <span className="sr-only">
              {pausado ? "Reanudar el paso automático" : "Pausar el paso automático"}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
