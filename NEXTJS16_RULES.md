# Next.js 16 Migration & Best Practices

## Common Build Errors to Avoid

### 1. Route Handler `params` must be Promise
```typescript
// ❌ SAI (Next.js 15)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params
}

// ✅ ĐÚNG (Next.js 16)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
}
```

### 2. `useSearchParams()` requires Suspense boundary
```typescript
// ❌ SAI - useSearchParams ở component cha không có Suspense
export default function Page() {
    const searchParams = useSearchParams() // Lỗi build!
}

// ✅ ĐÚNG - Tách component và wrap trong Suspense
function PageContent() {
    const searchParams = useSearchParams()
    // ... use searchParams
}

export default function Page() {
    return (
        <Suspense fallback={<Loading />}>
            <PageContent />
        </Suspense>
    )
}
```

### 3. `revalidateTag` is not available in all Next.js versions
```typescript
// ❌ SAI - revalidateTag có thể không tồn tại
import { revalidateTag } from "next/cache"
revalidateTag('some-tag')

// ✅ ĐÚNG - Dùng revalidatePath thay thế
import { revalidatePath } from "next/cache"
revalidatePath('/some-page')
```

### 4. Always run `prisma generate` after schema changes
```bash
# Sau khi sửa schema.prisma, chạy:
npx prisma generate

# Sau đó build/deploy
npm run build
```

## Pre-Deployment Checklist

- [ ] Chạy `npx prisma generate` sau mỗi lần sửa schema
- [ ] Test local: `npm run build` trước khi deploy
- [ ] Kiểm tra tất cả route handlers có `await params` (Next.js 16)
- [ ] Kiểm tra tất cả `useSearchParams()` được wrap trong Suspense
- [ ] Không dùng `revalidateTag` - dùng `revalidatePath` thay thế

## Lazy Loading State Tips

### Tránh re-render vô hạn khi dùng state cho navigation
```typescript
// ❌ SAI - setState trong setTimeout gây re-render và override
useEffect(() => {
    if (expandedId) {
        setCenter(...)
        setExpandedId(null) // ❌ Trigger useEffect lại!
    }
}, [..., expandedId])

// ✅ ĐÚNG - Dùng ref thay vì state cho giá trị tạm thời
const expandedIdRef = useRef<number | null>(null)

const handleExpand = (id: number) => {
    expandedIdRef.current = id
    // ... fetch data
}

useEffect(() => {
    if (expandedIdRef.current) {
        const pos = getPosition(...)
        setCenter(pos)
        // Không set state ở đây!
    }
}, [...])
```

## TypeScript Strict Mode

- Khai báo explicit types cho parameters
- Tránh `any` type
- Check "possibly undefined" warnings trước khi deploy
