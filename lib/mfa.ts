import crypto from "node:crypto"

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function generateTotpSecret(bytes = 20): string {
  const input = crypto.randomBytes(bytes)
  let bits = ""
  for (const byte of input) bits += byte.toString(2).padStart(8, "0")
  let out = ""
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0")
    out += BASE32[parseInt(chunk, 2)]
  }
  return out
}

function decodeBase32(value: string): Buffer {
  const clean = value.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase()
  let bits = ""
  for (const char of clean) {
    const index = BASE32.indexOf(char)
    if (index < 0) throw new Error("Invalid base32 secret")
    bits += index.toString(2).padStart(5, "0")
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

function totp(secret: string, counter: number): string {
  const key = decodeBase32(secret)
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64BE(BigInt(counter))
  const digest = crypto.createHmac("sha1", key).update(buffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return code.toString().padStart(6, "0")
}

export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false
  const counter = Math.floor(now / 30_000)
  return [-1, 0, 1].some((drift) => {
    const expected = totp(secret, counter + drift)
    const a = Buffer.from(expected)
    const b = Buffer.from(code)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  })
}

function encryptionKey(): Buffer {
  const source = process.env.MFA_ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!source) throw new Error("MFA encryption key is not configured")
  return crypto.createHash("sha256").update(source).digest()
}

export function encryptMfaSecret(secret: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, ciphertext].map((part) => part.toString("base64url")).join(".")
}

export function decryptMfaSecret(value: string): string {
  const [ivText, tagText, ciphertextText] = value.split(".")
  if (!ivText || !tagText || !ciphertextText) throw new Error("Invalid encrypted MFA secret")
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"))
  decipher.setAuthTag(Buffer.from(tagText, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

export function totpUri(secret: string, account: string): string {
  const issuer = "MFC"
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}
