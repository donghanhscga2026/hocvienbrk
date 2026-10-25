import prisma from "@/lib/prisma"
import { MIN_DIRECT_RATE } from "@/lib/affiliate/config-rules"

/**
 * Tự sinh cấu hình affiliate mặc định cho khóa học thu phí ngay khi khóa
 * được tạo (Gói "khép lệch mô hình", 25/10/2026).
 *
 * Trước đây khóa mới không có ProductAffiliateConfig → engine hoa hồng
 * (lib/affiliate/unified-commission.ts) bỏ qua hoa hồng trực tiếp một cách
 * lặng lẽ, CTV quảng bá khóa đó mất hoa hồng mà không ai biết. Nay mọi khóa
 * có phi_coc > 0 đều có sẵn cấu hình ở mức sàn MIN_DIRECT_RATE đang bật;
 * giảng viên/admin chỉnh tỷ lệ cao hơn trong /tools/affiliate/config.
 *
 * Không bao giờ ghi đè cấu hình đã tồn tại (update: {}), và lỗi ở đây
 * không được làm hỏng việc tạo khóa — chỉ ghi log.
 */
export async function ensureDefaultAffiliateConfig(
  courseId: number,
  listedPrice: number,
  createdBy?: number | null
): Promise<void> {
  if (!courseId || !listedPrice || listedPrice <= 0) return
  try {
    await prisma.productAffiliateConfig.upsert({
      where: {
        productType_productId: { productType: "COURSE", productId: courseId },
      },
      create: {
        productType: "COURSE",
        productId: courseId,
        directRate: MIN_DIRECT_RATE,
        isActive: true,
        createdBy: createdBy ?? null,
      },
      update: {},
    })
  } catch (err) {
    console.error("[Affiliate] ensureDefaultAffiliateConfig failed:", err)
  }
}
