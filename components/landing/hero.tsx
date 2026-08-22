"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { FileSearch } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ELENCOS } from "@/lib/elencos"
import { ELENCO_ICONS } from "@/components/landing/elenco-icons"
import { Wordmark } from "@/components/landing/wordmark"
import { EscudoOutline } from "@/components/landing/escudo-outline"

const TILE_MS = 2600

export function Hero() {
  const [tile, setTile] = useState(0)
  const [tilePausado, setTilePausado] = useState(false)

  // El mosaico va rotando entre elencos, como el de apps en la referencia.
  // Con reduced-motion se queda quieto en el primero: no se pierde información,
  // los seis están listados enteros en la sección de Elencos.
  //
  // Timeout keyado con `tile`, no interval fijo: cada cambio (clic o tick)
  // reinicia la cuenta, así un clic nunca es pisado por el tick automático
  // milisegundos después. Hover/focus pausan del todo, como en ElencosStack.
  useEffect(() => {
    if (tilePausado) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = setTimeout(() => setTile((i) => (i + 1) % ELENCOS.length), TILE_MS)
    return () => clearTimeout(t)
  }, [tile, tilePausado])

  // La portada no tiene animación de entrada propia a propósito: la cortina
  // suena en cada carga y ya ES la entrada. Animarla además por debajo haría que
  // cada columna al subir destapara el texto a medio fundido, con dos
  // movimientos peleándose. Lo que descubre la cortina ya está asentado.

  const active = ELENCOS[tile]
  const ActiveIcon = ELENCO_ICONS[active.key]

  return (
    // La cabecera es fixed, así que no ocupa flujo: el hero llena la ventana
    // entera y ella flota encima. Su contenido va abajo, así que no la estorba.
    //
    // El id es el destino de "Inicio" en el menú, y además hace que el marcador
    // de sección lo señale cuando estás arriba del todo.
    // pt-24: la cabecera es fixed y no ocupa flujo, así que sin este colchón el
    // contenido crece hacia arriba hasta meterse debajo de ella. Con el póster
    // grande pasaba: sus primeros 59px quedaban tapados por el logo.
    <section
      id="inicio"
      className="relative flex min-h-svh flex-col justify-end overflow-hidden pt-24"
    >
      {/* Foto aérea del campus a sangre completa. Va como primer hijo absoluto
          (no con z negativo: un z-index negativo la mandaría detrás del
          bg-background del contenedor de la página y desaparecería). El
          contenido lleva `relative` para pintarse encima. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <Image
          src="/banner/banner1.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Scrim en dos capas: un velo uniforme que baja el brillo general de la
            foto (cielo y césped son muy luminosos) y un degradado cargado hacia
            abajo, que es donde se asienta todo el texto del hero. */}
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/30" />
      </div>

      {/* El escudo enorme en línea fina, desbordando por la derecha: el mismo
          papel que la marca gigante de fondo de la referencia, pero con la
          geometría que la propia UNAMAD eligió. Sobre la foto va en blanco
          translúcido, como marca de agua en el cielo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 -right-36 hidden text-white/15 lg:block"
      >
        <EscudoOutline className="size-[42rem]" />
      </div>

      {/* max-w-7xl (1280px) dejaba el diseño convertido en una isla del 43% del
          ancho en un monitor de 3000px. Ahora el tope sube a 100rem y hasta ahí
          sigue al viewport.
          `relative`: sin él, la foto de fondo (absoluta y posterior en orden de
          pintado que el flujo normal) taparía el contenido. */}
      <div className="relative mx-auto w-full max-w-[min(92vw,100rem)] px-6 pb-8">
        {/* El PNG original pesa 2.7MB; next/image lo reescala y lo sirve en
            formato moderno, así que con `sizes` acotado bajan a unas decenas de
            kB. Ojo: `sizes` tiene que seguir a los anchos reales de abajo —si se
            quedan cortos, Next sirve una imagen pequeña y se ve borrosa.
            El alt recoge lo que el propio póster dice, no una descripción mía.

            Centrada y grande, superpuesta a la foto del campus: el hero ancla
            su contenido abajo y dejaba medio viewport vacío arriba. Este póster
            es lo que llena ese hueco. */}
        {/* Versión sin el fondo blanco del original (generada con sharp,
            flood-fill del blanco desde los bordes): el collage circular queda
            flotando sobre la foto del campus. El drop-shadow sigue la silueta
            del alfa, no la caja, y lo despega del fondo. */}
        <Image
          src="/images/proyeccion_social_banner_sin_fondo.png"
          alt="Proyección social, extensión universitaria y voluntariado al servicio del desarrollo — UNAMAD"
          width={1254}
          height={1254}
          priority
          sizes="(max-width: 640px) 85vw, 44rem"
          // Se mide por ALTO, no por ancho: lo que limita este póster no es el
          // ancho de la pantalla sino el sitio vertical que queda tras el
          // wordmark y el tagline. Con un tope fijo de 416px se quedaba en el
          // 14% de un monitor de 3000px mientras sobraban 870px verticales.
          // El original son 1254px, así que hasta 44rem no pierde nitidez.
          className="mx-auto mb-8 h-[min(42vh,44rem)] w-auto max-w-[85vw] object-contain drop-shadow-[0_10px_35px_rgba(0,0,0,0.45)]"
        />

        {/* Titular: el texto real de la portada, que entra carácter a carácter
            (SplitText) sincronizado con la cortina. */}
        <Wordmark />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <p className="max-w-md text-base text-pretty text-white/90 md:text-lg">
            Proyección social, extensión universitaria y voluntariado al servicio del desarrollo
            de Madre de Dios.
          </p>

          <div className="flex items-end gap-6">
            <Button
              asChild
              size="lg"
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
            >
              <Link href="/consulta-documentos">
                <FileSearch />
                Consultar constancias
              </Link>
            </Button>

            {/* Mosaico interactivo de elencos */}
            <button
              type="button"
              onClick={() => setTile((i) => (i + 1) % ELENCOS.length)}
              onMouseEnter={() => setTilePausado(true)}
              onMouseLeave={() => setTilePausado(false)}
              onFocus={() => setTilePausado(true)}
              onBlur={() => setTilePausado(false)}
              title="Haz clic para ver el siguiente elenco"
              aria-label={`Elenco actual: ${active.name}. Clic para cambiar.`}
              className="group focus-visible:ring-brand-ring relative hidden size-32 shrink-0 cursor-pointer overflow-hidden rounded-2xl shadow-md transition-all duration-500 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:outline-none sm:block"
              style={{ backgroundColor: active.color, color: active.fg }}
            >
              <div
                key={active.key}
                className="animate-in fade-in zoom-in-95 absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center duration-500"
              >
                <ActiveIcon className="size-7 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-xs leading-tight font-semibold text-balance">
                  {active.name}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Barra de color: un segmento por elenco, como el degradado de
            sub-marcas de la referencia. Aquí sí hay varios colores porque hay
            varios elencos; el cromo del sitio sigue siendo la marca. */}
        <div aria-hidden className="mt-8 flex h-1.5 overflow-hidden rounded-full">
          {ELENCOS.map((elenco) => (
            <div key={elenco.key} className="flex-1" style={{ backgroundColor: elenco.color }} />
          ))}
        </div>
      </div>
    </section>
  )
}
