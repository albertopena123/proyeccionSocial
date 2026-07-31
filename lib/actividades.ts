/**
 * Fotos reales de la DPSEU que ya estaban en public/images/.
 *
 * Los pies describen SOLO lo que se ve en cada foto: el banner de la primera
 * dice "Responsabilidad Social", en la segunda se reconoce a la TUNA por el
 * vestuario y los instrumentos, y la tercera es una foto de grupo. No hay
 * nombres de evento ni fechas porque no los sé — si los tienes, cámbialos aquí:
 * un pie concreto ("Campaña en Puerto Maldonado, mayo 2025") vale mucho más que
 * uno genérico.
 *
 * `width`/`height` son los reales del archivo; next/image los necesita para
 * reservar el hueco y que no salte la maquetación al cargar.
 *
 * `color` es el borde de la tarjeta. Son a propósito los mismos tokens que los
 * elencos: una sola paleta en toda la portada, ya validada en contraste y en
 * gamut (ver el comentario de --elenco-* en globals.css). Si esa paleta cambia,
 * estos bordes cambian con ella, que es lo que se quiere.
 *
 * La de la TUNA lleva el azul de la TUNA: ahí el color significa algo. Las otras
 * dos toman los extremos del espectro —amarillo y magenta— para que las tres se
 * distingan de un vistazo.
 */
export const ACTIVIDADES = [
  {
    key: "responsabilidad",
    src: "/images/main1.jpg",
    width: 2560,
    height: 1041,
    titulo: "Responsabilidad Social",
    pie: "Equipo de la Dirección en una actividad institucional de responsabilidad social.",
    color: "var(--elenco-canto)",
  },
  {
    key: "tuna",
    src: "/images/main2.jpg",
    width: 2048,
    height: 1365,
    titulo: "TUNA UNAMAD",
    pie: "El elenco de la tuna durante una presentación nocturna.",
    color: "var(--elenco-tuna)",
  },
  {
    key: "elencos",
    src: "/images/main3.jpg",
    width: 2048,
    height: 1365,
    titulo: "Elencos y estudiantes",
    pie: "Delegación de estudiantes y elencos de la universidad.",
    color: "var(--elenco-baile)",
  },
] as const
