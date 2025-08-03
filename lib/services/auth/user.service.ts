// lib/services/auth/user.service.ts
import { prisma } from "@/lib/prisma"

export async function getUserPreferences(userId: string) {
    return await prisma.userPreferences.findUnique({
        where: { userId }
    })
}

import type { Prisma } from "@prisma/client";

export async function updateUserPreferences(userId: string, data: Prisma.UserPreferencesUpdateInput) {
    return await prisma.userPreferences.update({
        where: { userId },
        data
    })
}

