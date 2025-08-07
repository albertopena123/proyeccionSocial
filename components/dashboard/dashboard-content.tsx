"use client"

import * as React from "react"
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle 
} from "@/components/ui/card"
import { 
    IconFileText, 
    IconFiles, 
    IconUsers, 
    IconTrendingUp,
    IconTrendingDown,
    IconClock,
    IconCheck,
    IconCurrencyDollar,
    IconActivity,
    IconCalendar,
    IconChartBar
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    Pie,
    PieChart,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Legend
} from "recharts"
import { formatDateShort } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface DashboardContentProps {
    stats: {
        constancias: {
            total: number
            thisMonth: number
            change: string
            pendientes: number
            aprobadas: number
        }
        resoluciones: {
            total: number
            thisMonth: number
            change: string
            pendientes: number
            aprobadas: number
            financiadas: number
        }
        usuarios: {
            total: number
            active: number
            newThisMonth: number
        }
    }
    chartData: {
        monthly: Array<{
            month: string
            constancias: number
            resoluciones: number
            total: number
        }>
        byModalidad: Array<{
            modalidad: string
            count: number
        }>
    }
    recentActivity: Array<{
        type: string
        id: string
        number: string
        title: string
        status: string
        createdAt: Date
    }>
    userRole?: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

const modalidadLabels: Record<string, string> = {
    DOCENTES: "Docentes",
    ESTUDIANTES: "Estudiantes",
    VOLUNTARIADO: "Voluntariado",
    ACTIVIDAD: "Actividad"
}

const statusColors: Record<string, string> = {
    PENDIENTE: "bg-yellow-500",
    APROBADO: "bg-green-500",
    RECHAZADO: "bg-red-500",
    EN_PROCESO: "bg-blue-500"
}

const statusLabels: Record<string, string> = {
    PENDIENTE: "Pendiente",
    APROBADO: "Aprobado",
    RECHAZADO: "Rechazado",
    EN_PROCESO: "En Proceso"
}

export function DashboardContent({ 
    stats, 
    chartData, 
    recentActivity,
    userRole 
}: DashboardContentProps) {
    const isPositiveChange = (change: string) => parseFloat(change) >= 0

    // Preparar datos para el gráfico de pie
    const pieData = chartData.byModalidad.map(item => ({
        name: modalidadLabels[item.modalidad] || item.modalidad,
        value: item.count
    }))

    // Calcular totales para progreso
    const totalDocumentos = stats.constancias.total + stats.resoluciones.total
    const totalPendientes = stats.constancias.pendientes + stats.resoluciones.pendientes
    const totalAprobados = stats.constancias.aprobadas + stats.resoluciones.aprobadas
    const tasaAprobacion = totalDocumentos > 0 
        ? ((totalAprobados / totalDocumentos) * 100).toFixed(1)
        : "0"

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Resumen de actividad y estadísticas del sistema
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <IconCalendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </span>
                </div>
            </div>

            {/* Cards de estadísticas principales */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Card Constancias */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Constancias
                        </CardTitle>
                        <IconFileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.constancias.total}</div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">
                                {stats.constancias.thisMonth} este mes
                            </span>
                            <div className={cn(
                                "flex items-center gap-0.5",
                                isPositiveChange(stats.constancias.change) 
                                    ? "text-green-600" 
                                    : "text-red-600"
                            )}>
                                {isPositiveChange(stats.constancias.change) ? (
                                    <IconTrendingUp className="h-3 w-3" />
                                ) : (
                                    <IconTrendingDown className="h-3 w-3" />
                                )}
                                <span>{Math.abs(parseFloat(stats.constancias.change))}%</span>
                            </div>
                        </div>
                        <Progress 
                            value={(stats.constancias.aprobadas / stats.constancias.total) * 100} 
                            className="mt-2 h-1"
                        />
                    </CardContent>
                </Card>

                {/* Card Resoluciones */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Resoluciones
                        </CardTitle>
                        <IconFiles className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.resoluciones.total}</div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">
                                {stats.resoluciones.thisMonth} este mes
                            </span>
                            <div className={cn(
                                "flex items-center gap-0.5",
                                isPositiveChange(stats.resoluciones.change) 
                                    ? "text-green-600" 
                                    : "text-red-600"
                            )}>
                                {isPositiveChange(stats.resoluciones.change) ? (
                                    <IconTrendingUp className="h-3 w-3" />
                                ) : (
                                    <IconTrendingDown className="h-3 w-3" />
                                )}
                                <span>{Math.abs(parseFloat(stats.resoluciones.change))}%</span>
                            </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <IconCurrencyDollar className="h-3 w-3" />
                            <span>{stats.resoluciones.financiadas} financiadas</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Card Usuarios */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Usuarios Activos
                        </CardTitle>
                        <IconUsers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.usuarios.active}</div>
                        <p className="text-xs text-muted-foreground">
                            De {stats.usuarios.total} usuarios totales
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                            <IconTrendingUp className="h-3 w-3" />
                            <span>+{stats.usuarios.newThisMonth} nuevos este mes</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Card Tasa de Aprobación */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Tasa de Aprobación
                        </CardTitle>
                        <IconCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tasaAprobacion}%</div>
                        <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span>{totalAprobados} aprobados</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                <span>{totalPendientes} pendientes</span>
                            </div>
                        </div>
                        <Progress 
                            value={parseFloat(tasaAprobacion)} 
                            className="mt-2 h-1"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Gráficos */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Gráfico de líneas - Tendencia mensual */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <IconChartBar className="h-5 w-5" />
                            Tendencia Mensual
                        </CardTitle>
                        <CardDescription>
                            Documentos procesados en los últimos 6 meses
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData.monthly}>
                                <defs>
                                    <linearGradient id="colorConstancias" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorResoluciones" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis 
                                    dataKey="month" 
                                    className="text-xs"
                                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                />
                                <YAxis 
                                    className="text-xs"
                                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '6px'
                                    }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="constancias" 
                                    stroke="#8884d8" 
                                    fillOpacity={1} 
                                    fill="url(#colorConstancias)" 
                                    name="Constancias"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="resoluciones" 
                                    stroke="#82ca9d" 
                                    fillOpacity={1} 
                                    fill="url(#colorResoluciones)"
                                    name="Resoluciones" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Gráfico de pie - Resoluciones por modalidad */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <IconChartBar className="h-5 w-5" />
                            Resoluciones por Modalidad
                        </CardTitle>
                        <CardDescription>
                            Distribución según tipo de modalidad
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '6px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {pieData.map((item, index) => (
                                <div key={item.name} className="flex items-center gap-2 text-sm">
                                    <div 
                                        className="h-3 w-3 rounded-full" 
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
                                    <span className="text-muted-foreground">{item.name}</span>
                                    <span className="ml-auto font-medium">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actividad Reciente */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconActivity className="h-5 w-5" />
                        Actividad Reciente
                    </CardTitle>
                    <CardDescription>
                        Últimos documentos procesados en el sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity) => (
                                <div key={`${activity.type}-${activity.id}`} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "flex h-8 w-8 items-center justify-center rounded-lg",
                                            activity.type === 'constancia' 
                                                ? "bg-blue-100 dark:bg-blue-900/20" 
                                                : "bg-purple-100 dark:bg-purple-900/20"
                                        )}>
                                            {activity.type === 'constancia' ? (
                                                <IconFileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            ) : (
                                                <IconFiles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">
                                                {activity.type === 'constancia' ? 'Constancia' : 'Resolución'} #{activity.number}
                                            </p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {activity.title}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge 
                                            variant="secondary"
                                            className={cn(
                                                "text-xs",
                                                statusColors[activity.status]
                                            )}
                                        >
                                            {statusLabels[activity.status] || activity.status}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDateShort(new Date(activity.createdAt))}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No hay actividad reciente
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Resumen de Estado */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <IconClock className="h-4 w-4 text-yellow-600" />
                            Documentos Pendientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {totalPendientes}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                            <div>Constancias: {stats.constancias.pendientes}</div>
                            <div>Resoluciones: {stats.resoluciones.pendientes}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <IconCheck className="h-4 w-4 text-green-600" />
                            Documentos Aprobados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {totalAprobados}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                            <div>Constancias: {stats.constancias.aprobadas}</div>
                            <div>Resoluciones: {stats.resoluciones.aprobadas}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <IconCurrencyDollar className="h-4 w-4 text-blue-600" />
                            Proyectos Financiados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.resoluciones.financiadas}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                            De {stats.resoluciones.total} resoluciones totales
                        </div>
                        <Progress 
                            value={(stats.resoluciones.financiadas / stats.resoluciones.total) * 100} 
                            className="mt-2 h-1"
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}