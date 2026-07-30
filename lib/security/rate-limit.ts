// lib/security/rate-limit.ts
// Limitador de peticiones en memoria.
//
// La app corre en un único proceso (ecosystem.config.js -> instances: 1), así
// que un contador en memoria es suficiente. Si algún día se pasa a modo cluster
// hay que mover esto a Redis o a la base de datos: cada worker tendría su propio
// contador y el límite efectivo se multiplicaría por el número de workers.

type Bucket = {
    hits: number[]
}

const buckets = new Map<string, Bucket>()

// Purga perezosa: se limpia al consultar, no con un timer, para no dejar un
// intervalo colgando en el runtime de Next.
let lastSweep = Date.now()
const SWEEP_INTERVAL_MS = 5 * 60 * 1000

function sweep(now: number) {
    if (now - lastSweep < SWEEP_INTERVAL_MS) return
    lastSweep = now

    for (const [key, bucket] of buckets) {
        if (bucket.hits.length === 0 || now - bucket.hits[bucket.hits.length - 1] > SWEEP_INTERVAL_MS) {
            buckets.delete(key)
        }
    }
}

export type RateLimitResult = {
    allowed: boolean
    remaining: number
    retryAfterSeconds: number
}

/**
 * Ventana deslizante. Devuelve allowed=false cuando se superan `limit`
 * peticiones para la misma clave dentro de `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now()
    sweep(now)

    const bucket = buckets.get(key) ?? { hits: [] }
    const windowStart = now - windowMs
    bucket.hits = bucket.hits.filter((timestamp) => timestamp > windowStart)

    if (bucket.hits.length >= limit) {
        buckets.set(key, bucket)
        const oldest = bucket.hits[0]
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
        }
    }

    bucket.hits.push(now)
    buckets.set(key, bucket)

    return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 }
}

// Se descarta cualquier intento de resetear el contador borrando la clave desde
// fuera; sólo el propio flujo con éxito puede hacerlo (p. ej. login correcto).
export function resetRateLimit(key: string) {
    buckets.delete(key)
}

/**
 * IP del cliente. La app está detrás del proxy inverso de Apache
 * (proyeccionsocial.unamad.edu.pe) y Next escucha sólo en 127.0.0.1, así que
 * x-forwarded-for lo pone el proxy. Se toma la primera entrada porque las
 * siguientes las puede haber añadido el cliente.
 */
export function clientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for")
    if (forwarded) {
        const first = forwarded.split(",")[0].trim()
        if (first) return first
    }

    return request.headers.get("x-real-ip")?.trim() || "unknown"
}

export function rateLimitResponse(result: RateLimitResult, message: string) {
    return Response.json(
        { error: message },
        {
            status: 429,
            headers: { "Retry-After": String(result.retryAfterSeconds) },
        }
    )
}
