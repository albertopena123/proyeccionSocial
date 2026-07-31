import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react"

import { siteConfig } from "@/lib/site-config"
import { ContactoForm } from "@/components/landing/contacto-form"

const { contact, social } = siteConfig

const REDES = [
  { label: "Facebook", href: social.facebook, icon: Facebook },
  { label: "Instagram", href: social.instagram, icon: Instagram },
  { label: "YouTube", href: social.youtube, icon: Youtube },
  { label: "LinkedIn", href: social.linkedin, icon: Linkedin },
]

export function ContactoSection() {
  return (
    <section id="contacto" className="bg-background scroll-mt-16 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-foreground font-display text-3xl font-extrabold tracking-tight text-balance md:text-5xl">
            Ponte en contacto
          </h2>
          <div className="bg-brand mx-auto mt-6 h-1 w-16 rounded-full" />
          <p className="text-muted-foreground mt-6 text-lg text-pretty">
            ¿Tienes una consulta, una propuesta o quieres sumarte al voluntariado? Escríbenos.
          </p>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-5 lg:gap-16">
          {/* El formulario ocupa más: es la acción principal. */}
          <div className="lg:col-span-3">
            <ContactoForm />
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-foreground font-display text-lg font-bold">Datos de contacto</h3>
            <ul className="mt-6 space-y-5 text-sm">
              <li className="flex gap-3">
                <MapPin className="text-brand mt-0.5 size-5 shrink-0" />
                <address className="text-muted-foreground not-italic">
                  {contact.streetAddress}
                  <br />
                  {contact.locality}, {contact.region}
                  <br />
                  {contact.postalCode}, Perú
                </address>
              </li>
              <li className="flex gap-3">
                <Phone className="text-brand mt-0.5 size-5 shrink-0" />
                <a
                  href={`tel:${contact.phone.replace(/-/g, "")}`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {contact.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="text-brand mt-0.5 size-5 shrink-0" />
                <a
                  href={`mailto:${contact.email}`}
                  className="text-muted-foreground hover:text-foreground break-all transition-colors"
                >
                  {contact.email}
                </a>
              </li>
            </ul>

            <h3 className="text-foreground font-display mt-8 text-lg font-bold">Síguenos</h3>
            <ul className="mt-4 flex gap-2">
              {REDES.map((red) => (
                <li key={red.label}>
                  <a
                    href={red.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-muted-foreground hover:bg-brand hover:text-brand-foreground border-border flex size-10 items-center justify-center rounded-md border transition-colors"
                  >
                    <red.icon className="size-4" />
                    <span className="sr-only">{red.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
