'use client'

import React from 'react'

// Nút "?" nổi góc dưới-phải — mở popup trợ lý hướng dẫn của trang hiện tại
export default function AssistantFab({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      title="Trợ lý hướng dẫn"
      aria-label="Mở trợ lý hướng dẫn"
      className="fixed bottom-6 right-6 z-[250] w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-white text-2xl font-extrabold shadow-2xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
    >
      <span
        className="inline-block"
        style={{ animation: 'fabFloat 3s ease-in-out infinite' }}
      >
        ?
      </span>
      <style>{`
        @keyframes fabFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </button>
  )
}
