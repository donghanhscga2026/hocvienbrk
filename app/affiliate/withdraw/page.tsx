'use server'

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { requestPayout } from "@/app/actions/affiliate-actions"

async function getWalletData(userId: number) {
    const wallet = await prisma.affiliateWallet.findUnique({
        where: { userId }
    })
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { bankName: true, bankAccount: true, bankHolder: true }
    })
    const campaign = await prisma.affiliateCampaign.findFirst({
        where: { isActive: true }
    })
    
    return { wallet, user, campaign }
}

export default async function AffiliateWithdrawPage() {
    const session = await auth()
    if (!session?.user?.id) {
        redirect('/login')
    }

    const userId = Number(session.user.id)
    const { wallet, user, campaign } = await getWalletData(userId)

    const availableBalance = wallet?.balance || 0
    const minPayout = campaign?.minPayout || 200000
    const taxRate = campaign?.taxRate || 0
    const feeAmount = campaign?.feeAmount || 3300

    return (
        <div className="min-h-screen bg-brk-background p-6">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <a href="/affiliate" className="text-brk-primary hover:underline mb-2 inline-block">
                        ← Quay lại Dashboard
                    </a>
                    <h1 className="text-2xl font-bold text-brk-on-surface">Rút tiền</h1>
                </div>

                {/* Balance Info */}
                <div className="bg-brk-surface rounded-lg shadow p-6 mb-6">
                    <div className="text-center">
                        <p className="text-brk-muted">Số dư khả dụng</p>
                        <p className="text-4xl font-bold text-brk-accent mt-2">
                            {availableBalance.toLocaleString('vi-VN')}đ
                        </p>
                    </div>
                </div>

                {/* Withdraw Form */}
                <div className="bg-brk-surface rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4 text-brk-on-surface">Yêu cầu rút tiền</h2>
                    
                    {/* Bank Info */}
                    {user?.bankAccount && user?.bankName ? (
                        <div className="mb-6 p-4 bg-brk-background rounded-lg">
                            <h3 className="font-medium mb-2 text-brk-on-surface">Thông tin tài khoản</h3>
                            <p className="text-brk-on-surface"><span className="text-brk-muted">Ngân hàng:</span> {user.bankName}</p>
                            <p className="text-brk-on-surface"><span className="text-brk-muted">Số tài khoản:</span> {user.bankAccount}</p>
                            <p className="text-brk-on-surface"><span className="text-brk-muted">Tên chủ tài khoản:</span> {user.bankHolder}</p>
                        </div>
                    ) : (
                        <div className="mb-6 p-4 bg-brk-accent rounded-lg">
                            <p className="text-brk-primary">
                                Bạn chưa cập nhật thông tin tài khoản ngân hàng. 
                                Vui lòng cập nhật trong <a href="/account-settings" className="underline">Cài đặt tài khoản</a>.
                            </p>
                        </div>
                    )}

                    {/* Amount Calculator */}
                    <form action={async (formData) => {
                        'use server'
                        const amount = Number(formData.get('amount'))
                        await requestPayout(
                            userId,
                            {
                                bankName: user?.bankName || '',
                                bankAccount: user?.bankAccount || '',
                                accountHolder: user?.bankHolder || ''
                            },
                            amount
                        )
                        redirect('/affiliate')
                    }}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-brk-on-surface">Số tiền muốn rút</label>
                            <input
                                type="number"
                                name="amount"
                                min={minPayout}
                                max={availableBalance}
                                placeholder={`Tối thiểu ${minPayout.toLocaleString('vi-VN')}đ`}
                                className="w-full px-4 py-2 border border-brk-outline rounded-lg bg-brk-background text-brk-on-surface"
                                required
                            />
                            <p className="text-sm text-brk-muted mt-1">
                                Số tiền tối thiểu: {minPayout.toLocaleString('vi-VN')}đ
                            </p>
                        </div>

                        {/* Fee Calculator Preview */}
                        <div className="mb-6 p-4 bg-brk-primary/10 rounded-lg">
                            <h3 className="font-medium mb-2 text-brk-on-surface">Chi tiết phí</h3>
                            <div className="text-sm space-y-1 text-brk-on-surface">
                                <div className="flex justify-between">
                                    <span>Phí chuyển khoản:</span>
                                    <span>{feeAmount.toLocaleString('vi-VN')}đ</span>
                                </div>
                                {taxRate > 0 && (
                                <div className="flex justify-between">
                                    <span>Thuế ({taxRate}%):</span>
                                    <span>Áp dụng khi {'>'} 2 triệu</span>
                                </div>
                                )}
                                <div className="flex justify-between font-medium pt-2 border-t border-brk-outline">
                                    <span>Thực nhận (ước tính):</span>
                                    <span className="text-brk-accent">
                                        ~{(availableBalance - feeAmount).toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={availableBalance < minPayout || !user?.bankAccount}
                            className="w-full bg-brk-accent text-brk-on-primary py-3 rounded-lg font-medium hover:opacity-90 disabled:bg-brk-background disabled:text-brk-muted disabled:cursor-not-allowed"
                        >
                            Gửi yêu cầu rút tiền
                        </button>
                    </form>
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-brk-background rounded-lg">
                    <h3 className="font-medium mb-2 text-brk-on-surface">Lưu ý</h3>
                    <ul className="text-sm text-brk-muted space-y-1">
                        <li>• Yêu cầu rút tiền sẽ được xử lý trong 24-48 giờ</li>
                        <li>• Phí chuyển khoản: {feeAmount.toLocaleString('vi-VN')}đ/lần</li>
                        {taxRate > 0 && (
                            <li>• Thuế TNCN {taxRate}% áp dụng cho khoản thanh toán trên 2 triệu đồng</li>
                        )}
                        <li>• Đảm bảo thông tin tài khoản ngân hàng chính xác</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
