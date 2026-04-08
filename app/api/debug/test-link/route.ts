import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const campaign = await prisma.affiliateCampaign.findFirst({
      where: { slug: 'default', isActive: true }
    })
    
    const link = await prisma.affiliateLink.findFirst({
      where: { userId: 0 } // test with userId 0
    })
    
    return NextResponse.json({ 
      campaignFound: campaign,
      linkFound: link,
      campaignIsDefault: campaign?.isDefault 
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}