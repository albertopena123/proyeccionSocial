"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { FileSearch, LogIn } from "lucide-react"

import { navItems, siteConfig } from "@/lib/site-config"
import { gsap, useIsomorphicLayoutEffect, usePrefersReducedMotion } from "@/lib/gsap"

const PANEL_ID = "menu-movil"

const REDES = [
  { label: "Facebook", href: siteConfig.social.facebook },
  { label: "Instagram", href: siteConfig.social.instagram },
  { label: "YouTube", href: siteConfig.social.youtube },
  { label: "LinkedIn", href: siteConfig.social.linkedin },
]

/** Coordenadas de las barras del icono: de hamburguesa a aspa. */
const BARRAS = {
  top: { menu: { x1: 3, y1: 7, x2: 17, y2: 7 }, aspa: { x1: 5, y1: 5, x2: 15, y2: 15 } },
  bot: { menu: { x1: 3, y1: 13, x2: 17, y2: 13 }, aspa: { x1: 15, y1: 5, x2: 5, y2: 15 } },
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const zonaRef = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const reduced = usePrefersReducedMotion()

  useIsomorphicLayoutEffect(() => {
    tl.current = gsap.timeline()
    return () => {
      tl.current?.kill()
    }
  }, [])

  /**
   * Un único timeline que se VACÍA y se reconstruye en cada cambio, en vez de
   * rebobinarse.
   *
   * La entrada usa fromTo: cada apertura arranca de un estado conocido.
   * La salida usa to: recoge desde donde estén las cosas. Ahí está la gracia —
   * si cierras a media apertura, los paneles caen desde su posición real en vez
   * de saltar al estado final para empezar. Un timeline rebobinado no puede
   * hacer eso, y tampoco puede tener una animación de salida DISTINTA: aquí los
   * paneles entran deslizando y salen cayendo con rotación al azar.
   */
  const construir = useCallback(
    (abriendo: boolean) => {
      const t = tl.current
      const nav = navRef.current
      const boton = toggleRef.current
      if (!t || !nav || !boton) return

      const barTop = boton.querySelector("[data-bar-top]")
      const barMid = boton.querySelector("[data-bar-mid]")
      const barBot = boton.querySelector("[data-bar-bot]")
      if (!barTop || !barMid || !barBot) return

      t.clear()

      const q = gsap.utils.selector(nav)
      const paneles = q("[data-panel]")
      const items = q("[data-nav-item]")
      const fondo = q("[data-nav-bg]")
      const pie = q("[data-nav-pie]")

      if (abriendo) {
        t.set(nav, { visibility: "visible", pointerEvents: "auto" })
          .fromTo(fondo, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0)
          .fromTo(
            paneles,
            { x: "101%", y: 0, rotation: 0 },
            { x: "0%", duration: 0.6, ease: "back.out", stagger: 0.2 },
            0
          )
          .fromTo(
            items,
            { opacity: 0, x: -20 },
            { opacity: 1, x: 0, duration: 1.2, ease: "expo.out", stagger: 0.03 },
            0.1
          )
          .fromTo(
            barTop,
            { attr: BARRAS.top.menu },
            { attr: BARRAS.top.aspa, duration: 0.35, ease: "back.out(1.4)" },
            0.06
          )
          .fromTo(
            barBot,
            { attr: BARRAS.bot.menu },
            { attr: BARRAS.bot.aspa, duration: 0.35, ease: "back.out(1.4)" },
            0.06
          )
          // La demo deja la barra del medio quieta: te queda un aspa con una
          // raya atravesada. Aquí se desvanece.
          .fromTo(barMid, { opacity: 1 }, { opacity: 0, duration: 0.2 }, 0.06)
          .fromTo(pie, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 0.4)
      } else {
        t.to(barTop, { attr: BARRAS.top.menu, duration: 0.2, ease: "power3.in" }, 0)
          .to(barBot, { attr: BARRAS.bot.menu, duration: 0.2, ease: "power3.in" }, "<")
          .to(barMid, { opacity: 1, duration: 0.2 }, "<")
          // Los paneles se caen de la pantalla, girando al azar y empezando por
          // el de abajo. No es la entrada al revés: es otra animación.
          .to(
            paneles,
            {
              y: "160vh",
              rotation: "random(-15, 15)",
              duration: 1,
              ease: "power3.in",
              stagger: { from: "end", each: 0.02 },
            },
            "<"
          )
          .to(fondo, { opacity: 0, duration: 0.3, ease: "power2.in" }, "<0.1")
          // La demo NO hace esto, y es un bug suyo: su overlay se queda con
          // pointerEvents:auto tapando la página y tragándose todos los clics.
          .set(nav, { visibility: "hidden", pointerEvents: "none" })
      }

      // Imprescindible: .clear() vacía el timeline pero NO mueve el cabezal.
      // Si la animación anterior terminó, el cabezal está al final, y los tweens
      // recién añadidos nacen "ya pasados" y se pintan directamente en su estado
      // final: la animación no se ve, salta. restart() lo rebobina a 0.
      t.restart()
    },
    []
  )

  const alternar = () => setOpen((o) => !o)

  const primeraVez = useRef(true)

  useIsomorphicLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return

    // En el montaje no se construye nada: `open` empieza en false, así que
    // habría reproducido la animación de cierre entera (invisible, pero
    // dejando el cabezal al final) y la primera apertura salía tocada.
    if (primeraVez.current) {
      primeraVez.current = false
      gsap.set(nav, { visibility: "hidden", pointerEvents: "none" })
      return
    }

    if (reduced) {
      // Sin animación: se muestra u oculta y ya. Los paneles a su sitio.
      const q = gsap.utils.selector(nav)
      gsap.set(nav, {
        visibility: open ? "visible" : "hidden",
        pointerEvents: open ? "auto" : "none",
      })
      gsap.set(q("[data-panel]"), { x: "0%", y: 0, rotation: 0 })
      gsap.set(q("[data-nav-item]"), { opacity: 1, x: 0 })
      gsap.set(q("[data-nav-bg]"), { opacity: open ? 1 : 0 })
      gsap.set(q("[data-nav-pie]"), { opacity: 1, y: 0 })
      return
    }
    construir(open)
  }, [open, reduced, construir])

  /**
   * Botón magnético: el botón se deja arrastrar por el puntero dentro de una
   * zona algo mayor que él mismo, y el icono tira un poco más para dar
   * profundidad.
   *
   * overwrite: "auto" y no true. El timeline del menú anima las coordenadas de
   * las líneas del icono; `true` mataría ESOS tweens también, porque comparten
   * target, y la hamburguesa se quedaría a medio convertir en aspa al mover el
   * ratón. "auto" solo pisa x/y, que es lo único en disputa.
   *
   * Sin puntero fino no se engancha nada: en táctil el efecto no existe y los
   * listeners solo estorbarían.
   */
  useIsomorphicLayoutEffect(() => {
    const zona = zonaRef.current
    const boton = toggleRef.current
    if (!zona || !boton || reduced) return
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return

    const icono = boton.querySelector("[data-icono]")
    const FUERZA = 0.32
    const FUERZA_ICONO = 0.18

    let rafId: number | null = null
    let latestE: MouseEvent | null = null

    const updateMagnetic = () => {
      if (!latestE) return
      const r = zona.getBoundingClientRect()
      const x = gsap.utils.mapRange(r.left, r.right, -r.width / 2, r.width / 2, latestE.clientX)
      const y = gsap.utils.mapRange(r.top, r.bottom, -r.height / 2, r.height / 2, latestE.clientY)

      gsap.to(boton, {
        x: x * FUERZA,
        y: y * FUERZA,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
      })
      gsap.to(icono, {
        x: x * FUERZA_ICONO,
        y: y * FUERZA_ICONO,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
      })
      rafId = null
    }

    const onMove = (e: MouseEvent) => {
      latestE = e
      if (!rafId) {
        rafId = requestAnimationFrame(updateMagnetic)
      }
    }

    const onLeave = () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      latestE = null
      gsap.to([boton, icono], {
        x: 0,
        y: 0,
        duration: 0.7,
        ease: "elastic.out(1, 0.4)",
        overwrite: "auto",
      })
    }

    zona.addEventListener("mousemove", onMove, { passive: true })
    zona.addEventListener("mouseleave", onLeave)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      zona.removeEventListener("mousemove", onMove)
      zona.removeEventListener("mouseleave", onLeave)
      gsap.set([boton, icono], { x: 0, y: 0 })
    }
  }, [reduced])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => {
    const onScroll = () => {
      const s = window.scrollY > 24
      setScrolled((prev) => (prev === s ? prev : s))
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const sections = navItems
      .map((i) => document.querySelector(i.href))
      .filter((el): el is Element => el !== null)
    if (!sections.length) return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id) setActive("#" + visible.target.id)
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <header
        // Con el menú abierto la cabecera se queda transparente: si no, su fondo
        // taparía el borde superior de los paneles.
        data-scrolled={scrolled && !open}
        className="group/header data-[scrolled=true]:bg-background/92 data-[scrolled=true]:border-border fixed inset-x-0 top-0 z-50 border-b border-transparent transition-[background-color,border-color] duration-300 data-[scrolled=true]:backdrop-blur-md"
      >
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="focus-visible:ring-brand-ring flex items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Image
              src="/banner/icon.png"
              alt=""
              width={949}
              height={897}
              priority
              className="size-8 object-contain"
            />
            {/* En lo alto la cabecera flota sobre la foto del hero (y, con el
                menú abierto, sobre su velo oscuro): el texto va en blanco y solo
                recupera los tonos del tema cuando aparece el fondo al hacer
                scroll. */}
            <span className="leading-none">
              <span className="font-display group-data-[scrolled=true]/header:text-foreground block text-sm font-extrabold tracking-tight text-white transition-colors duration-300">
                DPSEU
              </span>
              <span className="group-data-[scrolled=true]/header:text-muted-foreground mt-1 block text-[0.7rem] leading-none text-white/75 transition-colors duration-300">
                UNAMAD
              </span>
            </span>
            <span className="sr-only">
              {siteConfig.fullName} — {siteConfig.university}
            </span>
          </Link>

          {/* La barra se queda en logo + hamburguesa. Todo lo demás —enlaces,
              consulta de constancias, iniciar sesión— vive en el menú, y
              tenerlo en los dos sitios era la misma navegación repetida. */}
          {/* La zona magnética es mayor que el botón y con margen negativo: el
              tirón empieza antes de llegar al botón sin que el hueco extra
              empuje nada en la barra. */}
          <div ref={zonaRef} className="relative z-10 -m-3 p-3">
            {/* El icono es SVG a mano, no de lucide: hay que animar las
                coordenadas de cada línea para que la hamburguesa se convierta en
                aspa. Con un icono de componente no se puede tocar por dentro. */}
            <button
              ref={toggleRef}
              type="button"
              onClick={alternar}
              aria-expanded={open}
              aria-controls={PANEL_ID}
              className="group focus-visible:ring-brand-ring relative flex size-11 cursor-pointer items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {/* El fondo va en su propia capa porque el escalado del hover es
                  CSS y el tirón magnético es GSAP: en el mismo elemento se
                  pisarían la propiedad `transform`. */}
              <span
                aria-hidden
                className="bg-brand shadow-brand/30 absolute inset-0 rounded-full shadow-lg transition-transform duration-300 ease-out group-hover:scale-110 group-active:scale-95"
              />
              <svg
                width="22"
                height="22"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
                className="text-brand-foreground relative"
              >
                <g data-icono>
                  <line data-bar-top x1="3" y1="7" x2="17" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  {/* Más corta que las otras dos a propósito: dentro del círculo
                      la hamburguesa perfectamente simétrica se leía como un
                      icono por defecto. */}
                  <line data-bar-mid x1="3" y1="10" x2="12" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line data-bar-bot x1="3" y1="13" x2="17" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </g>
              </svg>
              <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Overlay de navegación. Bajo la cabecera (z-50) para que el botón siga
          pulsable, como en la demo. `inert` cuando está cerrado: quita del
          tabulador todo lo de dentro sin tener que ir poniendo tabindex="-1" a
          mano en cada enlace, que es lo que hace la demo. */}
      <div
        ref={navRef}
        id={PANEL_ID}
        inert={!open}
        className="invisible pointer-events-none fixed inset-0 z-[45] flex flex-col items-end gap-2 p-3"
      >
        <div
          data-nav-bg
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-black/40 opacity-0"
        />

        {/* Arriba: los enlaces.
            Sin flex-1: el panel mide lo que miden los enlaces. Antes se estiraba
            hasta llenar la pantalla y quedaba un vacío enorme arriba y abajo de
            la lista.
            El pt-16 se queda: la cabecera flota encima y sin ese hueco el primer
            enlace le quedaría debajo. */}
        <div
          data-panel
          className="border-foreground bg-card relative z-30 flex w-full max-w-[700px] flex-col overflow-y-auto rounded-xl border-2 px-6 pt-16 pb-6"
        >
          <ul className="flex flex-col">
            {navItems.map((item) => {
              const isActive = active === item.href
              return (
                <li key={item.href} data-nav-item className="overflow-hidden">
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "location" : undefined}
                    data-active={isActive}
                    className="text-muted-foreground data-[active=true]:text-card-foreground font-display group flex items-center gap-3 py-2.5 text-3xl font-extrabold tracking-tight transition-colors"
                  >
                    {/* El indicador de sección se muda aquí: los enlaces salieron
                        de la barra, y sin esto perderías el "dónde estoy" que
                        tenía el subrayado. */}
                    <span
                      aria-hidden
                      data-on={isActive}
                      className="bg-brand h-6 w-1 shrink-0 origin-center scale-y-0 rounded-full transition-transform duration-300 data-[on=true]:scale-y-100"
                    />
                    {item.label}
                  </a>
                </li>
              )
            })}
          </ul>
          {/* Iniciar sesión: botón de marca a todo el ancho, la acción
              destacada del menú. Antes era un enlace de texto tenue que se
              perdía al pie del panel. */}
          <div data-nav-pie className="border-border mt-auto border-t pt-5">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand-ring flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <LogIn className="size-5" />
              Iniciar sesión
            </Link>
          </div>
        </div>

        {/* En medio: donde la demo pone "What's New", aquí va a lo que la gente
            viene de verdad. */}
        <div
          data-panel
          className="border-brand-hover bg-brand text-brand-foreground relative z-20 flex w-full max-w-[700px] flex-col justify-center rounded-xl border-2 px-6 py-6"
        >
          <p className="font-display text-[0.65rem] tracking-[0.1em] uppercase opacity-70">
            Trámites
          </p>
          <div className="mt-3 flex items-center gap-4">
            <span className="bg-brand-foreground/15 flex size-12 shrink-0 items-center justify-center rounded-xl">
              <FileSearch className="size-6" />
            </span>
            <span>
              <span className="font-display block text-xl leading-tight font-bold">
                Consultar constancias
              </span>
              <span className="mt-0.5 block text-sm opacity-80">
                Busca tus constancias y resoluciones.
              </span>
            </span>
          </div>
          <div className="mt-4">
            <Link
              href="/consulta-documentos"
              onClick={() => setOpen(false)}
              className="bg-brand-foreground text-brand inline-flex rounded-full px-4 py-1.5 text-xs font-semibold"
            >
              Ir al buscador
            </Link>
          </div>
        </div>

        {/* Abajo: las redes. También al alto de su contenido: 110px fijos para
            una fila de enlaces era medio panel vacío. */}
        <div
          data-panel
          className="border-border bg-foreground text-background relative z-10 flex w-full max-w-[700px] items-center rounded-xl border-2 px-6 py-5"
        >
          <ul className="flex flex-wrap gap-4">
            {REDES.map((r) => (
              <li key={r.label}>
                <a
                  href={r.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-background/70 hover:text-background text-sm transition-colors"
                >
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
