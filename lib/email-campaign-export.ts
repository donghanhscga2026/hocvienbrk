import prisma from "@/lib/prisma";
import { getOAuth2Client } from "@/lib/google-auth";
import { tryDecrypt } from "@/lib/email-encryptor";
import { google } from "googleapis";

function getServiceAccountAuth() {
  const keyJson = process.env.GOOGLE_SHEETS_SERVICE_KEY;
  if (!keyJson) return null;
  try {
    const key = JSON.parse(keyJson);
    const auth = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return auth;
  } catch (e) {
    console.error('[CampaignExport] Service account auth failed:', e);
    return null;
  }
}

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
  sheetError?: string;
}

export async function exportCampaignToSheet(campaignId: number, campaignTitle: string, statusFilter?: string): Promise<ExportResult | null> {
  const where: any = { campaignId };
  if (statusFilter === "ERRORS") {
    where.status = { in: ["FAILED", "BOUNCED", "SKIPPED"] };
  } else if (statusFilter) {
    where.status = statusFilter;
  }

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
  const { sheetUrl, error } = await tryCreateSheet(rows, headers, safeTitle);

  return { sheetUrl, csvContent, fileName, totalRows: rows.length, sheetError: error };
}

async function tryCreateSheet(rows: string[][], headers: string[], safeTitle: string): Promise<{ sheetUrl?: string; error?: string }> {
  // Thử Service Account trước — không expire, không cần re-auth
  const saAuth = getServiceAccountAuth();
  if (saAuth) {
    try {
      const sheets = google.sheets({ version: "v4", auth: saAuth });
      const url = await doCreateSheet(sheets, rows, headers, safeTitle);
      return { sheetUrl: url };
    } catch (err: any) {
      console.warn(`[CampaignExport] Service account thất bại: ${err.message}. Fallback sang OAuth...`);
    }
  }

  const errors: string[] = [];

  try {
    const senders = await prisma.emailSender.findMany({ where: { isActive: true, provider: 'gmail' } });
    for (const sender of senders) {
      if (!sender.refreshToken) continue;
      try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: tryDecrypt(sender.refreshToken) });
        const sheets = google.sheets({ version: "v4", auth: oauth2Client });
        const url = await doCreateSheet(sheets, rows, headers, safeTitle);
        return { sheetUrl: url };
      } catch (err: any) {
        const msg = `Sender #${sender.id} ${sender.email}: ${err.message}`;
        console.error(`[CampaignExport] ${msg}`);
        errors.push(msg);
        continue;
      }
    }

    const mainRt = process.env.GMAIL_REFRESH_TOKEN;
    if (mainRt) {
      try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: mainRt });
        const sheets = google.sheets({ version: "v4", auth: oauth2Client });
        const url = await doCreateSheet(sheets, rows, headers, safeTitle);
        return { sheetUrl: url };
      } catch (err: any) {
        const msg = `Main token: ${err.message}`;
        console.error(`[CampaignExport] ${msg}`);
        errors.push(msg);
      }
    }
  } catch (err: any) {
    const msg = `tryCreateSheet: ${err.message}`;
    console.error(`[CampaignExport] ${msg}`);
    errors.push(msg);
  }

  return { error: errors.join(" | ") };
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

  // Lấy sheetId và title của sheet đầu tiên (locale VN tạo "Trang tính1" thay vì "Sheet1")
  const firstSheet = createResponse.data.sheets?.[0];
  const firstSheetId = firstSheet?.properties?.sheetId || 0;
  const firstSheetTitle = firstSheet?.properties?.title || "Sheet1";
  let targetRange = `${firstSheetTitle}!A1`;

  // Thử rename sheet sang "Data" cho đẹp
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          updateSheetProperties: {
            properties: { sheetId: firstSheetId, title: "Data" },
            fields: "title",
          },
        }],
      },
    });
    targetRange = "Data!A1";
  } catch (err: any) {
    console.warn(`[CampaignExport] Không thể rename sheet: ${err.message}. Sẽ dùng tên gốc: ${firstSheetTitle}`);
  }

  const values = [headers, ...rows];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: targetRange,
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

  // Thêm quyền public cho bất kỳ ai có link (reader) để admin không bị chặn access
  try {
    const drive = google.drive({ version: "v3", auth: sheets.context._options.auth });
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
    console.log(`[CampaignExport] 🔓 Đã mở quyền truy cập công khai cho Sheet: ${spreadsheetId}`);
  } catch (err: any) {
    console.error(`[CampaignExport] Không thể mở quyền truy cập: ${err.message}`);
  }

  console.log(`[CampaignExport] ✅ Đã tạo Google Sheet: ${sheetUrl}`);
  return sheetUrl;
}
