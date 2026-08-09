import { cache } from 'react'
import { auth } from '@/auth'

/**
 * [OPTIMIZE] `auth()` của NextAuth v5 không tự memoize theo request khi gọi
 * trong React Server Component — layout.tsx và page.tsx bên trong đều gọi
 * lại, tức giải mã JWT 2 lần/request. Bọc bằng React cache() để dedupe trong
 * cùng 1 lượt render, không đổi hành vi.
 *
 * CHỈ dùng hàm này ở Server Component (layout/page) đọc session để hiển thị
 * UI. KHÔNG dùng để thay `auth` gốc trong middleware (proxy.ts) hay khi bọc
 * Route Handler (`auth(handler)`) — cache() không phù hợp cho 2 cách dùng đó.
 */
export const getSession = cache(() => auth())
