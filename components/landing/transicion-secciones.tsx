"use client"

import { useCallback, useEffect, useRef } from "react"

import { navItems } from "@/lib/site-config"
import { gsap, ScrollTrigger, usePrefersReducedMotion } from "@/lib/gsap"

/**
 * Barrido de ondas al cruzar entre secciones con el scroll.
 *
 * Cuando el scroll entra en una sección nueva, dos capas onduladas hacen UN
 * barrido: suben desde abajo, cruzan la pantalla y salen por arriba. No frenan
 * el scroll (la capa nunca recibe clics) ni saltan a ningún sitio: solo pasan
 * por encima. La geometría de las ondas es la del pen de Blake Bowen; lo que
 * cambia es que aquí es un barrido continuo, no un menú que tapa y espera.
 *
 * El barrido son dos pasadas seguidas de la MISMA animación (los puntos siempre
 * van de 100 a 0): la primera con la capa "tapando" —el color sube y cubre— y la
 * segunda "destapando" —el color sigue subiendo y sale por arriba—. Entre las
 * dos hay un instante de cobertura total que enlaza sin corte.
 *
 * Con menos movimiento no se monta nada: el scroll pasa entre secciones sin
 * cortinilla.
 */

/** Puntos de control de la onda. */
const NUM_PUNTOS = 10

/** Desfase aleatorio de cada punto: es lo que hace que la onda no sea uniforme. */
const RETARDO_PUNTOS = 0.12

/** Desfase entre las dos capas, para que una asome por detrás de la otra. */
const RETARDO_POR_CAPA = 0.1

/** Corto a propósito: es un barrido de paso, no una pantalla de carga. */
const DURACION = 0.38

/** Intervalo mínimo entre barridos consecutivos para evitar saturación en scroll veloz. */
const MIN_INTERVALO_MS = 650

// Precomputar constantes de segmentos X y control points para no dividir en cada frame
const SEGMENT_STEP = 100 / (NUM_PUNTOS - 1)
const HALF_STEP = SEGMENT_STEP / 2
const PASOS_X = Array.from({ length: NUM_PUNTOS - 1 }, (_, j) => {
  const x = (j + 1) * SEGMENT_STEP
  const cx = x - HALF_STEP
  return { x: Number(x.toFixed(2)), cx: Number(cx.toFixed(2)) }
})

