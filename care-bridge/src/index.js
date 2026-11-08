import fs from 'node:fs'
import { bridgeApi } from './api-client.js'
import { config } from './config.js'
import { ZaloConnection } from './zalo.js'

/**
 * Care Bridge — vòng lặp chính (Care Engine GĐ4).
 *
 * Nhiệm vụ: giữ phiên nick Zalo PHỤ, định kỳ hỏi website (API ký HMAC)
 * để lấy lệnh gửi nhắc của Care Engine rồi gửi qua Zalo với nhịp chống
 * khóa nick: giãn cách ngẫu nhiên 10–25 giây/tin (tối thiểu 3 giây,
 * tối đa 20 tin/phút), không gửi trong khung giờ yên lặng 22:00–06:00.
 * Tin học viên nhắn đến được đẩy ngược về website thành CrmRequest.
 *
 * Chống gửi trùng 2 lớp: website khóa idempotencyKey ở DB + bridge lưu
 * danh sách khóa đã gửi thành công vào data/sent-keys.json (sống qua
 * khởi động lại) — khóa đã có trong danh sách thì báo SENT luôn, không
 * gửi lại lần nữa.
 */

const HEARTBEAT_MS = 60_000
const CLAIM_EVERY_MS = 20_000
const CLAIM_LIMIT = 5
const RECONNECT_BASE_MS = 15_000
const RECONNECT_MAX_MS = 5 * 60_000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const randomGapMs = () => 10_000 + Math.floor(Math.random() * 15_001) // 10–25 giây

/** Khung giờ yên lặng theo giờ Việt Nam: 22:00 → 06:00 không gửi tin. */
function isQuietHours(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0)
  const total = hour * 60 + minute
  return total >= 22 * 60 || total < 6 * 60
}

/* ---------- Danh sách khóa đã gửi (chống trùng phía client) ---------- */
function loadSentKeys() {
  try {
    const parsed = JSON.parse(fs.readFileSync(config.sentKeysPath, 'utf8'))
    return new Set(Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : [])
  } catch {
    return new Set()
  }
}
const sentKeys = loadSentKeys()
function rememberSentKey(key) {
  sentKeys.add(key)
  const trimmed = [...sentKeys].slice(-2000)
  try {
    fs.mkdirSync(config.dataDir, { recursive: true })
    fs.writeFileSync(config.sentKeysPath, JSON.stringify(trimmed), 'utf8')
  } catch (error) {
    console.warn('[care-bridge] Không lưu được sent-keys.json:', error?.message || error)
  }
}

/* ---------- Bộ đếm nhịp gửi: tối thiểu 3 giây/tin, tối đa 20 tin/phút ---------- */
const sendTimestamps = []
async function waitSendSlot() {
  const now = Date.now()
  const last = sendTimestamps[sendTimestamps.length - 1]
  if (last && now - last < 3000) await sleep(3000 - (now - last))
  while (sendTimestamps.length > 0 && sendTimestamps[0] <= Date.now() - 60_000) sendTimestamps.shift()
  if (sendTimestamps.length >= 20) {
    const waitMs = sendTimestamps[0] + 60_000 - Date.now()
    if (waitMs > 0) await sleep(waitMs)
  }
  sendTimestamps.push(Date.now())
}

/* ---------- Trạng thái chạy ---------- */
let zalo = null
let killSwitch = false
let sending = false
let reconnectAttempts = 0
let reconnecting = false

async function handleInbound(message) {
  if (!message.zaloMsgId || !message.zaloUserId) return
  try {
    const phone = zalo ? await zalo.lookupPhone(message.zaloUserId) : null
    const result = await bridgeApi.inbound({ ...message, phone })
    console.log(result?.duplicated
      ? `[care-bridge] Tin đến ${message.zaloMsgId} đã có trên website (trùng) — bỏ qua.`
      : `[care-bridge] Tin đến từ ${message.zaloUserId} đã thành yêu cầu CRM ${result?.crmRequestId || ''}.`)
  } catch (error) {
    console.error('[care-bridge] Không đẩy được tin đến về website:', error?.message || error)
  }
}

