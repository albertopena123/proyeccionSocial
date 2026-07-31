"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"

import { ELENCOS } from "@/lib/elencos"
import { gsap, useIsomorphicLayoutEffect, usePrefersReducedMotion } from "@/lib/gsap"

const N = ELENCOS.length

/**
 * Cada cuánto pasa sola.
 *
 * Ojo al margen real: el reparto (salir volando y volver al fondo) dura 0.85s,
 * así que de estos 2s la carta solo está quieta y legible ~1.15s. Si hay que
 * apurar más, antes que bajar esto conviene acortar el reparto: si no, la
 * siguiente carta empieza a salir casi encima de la anterior.
 */
const AUTO_MS = 2000

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
      const p = { x: d * paso, y: d * -paso * 0.5, rotate: d * 1.6, scale: 1 - d * 0.03, zIndex: N - d }

      if (primeraVez || reduced) {
        gsap.set(el, p)
        return
      }

      if (i === saliente) {
        // La que se va sale volando y vuelve al fondo. El zIndex no se
        // interpola: se cambia de golpe cuando ya está fuera, si no la veríamos
        // atravesar la pila.
        gsap
          .timeline({ onComplete: () => (animando.current = false) })
          .to(el, { x: -90, y: -30, rotate: -10, duration: 0.3, ease: "power2.in" })
          .set(el, { zIndex: p.zIndex })
          .to(el, { ...p, duration: 0.55, ease: "power3.out" })
      } else {
        gsap.to(el, { ...p, duration: 0.55, ease: "power3.out", delay: 0.14 })
      }
    })
  }, [frente, reduced, paso])

  const mover = useCallback(
    (dir: 1 | -1) => {
      if (animando.current) return
      if (!reduced) animando.current = true
      setFrente((f) => (f + dir + N) % N)
    },
    [reduced]
  )

  // Pasa sola. Depende de `frente`, así que al mover a mano el reloj se
  // reinicia y no salta una carta justo después de que la cambies tú.
  useEffect(() => {
    if (reduced || pausado || tocado) return
    const t = setTimeout(() => mover(1), AUTO_MS)
    return () => clearTimeout(t)
  }, [frente, reduced, pausado, tocado, mover])

  const activo = ELENCOS[frente]

  return (
    <div
      className="flex flex-col items-center gap-8"
      // Se detiene mientras la lees o la recorres con el teclado, y sigue al
      // salir. Es lo mínimo para que no te cambie la carta a media frase.
      onMouseEnter={() => setTocado(true)}
      onMouseLeave={() => setTocado(false)}
      onFocusCapture={() => setTocado(true)}
      onBlurCapture={() => setTocado(false)}
    >
      {/* La pila es decorativa en su disposición, pero las seis cartas están en
          el DOM y en orden: un lector de pantalla las lee todas, no solo la de
          delante. Lo que se apila es la presentación, no la información. */}
      {/* La caja mide la CARTA MÁS EL ABANICO (5 pasos a la derecha y la mitad
          hacia arriba). Si midiera solo la carta, al centrarla el abanico se
          saldría por la derecha: es lo que pasaba en móvil. Las cartas se anclan
          abajo-izquierda, que es de donde crece el abanico. */}
      <div className="relative h-[415px] w-[330px] md:h-[585px] md:w-[510px]">
        <ul className="absolute inset-0">
          {ELENCOS.map((elenco, i) => (
            <li
              key={elenco.key}
              ref={(el) => {
                cartas.current[i] = el
              }}
              // overflow-hidden para que el póster respete la esquina redondeada;
              // sin él la imagen desborda el radio por las cuatro esquinas. Sin
              // padding: el póster va a sangre. El borde de color se queda, y no
              // es decorativo: en abanico, de las cartas de atrás solo se ve eso,
              // y es lo que hace que la pila lea como un degradado.
              className="bg-card absolute bottom-0 left-0 h-[380px] w-[260px] overflow-hidden rounded-2xl border-2 md:h-[520px] md:w-[380px]"
              style={{ borderColor: elenco.color }}
            >
              {/* El póster ya trae el nombre y la descripción impresos, así que
                  aquí no se repiten: el alt es quien los pone a disposición del
                  lector de pantalla. Además el párrafo aria-live de abajo canta
                  el elenco cada vez que cambia. */}
              <Image
                src={elenco.image}
                alt={`${elenco.name}. ${elenco.description}.`}
                fill
                sizes="(min-width: 768px) 380px, 260px"
                className="object-cover"
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mover(-1)}
          className="border-border hover:bg-accent focus-visible:ring-brand-ring flex size-10 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Elenco anterior</span>
        </button>

        {/* aria-live para que quien no ve la baraja se entere de qué carta pasó
            al frente, la cambie él o pase sola. */}
        <p aria-live="polite" className="text-muted-foreground min-w-40 text-center text-sm">
          <span className="text-foreground font-medium">{activo.name}</span>
          <span className="mt-0.5 block text-xs tabular-nums">
            {frente + 1} de {N}
          </span>
        </p>

        <button
          type="button"
          onClick={() => mover(1)}
          className="border-border hover:bg-accent focus-visible:ring-brand-ring flex size-10 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">Elenco siguiente</span>
        </button>

        {/* WCAG 2.2.2: si el contenido se actualiza solo, tiene que haber forma
            de pararlo. Con reduced-motion no pasa sola, así que sobra el botón. */}
        {!reduced && (
          <button
            type="button"
            onClick={() => setPausado((p) => !p)}
            className="border-border text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-brand-ring ml-1 flex size-10 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
