import { SiteHeader } from "@/components/landing/site-header"
import { IntroOverlay } from "@/components/landing/intro-overlay"
import { TransicionSecciones } from "@/components/landing/transicion-secciones"
import { Hero } from "@/components/landing/hero"
import { ElencosSection } from "@/components/landing/elencos-section"
import { ActividadesSection } from "@/components/landing/actividades-section"
import { ResponsabilidadSection } from "@/components/landing/responsabilidad-section"
import { ContactoSection } from "@/components/landing/contacto-section"
import { SiteFooter } from "@/components/landing/site-footer"
import { Marquee } from "@/components/landing/motion/marquee"
import { ELENCO_NAMES } from "@/lib/elencos"

export default function HomePage() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <IntroOverlay />
      <TransicionSecciones />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Marquee items={ELENCO_NAMES} />
        <ElencosSection />
        <ActividadesSection />
        <ResponsabilidadSection />
        <ContactoSection />
      </main>
      <SiteFooter />
    </div>
  )
}
