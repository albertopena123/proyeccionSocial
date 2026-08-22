export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Sin envoltorio: cada página de auth compone su propia pantalla completa.
    // El antiguo max-w-md centrado de aquí impedía diseños a todo el ancho como
    // el login a dos paneles, y forgot/reset-password ya traían el suyo propio
    // (quedaban doblemente envueltas).
    return children
}
