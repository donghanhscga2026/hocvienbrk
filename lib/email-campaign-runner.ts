import prisma from "@/lib/prisma";
import { getOAuth2Client } from "@/lib/google-auth";
import { decrypt } from "@/lib/email-encryptor";
import { spinContent } from "@/lib/email-spin";
import { google } from "googleapis";

export interface Recipient {
  email: string;
  name?: string;
  userId?: number;
}

/**
 * Gửi 1 email duy nhất từ 1 sender cụ thể 
 */ 
export async function sendGmailFromSender( 
  sender: { email: string; refreshToken: string }, 
  to: string, 
  subject: string, 
  html: string 
) { 
  const oauth2Client = getOAuth2Client(); 
  oauth2Client.setCredentials({ 
    refresh_token: decrypt(sender.refreshToken), 
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const fromName = 'Học Viện BRK';

  const encodeHeader = (str: string) => { 
    if (!str) return ""; 
    const cleanStr = str.replace(/[\r\n]/g, " ").trim(); 
    const base64 = Buffer.from(cleanStr, 'utf-8').toString("base64");
    return `=?UTF-8?B?${base64}?=`;
  };

  // TÌM VÀ TRÍCH XUẤT ẢNH BASE64 TỪ NỘI DUNG HTML
  // Chuyển đổi từ <img src="data:image..."> sang <img src="cid:image_n">
  const images: { cid: string, base64: string, type: string }[] = [];
  let updatedHtml = html;
  
  const imgRegex = /<img[^>]*src="(data:(image\/[^;]+);base64,([^">]+))"[^>]*>/g;
  let match;
  let imgCount = 0;
  
  while ((match = imgRegex.exec(html)) !== null) {
    imgCount++;
    const fullTag = match[0];
    const dataUri = match[1];
    const mimeType = match[2];
    const base64Data = match[3];
    const cid = `img_${imgCount}@brk.academy`;
    
    images.push({ cid, base64: base64Data, type: mimeType });
    
    // Thay thế URL data bằng CID trong HTML
    const newTag = fullTag.replace(dataUri, `cid:${cid}`);
    updatedHtml = updatedHtml.replace(fullTag, newTag);
  }

  const boundary = `----=_Part_${Math.random().toString(36).substring(2)}`;

  // KHỞI TẠO CẤU TRÚC MULTIPART/RELATED (Dành cho Email có nội dung kèm ảnh nội khối)
  const messageParts = [
    `From: "${encodeHeader(fromName)}" <${sender.email}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/related; boundary="${boundary}"`,
    `Date: ${new Date().toUTCString()}`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(updatedHtml, 'utf-8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || '',
  ];

  // CHÈN CÁC PHẦN ĐÍNH KÈM ẢNH (INLINE ATTACHMENTS)
  for (const img of images) {
    messageParts.push(
      `--${boundary}`,
      `Content-Type: ${img.type}`,
      `Content-Transfer-Encoding: base64`,
      `Content-ID: <${img.cid}>`,
      `Content-Disposition: inline; filename="${img.cid}"`,
      ``,
      img.base64.match(/.{1,76}/g)?.join('\r\n') || ''
    );
  }

  messageParts.push(`--${boundary}--`);

  const rawMessage = messageParts.join('\r\n');

  const encodedMessage = Buffer.from(rawMessage, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({ 
    userId: 'me', 
    requestBody: { raw: encodedMessage }, 
  }); 
}


/**
 * Lấy danh sách người nhận dựa trên cấu hình Campaign
 */
export async function resolveRecipients(campaignId: number): Promise<Recipient[]> {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) return [];

  if (campaign.recipientSource === "CSV" || campaign.recipientSource === "SELECTED_LIST" || campaign.recipientSource === "GOOGLE_SHEET") {
    // Giả định recipientCsvData là chuỗi JSON mảng [{email, name, userId}]
    return JSON.parse(campaign.recipientCsvData || "[]");
  }

  if (campaign.recipientSource === "DB_ALL") {
    const users = await prisma.user.findMany({
      select: { email: true, name: true, id: true },
    });
    return users.map(u => ({ email: u.email, name: u.name || "", userId: u.id }));
  }

  if (campaign.recipientSource === "DB_ACTIVE") {
    const filter = campaign.recipientFilter as any;
    const courseId = filter?.courseId ? parseInt(filter.courseId) : null;

    if (!courseId) return [];

    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: courseId,
        status: "ACTIVE"
      },
      include: {
        user: { select: { email: true, name: true, id: true } }
      }
    });

    return enrollments.map(e => ({
      email: e.user.email,
      name: e.user.name || "",
      userId: e.user.id
    }));
  }

  return [];
}
