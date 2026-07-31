import Image from "next/image"

import { ELENCOS } from "@/lib/elencos"
import { COL_DELAY, COL_DURATION, COL_EASE, COL_STAGGER, INTRO_MS, MARK_MS } from "@/lib/intro"

/**
 * Cortina de entrada: seis columnas de color que suben en cascada de izquierda a
 * derecha y dejan ver la portada.
 *
 * Suena en cada carga de la portada.
 *
 * Server component sin una línea de JS de cliente. Todo lo decide el CSS:
 *  - si se pide menos movimiento, motion-reduce:hidden la quita;
 *  - con ?nointro (desarrollo), el script del <head> pone .intro-skip en <html>
 *    y la regla de globals.css la oculta antes del primer pintado;
 *  - con fill-mode forwards se retira sola aunque el JS nunca llegue a correr.
 *
 * Solo se animan transform y opacity: los dos van por el compositor, así que la
 * cortina sigue fluida aunque la hidratación de React bloquee el hilo principal
 * justo mientras corre (en dev llega a bloquearlo 145ms).
 */
export function IntroOverlay() {
  return (
    <div
      aria-hidden
      data-intro-veil
      className="pointer-events-none fixed inset-0 z-[100] motion-reduce:hidden"
      style={{ animation: `intro-veil-out ${INTRO_MS}ms linear forwards` }}
    >
      <div className="absolute inset-0 flex">
        {ELENCOS.map((elenco, i) => (
          <div
            key={elenco.key}
            data-intro-col
            className="h-full flex-1"
            style={{
              backgroundColor: elenco.color,
              // will-change promociona la capa antes de arrancar; sin esto el
              // primer fotograma de cada columna puede dar un tirón.
              willChange: "transform",
              animation: `intro-column-out ${COL_DURATION}ms ${COL_EASE} ${
                COL_DELAY + i * COL_STAGGER
              }ms both`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        {/* El logo es magenta y cian: sobre las columnas rojas y magentas se
            disolvía. brightness-0 + invert lo aplana a blanco sólido. Sin
            drop-shadow: es un filtro más sobre un elemento que anima. */}
        <Image
          src="/banner/icon.png"
          alt=""
          width={949}
          height={897}
          priority
          className="size-24 object-contain brightness-0 invert md:size-32"
          style={{
            willChange: "transform, opacity",
            animation: `intro-mark-in ${MARK_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
          }}
        />
      </div>
    </div>
  )
}
