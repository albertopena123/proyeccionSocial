import type { ComponentType } from "react"
import { Drama, Guitar, Mic2, Palette, PartyPopper, Sparkles } from "lucide-react"

/**
 * Iconos por elenco, emparejados con ELENCOS de lib/elencos.ts por `key`.
 * Viven aparte de los datos porque son componentes: solo pueden importarse
 * desde componentes de cliente.
 */
export const ELENCO_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  baile: Sparkles,
  teatro: Drama,
  danzas: PartyPopper,
  canto: Mic2,
  plasticas: Palette,
  tuna: Guitar,
}
