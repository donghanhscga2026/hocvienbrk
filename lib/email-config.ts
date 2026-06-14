import prisma from "@/lib/prisma";

export interface EmailCampaignConfig {
  emailsBeforePauseMin: number;
  emailsBeforePauseMax: number;
  pauseDurationMin: number;
  pauseDurationMax: number;
  interEmailDelayMin: number;
  interEmailDelayMax: number;
  brevoInterEmailDelayMin: number;
  brevoInterEmailDelayMax: number;
  enableTelegramAlert: boolean;
  telegramChatId: string;
  enableRandomMessageFooter: boolean;
}

export const DEFAULT_EMAIL_CONFIG: EmailCampaignConfig = {
  emailsBeforePauseMin: 15,
  emailsBeforePauseMax: 25,
  pauseDurationMin: 15,
  pauseDurationMax: 45,
  interEmailDelayMin: 5,
  interEmailDelayMax: 15,
  brevoInterEmailDelayMin: 0.5,
  brevoInterEmailDelayMax: 1.5,
  enableTelegramAlert: true,
  telegramChatId: process.env.TELEGRAM_CHAT_ID_EMAIL || "",
  enableRandomMessageFooter: false,
};

export const WARMUP_LIMITS = {
  0: 5,
  1: 15,
  2: 30,
  3: 60,
  4: 100,
};

export async function getEmailConfig(): Promise<EmailCampaignConfig> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "emailCampaignConfig" },
    });

    if (config?.value) {
      return { ...DEFAULT_EMAIL_CONFIG, ...(config.value as any) };
    }
  } catch (error) {
    console.error("[EmailConfig] Lỗi khi đọc config:", error);
  }

  return DEFAULT_EMAIL_CONFIG;
}

export async function saveEmailConfig(config: Partial<EmailCampaignConfig>): Promise<void> {
  const currentConfig = await getEmailConfig();
  const newConfig = { ...currentConfig, ...config };

  await prisma.systemConfig.upsert({
    where: { key: "emailCampaignConfig" },
    update: { value: newConfig as any },
    create: { key: "emailCampaignConfig", value: newConfig as any },
  });
}

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateWarmupLimit(createdAt: Date): number {
  const now = new Date();
  const days = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  if (days < 7) return WARMUP_LIMITS[0];
  if (days < 14) return WARMUP_LIMITS[1];
  if (days < 21) return WARMUP_LIMITS[2];
  if (days < 30) return WARMUP_LIMITS[3];
  return WARMUP_LIMITS[4];
}

export function getEffectiveDailyLimit(sender: {
  createdAt: Date;
  dailyLimit: number;
  warmupPhase: number;
}): number {
  const warmupLimit = sender.warmupPhase > 0
    ? WARMUP_LIMITS[sender.warmupPhase as keyof typeof WARMUP_LIMITS] ?? WARMUP_LIMITS[4]
    : calculateWarmupLimit(sender.createdAt);
  const configuredLimit = sender.dailyLimit;
  const effectiveLimit = Math.min(warmupLimit, configuredLimit);
  return effectiveLimit;
}
