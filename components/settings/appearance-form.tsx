"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface UserPreferences {
    theme: string
    radius: number
    primaryColor: string
    accentColor: string
    fontSize: string
    reducedMotion: boolean
    highContrast: boolean
}

interface AppearanceFormProps {
    userId: string
    initialPreferences: UserPreferences
}

export function AppearanceForm({ userId, initialPreferences }: AppearanceFormProps) {
    const router = useRouter()
    const [preferences, setPreferences] = useState(initialPreferences)
    const [saving, setSaving] = useState(false)

    // Aplicar cambios en tiempo real
    const updatePreference = <K extends keyof UserPreferences>(
        key: K,
        value: UserPreferences[K]
    ) => {
        setPreferences({ ...preferences, [key]: value })

        // Aplicar cambios visuales inmediatamente
        if (key === "primaryColor" || key === "accentColor") {
            applyColorChange(key, value as string)
        } else if (key === "radius") {
            document.documentElement.style.setProperty('--radius', `${value}rem`)
        }
    }

    const applyColorChange = (type: string, hue: string) => {
        const root = document.documentElement.style
        if (type === "primaryColor") {
            root.setProperty('--primary', `oklch(0.637 0.237 ${hue})`)
            root.setProperty('--ring', `oklch(0.637 0.237 ${hue})`)
            root.setProperty('--sidebar-primary', `oklch(0.637 0.237 ${hue})`)
        } else if (type === "accentColor") {
            root.setProperty('--accent', `oklch(0.967 0.001 ${hue})`)
            root.setProperty('--sidebar-accent', `oklch(0.967 0.001 ${hue})`)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const response = await fetch("/api/user/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, preferences })
            })

            if (response.ok) {
                router.refresh()
            }
        } catch (error) {
            console.error("Error saving preferences:", error)
        }
        setSaving(false)
    }

    return (
        <div className="w-full space-y-6 px-4 sm:px-0">
            <Tabs defaultValue="theme" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="theme">Tema</TabsTrigger>
                    <TabsTrigger value="colors">Colores</TabsTrigger>
                    <TabsTrigger value="accessibility" className="text-xs sm:text-sm">Accesibilidad</TabsTrigger>
                </TabsList>

                <TabsContent value="theme" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base sm:text-lg">Tema de la aplicación</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Selecciona cómo quieres que se vea tu aplicación
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="theme-select">Tema</Label>
                                <Select
                                    value={preferences.theme}
                                    onValueChange={(value) => updatePreference("theme", value)}
                                >
                                    <SelectTrigger id="theme-select" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="light">Claro</SelectItem>
                                        <SelectItem value="dark">Oscuro</SelectItem>
                                        <SelectItem value="system">Sistema</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="radius-slider">Radio de bordes</Label>
                                <div className="flex items-center gap-4">
                                    <Slider
                                        id="radius-slider"
                                        value={[preferences.radius]}
                                        onValueChange={([value]) => updatePreference("radius", value)}
                                        min={0}
                                        max={1}
                                        step={0.125}
                                        className="flex-1"
                                    />
                                    <span className="w-12 text-right text-sm text-muted-foreground">
                                        {preferences.radius}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="colors" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base sm:text-lg">Personalización de colores</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Ajusta los colores principales de tu interfaz
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label htmlFor="primary-color">Color primario</Label>
                                <div className="flex items-center gap-4">
                                    <input
                                        id="primary-color"
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={preferences.primaryColor}
                                        onChange={(e) => updatePreference("primaryColor", e.target.value)}
                                        className="flex-1"
                                    />
                                    <div
                                        className="h-10 w-10 flex-shrink-0 rounded-md border"
                                        style={{
                                            backgroundColor: `oklch(0.637 0.237 ${preferences.primaryColor})`
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="accent-color">Color de acento</Label>
                                <div className="flex items-center gap-4">
                                    <input
                                        id="accent-color"
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={preferences.accentColor}
                                        onChange={(e) => updatePreference("accentColor", e.target.value)}
                                        className="flex-1"
                                    />
                                    <div
                                        className="h-10 w-10 flex-shrink-0 rounded-md border"
                                        style={{
                                            backgroundColor: `oklch(0.967 0.001 ${preferences.accentColor})`
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Colores predefinidos</Label>
                                <div className="grid grid-cols-5 gap-2">
                                    {[25, 149, 200, 260, 320].map((hue) => (
                                        <Button
                                            key={hue}
                                            variant="outline"
                                            className="h-10 w-full p-0 sm:h-12"
                                            style={{
                                                backgroundColor: `oklch(0.637 0.237 ${hue})`
                                            }}
                                            onClick={() => updatePreference("primaryColor", String(hue))}
                                        />
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="accessibility" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base sm:text-lg">Opciones de accesibilidad</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Ajusta la aplicación para mejorar tu experiencia
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                    <Label htmlFor="reduced-motion" className="text-sm font-medium">
                                        Reducir movimiento
                                    </Label>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        Reduce las animaciones en la interfaz
                                    </p>
                                </div>
                                <Switch
                                    id="reduced-motion"
                                    checked={preferences.reducedMotion}
                                    onCheckedChange={(checked) => updatePreference("reducedMotion", checked)}
                                />
                            </div>

                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                    <Label htmlFor="high-contrast" className="text-sm font-medium">
                                        Alto contraste
                                    </Label>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        Aumenta el contraste para mejor visibilidad
                                    </p>
                                </div>
                                <Switch
                                    id="high-contrast"
                                    checked={preferences.highContrast}
                                    onCheckedChange={(checked) => updatePreference("highContrast", checked)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="font-size">Tamaño de fuente</Label>
                                <Select
                                    value={preferences.fontSize}
                                    onValueChange={(value) => updatePreference("fontSize", value)}
                                >
                                    <SelectTrigger id="font-size" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sm">Pequeño</SelectItem>
                                        <SelectItem value="default">Normal</SelectItem>
                                        <SelectItem value="lg">Grande</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="w-full sm:w-auto"
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full sm:w-auto"
                >
                    {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
            </div>
        </div>
    )
}