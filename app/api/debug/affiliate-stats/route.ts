import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const [
      links,
      clicks,
      commissions,
      wallet,
      points,
      users
    ] = await Promise.all([
      prisma.affiliateLink.findMany({ take: 50 }),
      prisma.affiliateClick.count(),
      prisma.affiliateCommission.findMany({ take: 20 }),
      prisma.affiliateWallet.findMany(),
      prisma.registrationPoint.findMany({ take: 20 }),
      prisma.user.findMany({ 
        where: { role: 'AFFILIATE' },
        take: 10
      })
    ])
    
    return NextResponse.json({
      linksCount: links.length,
      clicksCount: clicks,
      commissionsCount: commissions.length,
      walletsCount: wallet.length,
      pointsCount: points.length,
      affiliateUsersCount: users.length,
      sampleLinks: links.slice(0, 10),
      sampleWallet: wallet.slice(0, 5)
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}