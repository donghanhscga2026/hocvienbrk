"use client"

import { useEffect, useState } from "react"

export default function AdminMfaPage() {
  const [enabled, setEnabled] = useState(false)
  const [secret, setSecret] = useState("")
  const [uri, setUri] = useState("")
  const [code, setCode] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetch("/api/admin/mfa").then(r => r.json()).then(d => setEnabled(Boolean(d.enabled))).catch(() => {})
  }, [])

  async function begin() {
    setMessage("")
    const r = await fetch("/api/admin/mfa", { method: "POST" })
    const d = await r.json()
    if (!r.ok) return setMessage(d.error || "Không thể khởi tạo MFA.")
    setSecret(d.secret)
    setUri(d.uri)
    setMessage("Thêm khóa vào ứng dụng Authenticator, sau đó nhập mã 6 số để kích hoạt.")
  }

  async function enable() {
    const r = await fetch("/api/admin/mfa", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code })
    })
    const d = await r.json()
    if (!r.ok) return setMessage(d.error || "Không thể bật MFA.")
    setEnabled(true); setSecret(""); setUri(""); setCode(""); setMessage("MFA đã được bật.")
  }

  async function disable() {
    const r = await fetch("/api/admin/mfa", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code })
    })
    const d = await r.json()
    if (!r.ok) return setMessage(d.error || "Không thể tắt MFA.")
    setEnabled(false); setCode(""); setMessage("MFA đã được tắt.")
  }

  return <main className="mx-auto max-w-xl p-6 space-y-5">
    <h1 className="text-2xl font-bold">Bảo mật quản trị viên</h1>
    <p>Trạng thái MFA: <strong>{enabled ? "Đã bật" : "Chưa bật"}</strong></p>
    {!enabled && !secret && <button className="rounded-lg bg-brk-primary px-4 py-2 font-semibold text-brk-on-primary" onClick={begin}>Thiết lập Authenticator</button>}
    {secret && <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm">Trong Google/Microsoft Authenticator, chọn nhập khóa thiết lập và dùng khóa sau:</p>
      <code className="block break-all rounded bg-black/10 p-3 select-all">{secret}</code>
      <details><summary className="cursor-pointer text-sm">URI nâng cao</summary><code className="block break-all text-xs mt-2">{uri}</code></details>
    </div>}
    {(secret || enabled) && <div className="space-y-2">
      <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" placeholder="Mã 6 chữ số" className="w-full rounded-lg border px-3 py-2" />
      <button disabled={code.length !== 6} className="rounded-lg bg-brk-primary px-4 py-2 font-semibold text-brk-on-primary disabled:opacity-50" onClick={enabled ? disable : enable}>{enabled ? "Xác nhận và tắt MFA" : "Xác nhận và bật MFA"}</button>
    </div>}
    {message && <p className="text-sm">{message}</p>}
  </main>
}
