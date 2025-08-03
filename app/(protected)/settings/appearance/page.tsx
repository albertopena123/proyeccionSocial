// app/(protected)/settings/appearance/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserPreferences } from "@/lib/services"
import { AppearanceForm } from "@/components/settings/appearance-form"

export default async function AppearancePage() {
    const session = await auth()
    if (!session) redirect("/login")

    const preferences = await getUserPreferences(session.user.id)

    const formattedPreferences = {
        theme: preferences?.theme || "system",
        radius: preferences?.radius || 0.5,
        primaryColor: preferences?.primaryColor || "25",
        accentColor: preferences?.accentColor || "200",
        fontSize: preferences?.fontSize || "default",
        reducedMotion: preferences?.reducedMotion || false,
        highContrast: preferences?.highContrast || false
    }

    return (
        <div className="container max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="space-y-6">
                <div className="space-y-1">
                    <h3 className="text-lg font-medium">Apariencia</h3>
                    <p className="text-sm text-muted-foreground">
                        Personaliza la apariencia de tu aplicación
                    </p>
                </div>
                <AppearanceForm
                    userId={session.user.id}
                    initialPreferences={formattedPreferences}
                />
            </div>
        </div>
    )
}