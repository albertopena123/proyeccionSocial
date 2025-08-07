import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserModules, getUserPreferences } from "@/lib/services"
import { prisma } from "@/lib/prisma"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns"

async function getDashboardStats() {
    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))
    const yearStart = startOfYear(now)

    // Obtener estadísticas de constancias
    const [
        totalConstancias,
        constanciasThisMonth,
        constanciasLastMonth,
        constanciasPendientes,
        constanciasAprobadas
    ] = await Promise.all([
        prisma.constancia.count(),
        prisma.constancia.count({
            where: {
                createdAt: {
                    gte: thisMonthStart,
                    lte: thisMonthEnd
                }
            }
        }),
        prisma.constancia.count({
            where: {
                createdAt: {
                    gte: lastMonthStart,
                    lte: lastMonthEnd
                }
            }
        }),
        prisma.constancia.count({
            where: { status: "PENDIENTE" }
        }),
        prisma.constancia.count({
            where: { status: "APROBADO" }
        })
    ])

    // Obtener estadísticas de resoluciones
    const [
        totalResoluciones,
        resolucionesThisMonth,
        resolucionesLastMonth,
        resolucionesPendientes,
        resolucionesAprobadas,
        resolucionesFinanciadas
    ] = await Promise.all([
        prisma.resolucion.count(),
        prisma.resolucion.count({
            where: {
                createdAt: {
                    gte: thisMonthStart,
                    lte: thisMonthEnd
                }
            }
        }),
        prisma.resolucion.count({
            where: {
                createdAt: {
                    gte: lastMonthStart,
                    lte: lastMonthEnd
                }
            }
        }),
        prisma.resolucion.count({
            where: { status: "PENDIENTE" }
        }),
        prisma.resolucion.count({
            where: { status: "APROBADO" }
        }),
        prisma.resolucion.count({
            where: { esFinanciado: true }
        })
    ])

    // Obtener estadísticas de usuarios
    const [
        totalUsers,
        activeUsers,
        newUsersThisMonth
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
            where: { 
                isActive: true,
                emailVerified: { not: null }
            }
        }),
        prisma.user.count({
            where: {
                createdAt: {
                    gte: thisMonthStart,
                    lte: thisMonthEnd
                }
            }
        })
    ])

    // Obtener datos para gráficos (últimos 6 meses)
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i))
        const monthEnd = endOfMonth(subMonths(now, i))
        
        const [constancias, resoluciones] = await Promise.all([
            prisma.constancia.count({
                where: {
                    createdAt: {
                        gte: monthStart,
                        lte: monthEnd
                    }
                }
            }),
            prisma.resolucion.count({
                where: {
                    createdAt: {
                        gte: monthStart,
                        lte: monthEnd
                    }
                }
            })
        ])

        monthlyData.push({
            month: monthStart.toLocaleString('es', { month: 'short' }),
            constancias,
            resoluciones,
            total: constancias + resoluciones
        })
    }

    // Obtener resoluciones por modalidad
    const resolucionesByModalidad = await prisma.resolucion.groupBy({
        by: ['modalidad'],
        _count: {
            modalidad: true
        }
    })

    // Obtener actividad reciente
    const recentActivity = await prisma.$queryRaw`
        SELECT 
            'constancia' as type,
            id,
            "constanciaNumber" as number,
            "fullName" as title,
            status,
            "createdAt"
        FROM "Constancia"
        UNION ALL
        SELECT 
            'resolucion' as type,
            id,
            "numeroResolucion" as number,
            "tituloProyecto" as title,
            status,
            "createdAt"
        FROM "Resolucion"
        ORDER BY "createdAt" DESC
        LIMIT 10
    ` as any[]

    // Calcular porcentajes de cambio
    const constanciasChange = constanciasLastMonth > 0 
        ? ((constanciasThisMonth - constanciasLastMonth) / constanciasLastMonth * 100).toFixed(1)
        : "0"
    
    const resolucionesChange = resolucionesLastMonth > 0
        ? ((resolucionesThisMonth - resolucionesLastMonth) / resolucionesLastMonth * 100).toFixed(1)
        : "0"

    return {
        stats: {
            constancias: {
                total: totalConstancias,
                thisMonth: constanciasThisMonth,
                change: constanciasChange,
                pendientes: constanciasPendientes,
                aprobadas: constanciasAprobadas
            },
            resoluciones: {
                total: totalResoluciones,
                thisMonth: resolucionesThisMonth,
                change: resolucionesChange,
                pendientes: resolucionesPendientes,
                aprobadas: resolucionesAprobadas,
                financiadas: resolucionesFinanciadas
            },
            usuarios: {
                total: totalUsers,
                active: activeUsers,
                newThisMonth: newUsersThisMonth
            }
        },
        chartData: {
            monthly: monthlyData,
            byModalidad: resolucionesByModalidad.map(item => ({
                modalidad: item.modalidad,
                count: item._count.modalidad
            }))
        },
        recentActivity
    }
}

export default async function DashboardPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // Define UserRole enum if not imported from elsewhere
    enum UserRole {
        USER = "USER",
        ADMIN = "ADMIN",
        MODERATOR = "MODERATOR",
        SUPER_ADMIN = "SUPER_ADMIN"
    }

    // Obtener datos del usuario y estadísticas
    const userRole = (session.user.role as UserRole) ?? UserRole.USER;

    const [modules, userPreferences, dashboardData] = await Promise.all([
        getUserModules(session.user.id, userRole),
        getUserPreferences(session.user.id),
        getDashboardStats()
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
                    <DashboardContent 
                        stats={dashboardData.stats}
                        chartData={dashboardData.chartData}
                        recentActivity={dashboardData.recentActivity}
                        userRole={session.user.role}
                    />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}