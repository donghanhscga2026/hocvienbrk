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
} {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  const expectedSecret = (options.secretEnv ? process.env[options.secretEnv] : process.env.CRON_SECRET)?.trim()
  const querySecret = options.allowQuerySecret !== false ? req.nextUrl?.searchParams.get('secret') : undefined
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

  const isAuthorized = Boolean(
    expectedSecret && (
      bearerSecret === expectedSecret ||
      authHeader === expectedSecret ||
      alternateSecret === expectedSecret ||
      querySecret === expectedSecret
    )
  ) || hasGooglePubSubHeaders || isGooglePubSubUserAgent

  return {
    isAuthorized,
    hasAuthHeader: Boolean(authHeader),
    hasAlternateSecret: Boolean(alternateSecret),
    hasGooglePubSubHeaders: hasGooglePubSubHeaders || isGooglePubSubUserAgent,
    hasQuerySecret: Boolean(querySecret),
    secretConfigured: Boolean(expectedSecret),
    authHeader,
    alternateSecret,
  }
}
