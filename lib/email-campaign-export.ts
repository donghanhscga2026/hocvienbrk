import prisma from "@/lib/prisma";
import { getOAuth2Client } from "@/lib/google-auth";
import { tryDecrypt } from "@/lib/email-encryptor";
import { google } from "googleapis";

const STATUS_LABELS: Record<string, string> = {
  SENT: "Đã gửi",
  FAILED: "Thất bại",
  SKIPPED: "Bỏ qua",
  BOUNCED: "Bounce",
};

export async function exportCampaignToSheet(campaignId: number, campaignTitle: string, statusFilter?: string): Promise<string | null> {
  try {
    const where: any = { campaignId };
    if (statusFilter) where.status = statusFilter;

    const logs = await prisma.emailCampaignLog.findMany({
      where,
      select: { toEmail: true, status: true, errorType: true, errorCode: true, sentAt: true },
      orderBy: { sentAt: "asc" },
    });

    if (logs.length === 0) {
      console.log("[CampaignExport] Không có log nào để export");
      return null;
    }

    const emails = [...new Set(logs.map(l => l.toEmail.toLowerCase()))];

    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, name: true, email: true, phone: true, affiliateCode: true },
    });
    const userMap = new Map(users.map(u => [u.email.toLowerCase(), u]));

    const logMap = new Map<string, { status: string; error: string }>();
    for (const log of logs) {
      const key = log.toEmail.toLowerCase();
      const error = [log.errorType, log.errorCode].filter(Boolean).join(" - ");
      if (!logMap.has(key)) {
        logMap.set(key, { status: STATUS_LABELS[log.status] || log.status, error });
      }
    }

    const headers = ["STT", "User ID", "Họ tên", "Email", "Số điện thoại", "Mã giới thiệu", "Trạng thái", "Lỗi"];
    const rows = [...logMap.entries()].map(([email, info], index) => {
      const user = userMap.get(email);
      return [
        (index + 1).toString(),
        user?.id?.toString() || "",
        user?.name || "",
        email,
        user?.phone || "",
        user?.affiliateCode || "",
        info.status,
        info.error,
      ];
    });

    const sender = await prisma.emailSender.findFirst({ where: { isActive: true } });
    if (!sender) {
      console.warn("[CampaignExport] Không tìm thấy EmailSender active để lấy OAuth");
      return null;
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: tryDecrypt(sender.refreshToken) });
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    const safeTitle = campaignTitle.replace(/[<>:"/\\|?*]/g, "").substring(0, 90);
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `[Email Campaign] ${safeTitle} - ${new Date().toLocaleDateString("vi-VN")}`,
        },
      },
    });

    const spreadsheetId = createResponse.data.spreadsheetId;
    if (!spreadsheetId) throw new Error("Không thể tạo Google Sheet");

    const values = [headers, ...rows];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      requestBody: { values },
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            autoResizeDimensions: {
              dimensions: { dimension: "COLUMNS", startIndex: 0, endIndex: headers.length },
            },
          },
        ],
      },
    });

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    console.log(`[CampaignExport] ✅ Đã tạo Google Sheet: ${sheetUrl}`);
    return sheetUrl;

  } catch (error) {
    console.error("[CampaignExport] Lỗi export campaign:", error);
    return null;
  }
}
