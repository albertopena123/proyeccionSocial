"use client"

import * as React from "react"
import { useEffect } from "react"
import * as Icons from "lucide-react"
import { useTheme } from "next-themes"

import { NavMain } from "@/components/dashboard/nav-main"
import { NavUser } from "@/components/dashboard/nav-user"
import { TeamSwitcher } from "@/components/dashboard/team-switcher"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar"

interface SessionUser {
    name?: string
    email?: string
    picture?: string
    image?: string
}

interface Session {
    user?: SessionUser
}

interface Module {
    id: string
    name: string
    slug: string
    icon?: string | null
    order: number
    submodules?: {
        id: string
        name: string
        slug: string
        icon?: string | null
        description?: string | null
    }[]
}

interface UserPreferences {
    primaryColor?: string
    accentColor?: string
    theme?: string
    radius?: number
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
    session?: Session
    modules?: Module[]
    userPreferences?: UserPreferences | null
}

// Import LucideIcon type from lucide-react
import type { LucideIcon } from "lucide-react";

// Función para obtener el ícono de lucide-react dinámicamente
function getIcon(iconName?: string): LucideIcon {
    if (!iconName || !Icons[iconName as keyof typeof Icons]) {
        return Icons.FileText as LucideIcon // Ícono por defecto
    }
    return Icons[iconName as keyof typeof Icons] as LucideIcon;
}

// Función para aplicar colores personalizados
function applyUserColors(primaryColor?: string, accentColor?: string) {
    if (!primaryColor && !accentColor) return

    const root = document.documentElement.style

    if (primaryColor) {
        const hue = parseInt(primaryColor)
        root.setProperty('--primary', `oklch(0.637 0.237 ${hue})`)
        root.setProperty('--ring', `oklch(0.637 0.237 ${hue})`)
        root.setProperty('--sidebar-primary', `oklch(0.637 0.237 ${hue})`)
    }

    if (accentColor) {
        const hue = parseInt(accentColor)
        root.setProperty('--accent', `oklch(0.967 0.001 ${hue})`)
        root.setProperty('--sidebar-accent', `oklch(0.967 0.001 ${hue})`)
    }
}

export function AppSidebar({ session, modules = [], userPreferences, ...props }: AppSidebarProps) {
    const { setTheme } = useTheme()
    
    // Aplicar colores personalizados y tema al montar
    useEffect(() => {
        if (userPreferences) {
            applyUserColors(userPreferences.primaryColor, userPreferences.accentColor)
            // Aplicar el tema si está configurado
            if (userPreferences.theme) {
                setTheme(userPreferences.theme)
            }
        }
    }, [userPreferences, setTheme])

    // Convertir módulos de DB al formato de NavMain
    const navMainItems = modules.map(module => ({
        title: module.name,
        url: `/${module.slug}`,
        icon: getIcon(module.icon || undefined),
        items: module.submodules?.map(sub => ({
            title: sub.name,
            url: `/${module.slug}/${sub.slug}`
        })) || []
    }))

    // Datos estáticos para teams (puedes hacerlo dinámico después)
    const teams = [{
        name: "Acme Inc",
        logo: Icons.GalleryVerticalEnd,
        plan: "Enterprise",
    }]

    const userData = {
        name: session?.user?.name || "Usuario",
        email: session?.user?.email || "email@example.com",
        avatar: session?.user?.image || "/avatars/default.jpg",
    }

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={teams} />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navMainItems} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={userData} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}