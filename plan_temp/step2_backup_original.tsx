// ========== BACKUP: Bước 2 - ImageViewer ==========
// Ngày: 2026-03-24
// Trước khi sửa:
// 1. Dùng useRef cho tọa độ thay vì setState
// 2. Can thiệp DOM trực tiếp trong onMouseMove
// 3. Chỉ setState khi onMouseUp kết thúc
// ==========================================================

/* FILE: components/ImageViewer.tsx - TRƯỚC */
"use client"

import { useEffect, useRef, useState } from "react"

export default function ImageViewer() {
  const [src, setSrc] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)

  // ... (giữ nguyên các phần khác)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y

    setPosition((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }))

    lastPos.current = { x: e.clientX, y: e.clientY }
  }
  
  // VẤN ĐỀ: setPosition gọi mỗi lần mouse move → re-render liên tục → LAG
