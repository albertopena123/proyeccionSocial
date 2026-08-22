import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"

import { LoginForm } from "@/components/auth/login-form"
import { ELENCOS } from "@/lib/elencos"

/**
 * Login a dos paneles: la foto aérea del campus con el scrim de marca a la
 * izquierda (la misma identidad que el hero del landing) y el formulario en
 * limpio a la derecha. En móvil el panel visual se oculta y queda el
 * formulario sobre fondo neutro con el logo arriba.
 */
export default function LoginPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-[1.15fr_1fr]">
            {/* Panel visual: solo en escritorio. La foto y las capas del scrim
                repiten la receta del hero para que el login se sienta la misma
                casa, no una plantilla aparte. */}
            <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10">
                <Image
                    src="/banner/banner1.jpg"
                    alt=""
                    fill
                    priority
                    sizes="(min-width: 1024px) 55vw, 0px"
                    className="object-cover"
                />
                <div aria-hidden className="absolute inset-0 bg-black/30" />
                <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40"
                />

                <Link
                    href="/"
                    className="focus-visible:ring-brand-ring relative inline-flex w-fit items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                    <Image
                        src="/banner/icon.png"
                        alt=""
                        width={949}
                        height={897}
                        className="size-9 object-contain"
                    />
                    <span className="leading-none">
                        <span className="font-display block text-sm font-extrabold tracking-tight text-white">
                            DPSEU
                        </span>
                        <span className="mt-1 block text-[0.7rem] leading-none text-white/75">
                            UNAMAD
                        </span>
                    </span>
                </Link>

                <div className="relative">
                    <h2 className="font-display max-w-xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] xl:text-5xl">
                        Proyección Social Universitaria
                    </h2>
                    <p className="mt-4 max-w-md text-pretty text-white/85">
                        Extensión universitaria y voluntariado al servicio del desarrollo de Madre de
                        Dios.
                    </p>
                    {/* La barra de elencos del hero, como firma de color. */}
                    <div aria-hidden className="mt-8 flex h-1.5 max-w-sm overflow-hidden rounded-full">
                        {ELENCOS.map((elenco) => (
                            <div
                                key={elenco.key}
                                className="flex-1"
                                style={{ backgroundColor: elenco.color }}
                            />
                        ))}
                    </div>
                </div>
            </aside>

            {/* Panel del formulario */}
            <main className="bg-background flex flex-col px-6 py-8 sm:px-10">
                <div className="flex items-center justify-between">
                    <Link
                        href="/"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
                    >
                        <ArrowLeft className="size-4" />
                        Volver al inicio
                    </Link>

                    {/* En móvil no hay panel visual: el logo identifica la página. */}
                    <Link href="/" className="flex items-center gap-2 lg:hidden">
                        <Image
                            src="/banner/icon.png"
                            alt=""
                            width={949}
                            height={897}
                            className="size-7 object-contain"
                        />
                        <span className="font-display text-foreground text-sm font-extrabold tracking-tight">
                            DPSEU
                        </span>
                    </Link>
                </div>

                <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
                    <h1 className="font-display text-foreground text-3xl font-extrabold tracking-tight">
                        Bienvenido de nuevo
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Ingresa tus credenciales para acceder al sistema.
                    </p>

                    <div className="mt-8">
                        <Suspense
                            fallback={
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="text-brand size-6 animate-spin" />
                                    <span className="sr-only">Cargando…</span>
                                </div>
                            }
                        >
                            <LoginForm />
                        </Suspense>
                    </div>

                    <div className="relative mt-8">
                        <div aria-hidden className="absolute inset-0 flex items-center">
                            <span className="border-border w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background text-muted-foreground px-2">o</span>
                        </div>
                    </div>

                    <p className="text-muted-foreground mt-6 text-center text-sm">
                        ¿No tienes cuenta?{" "}
                        <Link
                            href="/register"
                            className="text-brand hover:text-brand-hover font-medium transition-colors hover:underline"
                        >
                            Regístrate aquí
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    )
}
