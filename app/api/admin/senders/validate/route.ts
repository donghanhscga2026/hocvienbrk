import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/google-auth";
import { tryDecrypt } from "@/lib/email-encryptor";

interface SenderValidation {
  id: number;
  email: string;
  label: string;
  isValid: boolean;
  error?: string;
}

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const senders = await prisma.emailSender.findMany({
      orderBy: { createdAt: "desc" },
    });

    const results: SenderValidation[] = [];
    const invalidSenders: number[] = [];

    for (const sender of senders) {
      // Brevo sender: kiểm tra thật bằng GET /account để phát hiện chặn IP
      if ((sender as any).provider === 'brevo') {
        try {
          const s = sender as any;
          let apiKey: string | null = s.apiKeyEnvVar ? process.env[s.apiKeyEnvVar] || null : null;
          if (!apiKey && s.apiKeyEncrypted) {
            const { decrypt } = await import("@/lib/email-encryptor");
            apiKey = decrypt(s.apiKeyEncrypted);
          }
          if (!apiKey) throw new Error(`Chưa cấu hình API key (${s.apiKeyEnvVar || 'không có env var'})`);
          const { validateApiKey, isBrevoIpBlockedError } = await import("@/lib/brevo");
          await validateApiKey(apiKey);
          results.push({ id: sender.id, email: sender.email, label: sender.label, isValid: true });
        } catch (error: any) {
          const { isBrevoIpBlockedError } = await import("@/lib/brevo");
          const blocked = isBrevoIpBlockedError(error);
          results.push({
            id: sender.id, email: sender.email, label: sender.label, isValid: false,
            error: blocked
              ? `Brevo chặn IP chưa whitelist. Vào app.brevo.com/security/authorised_ips để tắt giới hạn hoặc thêm IP Vercel. (${error.message})`
              : (error.message || 'Lỗi kết nối Brevo'),
          });
          invalidSenders.push(sender.id);
        }
        continue
      }

      if (!sender.refreshToken) {
        results.push({
          id: sender.id,
          email: sender.email,
          label: sender.label,
          isValid: false,
          error: "Không có refresh token (Brevo sender?)",
        });
        invalidSenders.push(sender.id);
        continue;
      }

      try {
        const oauth2Client = getOAuth2Client();
        
        oauth2Client.setCredentials({
          refresh_token: tryDecrypt(sender.refreshToken),
        });

        // Thử refresh token để kiểm tra
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        if (credentials.access_token) {
          results.push({
            id: sender.id,
            email: sender.email,
            label: sender.label,
            isValid: true,
          });
        } else {
          results.push({
            id: sender.id,
            email: sender.email,
            label: sender.label,
            isValid: false,
            error: "Không nhận được access token",
          });
          invalidSenders.push(sender.id);
        }
      } catch (error: any) {
        let errorMessage = "Lỗi không xác định";
        
        if (error.message?.includes("invalid_grant")) {
          errorMessage = "Token đã hết hạn hoặc bị revoke. Cần re-authenticate.";
        } else if (error.message?.includes("invalid_client")) {
          errorMessage = "Client credentials không hợp lệ.";
        } else if (error.message?.includes(" unauthorized")) {
          errorMessage = "Không có quyền truy cập Gmail API.";
        } else {
          errorMessage = error.message || "Lỗi kết nối";
        }

        results.push({
          id: sender.id,
          email: sender.email,
          label: sender.label,
          isValid: false,
          error: errorMessage,
        });
        invalidSenders.push(sender.id);
      }
    }

    const validCount = results.filter(r => r.isValid).length;
    const invalidCount = results.filter(r => !r.isValid).length;

    return NextResponse.json({
      results,
      summary: {
        total: senders.length,
        valid: validCount,
        invalid: invalidCount,
        readyToSend: validCount > 0,
      },
      invalidSenders,
    });
  } catch (error: any) {
    console.error("[Validate Senders] Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
