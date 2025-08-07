"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getConstancias() {
    const session = await auth()
    
    if (!session) {
        throw new Error("No autorizado")
    }

    const constancias = await prisma.constancia.findMany({
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            approvedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return constancias
}

export async function revalidateConstancias() {
    revalidatePath("/documents/constancias")
}