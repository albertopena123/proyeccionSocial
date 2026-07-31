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

/** Puntos de control de la onda. Más puntos, ondulación más fina. */
const NUM_PUNTOS = 10

/** Desfase aleatorio de cada punto: es lo que hace que la onda no sea uniforme. */
const RETARDO_PUNTOS = 0.12

/** Desfase entre las dos capas, para que una asome por detrás de la otra. */
const RETARDO_POR_CAPA = 0.1

/** Corto a propósito: es un barrido de paso, no una pantalla de carga. */
const DURACION = 0.4

export function TransicionSecciones() {
  const svg = useRef<SVGSVGElement>(null)
  const capas = useRef<(SVGPathElement | null)[]>([])
  const puntos = useRef<number[][]>([])
  const tapando = useRef(false)
  const linea = useRef<gsap.core.Timeline | null>(null)
  const reduced = usePrefersReducedMotion()

  // Reconstruye el atributo `d` de cada capa. Corre en CADA fotograma, así que
  // no hay nada aquí que no sea imprescindible.
  const pintar = useCallback(() => {
    capas.current.forEach((capa, i) => {
      const p = puntos.current[i]
      if (!capa || !p) return

      let d = tapando.current ? `M 0 0 V ${p[0]} C` : `M 0 ${p[0]} C`
      for (let j = 0; j < NUM_PUNTOS - 1; j++) {
        const x = ((j + 1) / (NUM_PUNTOS - 1)) * 100
        const cx = x - ((1 / (NUM_PUNTOS - 1)) * 100) / 2
        d += ` ${cx} ${p[j]} ${cx} ${p[j + 1]} ${x} ${p[j + 1]}`
      }
      // Cerrar por arriba o por abajo es lo que decide si la capa cubre o
      // descubre: los puntos siempre van de 100 a 0, lo que cambia es el lado
      // que se rellena.
      d += tapando.current ? " V 100 H 0" : " V 0 H 0"

      capa.setAttribute("d", d)
    })
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

  // Una pasada completa. Siempre anima los puntos de 100 a 0: progress(0) los
  // devuelve a 100 (rebobina las tweens anteriores) y clear() las retira.
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

  // El barrido: sube cubriendo (tapando) y sigue subiendo hasta salir por arriba
  // (destapando), sin corte entre medias. El guardia de isActive() evita que dos
  // cruces seguidos lancen barridos solapados: mientras uno corre, se ignoran.
  const barrido = useCallback(async () => {
    const tl = linea.current
    if (!tl || tl.isActive()) return

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
      activa = i
      // En la carga NO hay barrido: solo cuando el cambio lo provoca el scroll.
      if (iniciado) void barrido()
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
        {/* Los colores del pen original (naranja crush → rosa, y melocotón →
            naranja): son ajenos a la paleta del sitio, así que van fijos y no
            por var(--…). Si algún día se quieren integrar, aquí es donde se
            cambian a los tokens de marca. */}
        <linearGradient id="transicion-frente" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff8709" />
          <stop offset="100%" stopColor="#f7bdf8" />
        </linearGradient>
        <linearGradient id="transicion-fondo" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd9b0" />
          <stop offset="100%" stopColor="#ff8709" />
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
