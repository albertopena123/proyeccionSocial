"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// Mismos límites que valida la API: si cambian allí, cambian aquí.
const schema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre").max(100),
  correo: z.string().trim().email("Correo no válido").max(160),
  asunto: z.string().trim().min(3, "Escribe un asunto").max(150),
  mensaje: z.string().trim().min(10, "Cuéntanos un poco más").max(2000),
  // Honeypot: el usuario nunca lo ve ni lo rellena. Sin restricción de longitud,
  // igual que en la API: quien lo decide es el servidor.
  web: z.string().optional(),
})

type Valores = z.infer<typeof schema>

export function ContactoForm() {
  const [enviando, setEnviando] = useState(false)

  const form = useForm<Valores>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: "", correo: "", asunto: "", mensaje: "", web: "" },
  })

  const onSubmit = async (valores: Valores) => {
    setEnviando(true)
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valores),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "No se pudo enviar el mensaje")

      toast.success("Mensaje enviado. Te responderemos pronto.")
      form.reset()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar el mensaje")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Tu nombre" autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="correo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="asunto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asunto</FormLabel>
              <FormControl>
                <Input placeholder="¿Sobre qué nos escribes?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mensaje"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensaje</FormLabel>
              <FormControl>
                <Textarea
                  rows={5}
                  placeholder="Escribe tu mensaje…"
                  className="resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Honeypot: fuera de la vista y del foco, pero alcanzable por un bot que
            rellena todo. sr-only lo saca de la pantalla; aria-hidden y tabIndex
            lo esconden de lector de pantalla y del tabulador. */}
        <div className="sr-only" aria-hidden>
          <label htmlFor="contacto-web">No rellenar</label>
          <input
            id="contacto-web"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...form.register("web")}
          />
        </div>

        <Button type="submit" disabled={enviando} className="w-full sm:w-auto">
          {enviando ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Enviando…
            </>
          ) : (
            <>
              <Send className="size-4" />
              Enviar mensaje
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
