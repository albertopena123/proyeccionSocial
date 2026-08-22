"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Flip, gsap, usePrefersReducedMotion } from "@/lib/gsap"
import { useSwipe } from "@/hooks/use-swipe"

/**
 * Carrusel "oruga" de los tres pilares. Adaptado del pen de Chris Gannon: una
 * fila de pósters que camina: al pulsar avanzar, el póster de una punta se
 * encoge y desaparece mientras una copia crece en la otra, y los del medio se
 * corren un puesto.
 *
 * El pen mueve nodos a mano (createElement / append / remove) DENTRO del
 * contenedor. En React eso peta: React guarda referencias de padre y al quitar
 * un nodo que él no montó llama removeChild sobre el sitio equivocado
 * (NotFoundError). Aquí el patrón es el de React+Flip: se captura el estado, se
 * reordena el array de estado y Flip.from anima la diferencia en un layout
 * effect. El nodo que se va NO se borra a mano: se pinta como una capa aparte
 * (`saliente`) sobre su hueco y se retira cuando termina su animación.
 *
 * Los pósters llevan el título y la bajada quemados; aquí NO se repiten. El pie
 * rotativo muestra la descripción del póster central —lo único que no está en la
 * imagen— y va en aria-live para que se anuncie al caminar.
 */
const PILARES = [
  {
    key: "compromiso",
    title: "Compromiso Social",
    image: "/images/responsabilidad/compromiso.webp",
    description:
      "Trabajamos por el bienestar de las comunidades más vulnerables de Madre de Dios, llevando la universidad más allá de sus aulas.",
  },
  {
    key: "voluntariado",
    title: "Voluntariado",
    image: "/images/responsabilidad/voluntariado.webp",
    description:
      "Más de 500 estudiantes participan activamente en programas sociales, aportando su formación a quien más lo necesita.",
  },
  {
    key: "impacto",
    title: "Impacto Positivo",
    image: "/images/responsabilidad/impacto.webp",
    description:
      "Generando cambios medibles y sostenidos en la sociedad amazónica, con proyectos que perduran más allá del semestre.",
  },
]

const N = PILARES.length
const CENTRO = Math.floor(N / 2)
const DURACION = 0.5

type Carta = { uid: number; pilar: number }
type Saliente = { pilar: number; x: number; y: number; w: number; h: number; origen: string }
type Pendiente = { estado: ReturnType<typeof Flip.getState>; entraOrigen: string; saleOrigen: string }

