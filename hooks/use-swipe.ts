"use client"

import { useRef, type TouchEvent } from "react"

type Opciones = {
  /** Deslizar hacia la izquierda (avanzar). */
  onLeft: () => void
  /** Deslizar hacia la derecha (retroceder). */
  onRight: () => void
  /** Desplazamiento horizontal mínimo en px para contar como swipe. */
  threshold?: number
  /** Al posar el dedo (p. ej. pausar un paso automático). */
  onStart?: () => void
  /** Al levantar el dedo, haya habido swipe o no. */
  onEnd?: () => void
}

/**
 * Swipe horizontal por dominancia de eje: solo dispara si el desplazamiento en
 * X supera al de Y y al umbral, así el scroll vertical normal no se confunde
 * con una navegación. Devuelve los dos handlers listos para colgar del
 * contenedor.
 *
 * Vivía copiado en elencos-stack, responsabilidad-oruga y actividades-grid, y
 * las copias ya habían divergido en el umbral; cualquier arreglo futuro
 * (multi-touch, touchcancel…) se hace aquí una sola vez.
 */
export function useSwipe({ onLeft, onRight, threshold = 40, onStart, onEnd }: Opciones) {
  const inicioX = useRef<number | null>(null)
  const inicioY = useRef<number | null>(null)

  const onTouchStart = (e: TouchEvent) => {
    inicioX.current = e.touches[0].clientX
    inicioY.current = e.touches[0].clientY
    onStart?.()
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (inicioX.current === null || inicioY.current === null) return
    const diffX = inicioX.current - e.changedTouches[0].clientX
    const diffY = inicioY.current - e.changedTouches[0].clientY

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
      if (diffX > 0) onLeft()
      else onRight()
    }
    inicioX.current = null
    inicioY.current = null
    onEnd?.()
  }

  return { onTouchStart, onTouchEnd }
}
