'use server'

import prisma from "@/lib/prisma"

export async function getRandomMessage() {
    const count = await prisma.message.count({ 
        where: { isActive: true } 
    })
    
    if (count === 0) return null
    
    const random = Math.floor(Math.random() * count)
    return await prisma.message.findFirst({
        where: { isActive: true },
        skip: random
    })
}

export async function getAllMessages() {
    return await prisma.message.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
    })
}
