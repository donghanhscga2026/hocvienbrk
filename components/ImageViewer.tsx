"use client"

import { useEffect, useRef, useState } from "react"

export default function ImageViewer() {
  const [src, setSrc] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)
  const positionRef = useRef({ x: 0, y: 0 }) // [OPTIMIZE] Dùng ref cho tọa độ để tránh re-render

  // Click ảnh trong prose
  useEffect(() => {
    const handleClick = (e: any) => {
      const img = e.target.closest(".prose img")
      if (!img) return
      setSrc(img.src)
      setScale(1)
      setPosition({ x: 0, y: 0 })
      positionRef.current = { x: 0, y: 0 }
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  // ESC đóng
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSrc(null)
    }

    if (src) document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [src])

  if (!src) return null

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setScale((prev) =>
      e.deltaY < 0 ? Math.min(prev + 0.15, 6) : Math.max(prev - 0.15, 1)
    )
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return
    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }

  // [OPTIMIZE] Can thiệp DOM trực tiếp, không re-render
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y

    // Cập nhật ref và DOM trực tiếp
    positionRef.current = {
      x: positionRef.current.x + dx,
      y: positionRef.current.y + dy,
    }

    if (imgRef.current) {
      imgRef.current.style.transform = `translate(${positionRef.current.x}px, ${positionRef.current.y}px) scale(${scale})`
    }

    lastPos.current = { x: e.clientX, y: e.clientY }
  }

  // [OPTIMIZE] Chỉ cập nhật state khi kết thúc drag
  const handleMouseUp = () => {
    if (dragging.current) {
      setPosition({ ...positionRef.current })
    }
    dragging.current = false
  }

  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2)
    } else {
      setScale(1)
      setPosition({ x: 0, y: 0 })
      positionRef.current = { x: 0, y: 0 }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center"
      onClick={() => setSrc(null)}
    >
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          className="select-none max-w-[90vw] max-h-[90vh] object-contain"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: dragging.current ? "none" : "transform 0.2s ease",
            cursor: scale > 1 ? "grab" : "zoom-in",
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        />

        <div className="absolute top-5 right-5 flex gap-2">
          <button
            onClick={() => setScale((s) => Math.min(s + 0.3, 6))}
            className="bg-white text-black px-3 py-1 rounded shadow"
          >
            +
          </button>
          <button
            onClick={() => {
              setScale(1)
              setPosition({ x: 0, y: 0 })
              positionRef.current = { x: 0, y: 0 }
              if (imgRef.current) {
                imgRef.current.style.transform = "translate(0px, 0px) scale(1)"
              }
            }}
            className="bg-white text-black px-3 py-1 rounded shadow"
          >
            Reset
          </button>
          <button
            onClick={() => setSrc(null)}
            className="bg-white text-black px-3 py-1 rounded shadow"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
