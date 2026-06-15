const BREVO_API_URL = 'https://api.brevo.com/v3'

function getApiKey(overrideKey?: string): string {
  if (overrideKey) return overrideKey
  const key = process.env.BREVO_API_KEY
  if (!key) throw new Error('BREVO_API_KEY not configured')
  return key
}

function getDefaultSender(): { name: string; email: string } {
  return {
    name: process.env.BREVO_SENDER_NAME || 'Học Viện BRK',
    email: process.env.BREVO_SENDER_EMAIL || 'hocvienbrk@gmail.com',
  }
}

async function brevoFetch<T>(
  method: string,
  path: string,
  body?: unknown,
  apiKey?: string,
): Promise<T> {
  const response = await fetch(`${BREVO_API_URL}${path}`, {
    method,
    headers: {
      'api-key': getApiKey(apiKey),
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`Brevo API ${method} ${path}: ${error.message || JSON.stringify(error)}`)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

export interface BrevoRecipient {
  email: string
  name?: string
}

export interface SendEmailParams {
  to: BrevoRecipient[]
  subject: string
  htmlContent: string
  sender?: { name: string; email: string }
  bcc?: BrevoRecipient[]
  replyTo?: BrevoRecipient
  tags?: string[]
  headers?: Record<string, string>
  apiKey?: string
}

export interface SendEmailResult {
  messageId: string
  success: true
}

export async function sendTransactionalEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const body = {
    sender: params.sender || getDefaultSender(),
    to: params.to,
    subject: params.subject,
    htmlContent: params.htmlContent,
    ...(params.bcc && params.bcc.length > 0 ? { bcc: params.bcc } : {}),
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    ...(params.tags && params.tags.length > 0 ? { tags: params.tags } : {}),
    ...(params.headers ? { headers: params.headers } : {}),
  }

  const result = await brevoFetch<{ messageId: string }>('POST', '/smtp/email', body, params.apiKey)
  return { messageId: result.messageId, success: true }
}

export interface MessageVersion {
  to: BrevoRecipient[]
  params?: Record<string, string>
  subject?: string
  htmlContent?: string
}

export interface SendBatchEmailParams {
  sender?: { name: string; email: string }
  subject: string
  htmlContent: string
  messageVersions: MessageVersion[]
  tags?: string[]
  batchSize?: number
}

export async function sendBatchTransactionalEmail(
  params: SendBatchEmailParams,
): Promise<{ messageIds: string[]; success: true }> {
  const body: Record<string, unknown> = {
    sender: params.sender || getDefaultSender(),
    subject: params.subject,
    htmlContent: params.htmlContent,
    messageVersions: params.messageVersions,
    ...(params.tags && params.tags.length > 0 ? { tags: params.tags } : {}),
  }

  const result = await brevoFetch<{ messageId: string; messageIds: string[] }>(
    'POST', '/smtp/email', body,
  )
  return { messageIds: result.messageIds || [result.messageId], success: true }
}

export interface BrevoAccountInfo {
  email: string
  firstName: string
  lastName: string
  companyName: string
  plan: { type: string; credits: number; creditsType: string }[]
  relay: { enabled: boolean }
}

export async function getBrevoAccount(): Promise<BrevoAccountInfo> {
  return brevoFetch<BrevoAccountInfo>('GET', '/account')
}

export interface BrevoQuota {
  remaining: number
  used: number
  total: number
}

export interface BrevoTodayStats {
  requests: number
  delivered: number
  hardBounces: number
  softBounces: number
  complaints: number
  unsubscribed: number
  invalid: number
  blocked: number
}

export async function getBrevoTodayStats(apiKey: string): Promise<BrevoTodayStats> {
  const today = new Date().toISOString().split('T')[0]
  const result = await brevoFetch<{
    requests?: number; delivered?: number; hardBounces?: number
    softBounces?: number; complaints?: number; unsubscribed?: number
    invalid?: number; blocked?: number
  }>('GET', `/smtp/statistics/aggregatedReport?startDate=${today}&endDate=${today}`, undefined, apiKey)

  return {
    requests: result.requests ?? 0,
    delivered: result.delivered ?? 0,
    hardBounces: result.hardBounces ?? 0,
    softBounces: result.softBounces ?? 0,
    complaints: result.complaints ?? 0,
    unsubscribed: result.unsubscribed ?? 0,
    invalid: result.invalid ?? 0,
    blocked: result.blocked ?? 0,
  }
}

export async function getBrevoQuota(apiKey?: string): Promise<BrevoQuota> {
  const account = apiKey
    ? await brevoFetch<BrevoAccountInfo>('GET', '/account', undefined, apiKey)
    : await getBrevoAccount()

  const sendLimit = account.plan.find(p => p.creditsType === 'sendLimit')
  const total = sendLimit?.credits ?? 300

  const stats = apiKey
    ? await getBrevoTodayStats(apiKey)
    : { requests: 0, delivered: 0, hardBounces: 0, softBounces: 0, complaints: 0, unsubscribed: 0, invalid: 0, blocked: 0 }

  const used = stats.requests
  const remaining = Math.max(0, total - used)

  return { remaining, used, total }
}

export interface BlockedContact {
  email: string
  reason: string
  blockedAt: string
}

export async function getBlockedContacts(): Promise<BlockedContact[]> {
  const result = await brevoFetch<{ blockedContacts: BlockedContact[] }>(
    'GET', '/smtp/blockedContacts',
  )
  return result.blockedContacts || []
}

export async function unblockContact(email: string): Promise<void> {
  await brevoFetch('DELETE', `/smtp/blockedContacts/${encodeURIComponent(email)}`)
}

export interface BrevoWebhookConfig {
  url: string
  description?: string
  events: string[]
  type: 'transactional' | 'marketing'
}

export async function createWebhook(config: BrevoWebhookConfig): Promise<{ id: number }> {
  return brevoFetch<{ id: number }>('POST', '/webhooks', config)
}

export async function getExistingWebhooks(): Promise<{ id: number; url: string; events: string[]; type: string }[]> {
  const result = await brevoFetch<{ webhooks: any[] }>('GET', '/webhooks')
  return (result.webhooks || []).map(w => ({
    id: w.id,
    url: w.url,
    events: w.events,
    type: w.type,
  }))
}

export async function createBrevoContact(
  email: string,
  attributes?: Record<string, string>,
  listIds?: number[],
): Promise<void> {
  await brevoFetch('POST', '/contacts', {
    email,
    ...(attributes ? { attributes } : {}),
    ...(listIds ? { listIds } : {}),
    emailBlacklisted: false,
    smsBlacklisted: false,
  })
}

export function validateApiKey(apiKey: string): Promise<BrevoAccountInfo> {
  return brevoFetch<BrevoAccountInfo>('GET', '/account', undefined, apiKey)
}
