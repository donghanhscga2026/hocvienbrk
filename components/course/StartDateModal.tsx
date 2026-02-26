
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarDays, Loader2 } from "lucide-react"

interface StartDateModalProps {
    isOpen: boolean
    onConfirm: (date: Date) => Promise<void>
}

export default function StartDateModal({ isOpen, onConfirm }: StartDateModalProps) {
    const [loading, setLoading] = useState(false)
    const today = new Date().toISOString().split('T')[0]
    const [selectedDate, setSelectedDate] = useState(today)

    const handleConfirm = async () => {
        setLoading(true)
        try {
            await onConfirm(new Date(selectedDate))
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                    <div className="w-12 h-12 bg-sky-500/10 rounded-full flex items-center justify-center mb-4">
                        <CalendarDays className="w-6 h-6 text-sky-500" />
                    </div>
                    <DialogTitle className="text-xl font-bold">Xác nhận ngày bắt đầu</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Hệ thống sẽ dựa vào ngày này để tính toán Deadline cho toàn bộ các bài học trong khóa của bạn. Lưu ý: Không được chọn ngày trong quá khứ.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="start-date" className="text-sm font-medium text-zinc-300">Chọn ngày bạn muốn bắt đầu lộ trình:</Label>
                        <Input
                            id="start-date"
                            type="date"
                            min={today}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-white"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="w-full bg-sky-600 hover:bg-sky-500 text-white h-11 font-bold"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "XÁC NHẬN BẮT ĐẦU"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
