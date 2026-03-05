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
  DialogFooter
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
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
  const maxSelectableDate = addDays(today, 90)
  const courseDuration = 60

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
      <DialogContent className="max-w-[92vw] sm:max-w-[380px] w-full bg-zinc-900 border-zinc-800 text-white p-4 gap-4 overflow-hidden rounded-xl">

        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-sky-400">
            <CalendarDays className="w-5 h-5" />
            Xác nhận ngày bắt đầu học
          </DialogTitle>
          <p className="text-xs text-zinc-400 leading-tight">
            Hệ thống sẽ tính Deadline dựa trên ngày này (trong 90 ngày tới).
          </p>
        </DialogHeader>

        <div className="space-y-3">
          {/* Display Current Selection */}
          <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
            <span className="text-xs uppercase font-bold text-zinc-500">Ngày bạn chọn:</span>
            <span className="text-sm font-bold text-sky-400">
              {format(selectedDate, 'dd/MM/yyyy', { locale: vi })}
            </span>
          </div>

          {/* Calendar - Compact but Readable */}
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg flex justify-center p-1">
            <DayPicker
              mode="single"
              selected={selectedDate}
              locale={vi}
              onSelect={(date) => {
                if (date && !isBefore(date, today) && !isAfter(date, maxSelectableDate)) {
                  setSelectedDate(date)
                }
              }}
              disabled={(date) => isBefore(date, today) || isAfter(date, maxSelectableDate)}
              classNames={{
                months: "flex flex-col",
                month: "space-y-1",
                caption: "flex justify-center pt-1 relative items-center px-6 mb-1",
                caption_label: "text-xs font-bold text-zinc-200",
                nav: "flex items-center",
                nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-0",
                nav_button_next: "absolute right-0",
                table: "w-full border-collapse",
                head_row: "flex",
                head_cell: "text-zinc-500 w-7 sm:w-8 font-normal text-[0.65rem] uppercase",
                row: "flex w-full mt-0.5",
                cell: "relative p-0 text-center text-xs focus-within:relative focus-within:z-20",
                day: "h-7 w-7 sm:h-8 sm:w-8 p-0 font-normal hover:bg-zinc-800 rounded transition-colors text-xs",
                day_selected: "bg-sky-600 text-white hover:bg-sky-500 font-bold !opacity-100",
                day_today: "text-sky-400 font-bold underline underline-offset-4",
                day_outside: "text-zinc-700 opacity-30",
                day_disabled: "text-zinc-800 opacity-10",
                day_hidden: "invisible",
              }}
            />
          </div>

          {/* Info Summary - Clearer text */}
          <div className="grid grid-cols-2 gap-3 bg-sky-500/5 border border-sky-500/10 rounded-lg p-3 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500">Deadline dự kiến:</span>
              <span className="font-bold text-zinc-100">
                {format(deadline, 'dd/MM/yyyy', { locale: vi })}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-zinc-500">Thời lượng:</span>
              <span className="font-bold text-sky-500">
                {courseDuration} ngày ({daysRemaining} ngày còn lại)
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white h-11 text-sm font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95"
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
