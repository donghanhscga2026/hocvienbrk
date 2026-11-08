import fs from 'node:fs'
import path from 'node:path'
import { exec } from 'node:child_process'
import { LoginQRCallbackEventType, ThreadType, Zalo } from 'zca-js'
import { config } from './config.js'

/**
 * Lớp bọc quanh zca-js (thư viện Zalo không chính thức):
 * - Đăng nhập bằng phiên đã lưu trong data/session.json; chưa có phiên
 *   thì đăng nhập bằng mã QR (ảnh data/qr.png do máy chủ Zalo tạo).
 * - Nghe tin nhắn đến + sự kiện rớt kết nối để tiến trình chính xử lý.
 * - Gửi tin văn bản tới 1 học viên theo số điện thoại hoặc uid đã biết.
 * Tuyệt đối không dùng file này với nick Zalo chính của giảng viên.
 *
 * Bản sửa 08/11/2026 (từ bản vá pilot đã chạy thật):
 * 1) zca-js 2.1.2 trả event.data.image là base64 THÔ (đã cắt tiền tố
 *    "data:image/png;base64,") nên bản cũ không lưu được data/qr.png.
 * 2) Mã QR vẽ từ event.data.code chỉ chứa chuỗi mã thô — Zalo quét vào
 *    chỉ thấy văn bản, không mở được màn hình đăng nhập. Nội dung đăng nhập
 *    đúng nằm trong ảnh máy chủ Zalo tạo (zaloapp.com/qr/...). Vì vậy
 *    bỏ hẳn QR vẽ bằng ký tự trong console; chỉ dùng data/qr.png và
 *    tự mở ảnh đó trên Windows mỗi khi có mã mới.
 */