async function heartbeatLoop() {
  for (;;) {
    try {
      const state = await bridgeApi.heartbeat()
      if (typeof state?.killSwitch === 'boolean' && state.killSwitch !== killSwitch) {
        killSwitch = state.killSwitch
        console.log(killSwitch
          ? '[care-bridge] Website báo TẮT KHẨN CẤP — dừng lấy lệnh mới.'
          : '[care-bridge] Công tắc khẩn cấp đã tắt — tiếp tục lấy lệnh.')
      }
    } catch (error) {
      if (error?.status === 503) console.error('[care-bridge] Website chưa cấu hình CARE_BRIDGE_SECRET — bridge chưa hoạt động được.')
      else console.warn('[care-bridge] Nhịp tim thất bại:', error?.message || error)
    }
    await sleep(HEARTBEAT_MS)
  }
}

async function sendOne(command) {
  if (sentKeys.has(command.idempotencyKey)) {
    console.log(`[care-bridge] Lệnh #${command.id} đã từng gửi (khóa ${command.idempotencyKey}) — báo SENT, không gửi lại.`)
    await bridgeApi.report({ commandId: command.id, ok: true, zaloUserId: null }).catch(() => undefined)
    return
  }
  await waitSendSlot()
  try {
    const result = await zalo.sendText({ phone: command.phone, body: command.body })
    rememberSentKey(command.idempotencyKey)
    await bridgeApi.report({ commandId: command.id, ok: true, zaloUserId: result.zaloUserId })
    console.log(`[care-bridge] Đã gửi lệnh #${command.id} cho học viên #${command.studentId} (${command.studentName}).`)
  } catch (error) {
    const message = String(error?.message || error).slice(0, 480)
    console.error(`[care-bridge] Gửi lệnh #${command.id} thất bại:`, message)
    await bridgeApi.report({ commandId: command.id, ok: false, error: message }).catch(() => undefined)
  }
}

async function claimLoop() {
  for (;;) {
    await sleep(CLAIM_EVERY_MS)
    if (!zalo || sending || killSwitch) continue
    if (isQuietHours()) continue
    let result
    try {
      result = await bridgeApi.claim(CLAIM_LIMIT)
    } catch (error) {
      console.warn('[care-bridge] Lấy lệnh thất bại:', error?.message || error)
      continue
    }
    if (typeof result?.killSwitch === 'boolean') killSwitch = result.killSwitch
    if (result?.held || !Array.isArray(result?.commands) || result.commands.length === 0) continue
    sending = true
    try {
      for (const command of result.commands) {
        if (killSwitch) break
        await sendOne(command)
        if (command !== result.commands[result.commands.length - 1]) await sleep(randomGapMs())
      }
    } finally {
      sending = false
    }
  }
}

async function connectZalo() {
  zalo = new ZaloConnection({
    onMessage: (message) => { void handleInbound(message) },
    onDisconnected: () => { void scheduleReconnect() },
  })
  await zalo.connect()
  reconnectAttempts = 0
}

async function scheduleReconnect() {
  if (reconnecting) return
  reconnecting = true
  reconnectAttempts++
  const waitMs = Math.min(RECONNECT_BASE_MS * 2 ** (reconnectAttempts - 1), RECONNECT_MAX_MS)
  console.log(`[care-bridge] Sẽ thử kết nối lại Zalo sau ${Math.round(waitMs / 1000)} giây (lần ${reconnectAttempts})…`)
  await sleep(waitMs)
  try {
    await connectZalo()
    console.log('[care-bridge] Đã kết nối lại Zalo.')
  } catch (error) {
    console.error('[care-bridge] Kết nối lại thất bại:', error?.message || error)
    reconnecting = false
    void scheduleReconnect()
    return
  }
  reconnecting = false
}

async function main() {
  console.log(`[care-bridge] Khởi động ${config.version} · API: ${config.apiBase}`)
  fs.mkdirSync(config.dataDir, { recursive: true })
  void heartbeatLoop()
  void claimLoop()
  await connectZalo()
}

main().catch((error) => {
  console.error('[care-bridge] Lỗi khởi động:', error?.message || error)
  process.exit(1)
})
