import Link from "next/link"
import Image from "next/image"
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react"

import { navItems, siteConfig } from "@/lib/site-config"

const { contact, social } = siteConfig

const SOCIAL_LINKS = [
  { label: "Facebook", href: social.facebook, icon: Facebook },
  { label: "Instagram", href: social.instagram, icon: Instagram },
  { label: "YouTube", href: social.youtube, icon: Youtube },
  { label: "LinkedIn", href: social.linkedin, icon: Linkedin },
]

export function SiteFooter() {
  return (
    <footer className="bg-card border-border border-t">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <Image
              src="/images/unamad-logo.png"
              alt={siteConfig.university}
              width={262}
              height={70}
              className="h-10 w-auto dark:brightness-0 dark:invert"
            />
            <p className="text-muted-foreground mt-5 max-w-xs text-sm text-pretty">
              {siteConfig.fullName} de la {siteConfig.university}.
            </p>
            <ul className="mt-6 flex gap-2">
              {SOCIAL_LINKS.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-muted-foreground hover:bg-brand hover:text-brand-foreground border-border flex size-9 items-center justify-center rounded-md border transition-colors"
                  >
                    <item.icon className="size-4" />
                    <span className="sr-only">{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-foreground text-sm font-semibold">Contacto</h2>
            <ul className="mt-5 space-y-4 text-sm">
              <li className="text-muted-foreground flex gap-3">
                <MapPin className="text-brand mt-0.5 size-4 shrink-0" />
                <address className="not-italic">
                  {contact.streetAddress}
                  <br />
                  {contact.locality}, {contact.region}
                  <br />
                  {contact.postalCode}, Perú
                </address>
              </li>
              <li className="flex gap-3">
                <Phone className="text-brand mt-0.5 size-4 shrink-0" />
                <a
                  href={`tel:${contact.phone.replace(/-/g, "")}`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {contact.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="text-brand mt-0.5 size-4 shrink-0" />
                <a
                  href={`mailto:${contact.email}`}
                  className="text-muted-foreground hover:text-foreground break-all transition-colors"
                >
                  {contact.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-foreground text-sm font-semibold">Enlaces</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {navItems.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/consulta-documentos"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Consultar documentos
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Iniciar sesión
                </Link>
              </li>
              <li>
                <a
                  href={siteConfig.universityUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Portal UNAMAD
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-border text-muted-foreground mt-14 border-t pt-8 text-center text-xs">
          <p>
            © {new Date().getFullYear()} {siteConfig.university}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
