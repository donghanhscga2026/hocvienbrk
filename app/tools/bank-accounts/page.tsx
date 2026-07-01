'use client'

import { useState, useEffect } from 'react'
import { Loader2, Search, Plus, Edit3, Trash2, X, CheckCircle2, AlertCircle, Banknote } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import { getVietnamBanks, BankInfo } from '@/lib/vietnam-banks'

const accountTypeLabels: Record<string, string> = { BANK: 'Ngân hàng', MOMO: 'Ví Momo', ZALOPAY: 'Ví ZaloPay', OTHER: 'Khác' }
const accountTypeOptions = [
  { value: 'BANK', label: 'Ngân hàng' },
  { value: 'MOMO', label: 'Ví Momo' },
  { value: 'ZALOPAY', label: 'Ví ZaloPay' },
  { value: 'OTHER', label: 'Khác' },
]

interface BankAccount {
  id: number
  userId: number
  accountType: string
  accountHolder: string
  accountNumber: string
  bankName: string | null
  qrCodeUrl: string | null
  isDefault: boolean
  createdAt: string
  user: { id: number; name: string | null; email: string; phone: string | null }
}

interface UserResult {
  id: number; name: string | null; email: string
}

export default function AdminBankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [formUserId, setFormUserId] = useState<number | null>(null)
  const [formUserSearch, setFormUserSearch] = useState('')
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [searchingUser, setSearchingUser] = useState(false)
  const [formAccountType, setFormAccountType] = useState('BANK')
  const [formAccountHolder, setFormAccountHolder] = useState('')
  const [formAccountNumber, setFormAccountNumber] = useState('')
  const [formBankName, setFormBankName] = useState('')
  const [formQrCodeUrl, setFormQrCodeUrl] = useState('')
  const [formIsDefault, setFormIsDefault] = useState(false)
  const [bankList, setBankList] = useState<BankInfo[]>([])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bank-accounts')
      if (!res.ok) throw new Error('Unauthorized')
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  useEffect(() => { loadData(); loadBanks() }, [])

  async function loadBanks() {
    const banks = await getVietnamBanks()
    setBankList(banks)
  }

  // Search users for the add form
  useEffect(() => {
    if (!formUserSearch.trim() || formUserId) {
      setUserResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearchingUser(true)
      try {
        const res = await fetch(`/api/admin/users/list?search=${encodeURIComponent(formUserSearch)}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          setUserResults(data.users || [])
        }
      } catch { }
      setSearchingUser(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [formUserSearch, formUserId])

  const filtered = accounts.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.accountHolder?.toLowerCase().includes(q)
      || a.accountNumber?.toLowerCase().includes(q)
      || a.bankName?.toLowerCase().includes(q)
      || a.user?.name?.toLowerCase().includes(q)
      || a.user?.email?.toLowerCase().includes(q)
  })

  function openAddModal() {
    setEditingAccount(null)
    resetForm()
    setShowModal(true)
  }

  function openEditModal(acc: BankAccount) {
    setEditingAccount(acc)
    setFormUserId(acc.userId)
    setFormUserSearch(`${acc.user?.name || ''} (#${acc.userId})`)
    setFormAccountType(acc.accountType)
    setFormAccountHolder(acc.accountHolder)
    setFormAccountNumber(acc.accountNumber)
    setFormBankName(acc.bankName || '')
    setFormQrCodeUrl(acc.qrCodeUrl || '')
    setFormIsDefault(acc.isDefault)
    setShowModal(true)
  }

  function resetForm() {
    setFormUserId(null)
    setFormUserSearch('')
    setUserResults([])
    setFormAccountType('BANK')
    setFormAccountHolder('')
    setFormAccountNumber('')
    setFormBankName('')
    setFormQrCodeUrl('')
    setFormIsDefault(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const body: any = {
        accountType: formAccountType,
        accountHolder: formAccountHolder,
        accountNumber: formAccountNumber,
        bankName: formBankName || null,
        qrCodeUrl: formQrCodeUrl || null,
        isDefault: formIsDefault,
      }

      let res: Response
      if (editingAccount) {
        body.id = editingAccount.id
        res = await fetch('/api/admin/bank-accounts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        if (!formUserId) {
          setMessage({ type: 'error', text: 'Vui lòng chọn người dùng' })
          setSaving(false)
          return
        }
        body.userId = formUserId
        res = await fetch('/api/admin/bank-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: editingAccount ? 'Đã cập nhật tài khoản!' : 'Đã thêm tài khoản!' })
        setShowModal(false)
        loadData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Lỗi khi lưu' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
    setSaving(false)
  }

  async function handleDelete(acc: BankAccount) {
    if (!window.confirm(`Xóa tài khoản "${acc.accountHolder} - ${acc.accountNumber}"?`)) return
    try {
      const res = await fetch('/api/admin/bank-accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: acc.id }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Đã xóa tài khoản!' })
        loadData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Lỗi khi xóa' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader title="QUẢN LÝ TÀI KHOẢN NHẬN TIỀN" toolSlug="bank-accounts" />

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold outline-none"
            />
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-3 bg-black text-yellow-400 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all"
          >
            <Plus className="w-4 h-4" /> Thêm tài khoản
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 rounded-2xl text-red-700 text-sm font-bold">{error}</div>
        )}

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase text-gray-400">Người dùng</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase text-gray-400">Loại</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase text-gray-400">Chủ TK</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase text-gray-400">Số TK</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase text-gray-400">Ngân hàng</th>
                  <th className="text-center px-4 py-3 text-[10px] font-black uppercase text-gray-400">Mặc định</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase text-gray-400">Ngày tạo</th>
                  <th className="text-center px-4 py-3 text-[10px] font-black uppercase text-gray-400">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-gray-900">{acc.user?.name || 'Không tên'}</p>
                        <p className="text-xs text-gray-400">{acc.user?.email} #{acc.user?.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold uppercase text-gray-500">{accountTypeLabels[acc.accountType] || acc.accountType}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800">{acc.accountHolder}</td>
                    <td className="px-4 py-3 font-mono text-gray-800">{acc.accountNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{acc.bankName || '-'}</td>
                    <td className="px-4 py-3 text-center">{acc.isDefault ? <span className="text-green-500 font-bold">✓</span> : '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(acc.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(acc)}
                          className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-xs font-black uppercase">Không có tài khoản nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 pb-0">
              <h2 className="text-lg font-black uppercase tracking-tight">
                {editingAccount ? 'Sửa tài khoản' : 'Thêm tài khoản'}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingAccount && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Người dùng *</label>
                  <input
                    type="text"
                    value={formUserSearch}
                    onChange={(e) => { setFormUserSearch(e.target.value); setFormUserId(null) }}
                    placeholder="Nhập mã HV, tên, email..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                  />
                  {searchingUser && <p className="text-xs text-gray-400 ml-1">Đang tìm...</p>}
                  {userResults.length > 0 && !formUserId && (
                    <div className="border border-gray-100 rounded-2xl overflow-hidden">
                        {userResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => { setFormUserId(u.id); setFormUserSearch(`${u.name || 'Không tên'} — Mã HV #${u.id}`); setUserResults([]) }}
                          className="w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                        >
                          <span className="inline-flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono font-bold text-gray-500">#{u.id}</span>
                            <span>{u.name || 'Không tên'}</span>
                          </span>
                          <span className="text-gray-400 font-normal block text-xs mt-0.5 ml-7">{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Loại tài khoản</label>
                <select
                  value={formAccountType}
                  onChange={(e) => setFormAccountType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                >
                  {accountTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Chủ tài khoản *</label>
                <input type="text" value={formAccountHolder} onChange={(e) => setFormAccountHolder(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Số tài khoản *</label>
                <input type="text" value={formAccountNumber} onChange={(e) => setFormAccountNumber(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Ngân hàng</label>
                {formAccountType === 'BANK' ? (
                  <select
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                  >
                    <option value="">Chọn ngân hàng...</option>
                    {bankList.map((bank) => (
                      <option key={bank.code} value={bank.name}>{bank.shortName} ({bank.code}) - {bank.name}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={formBankName} onChange={(e) => setFormBankName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" placeholder="Tên đơn vị nhận..." />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link QR Code</label>
                <input type="url" value={formQrCodeUrl} onChange={(e) => setFormQrCodeUrl(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formIsDefault} onChange={(e) => setFormIsDefault(e.target.checked)} className="w-5 h-5 rounded" />
                <span className="text-sm font-bold">Mặc định</span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-black text-yellow-400 py-3.5 rounded-2xl font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                {editingAccount ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
