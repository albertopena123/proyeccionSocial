"use client"

import { useLayoutEffect, useEffect, useState } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Flip } from "gsap/Flip"
import { SplitText } from "gsap/SplitText"

// registerPlugin es idempotente, pero solo tiene sentido en cliente: en el
// servidor no hay document y ScrollTrigger no tiene nada que medir.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, Flip, SplitText)
}

/**
 * useLayoutEffect avisa en SSR, pero es el que evita el parpadeo: corre antes
 * de pintar, así el estado inicial de un gsap.from() nunca llega a verse.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

/**
 * Envuelve animaciones para que solo corran si el usuario no ha pedido menos
 * movimiento. Devuelve el cleanup de gsap.matchMedia, que revierte todo.
 *
 * Importante: todo lo de dentro debe animar HACIA el estado final (gsap.from),
 * nunca esconder con CSS y revelar con JS. Así quien pide menos movimiento —o
 * quien tiene el JS caído— ve el contenido igualmente.
 *
 * `extraQuery` se concatena a la consulta: úsalo cuando la animación dependa de
 * elementos que solo existen en cierto breakpoint, o medirás cajas ocultas.
 */
export function withMotionPreference(
  setup: (ctx: gsap.Context) => void,
  extraQuery?: string
) {
  const mm = gsap.matchMedia()
  const query = extraQuery
    ? `(prefers-reduced-motion: no-preference) and ${extraQuery}`
    : "(prefers-reduced-motion: no-preference)"
  mm.add(query, (ctx) => {
    setup(ctx)
  })
  return () => mm.revert()
}

/**
 * La preferencia de movimiento como valor, no como envoltorio.
 *
 * withMotionPreference sirve cuando la animación se monta una vez, pero no
 * cuando hay que reaccionar a cada cambio de estado: su cleanup hace
 * mm.revert(), que deshace las animaciones y devolvería los elementos a su
 * sitio original en cada render.
 *
 * Devuelve false en el servidor y en el primer render: el estado real se resuelve
 * tras montar, así no hay desajuste de hidratación.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return reduced
}

export { gsap, ScrollTrigger, Flip, SplitText }
