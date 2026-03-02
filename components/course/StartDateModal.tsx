'use client'

import { useState, useMemo } from 'react'
import {
  format,
  isBefore,
  isAfter,
  startOfDay,
  addDays,
  differenceInDays
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CalendarDays, Loader2 } from "lucide-react"

interface StartDateModalProps {
  isOpen: boolean
  onConfirm: (date: Date) => Promise<void>
}

export default function StartDateModal({
  isOpen,
  onConfirm
}: StartDateModalProps) {

  const today = startOfDay(new Date())
  const maxSelectableDate = addDays(today, 90) // 👈 chỉ cho chọn trong 90 ngày
  const courseDuration = 60 // 👈 giả sử khóa học 60 ngày

  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [loading, setLoading] = useState(false)

  const deadline = useMemo(() => {
    return addDays(selectedDate, courseDuration)
  }, [selectedDate])

  const daysRemaining = useMemo(() => {
    return differenceInDays(deadline, today)
  }, [deadline, today])

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm(selectedDate)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[520px] bg-zinc-900 border-zinc-800 text-white animate-in fade-in zoom-in-95 duration-200">

        <DialogHeader>
          <div className="w-12 h-12 bg-sky-500/10 rounded-full flex items-center justify-center mb-4">
            <CalendarDays className="w-6 h-6 text-sky-500" />
          </div>

          <DialogTitle className="text-xl font-bold">
            Xác nhận ngày bắt đầu
          </DialogTitle>

          <DialogDescription className="text-zinc-400">
            Hệ thống sẽ dựa vào ngày này để tính Deadline cho toàn bộ các bài học.
            Bạn chỉ có thể chọn trong vòng 90 ngày kể từ hôm nay.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">

          <div className="space-y-2">
            <Label className="text-sm font-medium text-zinc-300">
              Ngày bắt đầu:
            </Label>

            <div className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm font-medium">
              {format(selectedDate, 'dd/MM/yyyy', { locale: vi })}
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-md p-3">

            <DayPicker
              mode="single"
              selected={selectedDate}
              locale={vi}
              onSelect={(date) => {
                if (
                  date &&
                  !isBefore(date, today) &&
                  !isAfter(date, maxSelectableDate)
                ) {
                  setSelectedDate(date)
                }
              }}
              disabled={(date) =>
                isBefore(date, today) ||
                isAfter(date, maxSelectableDate)
              }
              classNames={{
                day_selected:
                  "bg-sky-600 text-white hover:bg-sky-500",
                day_today:
                  "border border-sky-500",
                head_cell: "text-zinc-400 text-xs",
                cell: "text-sm",
              }}
            />
          </div>

          {/* Thông tin preview */}
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-4 space-y-2 text-sm">

            <div className="flex justify-between">
              <span className="text-zinc-400">Deadline dự kiến:</span>
              <span className="font-semibold text-white">
                {format(deadline, 'dd/MM/yyyy', { locale: vi })}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-400">Thời lượng khóa:</span>
              <span className="font-semibold text-white">
                {courseDuration} ngày
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-400">Số ngày còn lại từ hôm nay:</span>
              <span className="font-semibold text-sky-400">
                {daysRemaining} ngày
              </span>
            </div>

          </div>

        </div>

        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white h-11 font-bold transition-all"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "XÁC NHẬN BẮT ĐẦU"
            )}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
