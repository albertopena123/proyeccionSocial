import { NextResponse } from "next/server"
import { z } from "zod"

import { sendEmail } from "@/lib/email"
import { siteConfig } from "@/lib/site-config"

/**
 * Recibe el formulario público de contacto y lo reenvía al correo de la DPSEU.
 *
 * Defensas, de más a menos importante:
 *  - honeypot `web`: un campo que el CSS oculta y ningún humano rellena. Si
 *    llega con algo, es un bot: se responde 200 sin enviar, para no darle pistas.
 *  - validación y límites de longitud con zod.
 *  - límite por IP en memoria: best-effort. Frena ráfagas triviales; no
 *    sobrevive a un reinicio ni a varias instancias, pero para un sitio
 *    institucional pequeño, con el honeypot delante, es suficiente.
 *  - escape de HTML: el mensaje del visitante va dentro de un email HTML, así
 *    que se escapa para que no inyecte marcado.
 */

const schema = z.object({
  nombre: z.string().trim().min(2, "Nombre demasiado corto").max(100),
  correo: z.string().trim().email("Correo no válido").max(160),
  asunto: z.string().trim().min(3, "Asunto demasiado corto").max(150),
  mensaje: z.string().trim().min(10, "Mensaje demasiado corto").max(2000),
  // Honeypot: se acepta cualquier valor en la validación A PROPÓSITO. No es un
  // campo real, así que no debe generar un error 400 que le dé pistas al bot;
  // que llegue lleno lo decide el handler más abajo, respondiendo 200 sin enviar.
  web: z.string().optional(),
})

// IP -> lista de marcas de tiempo (ms) de sus últimos envíos.
const golpes = new Map<string, number[]>()
const VENTANA_MS = 60_000
const MAX_POR_VENTANA = 3

function limitado(ip: string) {
  const ahora = Date.now()
  const previos = (golpes.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS)
  if (previos.length >= MAX_POR_VENTANA) {
    golpes.set(ip, previos)
    return true
  }
  previos.push(ahora)
  golpes.set(ip, previos)
  return false
}

function escapar(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "desconocida"

    if (limitado(ip)) {
      return NextResponse.json(
        { error: "Has enviado varios mensajes seguidos. Espera un minuto." },
        { status: 429 }
      )
    }

    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos"
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const { nombre, correo, asunto, mensaje, web } = parsed.data

    // Honeypot lleno: bot. Fingir éxito sin enviar.
    if (web) return NextResponse.json({ ok: true })

    const [n, c, a, m] = [nombre, correo, asunto, mensaje].map(escapar)
    const resultado = await sendEmail({
      to: siteConfig.contact.email,
      // replyTo con el correo del visitante: "Responder" le contesta a él.
      replyTo: correo,
      subject: `[Web contacto] ${a}`,
      text: `Nombre: ${nombre}\nCorreo: ${correo}\nAsunto: ${asunto}\n\n${mensaje}`,
      html: `
        <h2 style="margin:0 0 16px">Nuevo mensaje desde la web</h2>
        <p style="margin:4px 0"><strong>Nombre:</strong> ${n}</p>
        <p style="margin:4px 0"><strong>Correo:</strong> ${c}</p>
        <p style="margin:4px 0"><strong>Asunto:</strong> ${a}</p>
        <p style="margin:16px 0 4px"><strong>Mensaje:</strong></p>
        <p style="margin:0;white-space:pre-wrap">${m}</p>
      `,
    })

    if (!resultado.success) {
      return NextResponse.json(
        { error: "No se pudo enviar el mensaje. Intenta más tarde." },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error inesperado." }, { status: 500 })
  }
}
