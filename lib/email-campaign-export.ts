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

function escapeCsv(val: string): string {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export interface ExportResult {
  sheetUrl?: string;
  csvContent: string;
  fileName: string;
  totalRows: number;
}

export async function exportCampaignToSheet(campaignId: number, campaignTitle: string, statusFilter?: string): Promise<ExportResult | null> {
  const where: any = { campaignId };
  if (statusFilter) where.status = statusFilter;

  const logs = await prisma.emailCampaignLog.findMany({
    where,
    select: { toEmail: true, status: true, errorType: true, errorCode: true },
  });

  if (logs.length === 0) return null;

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

  const safeTitle = campaignTitle.replace(/[<>:"/\\|?*]/g, "").substring(0, 90);
  const dateStr = new Date().toLocaleDateString("vi-VN").replace(/\//g, "-");
  const fileName = `EmailCampaign_${safeTitle}_${dateStr}`;

  const csvHeader = headers.join(",");
  const csvRows = rows.map(r => r.map(escapeCsv).join(","));
  const csvContent = [csvHeader, ...csvRows].join("\n");

  // Thử tạo Google Sheet với từng sender, fallback sang main token
  const sheetUrl = await tryCreateSheet(rows, headers, safeTitle);

  return { sheetUrl, csvContent, fileName, totalRows: rows.length };
}

async function tryCreateSheet(rows: string[][], headers: string[], safeTitle: string): Promise<string | undefined> {
  try {
    const senders = await prisma.emailSender.findMany({ where: { isActive: true } });
    for (const sender of senders) {
      try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: tryDecrypt(sender.refreshToken) });
        const sheets = google.sheets({ version: "v4", auth: oauth2Client });
        return await doCreateSheet(sheets, rows, headers, safeTitle);
      } catch {
        continue;
      }
    }

    // Fallback: thử dùng main GMAIL_REFRESH_TOKEN
    const mainRt = process.env.GMAIL_REFRESH_TOKEN;
    if (mainRt) {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({ refresh_token: mainRt });
      const sheets = google.sheets({ version: "v4", auth: oauth2Client });
      return await doCreateSheet(sheets, rows, headers, safeTitle);
    }
  } catch {
    // All failed
  }
  return undefined;
}

async function doCreateSheet(sheets: any, rows: string[][], headers: string[], safeTitle: string): Promise<string> {
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
}
