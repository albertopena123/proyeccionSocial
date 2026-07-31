"use client"

import { useEffect, useRef } from "react"

import { gsap, SplitText, usePrefersReducedMotion } from "@/lib/gsap"
import { INTRO_SKIP_CLASS } from "@/lib/intro"

/**
 * Titular de la portada. El texto real va en el <h1> (lo ve el buscador, el
 * lector de pantalla y quien tenga el JS caído); SplitText solo lo parte en
 * caracteres para la animación de entrada y luego lo revierte, dejando el DOM
 * limpio otra vez.
 *
 * El tiempo está atado a la cortina de entrada, igual que estaba el wordmark que
 * había antes: arranca a 1.6s —cuando la cortina (que despeja a 1760ms) ya está
 * casi fuera— o a 0.2s con ?nointro, que la salta.
 *
 * Progresivo por defecto: gsap.from esconde los caracteres SOLO cuando el JS
 * corre. Si no corre, o si se pide menos movimiento, el titular está visible y
 * asentado sin más.
 */
const TEXTO = "Proyección Social Universitaria"

export function Wordmark() {
  const ref = useRef<HTMLHeadingElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    // Menos movimiento: el titular se queda quieto y visible. Ni split ni tween.
    if (reduced) return
    const el = ref.current
    if (!el) return

    let split: SplitText | null = null
    let tween: gsap.core.Tween | null = null
    let cancelado = false

    // Partir DESPUÉS de que la fuente esté lista: si se parte con la fuente de
    // sistema y luego llega Parkinsans, cada carácter cambia de ancho y el
    // reparto queda descuadrado.
    document.fonts.ready.then(() => {
      if (cancelado || !ref.current) return

      split = SplitText.create(el, { type: "chars, words", charsClass: "wm-char" })
      const salto = document.documentElement.classList.contains(INTRO_SKIP_CLASS)

      tween = gsap.from(split.chars, {
        duration: 1,
        opacity: 0,
        scale: 0,
        y: 80,
        rotationX: 180,
        transformOrigin: "0% 50% -50",
        ease: "back",
        stagger: 0.05,
        // Sincronía con la cortina. immediateRender (por defecto en from) deja
        // los caracteres en su estado inicial —invisibles— hasta que el delay
        // pasa, así no se ve el titular entero antes de animar.
        delay: salto ? 0.2 : 1.6,
        // Al terminar se revierte: el <h1> vuelve a ser un nodo de texto normal.
        onComplete: () => split?.revert(),
      })
    })

    return () => {
      cancelado = true
      tween?.kill()
      split?.revert()
    }
  }, [reduced])

  return (
    <h1
      ref={ref}
      // perspective para que el rotationX de cada carácter tenga profundidad y
      // no sea un simple volteo plano.
      style={{ perspective: "800px" }}
      className="text-brand font-display mx-auto mb-8 max-w-[18ch] text-center text-[clamp(2.25rem,7vw,6rem)] leading-[0.95] font-extrabold tracking-tight text-balance"
    >
      {TEXTO}
    </h1>
  )
}
