type RequestLike = Request & {
  nextUrl?: {
    searchParams: URLSearchParams
  }
}

interface AuthorizedRequestOptions {
  secretEnv?: string
  allowedHeaderNames?: string[]
  allowQuerySecret?: boolean
}

export function isAuthorizedRequest(
  req: RequestLike,
  options: AuthorizedRequestOptions = {},
): {
  isAuthorized: boolean
  hasAuthHeader: boolean
  hasAlternateSecret: boolean
  hasGooglePubSubHeaders: boolean
  hasQuerySecret: boolean
  secretConfigured: boolean
  authHeader?: string | null
  alternateSecret?: string | null
  // Chỉ để CHẨN ĐOÁN khi bị 401 ngoài ý muốn — KHÔNG chứa nội dung secret thật,
  // chỉ độ dài, để phát hiện lỗi encode/cắt bớt ký tự khi dán secret vào URL.
  debug?: {
    expectedSecretLength: number
    querySecretLength: number
    matchesIgnoringCase: boolean
    matchesTrimmed: boolean
  }
} {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  const expectedSecret = (options.secretEnv ? process.env[options.secretEnv] : process.env.CRON_SECRET)?.trim()
  const rawQuerySecret = options.allowQuerySecret !== false ? req.nextUrl?.searchParams.get('secret') : undefined
  const querySecret = rawQuerySecret?.trim()
  const allowedHeaderNames = options.allowedHeaderNames ?? ['x-cron-secret', 'x-webhook-secret', 'x-gmail-webhook-secret']
  const alternateSecret = allowedHeaderNames
    .map((name) => req.headers.get(name))
    .find((value): value is string => Boolean(value)) ?? null
  const hasGooglePubSubHeaders = ['x-goog-topic', 'x-goog-message-id', 'x-goog-subscription-name'].some((header) => Boolean(req.headers.get(header)))
  const userAgent = req.headers.get('user-agent') || req.headers.get('User-Agent')
  const userAgentLower = userAgent?.toLowerCase() || ''
  const isGooglePubSubUserAgent = 
    userAgentLower.includes('cloudpubsub-google') ||
    userAgentLower.includes('apis-google') ||
    userAgentLower.includes('google-cloud-pubsub')

  const normalizedAuthHeader = authHeader?.trim()
  const bearerSecret = normalizedAuthHeader?.startsWith('Bearer ')
    ? normalizedAuthHeader.slice(7).trim()
    : normalizedAuthHeader

  // LƯU Ý BẢO MẬT: KHÔNG được coi hasGooglePubSubHeaders/isGooglePubSubUserAgent
  // là bằng chứng xác thực — đây chỉ là header/User-Agent do CHÍNH client tự khai,
  // ai cũng giả lập được bằng một request POST thường. Việc dựa vào chúng để tự
  // động authorize (như code cũ) cho phép bất kỳ ai giả header để bỏ qua CRON_SECRET.
  // Phải luôn yêu cầu secret hợp lệ; nếu dùng Google Pub/Sub push subscription,
  // hãy cấu hình secret vào query string của push endpoint (?secret=...) khi đăng ký
  // với Google, hoặc xác thực OIDC token thật (ký bởi Google) thay vì đoán qua header.
  const isAuthorized = Boolean(
    expectedSecret && (
      bearerSecret === expectedSecret ||
      authHeader === expectedSecret ||
      alternateSecret === expectedSecret ||
      querySecret === expectedSecret
    )
  )

  return {
    isAuthorized,
    hasAuthHeader: Boolean(authHeader),
    hasAlternateSecret: Boolean(alternateSecret),
    hasGooglePubSubHeaders: hasGooglePubSubHeaders || isGooglePubSubUserAgent,
    hasQuerySecret: Boolean(querySecret),
    secretConfigured: Boolean(expectedSecret),
    authHeader,
    alternateSecret,
    debug: querySecret !== undefined ? {
      expectedSecretLength: expectedSecret?.length ?? 0,
      querySecretLength: querySecret?.length ?? 0,
      matchesIgnoringCase: !!expectedSecret && !!querySecret && expectedSecret.toLowerCase() === querySecret.toLowerCase(),
      matchesTrimmed: !!expectedSecret && !!querySecret && expectedSecret.trim() === querySecret.trim(),
    } : undefined,
  }
}
