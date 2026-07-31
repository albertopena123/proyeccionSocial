/**
 * Elencos culturales de la DPSEU. Aquí solo van los datos: el icono de cada uno
 * es un componente de React y no puede viajar del servidor al cliente como prop,
 * así que el mapa de iconos vive en components/landing/elenco-icons.ts.
 *
 * El ORDEN es deliberado: recorre el espectro (amarillo, naranja, rojo, magenta,
 * morado, azul) para que la barra de color de la portada lea como un degradado.
 *
 * `color`/`fg` apuntan a los tokens --elenco-* de globals.css. El texto va por
 * pares porque cada color pide el suyo: sobre el amarillo el blanco no se lee.
 * Si añades un elenco, valida el par antes (>=4.5:1) — ver el comentario del CSS.
 *
 * `image` es el póster de la tarjeta, y es OBLIGATORIO: los pósters llevan el
 * nombre y la descripción QUEMADOS en la imagen, así que la tarjeta no los
 * pinta en HTML — si no, saldrían dos veces. Un elenco sin `image` no tiene
 * dónde caer: la carta se quedaría vacía. Ese texto solo llega al lector de
 * pantalla por el `alt`, que lo compone en elencos-stack.tsx.
 *
 * Al añadir un elenco: original a assets/elencos-originales/, darlo de alta en
 * el MAPA de scripts/convert-posters.js, ejecutarlo, y poner la ruta aquí.
 * El color sigue haciendo falta aunque haya imagen: es el borde de la tarjeta,
 * que es lo único que se ve de las cartas de atrás cuando la baraja se abre.
 */
export const ELENCOS = [
  {
    key: "canto",
    name: "Canto y Música",
    description: "Armonía y talento vocal",
    color: "var(--elenco-canto)",
    fg: "var(--elenco-canto-fg)",
    image: "/images/elencos/canto.webp",
  },
  {
    key: "teatro",
    name: "Teatro y Oratoria",
    description: "Desarrollo de habilidades comunicativas",
    color: "var(--elenco-teatro)",
    fg: "var(--elenco-teatro-fg)",
    image: "/images/elencos/teatro.webp",
  },
  {
    key: "danzas",
    name: "Danzas Folklóricas Peruanas",
    description: "Preservando nuestras tradiciones",
    color: "var(--elenco-danzas)",
    fg: "var(--elenco-danzas-fg)",
    image: "/images/elencos/danzas.webp",
  },
  {
    key: "baile",
    name: "Baile Moderno",
    description: "Expresión artística contemporánea",
    color: "var(--elenco-baile)",
    fg: "var(--elenco-baile-fg)",
    image: "/images/elencos/baile.webp",
  },
  {
    key: "plasticas",
    name: "Artes Plásticas",
    description: "Creatividad visual y expresión",
    color: "var(--elenco-plasticas)",
    fg: "var(--elenco-plasticas-fg)",
    image: "/images/elencos/plasticas.webp",
  },
  {
    key: "tuna",
    name: "TUNA UNAMAD",
    description: "Tradición universitaria musical",
    color: "var(--elenco-tuna)",
    fg: "var(--elenco-tuna-fg)",
    image: "/images/elencos/tuna.webp",
  },
] as const

export const ELENCO_NAMES = ELENCOS.map((e) => e.name)
