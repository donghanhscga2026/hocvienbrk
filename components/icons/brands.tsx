import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * Icon thương hiệu Facebook / YouTube.
 * Lucide đã loại bỏ toàn bộ brand icon ở bản 1.x (deprecated từ lâu) —
 * hai icon này giữ nguyên đúng nét vẽ stroke của Lucide bản cũ để giao
 * diện không đổi, nhận cùng LucideProps nên dùng thay thế trực tiếp ở
 * mọi nơi đang chờ kiểu LucideIcon.
 */

export const FacebookBrandIcon = forwardRef<SVGSVGElement, LucideProps>(
    function FacebookBrandIcon({ size = 24, ...props }, ref) {
        return (
            <svg
                ref={ref}
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                {...props}
            >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
        )
    },
)

export const YoutubeBrandIcon = forwardRef<SVGSVGElement, LucideProps>(
    function YoutubeBrandIcon({ size = 24, ...props }, ref) {
        return (
            <svg
                ref={ref}
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                {...props}
            >
                <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                <path d="m10 15 5-3-5-3z" />
            </svg>
        )
    },
)
