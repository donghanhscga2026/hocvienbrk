'use client'

import { BookOpen, Lightbulb, GraduationCap, UsersRound, Cpu, TrendingUp, MessageCircle } from 'lucide-react'

/** Minh họa vector nhẹ, màu từ nhận diện; không dùng ảnh người hoặc chữ trong bitmap. */
export default function WiKnowledgeArt({ ecosystem = false }: { ecosystem?: boolean }) {
  const nodes = ecosystem
    ? [{ icon: BookOpen, label: 'Tri thức', x: 27, y: 14 }, { icon: Cpu, label: 'Công nghệ', x: 76, y: 17 }, { icon: Lightbulb, label: 'Sáng tạo', x: 13, y: 47 }, { icon: TrendingUp, label: 'Kinh doanh', x: 84, y: 57 }, { icon: UsersRound, label: 'Cộng đồng', x: 34, y: 76 }]
    : [{ icon: Lightbulb, label: '', x: 25, y: 22 }, { icon: GraduationCap, label: '', x: 53, y: 12 }, { icon: MessageCircle, label: '', x: 81, y: 31 }, { icon: UsersRound, label: '', x: 64, y: 44 }]
  return <div aria-hidden="true" className="wi300-knowledge-art relative mx-auto aspect-[5/3] w-full max-w-xl">
    <svg viewBox="0 0 500 300" className="absolute inset-0 h-full w-full" fill="none">
      <ellipse cx="260" cy="166" rx="208" ry="127" fill="currentColor" opacity=".04" />
      <ellipse cx="291" cy="129" rx="147" ry="112" fill="currentColor" opacity=".06" transform="rotate(-18 291 129)" />
      <g stroke="currentColor" strokeWidth="1.2" opacity=".45"><path d="M60 230C90 32 275 16 418 100S380 290 166 227" /><path d="M69 142C161 73 196 209 315 104S429 49 445 173" /><path d="M128 66C258 206 323 16 405 93" /></g>
      {[ [69,142], [153,57], [220,168], [315,104], [420,104], [378,219] ].map(([cx,cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="currentColor" opacity=".65" />)}
      <g fill="currentColor"><path d="M60 273C12 250 24 205 26 183C65 206 74 239 60 273Z" opacity=".12" /><path d="M433 263C475 248 476 215 477 195C442 210 424 237 433 263Z" opacity=".15" /><path d="M421 256C412 224 428 193 454 184C452 219 442 242 421 256Z" opacity=".09" /></g>
      {!ecosystem && <g stroke="currentColor" strokeLinejoin="round"><path d="M52 264L250 289L448 264L431 252L250 266L71 252Z" fill="currentColor" strokeWidth="2" /><path d="M250 267C190 208 119 202 81 213L58 254C139 238 192 253 250 275C308 253 360 238 442 254L418 213C380 202 310 208 250 267Z" fill="var(--color-background)" strokeWidth="1.2" /><path d="M250 266C180 203 132 183 98 196L80 235C141 224 191 244 250 270C309 244 359 224 420 235L402 196C368 183 320 203 250 266Z" fill="var(--color-surface)" strokeWidth="1" /><g opacity=".25"><path d="M100 209C150 210 195 232 239 258M95 219C147 218 195 241 233 259M400 209C350 210 305 232 261 258M405 219C353 218 305 241 267 259" /></g><path d="M250 266V279" strokeWidth="2" /></g>}
    </svg>
    {ecosystem && <div className="wi300-network-hub absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-8 border-white/70 text-4xl font-extrabold shadow-lg">Wi<span className="text-brk-accent">.</span></div>}
    {nodes.map(({ icon: Icon, label, x, y }) => <div key={x} style={{ left: `${x}%`, top: `${y}%` }} className="wi300-network-node absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-2xl border border-brk-outline bg-brk-surface/90 p-3 shadow-sm"><Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.7} />{label && <span className="text-[10px] font-semibold sm:text-xs">{label}</span>}</div>)}
  </div>
}
