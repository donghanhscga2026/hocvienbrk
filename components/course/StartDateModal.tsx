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
      <DialogContent className="max-w-[92vw] sm:max-w-[400px] w-full bg-zinc-900 border-zinc-800 text-white animate-in fade-in zoom-in-95 duration-200 p-3 sm:p-5 overflow-y-auto max-h-[95vh] gap-3">

        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base sm:text-lg font-bold text-left flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-sky-500" />
            Chọn ngày bắt đầu
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-[10px] sm:text-xs text-left leading-tight">
            Hệ thống tính Deadline dựa trên ngày này (trong 90 ngày tới).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between bg-zinc-950/50 border border-zinc-800/50 rounded px-2 py-1.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Ngày chọn:</span>
            <span className="text-xs font-bold text-sky-400">
              {format(selectedDate, 'dd/MM/yyyy', { locale: vi })}
            </span>
          </div>

          <div className="bg-zinc-950/30 border border-zinc-800/50 rounded flex justify-center p-0.5">
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
                months: "flex flex-col",
                month: "space-y-1",
                caption: "flex justify-center pt-1 relative items-center px-6 mb-1",
                caption_label: "text-xs font-bold text-zinc-300",
                nav: "flex items-center",
                nav_button: "h-5 w-5 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-0",
                nav_button_next: "absolute right-0",
                table: "w-full border-collapse",
                head_row: "flex",
                head_cell: "text-zinc-600 w-7 sm:w-8 font-normal text-[0.6rem] uppercase",
                row: "flex w-full mt-0.5",
                cell: "relative p-0 text-center text-xs focus-within:relative focus-within:z-20",
                day: "h-7 w-7 sm:h-8 sm:w-8 p-0 font-normal hover:bg-zinc-800 rounded transition-colors text-[11px]",
                day_selected: "bg-sky-600 text-white hover:bg-sky-500 font-bold",
                day_today: "text-sky-400 font-bold underline underline-offset-2",
                day_outside: "text-zinc-700 opacity-30",
                day_disabled: "text-zinc-800 opacity-10",
                day_hidden: "invisible",
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 bg-sky-500/5 border border-sky-500/10 rounded p-2 text-[10px]">
            <div className="flex flex-col">
              <span className="text-zinc-500">Deadline:</span>
              <span className="font-bold text-zinc-200">
                {format(deadline, 'dd/MM/yyyy', { locale: vi })}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-zinc-500">Còn lại:</span>
              <span className="font-bold text-sky-500">
                {daysRemaining} ngày
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-1">
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white h-9 font-bold text-xs"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "XÁC NHẬN BẮT ĐẦU"
            )}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
