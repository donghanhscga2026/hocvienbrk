import prisma from "@/lib/prisma"

export async function resolveRefToUserId(refCode: string): Promise<number> {
  try {
    // 1. Tìm trong AffiliateRef (custom aliases)
    const customRef = await prisma.affiliateRef.findUnique({
      where: { refKey: refCode.toLowerCase() },
    })
    if (customRef) return customRef.userId

    // 2. Thử parse as number (direct user ID)
    const numericId = parseInt(refCode, 10)
    if (!isNaN(numericId) && numericId > 0) {
      const userById = await prisma.user.findUnique({
        where: { id: numericId },
        select: { id: true },
      })
      if (userById) return numericId
    }

    // 3. Tìm trong User theo affiliateCode
    const userByCode = await prisma.user.findUnique({
      where: { affiliateCode: refCode.toUpperCase() },
      select: { id: true },
    })
    if (userByCode) return userByCode.id

    return 0
  } catch {
    return 0
  }
}
