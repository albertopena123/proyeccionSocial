import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserModules, getUserPreferences } from "@/lib/services"
import { $Enums } from "@prisma/client"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

export default async function DocumentsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    
    if (!session) {
        redirect("/login")
    }
    
    // Obtener módulos y preferencias del usuario
    const [modules, rawUserPreferences] = await Promise.all([
        getUserModules(session.user.id, session.user.role as $Enums.UserRole),
        getUserPreferences(session.user.id)
    ])
    
    // Normalizar datos de sesión y preferencias
    const normalizedSession = {
        ...session,
        user: {
            ...session.user,
            name: session.user.name || undefined,
            email: session.user.email || undefined,
            role: session.user.role as $Enums.UserRole
        }
    }
    
    const userPreferences = {
        theme: rawUserPreferences?.theme || "system",
        fontSize: rawUserPreferences?.fontSize || "default",
        reducedMotion: rawUserPreferences?.reducedMotion || false,
        highContrast: rawUserPreferences?.highContrast || false,
        primaryColor: rawUserPreferences?.primaryColor || undefined,
        accentColor: rawUserPreferences?.accentColor || undefined,
        radius: rawUserPreferences?.radius || 0.5
    }
    
    return (
        <SidebarProvider>
            <AppSidebar
                variant="inset"
                session={normalizedSession}
                modules={modules}
                userPreferences={userPreferences}
            />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="container mx-auto">
                        {children}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}