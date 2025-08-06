// app/(protected)/users/layout.tsx
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

export default async function UsersLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // Obtener datos del usuario
    if (!session.user.role) {
        throw new Error("User role is undefined");
    }
    const [modules, rawUserPreferences] = await Promise.all([
        getUserModules(session.user.id, session.user.role as $Enums.UserRole),
        getUserPreferences(session.user.id)
    ])

    // Normalize userPreferences to match UserPreferences type
    const userPreferences = rawUserPreferences
        ? {
            ...rawUserPreferences,
            primaryColor: rawUserPreferences.primaryColor ?? undefined,
            accentColor: rawUserPreferences.accentColor ?? undefined,
        }
        : null;

    const normalizedSession = session
        ? {
            ...session,
            user: {
                ...session.user,
                name: session.user?.name ?? undefined,
                email: session.user?.email ?? undefined,
            },
        }
        : undefined;

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
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