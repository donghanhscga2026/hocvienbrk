import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { sendToolShareClickNotification } from "@/lib/notifications"

async function resolveRefToUserId(ref: string): Promise<number | null> {
  // 1. Tìm trong AffiliateRef (custom aliases)
  const customRef = await prisma.affiliateRef.findUnique({
    where: { refKey: ref.toLowerCase() }
  })
  if (customRef) return customRef.userId

  // 2. Parse as number (direct user ID)
  const numericId = parseInt(ref, 10)
  if (!isNaN(numericId) && numericId > 0) {
    const user = await prisma.user.findUnique({ where: { id: numericId } })
    if (user) return numericId
  }

  // 3. Tìm theo affiliateCode
  const userByCode = await prisma.user.findUnique({
    where: { affiliateCode: ref.toUpperCase() }
  })
  if (userByCode) return userByCode.id

  return null
}

async function getOrCreateDefaultLink(userId: number) {
  const userIdStr = userId.toString()
  
  // Tìm link mặc định với code = userId
  let link = await prisma.affiliateLink.findFirst({
    where: { 
      userId,
      code: userIdStr,
      name: "Default Tool Share"
    }
  })

  if (!link) {
    // Tìm campaign mặc định
    let campaign = await prisma.affiliateCampaign.findFirst({
      where: { isDefault: true },
      include: { levels: true }
    })

    if (!campaign) {
      // Tạo campaign mặc định với levels
      campaign = await prisma.affiliateCampaign.create({
        data: {
          name: "Default Campaign",
          slug: "default-campaign",
          isDefault: true,
          isActive: true,
          maxLevels: 3,
          pendingDays: 7,
          minPayout: 100000,
          taxRate: 0,
          feeAmount: 0,
          pointsPerRegistration: 1,
          pointsRequired: 10,
          pointRedemptionValue: 1000,
          autoRedeem: false,
          levels: {
            create: [
              { level: 1, percentage: 10.0 },
              { level: 2, percentage: 5.0 },
              { level: 3, percentage: 2.0 },
            ]
          }
        },
        include: { levels: true }
      })
    }

    link = await prisma.affiliateLink.create({
      data: {
        userId,
        campaignId: campaign.id,
        code: userIdStr,
        name: "Default Tool Share",
        source: "TOOL_SHARE",
      }
    })
  }

  return link
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const url = searchParams.get("url")
    
    // Parse body for additional params
    let body: { landing?: string; campaignId?: number; ref?: string } = {}
    try {
      const text = await request.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch {
      // Ignore JSON parse errors
    }
    
    const landingSlug = body.landing || searchParams.get("landing")
    const campaignId = body.campaignId ? parseInt(String(body.campaignId)) : undefined
    const refKey = body.ref || code

    if (!refKey) {
      return NextResponse.json({ error: "Missing ref parameter" }, { status: 400 })
    }

    // Resolve ref to userId
    const userId = await resolveRefToUserId(refKey)
    if (!userId) {
      return NextResponse.json({ error: "Invalid ref - user not found" }, { status: 404 })
    }

    // Get or create default link for this user
    const link = await getOrCreateDefaultLink(userId)

    // Validate landing slug if provided
    let landingId: number | undefined
    if (landingSlug) {
      const landing = await prisma.landingPage.findUnique({
        where: { slug: landingSlug }
      })
      if (landing) {
        landingId = landing.id
      }
    }

    // Lấy thông tin từ request
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const userAgent = request.headers.get("user-agent") || ""
    const referer = request.headers.get("referer") || ""
    
    // Parse UTM params từ url
    const urlObj = new URL(url || "http://localhost")
    const utmSource = urlObj.searchParams.get("utm_source") || undefined
    const utmMedium = urlObj.searchParams.get("utm_medium") || undefined
    const utmCampaign = urlObj.searchParams.get("utm_campaign") || undefined

    // Xác định device type
    let deviceType = "desktop"
    if (/mobile/i.test(userAgent)) {
      deviceType = "mobile"
    } else if (/tablet|ipad/i.test(userAgent)) {
      deviceType = "tablet"
    }

    // Ghi nhận click với landing info
    const click = await prisma.affiliateClick.create({
      data: {
        linkId: link.id,
        ipAddress,
        userAgent,
        referer,
        url: url || "",
        utmSource,
        utmMedium,
        utmCampaign,
        deviceType,
        landingSlug: landingSlug || null,
        landingId: landingId
      }
    })

    // Increment landing click count if applicable
    if (landingId) {
      prisma.landingPage.update({
        where: { id: landingId },
        data: { clickCount: { increment: 1 } }
      }).catch(console.error)
    }

    // Gửi Telegram notification
    sendToolShareClickNotification({
      refUserId: userId,
      url: url || "",
      deviceType,
      referer: referer || null,
      ipAddress,
      city: null,
    }).catch(console.error)

    return NextResponse.json({
      success: true,
      clickId: click.id,
      linkId: link.id,
      userId: userId,
      landing: landingSlug || null
    })

  } catch (error) {
    console.error("[Track] Click error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// GET: Lấy thống kê click cho một link
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const landing = searchParams.get("landing")

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 })
    }

    const link = await prisma.affiliateLink.findUnique({
      where: { code },
      include: {
        clicks: {
          where: landing ? { landingSlug: landing } : undefined,
          orderBy: { createdAt: "desc" },
          take: 100
        },
        _count: {
          select: { clicks: true, conversions: true }
        }
      }
    })

    if (!link) {
      return NextResponse.json({ error: "Invalid code" }, { status: 404 })
    }

    // Thống kê theo ngày (7 ngày gần nhất)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentClicks = await prisma.affiliateClick.count({
      where: {
        linkId: link.id,
        createdAt: { gte: sevenDaysAgo },
        ...(landing ? { landingSlug: landing } : {})
      }
    })

    // Thống kê theo landing
    const landingStats = await prisma.affiliateClick.groupBy({
      by: ['landingSlug'],
      where: {
        linkId: link.id,
        landingSlug: { not: null }
      },
      _count: true
    })

    return NextResponse.json({
      link: {
        id: link.id,
        code: link.code,
        name: link.name,
        isActive: link.isActive
      },
      stats: {
        totalClicks: link._count.clicks,
        recentClicks,
        conversions: link._count.conversions,
        conversionRate: link._count.clicks > 0 
          ? ((link._count.conversions / link._count.clicks) * 100).toFixed(2) + "%"
          : "0%"
      },
      landingStats: landingStats.map(stat => ({
        landingSlug: stat.landingSlug,
        clicks: stat._count
      }))
    })

  } catch (error) {
    console.error("[Track] Stats error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