export function TransicionSecciones() {
  const svg = useRef<SVGSVGElement>(null)
  const capas = useRef<(SVGPathElement | null)[]>([])
  const puntos = useRef<number[][]>([])
  const tapando = useRef(false)
  const linea = useRef<gsap.core.Timeline | null>(null)
  const ultimoBarrido = useRef(0)
  const reduced = usePrefersReducedMotion()

  // Reconstruye el atributo `d` de cada capa de forma optimizada.
  const pintar = useCallback(() => {
    const list = capas.current
    const pts = puntos.current
    const isTapando = tapando.current

    for (let i = 0; i < list.length; i++) {
      const capa = list[i]
      const p = pts[i]
      if (!capa || !p) continue

      let d = isTapando ? `M 0 0 V ${p[0].toFixed(1)} C` : `M 0 ${p[0].toFixed(1)} C`
      for (let j = 0; j < NUM_PUNTOS - 1; j++) {
        const { x, cx } = PASOS_X[j]
        d += ` ${cx} ${p[j].toFixed(1)} ${cx} ${p[j + 1].toFixed(1)} ${x} ${p[j + 1].toFixed(1)}`
      }
      d += isTapando ? " V 100 H 0" : " V 0 H 0"

      capa.setAttribute("d", d)
    }
  }, [])

  useEffect(() => {
    puntos.current = capas.current.map(() => Array.from({ length: NUM_PUNTOS }, () => 100))
    linea.current = gsap.timeline({
      onUpdate: pintar,
      defaults: { ease: "power2.inOut", duration: DURACION },
    })
    return () => {
      linea.current?.kill()
      linea.current = null
    }
  }, [pintar])

  // Una pasada completa. Siempre anima los puntos de 100 a 0.
  const pasada = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const tl = linea.current
        if (!tl) return resolve()

        tl.progress(0).clear()

        const retardos = Array.from({ length: NUM_PUNTOS }, () => Math.random() * RETARDO_PUNTOS)
        const total = capas.current.length

        capas.current.forEach((_, i) => {
          const p = puntos.current[i]
          const retardoCapa = RETARDO_POR_CAPA * (tapando.current ? i : total - i - 1)
          for (let j = 0; j < NUM_PUNTOS; j++) {
            tl.to(p, { [j]: 0 }, retardos[j] + retardoCapa)
          }
        })

        tl.eventCallback("onComplete", () => {
          tl.eventCallback("onComplete", null)
          resolve()
        })
      }),
    []
  )

  // El barrido optimizado: sube cubriendo y destapando sin colisiones de animación.
  const barrido = useCallback(async () => {
    const ahora = Date.now()
    if (ahora - ultimoBarrido.current < MIN_INTERVALO_MS) return
    const tl = linea.current
    if (!tl || tl.isActive()) return

    ultimoBarrido.current = ahora
    if (svg.current) svg.current.style.visibility = "visible"
    tapando.current = true
    await pasada()
    tapando.current = false
    await pasada()
    if (svg.current) svg.current.style.visibility = "hidden"
  }, [pasada])

  useEffect(() => {
    // Con menos movimiento, ni ScrollTrigger: el scroll cruza sin cortinilla.
    if (reduced) return

    const secciones = navItems
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter((s): s is HTMLElement => s !== null)
    if (!secciones.length) return

    let activa = -1
    let iniciado = false

    const cambiar = (idx: number) => {
      const i = Math.max(0, Math.min(secciones.length - 1, idx))
      if (i === activa) return
      const anterior = activa
      activa = i
      // En la carga NO hay barrido: solo cuando el cambio lo provoca el scroll.
      // Y solo en el cruce con la PRIMERA sección (el hero): al dejarla bajando
      // o al volver a ella subiendo. En cada frontera se hacía pesado; así el
      // barrido marca la salida de la portada y el resto del scroll pasa limpio.
      if (iniciado && (anterior === 0 || i === 0)) void barrido()
    }

    // Una sección es la "actual" cuando su borde superior pasa el centro de la
    // pantalla. Bajando (onEnter) esa sección pasa a ser la actual; subiendo
    // (onEnterBack) volvemos a la anterior. Es el patrón clásico de scroll-spy y
    // evita disparos dobles en cada frontera.
    const triggers = secciones.map((sec, idx) =>
      ScrollTrigger.create({
        trigger: sec,
        start: "top center",
        onEnter: () => cambiar(idx),
        onEnterBack: () => cambiar(idx - 1),
      })
    )

    // Refrescar deja a todos midiendo posiciones frescas tras montar (imágenes
    // que cambian de alto al cargar, etc.).
    ScrollTrigger.refresh()
    // El primer fotograma fija la sección de arranque sin barrido; a partir de
    // ahí, cada cruce real sí lo dispara.
    const raf = requestAnimationFrame(() => {
      iniciado = true
    })

    return () => {
      cancelAnimationFrame(raf)
      triggers.forEach((t) => t.kill())
    }
  }, [reduced, barrido])

  return (
    <svg
      ref={svg}
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      // invisible en reposo, y pointer-events-none SIEMPRE: el barrido pasa por
      // encima sin robar un solo clic ni frenar el scroll. z-[90] la pone sobre
      // la cabecera (z-50) y bajo la cortina de entrada (z-100).
      className="pointer-events-none invisible fixed inset-0 z-[90] h-full w-full"
    >
      <defs>
        {/* Familia del magenta institucional (#db0455): el pen original venía
            en naranja crush → rosa, ajeno a la paleta, y la cortina era lo
            único del sitio fuera de marca. Van en hex fijo y no por var(--…):
            son los mismos en claro y oscuro, como el barrido de un telón. */}
        <linearGradient id="transicion-frente" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#db0455" />
          <stop offset="100%" stopColor="#ffb1cd" />
        </linearGradient>
        <linearGradient id="transicion-fondo" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd6e5" />
          <stop offset="100%" stopColor="#e8206b" />
        </linearGradient>
      </defs>

      {/* La de atrás va primero en el DOM y lleva el retardo menor: asoma por
          detrás de la de delante. */}
      <path
        ref={(el) => {
          capas.current[0] = el
        }}
        fill="url(#transicion-fondo)"
      />
      <path
        ref={(el) => {
          capas.current[1] = el
        }}
        fill="url(#transicion-frente)"
      />
    </svg>
  )
}
