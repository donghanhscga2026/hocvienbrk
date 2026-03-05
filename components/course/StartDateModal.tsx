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
      <DialogContent className="max-w-[90vw] sm:max-w-[340px] w-full bg-zinc-900 border-zinc-800 text-white p-3 gap-2 overflow-hidden rounded-xl">

        <DialogHeader className="space-y-0.5">
          <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-1.5 text-sky-400">
            <CalendarDays className="w-3.5 h-3.5" />
            Chọn ngày bắt đầu học
          </DialogTitle>
          <p className="text-[10px] text-zinc-500 italic">Hệ thống sẽ tính Deadline dựa trên ngày này.</p>
        </DialogHeader>

        <div className="space-y-2">
          {/* Display Current Selection */}
          <div className="flex items-center justify-between bg-zinc-950/50 border border-zinc-800/50 rounded-lg px-2 py-1">
            <span className="text-[9px] uppercase font-bold text-zinc-500">Ngày bắt đầu:</span>
            <span className="text-[11px] font-black text-white bg-sky-600/20 px-1.5 py-0.5 rounded">
              {format(selectedDate, 'dd/MM/yyyy', { locale: vi })}
            </span>
          </div>

          {/* Calendar - Super Compact */}
          <div className="bg-zinc-950/30 border border-zinc-800/30 rounded-lg flex justify-center p-0.5">
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
                month: "space-y-0.5",
                caption: "flex justify-center pt-0.5 relative items-center px-4 mb-0.5",
                caption_label: "text-[10px] font-bold text-zinc-400",
                nav: "flex items-center",
                nav_button: "h-4 w-4 bg-transparent p-0 opacity-40 hover:opacity-100",
                nav_button_previous: "absolute left-0",
                nav_button_next: "absolute right-0",
                table: "w-full border-collapse",
                head_row: "flex",
                head_cell: "text-zinc-600 w-6 sm:w-7 font-normal text-[0.55rem] uppercase",
                row: "flex w-full mt-0",
                cell: "relative p-0 text-center text-[10px] focus-within:relative focus-within:z-20",
                day: "h-6 w-6 sm:h-7 sm:w-7 p-0 font-normal hover:bg-zinc-800 rounded-sm transition-colors",
                day_selected: "bg-sky-600 text-white hover:bg-sky-500 font-bold !opacity-100",
                day_today: "text-sky-500 font-bold border-b border-sky-500",
                day_outside: "text-zinc-800 opacity-20",
                day_disabled: "text-zinc-900 opacity-5",
                day_hidden: "invisible",
              }}
            />
          </div>

          {/* Info Summary - Horizontal & Tiny */}
          <div className="flex items-center justify-between bg-sky-500/5 border border-sky-500/10 rounded-md px-2 py-1.5 text-[9px]">
            <div className="flex flex-col gap-0.5">
              <span className="text-zinc-500 leading-none">Deadline dự kiến:</span>
              <span className="font-bold text-zinc-300 leading-none">
                {format(deadline, 'dd/MM/yyyy', { locale: vi })}
              </span>
            </div>
            <div className="h-6 w-px bg-zinc-800 mx-1"></div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-zinc-500 leading-none">Thời lượng:</span>
              <span className="font-bold text-sky-500 leading-none">
                {courseDuration} ngày ({daysRemaining} ngày còn lại)
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-0.5">
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white h-8 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              "XÁC NHẬN BẮT ĐẦU"
            )}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
