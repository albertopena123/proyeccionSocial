"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Flip, gsap, usePrefersReducedMotion } from "@/lib/gsap"

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

  // El pie sigue al póster central: al caminar, el centro cambia y con él el
  // texto. Con N=3 el centro es el del medio, que es donde cae la mirada.
  const central = PILARES[tira[CENTRO].pilar]

  const caminar = useCallback(
    (haciaDelante: boolean) => {
      if (animando) return
      const c = cont.current
      if (!c) return
      const nodos = Array.from(c.querySelectorAll<HTMLElement>("[data-carta]"))
      if (nodos.length !== N) return

      // El que se va y los que permanecen. Solo se captura el estado de los que
      // permanecen: al que se va lo maneja `saliente` por su cuenta, así Flip no
      // intenta también animar su salida.
      const nodoSale = haciaDelante ? nodos[0] : nodos[nodos.length - 1]
      const permanecen = haciaDelante ? nodos.slice(1) : nodos.slice(0, -1)
      const cartaSale = haciaDelante ? tira[0] : tira[N - 1]

      // Hueco exacto del que se va, relativo al contenedor: así la capa saliente
      // aparece justo encima sin depender del ancho de tarjeta.
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
      // Sin animación: el reordenamiento ya está en el DOM, solo se retira la
      // capa saliente. El resultado es un cambio instantáneo, pero completo.
      terminar()
      return
    }

    const cartas = Array.from(c.querySelectorAll<HTMLElement>("[data-carta]"))
    Flip.from(p.estado, {
      targets: cartas,
      duration: DURACION,
      ease: "power2.inOut",
      // La tarjeta nueva no estaba en el estado capturado: Flip la trata como
      // entrante y la hace crecer desde la punta.
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { opacity: 0, scale: 0 },
          { opacity: 1, scale: 1, duration: DURACION, ease: "power2.out", transformOrigin: p.entraOrigen }
        ),
    })

    // La saliente se encoge sobre su hueco y, al acabar, se desmonta.
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
    <div className="flex flex-col items-center">
      {/* overflow-hidden recorta las puntas cuando la fila no cabe (móvil); en
          escritorio caben las tres y queda centrada. La capa saliente se
          posiciona respecto a este contenedor (relative). */}
      <div
        ref={cont}
        className="border-border relative flex items-end gap-3 overflow-hidden rounded-2xl border-2 border-dashed p-3 md:gap-4 md:p-4"
      >
        {tira.map((carta) => {
          const pilar = PILARES[carta.pilar]
          return (
            <div
              key={carta.uid}
              data-carta
              data-flip-id={`oruga-${carta.uid}`}
              // relative es obligatorio: la Image usa fill (position:absolute) y
              // sin un ancestro posicionado propio se cuela hasta el contenedor
              // y las tres se superponen ocupándolo entero.
              className="relative aspect-[1072/1467] w-32 shrink-0 overflow-hidden rounded-xl sm:w-36 md:w-44 lg:w-52"
            >
              <Image
                src={pilar.image}
                alt={`${pilar.title}. ${pilar.description}`}
                fill
                sizes="(min-width: 1024px) 208px, (min-width: 768px) 176px, 144px"
                className="object-cover"
              />
            </div>
          )
        })}

        {/* La copia que se está yendo: fuera de flujo, sobre el hueco que dejó,
            aria-hidden porque su gemela ya está en la fila. */}
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

      {/* Pie del póster central. aria-live para que se anuncie al caminar. El
          título va de sobretítulo pequeño: en el póster está en grande, aquí solo
          rotula la descripción, que es lo que la imagen no dice. */}
      <div aria-live="polite" className="mt-6 min-h-24 max-w-md text-center md:mt-8">
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
          className="border-border hover:bg-accent focus-visible:ring-brand-ring flex size-11 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
        >
          <ChevronLeft className="size-5" />
          <span className="sr-only">Pilar anterior</span>
        </button>
        <button
          type="button"
          onClick={() => caminar(true)}
          disabled={animando}
          className="border-border hover:bg-accent focus-visible:ring-brand-ring flex size-11 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
        >
          <ChevronRight className="size-5" />
          <span className="sr-only">Pilar siguiente</span>
        </button>
      </div>
    </div>
  )
}
