import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserModules, getUserPreferences } from "@/lib/services"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { ChartAreaInteractive } from "@/components/dashboard/chart-area-interactive"
import { DataTable } from "@/components/dashboard/data-table"
import { SectionCards } from "@/components/dashboard/section-cards"
import { SiteHeader } from "@/components/dashboard/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

import data from "./data.json"

export default async function Page() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // Define UserRole enum if not imported from elsewhere
    enum UserRole {
        USER = "USER",
        ADMIN = "ADMIN",
        // Add other roles as needed
    }

    // Obtener datos del usuario
    // Ensure userRole is always a valid UserRole
    const userRole = (session.user.role as UserRole) ?? UserRole.USER; // Replace UserRole.USER with your default role if needed

    const [modules, userPreferences] = await Promise.all([
        getUserModules(session.user.id, userRole),
        getUserPreferences(session.user.id)
    ])

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

    // Normalize userPreferences to ensure primaryColor and accentColor are undefined instead of null
    const normalizedUserPreferences = userPreferences
        ? {
            ...userPreferences,
            primaryColor: userPreferences.primaryColor ?? undefined,
            accentColor: userPreferences.accentColor ?? undefined,
        }
        : userPreferences;

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
                userPreferences={normalizedUserPreferences}
            />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                            <SectionCards />
                            <div className="px-4 lg:px-6">
                                <ChartAreaInteractive />
                            </div>
                            <DataTable data={data} />
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}