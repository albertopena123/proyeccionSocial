import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <main>{children}</main>
        </div>
    )
}