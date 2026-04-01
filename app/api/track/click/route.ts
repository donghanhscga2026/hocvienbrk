import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const url = searchParams.get("url")

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 })
    }

    // Tìm link affiliate
    const link = await prisma.affiliateLink.findUnique({
      where: { code },
      include: { campaign: true }
    })

    if (!link || !link.isActive) {
      return NextResponse.json({ error: "Invalid code" }, { status: 404 })
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

    // Ghi nhận click
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
        deviceType
      }
    })

    return NextResponse.json({
      success: true,
      clickId: click.id,
      linkId: link.id
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

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 })
    }

    const link = await prisma.affiliateLink.findUnique({
      where: { code },
      include: {
        clicks: {
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
        createdAt: { gte: sevenDaysAgo }
      }
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
      }
    })

  } catch (error) {
    console.error("[Track] Stats error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
