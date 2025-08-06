"use client"

import { PermissionAction } from "@prisma/client"
import { usePermissions } from "@/hooks/use-permission"
import { Skeleton } from "@/components/ui/skeleton"

interface PermissionGuardProps {
    permission: string
    action?: PermissionAction
    children: React.ReactNode
    fallback?: React.ReactNode
    showLoading?: boolean
}

export function PermissionGuard({
    permission,
    action,
    children,
    fallback = null,
    showLoading = false
}: PermissionGuardProps) {
    const { hasPermission, isLoading } = usePermissions()

    const hasAccess = hasPermission(permission, action)

    if (isLoading && showLoading) {
        return <Skeleton className="h-10 w-full" />
    }

    if (!hasAccess) {
        return <>{fallback}</>
    }

    return <>{children}</>
}

interface MultiPermissionGuardProps {
    permissions: string[]
    action?: PermissionAction
    requireAll?: boolean
    children: React.ReactNode
    fallback?: React.ReactNode
    showLoading?: boolean
}

export function MultiPermissionGuard({
    permissions,
    action,
    requireAll = false,
    children,
    fallback = null,
    showLoading = false
}: MultiPermissionGuardProps) {
    const { hasAllPermissions, hasAnyPermission, isLoading } = usePermissions()

    const hasAccess = requireAll
        ? hasAllPermissions(permissions, action)
        : hasAnyPermission(permissions, action)

    if (isLoading && showLoading) {
        return <Skeleton className="h-10 w-full" />
    }

    if (!hasAccess) {
        return <>{fallback}</>
    }

    return <>{children}</>
}