export function ResponsabilidadOruga() {
  const cont = useRef<HTMLDivElement>(null)
  const uid = useRef(N)
  const pendiente = useRef<Pendiente | null>(null)
  const reduced = usePrefersReducedMotion()

  const [tira, setTira] = useState<Carta[]>(() => PILARES.map((_, i) => ({ uid: i, pilar: i })))
  const [saliente, setSaliente] = useState<Saliente | null>(null)
  const [animando, setAnimando] = useState(false)

  // El pie sigue al póster central: al caminar, el centro cambia y con él el texto.
  const central = PILARES[tira[CENTRO].pilar]

  const caminar = useCallback(
    (haciaDelante: boolean) => {
      if (animando) return
      const c = cont.current
      if (!c) return
      const nodos = Array.from(c.querySelectorAll<HTMLElement>("[data-carta]"))
      if (nodos.length !== N) return

      const nodoSale = haciaDelante ? nodos[0] : nodos[nodos.length - 1]
      const permanecen = haciaDelante ? nodos.slice(1) : nodos.slice(0, -1)
      const cartaSale = haciaDelante ? tira[0] : tira[N - 1]

      const r = nodoSale.getBoundingClientRect()
      const rc = c.getBoundingClientRect()

      const nueva: Carta = { uid: uid.current++, pilar: cartaSale.pilar }
      const nuevaTira = haciaDelante ? [...tira.slice(1), nueva] : [nueva, ...tira.slice(0, N - 1)]

      pendiente.current = {
        estado: Flip.getState(permanecen),
        entraOrigen: haciaDelante ? "bottom right" : "bottom left",
        saleOrigen: haciaDelante ? "bottom left" : "bottom right",
      }
      setAnimando(true)
      setSaliente({
        pilar: cartaSale.pilar,
        x: r.left - rc.left,
        y: r.top - rc.top,
        w: r.width,
        h: r.height,
        origen: haciaDelante ? "bottom left" : "bottom right",
      })
      setTira(nuevaTira)
    },
    [animando, tira]
  )

  // Gestos táctiles (Swipe)
  const { onTouchStart, onTouchEnd } = useSwipe({
    onLeft: () => caminar(true),
    onRight: () => caminar(false),
  })

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      caminar(true)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      caminar(false)
    }
  }

  useLayoutEffect(() => {
    const p = pendiente.current
    if (!p) return
    pendiente.current = null

    const c = cont.current
    if (!c) {
      setAnimando(false)
      return
    }

    const terminar = () => {
      setSaliente(null)
      setAnimando(false)
    }

    if (reduced) {
      terminar()
      return
    }

    const cartas = Array.from(c.querySelectorAll<HTMLElement>("[data-carta]"))
    Flip.from(p.estado, {
      targets: cartas,
      duration: DURACION,
      ease: "power2.inOut",
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { opacity: 0, scale: 0 },
          { opacity: 1, scale: 1, duration: DURACION, ease: "power2.out", transformOrigin: p.entraOrigen }
        ),
    })

    const nodoSal = c.querySelector<HTMLElement>("[data-saliente]")
    if (nodoSal) {
      gsap.to(nodoSal, {
        opacity: 0,
        scale: 0,
        duration: DURACION,
        ease: "power2.in",
        transformOrigin: p.saleOrigen,
        onComplete: terminar,
      })
    } else {
      terminar()
    }
  }, [tira, reduced])

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Carrusel de pilares de responsabilidad social"
      className="focus-visible:ring-brand-ring flex flex-col items-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        ref={cont}
        className="border-border relative flex items-end gap-3 overflow-hidden rounded-2xl border-2 border-dashed p-3 select-none md:gap-4 md:p-4"
      >
        {tira.map((carta, index) => {
          const pilar = PILARES[carta.pilar]
          const esCentro = index === CENTRO

          return (
            <div
              key={carta.uid}
              data-carta
              data-flip-id={`oruga-${carta.uid}`}
              onClick={() => {
                if (index < CENTRO) caminar(false)
                else if (index > CENTRO) caminar(true)
              }}
              className={`relative aspect-[1072/1467] w-32 shrink-0 cursor-pointer overflow-hidden rounded-xl transition-all duration-300 sm:w-36 md:w-44 lg:w-52 ${
                esCentro ? "ring-brand/80 scale-105 shadow-xl ring-2" : "opacity-85 hover:scale-100 hover:opacity-100"
              }`}
            >
              <Image
                src={pilar.image}
                alt={`${pilar.title}. ${pilar.description}`}
                fill
                sizes="(min-width: 1024px) 208px, (min-width: 768px) 176px, 144px"
                className="pointer-events-none object-cover"
              />
            </div>
          )
        })}

        {saliente && (
          <div
            data-saliente
            aria-hidden
            className="absolute overflow-hidden rounded-xl"
            style={{
              left: saliente.x,
              top: saliente.y,
              width: saliente.w,
              height: saliente.h,
              transformOrigin: saliente.origen,
            }}
          >
            <Image
              src={PILARES[saliente.pilar].image}
              alt=""
              fill
              sizes="(min-width: 1024px) 208px, (min-width: 768px) 176px, 144px"
              className="object-cover"
            />
          </div>
        )}
      </div>

      {/* Indicadores de pilares */}
      <div className="mt-5 flex items-center gap-2" aria-label="Indicador de pilar activo">
        {PILARES.map((p, idx) => {
          const esActivo = tira[CENTRO].pilar === idx
          return (
            <button
              key={p.key}
              type="button"
              // La misma regla por posición que el clic en las tarjetas, no
              // índices cableados: con tira[0]/tira[2] literales, añadir un
              // cuarto pilar dejaba un punto muerto y otro que caminaba en
              // dirección contraria.
              onClick={() => {
                const pos = tira.findIndex((c) => c.pilar === idx)
                if (pos < CENTRO) caminar(false)
                else if (pos > CENTRO) caminar(true)
              }}
              disabled={animando}
              aria-label={`Ver pilar ${p.title}`}
              className={`h-2 rounded-full transition-all duration-300 disabled:opacity-40 ${
                esActivo ? "bg-brand w-7" : "bg-muted-foreground/30 hover:bg-muted-foreground/60 w-2"
              }`}
            />
          )
        })}
      </div>

      {/* Pie del póster central */}
      <div aria-live="polite" className="mt-4 min-h-24 max-w-md text-center md:mt-6">
        <p className="text-brand font-display text-sm font-bold tracking-wide uppercase">
          {central.title}
        </p>
        <p className="text-muted-foreground mt-2 text-pretty">{central.description}</p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => caminar(false)}
          disabled={animando}
          className="border-border hover:bg-accent focus-visible:ring-brand-ring flex size-11 items-center justify-center rounded-full border transition-transform duration-200 active:scale-95 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
        >
          <ChevronLeft className="size-5" />
          <span className="sr-only">Pilar anterior</span>
        </button>
        <button
          type="button"
          onClick={() => caminar(true)}
          disabled={animando}
          className="border-border hover:bg-accent focus-visible:ring-brand-ring flex size-11 items-center justify-center rounded-full border transition-transform duration-200 active:scale-95 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
        >
          <ChevronRight className="size-5" />
          <span className="sr-only">Pilar siguiente</span>
        </button>
      </div>
    </div>
  )
}
