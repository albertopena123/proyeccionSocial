"use client"

import { useSession } from "next-auth/react"
import { PermissionAction } from "@prisma/client"
import { useEffect, useState } from "react"

interface Permission {
    id: string
    code: string
    actions: PermissionAction[]
}

interface UserPermission {
    permission: Permission
}

export function usePermission(permissionCode: string, action?: PermissionAction) {
    const { data: session } = useSession()
    const [hasPermission, setHasPermission] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!session?.user) {
            setHasPermission(false)
            setIsLoading(false)
            return
        }

        // Verificar si el usuario tiene el permiso
        const checkPermission = async () => {
            try {
                const response = await fetch('/api/permissions/check', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        permissionCode,
                        action
                    })
                })

                if (response.ok) {
                    const data = await response.json()
                    setHasPermission(data.hasPermission)
                } else {
                    setHasPermission(false)
                }
            } catch (error) {
                console.error('Error checking permission:', error)
                setHasPermission(false)
            } finally {
                setIsLoading(false)
            }
        }

        checkPermission()
    }, [session, permissionCode, action])

    return { hasPermission, isLoading }
}

export function usePermissions() {
    const { data: session } = useSession()
    const [permissions, setPermissions] = useState<Permission[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!session?.user) {
            setPermissions([])
            setIsLoading(false)
            return
        }

        const fetchPermissions = async () => {
            try {
                const response = await fetch('/api/permissions/user')
                if (response.ok) {
                    const data = await response.json()
                    setPermissions(data.permissions.map((up: UserPermission) => up.permission))
                }
            } catch (error) {
                console.error('Error fetching permissions:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchPermissions()
    }, [session])

    const hasPermission = (code: string, action?: PermissionAction) => {
        const permission = permissions.find(p => p.code === code)
        if (!permission) return false
        if (!action) return true
        return permission.actions.includes(action)
    }

    const hasAnyPermission = (codes: string[], action?: PermissionAction) => {
        return codes.some(code => hasPermission(code, action))
    }

    const hasAllPermissions = (codes: string[], action?: PermissionAction) => {
        return codes.every(code => hasPermission(code, action))
    }

    return {
        permissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isLoading
    }
}