export function loadSession() {
  try {
    if (!fs.existsSync(config.sessionPath)) return null
    const parsed = JSON.parse(fs.readFileSync(config.sessionPath, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function saveSession(credentials) {
  fs.mkdirSync(config.dataDir, { recursive: true })
  fs.writeFileSync(config.sessionPath, JSON.stringify(credentials, null, 2), 'utf8')
  console.log('[care-bridge] Đã lưu phiên đăng nhập vào data/session.json — giữ file này bí mật như mật khẩu.')
}

function saveQrImage(image) {
  const raw = String(image || '').replace(/^data:image\/png;base64,/, '')
  if (!raw) return
  fs.mkdirSync(config.dataDir, { recursive: true })
  const qrPath = path.join(config.dataDir, 'qr.png')
  fs.writeFileSync(qrPath, Buffer.from(raw, 'base64'))
  console.log('[care-bridge] Đã lưu ảnh mã QR vào data/qr.png — mở file này và quét bằng ứng dụng Zalo của nick phụ.')
  if (process.platform === 'win32') {
    exec(`start "" "${qrPath}"`, () => {})
  }
}

export class ZaloConnection {
  constructor({ onMessage, onDisconnected }) {
    this.api = null
    this.ownId = null
    this.onMessage = onMessage
    this.onDisconnected = onDisconnected
    this.userCache = new Map()
  }

  async connect() {
    const zalo = new Zalo({ selfListen: false, logging: false })
    const saved = loadSession()
    if (saved) {
      try {
        console.log('[care-bridge] Đang khôi phục phiên Zalo đã lưu…')
        this.api = await zalo.login(saved)
      } catch (error) {
        console.warn('[care-bridge] Phiên đã lưu không còn dùng được, chuyển sang đăng nhập QR:', error?.message || error)
        this.api = null
      }
    }
    if (!this.api) {
      console.log('[care-bridge] Bắt đầu đăng nhập bằng mã QR — hãy quét bằng nick Zalo PHỤ (nick trợ lý), không dùng nick chính.')
      this.api = await zalo.loginQR({}, async (event) => {
        switch (event.type) {
          case LoginQRCallbackEventType.QRCodeGenerated: {
            if (event.data?.image) saveQrImage(event.data.image)
            break
          }
          case LoginQRCallbackEventType.QRCodeScanned:
            console.log(`[care-bridge] Đã quét QR (${event.data?.display_name || 'nick phụ'}) — xác nhận đăng nhập trên điện thoại…`)
            break
          case LoginQRCallbackEventType.GotLoginInfo:
            saveSession(event.data)
            break
          case LoginQRCallbackEventType.QRCodeExpired:
            console.warn('[care-bridge] Mã QR hết hạn, đang tạo mã mới…')
            if (typeof event.actions?.retry === 'function') event.actions.retry()
            break
          default:
            break
        }
      })
    }
    try {
      const profile = await this.api.fetchAccountInfo()
      this.ownId = String(profile?.profile?.userId || profile?.userId || '')
    } catch {
      this.ownId = null
    }
    this.setupListener()
    this.api.listener.start()
    console.log('[care-bridge] Đã đăng nhập Zalo và bắt đầu nghe tin nhắn.')
    return this.api
  }

  setupListener() {
    const listener = this.api.listener
    listener.on('message', (message) => {
      try {
        if (message.isSelf) return
        if (message.type !== ThreadType.User) return // GĐ4 chỉ xử lý hội thoại 1-1 với học viên
        const text = typeof message.data?.content === 'string' ? message.data.content : ''
        if (!text.trim()) return // bản này chỉ chuyển tin văn bản về CRM; ảnh/tệp sẽ bổ sung sau
        this.onMessage({
          zaloMsgId: String(message.data?.msgId || message.messageId || ''),
          zaloUserId: String(message.data?.uidFrom || message.threadId || ''),
          text: text.slice(0, 4000),
        })
      } catch (error) {
        console.error('[care-bridge] Lỗi xử lý tin đến:', error?.message || error)
      }
    })
    listener.on('disconnected', (code, reason) => {
      console.warn(`[care-bridge] Mất kết nối Zalo (disconnected ${code}: ${reason || ''}).`)
      this.onDisconnected('disconnected')
    })
    listener.on('closed', (code, reason) => {
      console.warn(`[care-bridge] Kết nối Zalo đã đóng (closed ${code}: ${reason || ''}).`)
      this.onDisconnected('closed')
    })
    listener.on('error', (error) => {
      console.error('[care-bridge] Lỗi listener Zalo:', error?.message || error)
    })
  }

  /** Tìm uid Zalo của học viên theo số điện thoại (có cache trong phiên chạy). */
  async resolveUserId(phone) {
    if (!phone) return null
    if (this.userCache.has(phone)) return this.userCache.get(phone)
    const found = await this.api.findUser(phone)
    const uid = found?.uid ? String(found.uid) : null
    if (uid) this.userCache.set(phone, uid)
    return uid
  }

  /** Số điện thoại của 1 uid (nếu Zalo cho thấy) — giúp website khớp học viên khi nhận tin đến. */
  async lookupPhone(uid) {
    try {
      const info = await this.api.getUserInfo(String(uid))
      const profile = info?.changed_profiles?.[String(uid)] || info?.unchanged_profiles?.[String(uid)]
      return profile?.phoneNumber ? String(profile.phoneNumber) : null
    } catch {
      return null
    }
  }

  /** Gửi 1 tin văn bản; trả { msgId, zaloUserId } để website ghi nhận. */
  async sendText({ phone, body }) {
    const uid = await this.resolveUserId(phone)
    if (!uid) throw new Error(`Không tìm thấy tài khoản Zalo cho số điện thoại ${phone || '(trống)'} — học viên có thể chưa dùng số này trên Zalo hoặc chưa từng kết bạn/hội thoại với nick trợ lý.`)
    const result = await this.api.sendMessage(body, uid, ThreadType.User)
    const msgId = result?.message?.msgId || result?.msgId || null
    return { msgId: msgId ? String(msgId) : null, zaloUserId: uid }
  }
}
