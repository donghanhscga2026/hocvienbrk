import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Đọc file .env tối giản (KEY=VALUE theo dòng) — tránh thêm dependency chỉ để nạp cấu hình. */
function loadEnvFile() {
  const envPath = path.join(rootDir, '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvFile()

const apiBase = (process.env.CARE_BRIDGE_API_BASE || '').replace(/\/+$/, '')
const secret = process.env.CARE_BRIDGE_SECRET || ''

if (!apiBase || !/^https?:\/\//.test(apiBase)) {
  console.error('[care-bridge] Thiếu CARE_BRIDGE_API_BASE hợp lệ trong file .env (ví dụ https://giautoandien.io.vn).')
  process.exit(1)
}
if (!secret || secret.length < 16) {
  console.error('[care-bridge] CARE_BRIDGE_SECRET chưa đặt hoặc quá ngắn — phải giống hệt giá trị đặt ở phía website.')
  process.exit(1)
}

export const config = {
  apiBase,
  secret,
  name: process.env.CARE_BRIDGE_NAME || 'Care Bridge',
  rootDir,
  dataDir: path.join(rootDir, 'data'),
  sessionPath: path.join(rootDir, 'data', 'session.json'),
  sentKeysPath: path.join(rootDir, 'data', 'sent-keys.json'),
  version: 'care-bridge@1.0.0',
}
