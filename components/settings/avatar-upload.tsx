"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Camera, 
    Upload, 
    Trash2, 
    User,
    Loader2
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface AvatarUploadProps {
    currentImage?: string | null
    userName?: string | null
    userId: string
    onImageUpdate?: (newImage: string | null) => void
}

export function AvatarUpload({ 
    currentImage, 
    userName, 
    userId,
    onImageUpdate 
}: AvatarUploadProps) {
    const [image, setImage] = React.useState(currentImage)
    const [isUploading, setIsUploading] = React.useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Obtener las iniciales del nombre
    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U"
        const parts = name.split(" ")
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        }
        return name.substring(0, 2).toUpperCase()
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validar tipo de archivo
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            toast.error("Solo se permiten imágenes JPG, JPEG, PNG o WEBP")
            return
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("La imagen no debe superar los 5MB")
            return
        }

        // Subir la imagen
        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append("file", file)

            const response = await fetch("/api/user/avatar", {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Error al subir la imagen")
            }

            const data = await response.json()
            setImage(data.user.image)
            toast.success("Foto de perfil actualizada exitosamente")
            
            // Llamar al callback si existe
            if (onImageUpdate) {
                onImageUpdate(data.user.image)
            }

            // Limpiar el input
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al subir la imagen")
        } finally {
            setIsUploading(false)
        }
    }

    const handleDelete = async () => {
        setIsUploading(true)
        try {
            const response = await fetch("/api/user/avatar", {
                method: "DELETE",
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Error al eliminar la imagen")
            }

            setImage(null)
            toast.success("Foto de perfil eliminada exitosamente")
            
            // Llamar al callback si existe
            if (onImageUpdate) {
                onImageUpdate(null)
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al eliminar la imagen")
        } finally {
            setIsUploading(false)
            setShowDeleteDialog(false)
        }
    }

    return (
        <div className="space-y-4">
            <Label>Foto de Perfil</Label>
            <div className="flex items-center gap-6">
                {/* Avatar Preview */}
                <div className="relative">
                    <Avatar className="h-24 w-24">
                        <AvatarImage 
                            src={image || undefined} 
                            alt={userName || "Avatar"} 
                        />
                        <AvatarFallback className="text-lg">
                            {getInitials(userName)}
                        </AvatarFallback>
                    </Avatar>
                    {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                            <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                    )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleFileSelect}
                            disabled={isUploading}
                            className="hidden"
                            id="avatar-upload"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex items-center gap-2"
                        >
                            {image ? (
                                <>
                                    <Camera className="h-4 w-4" />
                                    Cambiar foto
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Subir foto
                                </>
                            )}
                        </Button>
                        {image && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDeleteDialog(true)}
                                disabled={isUploading}
                                className="flex items-center gap-2 text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                            </Button>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        JPG, JPEG, PNG o WEBP. Máximo 5MB.
                    </p>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar foto de perfil?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará tu foto de perfil actual. 
                            Se mostrará tu inicial en su lugar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isUploading}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isUploading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                "Eliminar"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}