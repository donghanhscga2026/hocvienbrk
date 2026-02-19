'use server'

import { z } from "zod"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function registerUser(prevState: any, formData: FormData) {
    const data = Object.fromEntries(formData.entries())

    const validatedFields = registerSchema.safeParse(data)

    if (!validatedFields.success) {
        return {
            message: "Invalid fields",
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const { name, email, phone, password } = validatedFields.data

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email },
                { phone }
            ]
        }
    })

    if (existingUser) {
        return {
            message: "User already exists with this email or phone number",
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        const { getNextAvailableId } = await import("@/lib/id-helper")
        const newId = await getNextAvailableId()

        await prisma.user.create({
            data: {
                id: newId, // Sử dụng ID đã tính toán (tránh số đẹp)
                name,
                email,
                phone,
                password: hashedPassword,
                role: Role.STUDENT,
            },
        })
    } catch (error) {
        console.error("Failed to create user:", error)
        return {
            message: "Database Error: Failed to create user. Please try again.",
        }
    }

    redirect('/login')
}
