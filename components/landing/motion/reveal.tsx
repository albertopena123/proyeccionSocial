"use client"

import { useRef, type ReactNode, type ElementType } from "react"

import { gsap, useIsomorphicLayoutEffect, withMotionPreference } from "@/lib/gsap"

type RevealProps = {
  children: ReactNode
  /** Escalona los hijos directos en vez de animar el bloque entero. */
  stagger?: boolean
  /** Retardo entre hijos. Lokal usa 0.2 en sus secuencias de trazo. */
  staggerAmount?: number
  /** Desplazamiento vertical de entrada, en px. */
  y?: number
  delay?: number
  as?: ElementType
  className?: string
}

export function Reveal({
  children,
  stagger = false,
  staggerAmount = 0.12,
  y = 32,
  delay = 0,
  as: Tag = "div",
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    return withMotionPreference(() => {
      const targets = stagger ? Array.from(el.children) : [el]
      if (!targets.length) return

      // gsap.from: el estado final es el del HTML. Si esto no corre nunca
      // (reduced-motion, JS caído), el contenido ya está visible y en su sitio.
      gsap.from(targets, {
        y,
        opacity: 0,
        duration: 1.2,
        delay,
        ease: "expo.out", // el mismo easing que usa Lokal en su hero
        stagger: stagger ? staggerAmount : 0,
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      })
    })
  }, [stagger, staggerAmount, y, delay])

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
