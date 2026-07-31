/**
 * Tiempos de la cortina. Los tres valores de las columnas están medidos sobre la
 * referencia (fotogramas a 20fps, detectando el borde de cada columna): su
 * escalonado es de 100ms exactos y cada columna cruza la pantalla en ~590ms con
 * un ease-out marcado —hace el 61% del recorrido en el primer 22% del tiempo—.
 *
 * INVARIANTE: COL_DELAY + 5*COL_STAGGER + COL_DURATION <= INTRO_MS.
 * Si no se cumple, el velo se oculta con la última columna aún moviéndose y el
 * corte se ve. Ahora: 680 + 500 + 580 = 1760 <= 1800.
 */
export const INTRO_MS = 1800
export const COL_DELAY = 680
export const COL_STAGGER = 100
export const COL_DURATION = 580

/** Ease-out fuerte (easeOutCubic): sale disparada y se asienta. Lo contrario de
 *  un ease-in-out, que arranca lento y es justo lo que hacía que no fuera fluido. */
export const COL_EASE = "cubic-bezier(0.33, 1, 0.68, 1)"

/** La marca se apaga justo cuando la primera columna empieza a subir. */
export const MARK_MS = 760

/** Clase en <html> que salta la cortina. Solo la pone ?nointro. */
export const INTRO_SKIP_CLASS = "intro-skip"

/**
 * Script bloqueante para el <head>.
 *
 * La cortina suena en CADA carga, así que no hay nada que recordar: lo único que
 * hace esto es atender a ?nointro, y tiene que ser antes del primer pintado —el
 * velo se renderiza en el servidor, así que quitarlo desde React dejaría ver un
 * fogonazo—.
 *
 * ?nointro es para desarrollo: iterar sobre la portada esperando 1.8s en cada
 * recarga es insufrible. No lo usa nadie de fuera.
 */
export const INTRO_SCRIPT = `
try {
  if (new URLSearchParams(location.search).has("nointro")) {
    document.documentElement.classList.add(${JSON.stringify(INTRO_SKIP_CLASS)});
  }
} catch (e) {
  /* Si esto falla, la cortina suena igual: es el comportamiento por defecto. */
}
`.trim()
