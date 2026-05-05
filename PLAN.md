# PLAN.md — Tài liệu kỹ thuật dự án HocVien-BRK
> Cập nhật lần cuối: **2026-04-23 19:10**  
> Dùng để tiếp tục công việc khi bị ngắt đột ngột  
> ⚡ Cập nhật **ngay sau mỗi thay đổi code**

---

## 🗓️ SESSION 2026-04-21 → 2026-04-22: TCA Sync + Genealogy Tree

---

## ✅ PHẦN 1: TCA SYNC PIPELINE (HOÀN THÀNH)

### Mục tiêu
Đồng bộ dữ liệu thành viên từ TCA portal về DB production qua Chrome Extension, không bị crash và không bị skip.

### Các file đã sửa

#### 1. `/app/api/sync-tca/route.ts`
**Vấn đề**: `prisma.user.create()` crash với "Unique constraint failed on id" khi user đã tồn tại.  
**Fix (dòng ~150-174)**: Thay `userModel.create` bằng conditional check:
```ts
// Kiểm tra user tồn tại trước khi create
const existingUser = await prisma.user.findUnique({ where: { id: userId } })
if (!existingUser) {
    await prisma.user.create({ ... })
    await addUserToClosure(...)  // Chỉ gọi khi user MỚI
} else {
    // Skip create, chỉ upsert TCAMember
}
```

**Fix score parsing (dòng ~215-230)**:
```ts
// TCA dùng '.' là dấu thập phân: '17.463' = 17.463 điểm (KHÔNG phải 17,463)
const parseScore = (raw?: string): number => {
    if (!raw || raw === '-' || raw === '0') return 0
    const normalized = raw.trim().replace(',', '.')  // Chỉ replace ',', KHÔNG xóa '.'
    return parseFloat(normalized) || 0
}
```

#### 2. `/app/api/sync-tca/preview/route.ts`
**Fix**: Thêm các case bị thiếu (`Pe S TCA`, `pE S TCA`, etc.) và đổi default `PE S TCA` từ `SKIP` → `TCA` để luôn update TCAMember.

#### 3. `/chrome-extension-tca/manifest.json`
**Fix** (version 7.3.0): Thêm localhost vào `host_permissions`:
```json
"host_permissions": [
    "*://portal.tca.com.vn/*",
    "*://giautoandien.io.vn/*",
    "http://localhost:3000/*",
    "http://127.0.0.1:3000/*"
]
```

#### 4. `/chrome-extension-tca/content-script.js`
**Fix 1**: Auto-detect API server — ping localhost:3000 trước (timeout 1.5s), nếu không phản hồi dùng production:
```js
async function detectApiBase() {
    try {
        const res = await fetch(LOCAL_API + '/api/sync-tca', { signal: ... })
        if (res.ok || res.status < 500) {
            API_BASE = LOCAL_API  // Dùng localhost
            return
        }
    } catch (e) { /* fallback to production */ }
}
```

**Fix 2**: Client-side action override — convert `SKIP` → `TCA`/`E TCA`/`P TCA` trước khi gửi lên server (trong `executeFinalSync`).

**Fix 3**: Gọi `detectApiBase()` trước `callPreviewAPI()` khi tất cả member info đã fetch xong.

### Trạng thái TCA Sync
- ✅ Không còn crash Unique constraint
- ✅ TCAMember được upsert đúng (score/level)
- ✅ Extension tự phát hiện localhost:3000 vs production
- ✅ Điểm số parse đúng dạng thập phân (17.463 → 17.463, không phải 17463)
- ⚠️ Chưa deploy code mới lên production (giautoandien.io.vn) — chỉ chạy đúng khi local server bật

---

## ✅ PHẦN 2: GENEALOGY TREE — BUG FIXES (HOÀN THÀNH)

### File: `/app/actions/admin-actions.ts`

#### Bug: totalSubCount sai ở F2, F3+ nodes
**Root cause**: Code đang tìm trong closure của **cha** để đếm descendants của **con** → luôn = 1.
```ts
// SAI: tìm trong f1Closures (closure của cha)
totalSubCount: f1Closures.filter(c => c.userId === f2.userId).length || 1

// ĐÚNG: lấy closure của chính f2
totalSubCount: (closureByAncestor.get(f2.autoId) || []).length
```

**Quy tắc thống nhất** (áp dụng cho F1, F2, F3+):
```
totalSubCount(NODE_X) = closureByAncestor.get(NODE_X.autoId).length
```

**Đã fix** tại:
- Dòng 218: F3+ nodes trong `buildFullSubtree`
- Dòng 245: F2 nodes trong `f2Subtrees.map`

#### Xác nhận nguồn dữ liệu
- `totalSubCount` tính từ `systemClosure` (đúng cho đa hệ thống TCA/KTC/etc)
- `TCAMember` chỉ dùng cho `level`, `personalScore`, `totalScore` — KHÔNG ảnh hưởng cây phả hệ

---

## ✅ PHẦN 3: GENEALOGY TREE — UI OPTIMIZATION (HOÀN THÀNH)

### File: `/app/tools/genealogy/page.tsx`

#### 3.1 Giảm khoảng cách nodes (compact)
```ts
// TRƯỚC         // SAU
NODE_WIDTH = 250  → 200
NODE_HEIGHT = 160 → 130
HORIZONTAL_SPACING = 50  → 20
VERTICAL_SPACING = 350   → 270   // Tăng thêm 2 lần: 350→220→270
```

> **Lý do 270 (không phải 220)**: Cards có TCA data cao hơn cards không có nên đường line bị lệch. Tăng VERTICAL_SPACING cho thêm khoảng thở giữa các tầng.

#### 3.2 GenealogyCard — Tối ưu compact mode
**Vấn đề**: Card luôn hiển thị 3 cột điểm (CÁ NHÂN/ĐỘI NHÓM/ĐIỂM ĐỘI) dù giá trị là `—`.

**Fix logic hiển thị** (conditional render):
```tsx
{hasTcaData ? (
    // TCA: hiện đầy đủ 3 cột điểm
    <div>CÁ NHÂN | ĐỘI NHÓM | ĐIỂM ĐỘI</div>
) : (
    // Học viên: chỉ hiện "👥 N thành viên" nhỏ gọn
    <div>👥 {totalSubCount} thành viên</div>
)}
```

**Fix A/B/C buttons** → đổi thành nhãn rõ nghĩa:
| Trước | Sau | Ý nghĩa |
|---|---|---|
| Số tròn A | `LÁ` + số (xanh) | F1 chưa có ai bên dưới |
| Users icon | `N nhánh` (indigo) | F1 có F3+ — click để Focus |
| Số tròn B | `CẠN` + số (sky) | F1 có F2 nhưng chưa F3 |

#### 3.3 Auto-center khi click expand
```ts
// Track node vừa được expand
pendingCenterNodeIdRef.current = id

// Sau khi render xong
if (centerNodeId && positionMap.has(centerNodeId)) {
    setCenter(pos.x, pos.y + NODE_HEIGHT * 2, { zoom: 1.2, duration: 600 })
} else {
    fitView({ padding: 0.15, duration: 700 })  // Load lần đầu
}
```

#### 3.4 positionMap luôn tính (mọi chế độ)
```ts
// TRƯỚC: chỉ tính khi isFullMode || editMode
// SAU: luôn tính để auto-center hoạt động trong compact mode
try {
    const newMap = calculateNodePositions(treeToRender, isFullMode, activeFocusMapRef.current)
    positionMapRef.current = newMap
} catch (e) { ... }
```

#### 3.5 Focus Subtree Mode (TÍNH NĂNG MỚI)
**Mô tả**: Click nút "N nhánh" trên bất kỳ node nào → load toàn bộ cây con từ node đó làm root, hiển thị như Full mode.

**State mới**:
```ts
const [focusedSubtreeNode, setFocusedSubtreeNode] = useState<GenealogyNode | null>(null)
const [focusedNodeName, setFocusedNodeName] = useState<string | null>(null)
```

**Handler**:
```ts
const handleFocusSubtree = useCallback(async (nodeId, nodeName) => {
    // Học viên (systemId=0): getGenealogyChildrenAction(nodeId)
    // TCA/KTC:               getSystemChildrenAction(nodeId, systemId)
    // → buildStandardTree(nodeId, ...) → trả đầy đủ A/B/C/children
    setFocusedSubtreeNode({ ...result.tree, isRoot: true })
}, [selectedSystem])

const handleExitFocusSubtree = useCallback(() => {
    setFocusedSubtreeNode(null)  // Quay về fullTree
}, [])
```

**Render logic**:
```ts
// useEffect theo dõi focusedSubtreeNode
const treeToRender = focusedSubtreeNode ?? fullTree
const isFocusMode = focusedSubtreeNode !== null
const isFullMode = isFocusMode || displayMode === 'full'
// → generateGraphNodes với mode 'full' khi đang focus
```

**Toolbar**: Nút `← Quay về [tên node]` màu amber khi đang focus mode.

**Card**: Nút "N nhánh" gọi `onFocusSubtree(id, name)` thay vì `onToggleExpand`.

#### 3.6 Avatar Semicircle — tiết kiệm chiều cao node
**Yêu cầu**: Thay full circle (64px) bằng nửa hình tròn để tiết kiệm ~28px chiều cao mỗi node.

**Kỹ thuật**: `overflow-hidden` + clip container `h-9` (36px) chứa vòng tròn `h-16` (64px):
```tsx
{/* Avatar wrapper - badge nằm ngoài vùng clip để không bị che */}
<div className="relative z-10 w-16 mx-auto">
  {levelBadgeText && (
    <div className="absolute -top-3 ... z-20">BADGE</div>  {/* nằm ngoài clip */}
  )}
  {/* Clip: chỉ hiện 36px trên cùng của vòng tròn 64px */}
  <div className="overflow-hidden h-9">
    <div className="w-16 h-16 rounded-full ... flex items-start pt-2 justify-center">
      <span>#{id}</span>
    </div>
  </div>
</div>
{/* Card bắt đầu ngay dưới, border-t-0 để liền mạch */}
<div className="bg-white ... pt-2 -mt-0.5 rounded-b-2xl border-t-0">
```

**Kết quả**:
- Avatar height: 64px → 36px (tiết kiệm 28px)
- Card `pt-6 -mt-5` → `pt-2 -mt-0.5` (không cần overlap nhiều)
- Target highlight: `ring-amber` trên phần clip

#### 3.7 #ID text position — dịch xuống giữa bán nguyệt
**Vấn đề**: `pt-2` (8px) khiến #ID sát đỉnh, vùng phía dưới bán nguyệt trống.  
**Fix**: `pt-2` → `pt-4` (16px), đưa text về gần tâm vùng hiển thị 36px.

#### 3.8 Level Badge — pill → hình tròn màu bổ trợ
**Yêu cầu**: Badge cấp từ chữ nhật pill → hình tròn `w-6 h-6`, màu tương phản với semicircle.

**Palette màu** (complementàry — khác tône):
| Tầng | Semicircle (getLevelColor) | Badge (getLevelBadgeColor) |
|---|---|---|
| Root | amber→orange | **teal** |
| F1 | emerald→teal | **amber** |
| F2 | blue→indigo | **rose** |
| F3 | violet→purple | **emerald** |
| F4+ | rose→pink | **sky** |

**Badge JSX**:
```tsx
<div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-20
  w-6 h-6 rounded-full flex items-center justify-center
  text-[8px] font-black border-2 border-white shadow-md
  ${getLevelBadgeColor(colorDepth)}`}>
  {tcaLevel != null ? tcaLevel : '★'}
</div>
```
Nội dung badge: số cấp thực (1, 2, 3...) hoặc `★` cho Root.

---

## 🔄 TRẠNG THÁI HIỆN TẠI

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| TCA Sync pipeline | ✅ Code đúng | Cần deploy để production dùng code mới |
| Score parsing (17.463) | ✅ | `Decimal(10,3)` lưu đúng |
| Chrome Extension v7.5.0 | ✅ | Overview data extraction |
| Overview Update (#861) | ✅ | Regex tách điểm từ "Tổ chức phân nhánh" |
| totalSubCount F2/F3 | ✅ | systemClosure-based |
| Card compact Học viên | ✅ | Ẩn score row khi không có TCA data |
| A/B/C labels rõ nghĩa | ✅ | LÁ / N nhánh / CẠN |
| Auto-center on expand | ✅ | setCenter với zoom 1.2 |
| Focus Subtree Mode | ✅ | Click nhánh → view full subtree |
| VERTICAL_SPACING = 270 | ✅ | Đường line không lệch giữa các tầng |
| Avatar Semicircle | ✅ | Tiết kiệm ~28px/node, border-t-0 liền mạch |
| #ID position pt-4 | ✅ | Text nằm giữa bán nguyệt, không sát đỉnh |
| Badge hình tròn màu bổ trợ | ✅ | w-8 h-8 rounded-full, text-[11px], complementary palette |
| **Deploy production** | ⏳ Chưa | Vercel tự deploy khi push master |

---

## 🚀 PHASE TIẾP THEO (gợi ý)

1. **Test Focus Subtree** trên production sau deploy
2. **Verify score update** — sau khi TCA cập nhật điểm thực → sync lại xem `17.463` có lưu đúng không
3. **Thêm loading skeleton** cho Genealogy tree khi đang fetch
4. **Cải thiện modal Group A/B** — hiện chỉ hiện danh sách tên, có thể thêm link đến profile

---

## ✅ PHẦN 4: CLICKABLE LINKS TRONG MÔ TẢ KHÓA HỌC (2026-04-23)

### Mục tiêu
Cho phép URL trong phần mô tả khóa học và nội dung bài học thành link clickable.

### Các file đã sửa

#### 1. `components/course/CourseCard.tsx`
Thêm hàm `makeLinksClickable()` và áp dụng cho phần mô tả:
```ts
const makeLinksClickable = (html: string): string => {
    if (!html) return ''
    const urlRegex = /(\b(https?:\/\/)[^\s<]+)/gi
    return html.replace(urlRegex, (match) => {
        return `<a href="${match}" target="_blank" rel="noopener noreferrer" class="text-brk-accent hover:underline font-bold">${match}</a>`
    })
}
```

#### 2. `components/course/CoursePlayer.tsx`
Thêm cùng hàm `makeLinksClickable()` và áp dụng cho:
- **Dòng ~292**: Tiêu đề bài học (line-clamp-2)
- **Dòng ~405**: Content Modal (whitespace-pre-wrap)

### Trạng thái
- ✅ URL trong mô tả khóa học trên trang chủ clickable
- ✅ URL trong nội dung bài học (Course Player) clickable
- ✅ Link Zalo, Facebook, và mọi URL http/https đều hoạt động

---

## 📁 KEY FILES REFERENCE

| File | Mục đích |
|---|---|
| `app/api/sync-tca/route.ts` | Backend sync endpoint, upsert logic |
| `app/api/sync-tca/preview/route.ts` | Preview sync, action matching logic |
| `app/actions/admin-actions.ts` | `buildStandardTree`, totalSubCount logic |
| `app/tools/genealogy/page.tsx` | Genealogy UI, Focus Subtree Mode |
| `chrome-extension-tca/content-script.js` | Extension, auto-detect API, executeFinalSync |
| `chrome-extension-tca/manifest.json` | Permissions (localhost + production) |
| `prisma/schema.prisma` | TCAMember: `Decimal(10,3)` cho personalScore/totalScore |

---

## 🔧 QUICK COMMANDS

```bash
# Dev server
npm run dev

# TypeScript check
npx tsc --noEmit

# Schema validate
npx prisma validate

# Deploy production
.\auto-commit-push.ps1  → chọn 1 (master → Vercel auto deploy)
```

---

## 📋 CHROME EXTENSION RELOAD PROCEDURE

Bất kỳ khi nào sửa extension:
1. `chrome://extensions` → click ↺ Reload trên "TCA to BRK Sync"
2. Kiểm tra version = **7.3.0**
3. Mở tab `portal.tca.com.vn` → nhấn **F5**
4. Console phải log: `🟢 Dùng LOCAL server: http://localhost:3000`

---

*Tài liệu này được cập nhật **ngay sau mỗi thay đổi code**, không chờ cuối phiên.*

---

## ✅ PHẦN 5: AFFILIATE REFERRAL FIELD LOCK (2026-05-03)

### Mục tiêu
Khi người dùng truy cập trang đăng ký qua link affiliate (`?ref=...`) hoặc có ref lưu trong localStorage, ô **Mã giới thiệu** phải được điền sẵn và **không cho phép chỉnh sửa**.

### Vấn đề cũ
Dùng `readOnly + onKeyDown prevent + pointer-events-none` để khóa field — là hack CSS/DOM, không đảm bảo data integrity. Ngoài ra chỉ check `urlRef` (URL `?ref=`) mà không check localStorage ref.

### Các file đã sửa

#### `app/register/page.tsx`
- **Vấn đề**: `readOnly={!!urlRef}` chỉ lock khi có `?ref=` trên URL, bỏ sót localStorage ref. Dùng hack `onKeyDown prevent` thay vì pattern chuẩn.
- **Fix**: Áp dụng Form Data Integrity pattern:
```tsx
// Input ẩn: giữ value thật để RHF submit đúng dù field bị disabled
{resolvedRef && <input type="hidden" {...register("referrerId")} value={resolvedRef} />}

// Input hiển thị: disabled + style amber khi đã có ref
<input
    {...(resolvedRef ? {} : register("referrerId"))}
    disabled={!!resolvedRef}
    value={resolvedRef || undefined}
    className={resolvedRef ? 'border-brk-accent/40 bg-brk-accent/10 ...' : '...'}
/>
```
- **Điều kiện lock**: `resolvedRef` (thay vì `urlRef`) — bao gồm cả URL lẫn localStorage

### Trạng thái
- ✅ Vào `?ref=ABC` → ô mã giới thiệu điền sẵn, không cho sửa
- ✅ Ref từ localStorage (click affiliate trước) → cũng bị lock
- ✅ Không có ref → ô bình thường, gõ được
- ✅ Submit vẫn gửi đúng `referrerId` dù field bị `disabled`

---

## ✅ PHẦN 6: TỐI ƯU TÍNH NĂNG ĐỔI MẬT KHẨU (2026-05-03)

### Mục tiêu
Cải thiện UX và tính nhất quán của form đổi mật khẩu trong trang cài đặt tài khoản.

### Vấn đề cũ
1. Validation mật khẩu mới chỉ check `length >= 6` — không nhất quán với trang register (yêu cầu chữ hoa + số + ký tự đặc biệt)
2. Thông báo success và error dùng **cùng màu amber** — không phân biệt được
3. State `saving` dùng chung với form profile — có thể conflict
4. Không có nút show/hide password

### Các file đã sửa

#### `app/account-settings/page.tsx`
- **Thêm state riêng**: `isSavingPassword`, `showCurrentPwd`, `showNewPwd`, `showConfirmPwd`
- **Hàm validation**: `validateNewPassword()` — nhất quán với register: ≥8 ký tự, chữ Hoa, chữ thường, số, ký tự đặc biệt
- **Fix màu message**: success = xanh lá `bg-green-500/10`, error = đỏ `bg-red-500/10`
- **Show/hide password**: Nút 👁 toggle cho cả 3 field (hiện tại, mới, xác nhận)
- **Real-time feedback**: Field xác nhận đổi màu đỏ khi chưa khớp, xanh khi khớp
- **Import thêm**: `Eye, EyeOff` từ lucide-react

### Trạng thái
- ✅ Validation mật khẩu nhất quán với trang register
- ✅ Success = xanh, Error = đỏ — phân biệt rõ ràng
- ✅ Loading state riêng cho form mật khẩu
- ✅ Toggle show/hide cho 3 field mật khẩu
- ✅ Real-time feedback khớp/chưa khớp mật khẩu
- ✅ Server action `changePassword()` hoạt động đúng (không cần sửa)

---

## ✅ PHẦN 7: TỐI ƯU AGENTS.MD — QUY TẮC AI (2026-05-03)

### Mục tiêu
Tái cấu trúc `AGENTS.md` để AI tuân thủ tốt hơn: nguyên tắc quan trọng nổi bật, loại bỏ xung đột/mơ hồ, bổ sung quy tắc cập nhật tài liệu bắt buộc.

### Các thay đổi chính
- Giảm từ 7 → 6 nguyên tắc (hợp nhất trùng lặp)
- Thêm bảng phân loại `edit` vs `write` rõ ràng (dứt khoát khi nào dùng cái nào)
- Tách 2 luồng quy trình: Đơn giản (4 bước) vs Phức tạp (7 bước)
- Thêm **Nguyên tắc 6: Cập nhật tài liệu bắt buộc** sau mỗi thay đổi được xác nhận
- Thêm format chuẩn cho cập nhật `PLAN.md` (Ví dụ G)
- Thêm `docs/` vào cấu trúc thư mục

### Trạng thái
- ✅ AGENTS.md được tối ưu — 250 dòng (từ 306 dòng gốc)
- ✅ Không còn quy tắc xung đột hoặc trùng lặp
- ✅ Quy tắc cập nhật tài liệu được tích hợp vào cả 2 luồng quy trình

---

*Tài liệu này được cập nhật **ngay sau mỗi thay đổi code**, không chờ cuối phiên.*

## ✅ Sửa lỗ hổng Affiliate Data Integrity (2026-05-04)
### Mục tiêu
Ngăn chặn người dùng thao túng eferrerId ẩn trong form đăng ký.
### Các file đã sửa
#### pp/actions/auth-actions.ts`n- Vấn đề: Lấy eferrerId trực tiếp từ formData.
- Fix: Ưu tiên trích xuất eferrerId từ cookie ff_ref do server quản lý.
### Trạng thái
- ✅ Affiliate Cookie được ưu tiên tuyệt đối.
- ✅ Đăng ký hoạt động bình thường.


## ✅ Fix lỗi cập nhật Avatar bằng URL do CORS (2026-05-04)
### Mục tiêu
Giải quyết triệt để lỗi không tải được ảnh avatar từ các domain ngoài do chính sách CORS của trình duyệt chặn.
### Các file đã tạo/sửa
#### [NEW] pp/api/upload/url/route.ts`n- Tạo API proxy phía Server để thay mặt Client tải ảnh từ xa, convert thành base64 trả về cho Client.
#### [MODIFY] pp/account-settings/page.tsx`n- Chuyển etch(url) sang gọi API trung gian /api/upload/url.
### Trạng thái
- ✅ Client nhận ảnh base64 qua API và resize 50x50 bình thường, loại bỏ rủi ro CORS.


## ✅ Tối ưu hoá Giật/Lag khi tạo/sửa Khóa Học (2026-05-04)
### Mục tiêu
Giảm thiểu code đồ sộ và chặn re-render toàn màn hình bằng cách tách các Modals ra thành các component riêng biệt.
### Các file đã tạo/sửa
#### [NEW] components/admin/courses/ImportLessonsModal.tsx`n#### [NEW] components/admin/courses/LessonEditModal.tsx`n#### [NEW] components/admin/courses/AddLessonModal.tsx`n#### [MODIFY] pp/tools/courses/[id]/page.tsx`n#### [MODIFY] pp/tools/courses/new/page.tsx`n- Tách và xoá cứng nội dung 3 popup khỏi 2 file page.tsx.
- Chuyển thành dạng import lazy components (giảm kích thước bundle tải lần đầu và chống re-render).
### Trạng thái
- ✅ Các chức năng thêm, sửa, import bài học vẫn hoạt động bình thường.
- ✅ File page.tsx đã được giảm đi hơn 250 dòng code nặng nhọc.


## ✅ Sửa cảnh báo Hydration (Unoptimized) (2026-05-04)
### Mục tiêu
Đảm bảo tất cả các component sử dụng \useSearchParams\ trong dự án đều được bọc bởi thẻ \<Suspense>\ đúng chuẩn của Next.js 16 (App Router) để tránh các cảnh báo deopt (hạ cấp) xuống Client Rendering khi build.
### Các file đã sửa
#### [MODIFY] pp/page.tsx`n- Vấn đề: \HomePageClient\ đang gọi \useSearchParams\ bên trong nhưng chưa có Suspense boundary ở \pp/page.tsx\.
- Fix: Import \Suspense\ từ \eact\ và bọc toàn bộ thẻ \<HomePageClient>\ kèm \allback\ loader đẹp mắt.
### Trạng thái
- ✅ Quét bằng grep_search không còn component nào bị lọt lưới Suspense.
- ✅ Lỗi Hydration đã được xử lý triệt để, an toàn cho production build.


## ✅ Khắc phục lỗi Video YouTube và Tối ưu bài học TEXT (2026-05-04)
### Mục tiêu
1. Sửa lỗi mất khung hình (chỉ có tiếng không có hình) khi chuyển bài học Video do YouTube API nuốt mất thẻ DOM React.
2. Bổ sung logic hiển thị: Nếu bài học có loại (type) là TEXT, nội dung chữ sẽ được nạp thẳng vào khu vực Video Player 16:9, đồng thời ẩn phần mô tả bên dưới và ẩn nút xem chi tiết trên mobile để tránh trùng lặp nội dung.
### Các file đã sửa
#### [MODIFY] components/course/VideoPlayer.tsx`n- Vấn đề: YT.Player thay thế thẻ div gốc khiến iframe sinh ra mất class kích thước (w-full h-full). Lệnh destroy làm mất thẻ vĩnh viễn trong DOM thật.
- Fix: Bọc thêm thẻ div bảo vệ cho React quản lý, dùng ef cấp key động, ép height/width 100% cho Player.
#### [MODIFY] components/course/CoursePlayer.tsx`n- Vấn đề: Logic hiển thị TEXT đã có trong VideoPlayer nhưng chưa được truyền dữ liệu mồi.
- Fix: Truyền serverPlaylist có định dạng text nếu 	ype === 'TEXT', thêm cờ ẩn giao diện thừa.
### Trạng thái
- ✅ Lỗi mất hình YouTube Video đã được khắc phục hoàn toàn.
- ✅ Bài giảng TEXT hiển thị tập trung, đẹp mắt, giao diện tối giản.


## ✅ [Bổ sung loại bài học ALL] ([2026-05-04])

### Mục tiêu
Bổ sung loại bài học \ALL\ vào hệ thống để kết hợp hiển thị Nội dung dạng văn bản (TEXT) và Chuỗi Video/Tài liệu (PLAYLIST) trong cùng một giao diện Player 16:9 duy nhất, đem lại trải nghiệm học tập liền mạch.

### Các file đã sửa

#### \prisma/schema.prisma\
- Vấn đề: Cần thêm \ALL\ vào schema hiện tại.
- Fix: Bổ sung giá trị \ALL\ vào \enum LessonType\, chạy lệnh đồng bộ \
px prisma db push\ và \
px prisma generate\.

#### \components/course/VideoPlayer.tsx\
- Vấn đề: Logic trước đây chỉ lấy playlist từ \videoUrl\ và bỏ qua \content\ nếu là video.
- Fix:
  - Bổ sung \lessonType\ vào Props.
  - Sửa hàm \useMemo\ tính \playlist\: Nếu \lessonType === 'ALL'\, tự động chèn \content\ vào vị trí đầu tiên của mảng \playlist\.
  - Tích hợp hàm \makeLinksClickable\ vào trong VideoPlayer để hiển thị đúng định dạng các đường link trong khung 16:9.

#### \components/course/CoursePlayer.tsx\
- Vấn đề: Khung mô tả (phía dưới trên Desktop và trong Modal trên Mobile) bị thừa nội dung \content\ khi học viên xem dạng \ALL\.
- Fix:
  - Truyền \lessonType={currentLesson?.type}\ vào \VideoPlayer\.
  - Ẩn hiển thị text mặc định, thay bằng thông báo in nghiêng *"Hãy xem các phần trong playlist bài học."* (Áp dụng cho cả bản Desktop và nút "Xem chi tiết nội dung" ở Mobile).

### Trạng thái
- ✅ Tính năng LessonType \ALL\ hoạt động đúng.
- ✅ Type Check (\npx tsc --noEmit\) không báo lỗi.
- ✅ Các loại bài học \VIDEO\, \TEXT\, \DOCS\ cũ không bị ảnh hưởng.

---

## ✅ PHẦN 8: REFACTOR COURSE DISPLAY + MOBILE UI (2026-05-05)

### Mục tiêu
Loại bỏ redundancy (trùng lặp logic) giữa `CourseSection.tsx` và `CourseCategoryGroup.tsx`, đồng thời thay đổi số khóa học hiển thị trên mobile từ 1 → 3 khóa khi thu gọn.

### Các file đã sửa

#### [NEW] `hooks/useExpandWithCountdown.ts`
- Tạo custom hook mới gộp chung logic expand/collapse + countdown 10s
- Input: `countdownSeconds` (default 10)
- Return: `{ isExpanded, setIsExpanded, countdown, resetTimer, handleActivity }`
- Xử lý: Timer + Interval tự động cleanup trong useEffect

#### [MODIFY] `components/home/CourseSection.tsx`
- **Vấn đề**: Logic expand/collapse + countdown bị lặp lại 2 nơi (CourseSection và CourseCategoryGroup) ~60 dòng duplicate
- **Fix**: 
  - Xóa bỏ state/refs/effects trùng lặp (dòng 187-217 cũ)
  - Import và sử dụng `useExpandWithCountdown()` hook
  - Thay đổi `displayCount` từ responsive (3 desktop/1 mobile) → **cố định 3 khóa** cho cả mobile và desktop
  - Xóa bỏ `useEffect` theo dõi resize window (không cần thiết nữa)

#### [MODIFY] `components/home/CourseSection.tsx` (phần CourseCategoryGroup)
- **Fix**: 
  - Xóa bỏ state/refs/effects trùng lặp (dòng 30-81 cũ)
  - Import và sử dụng `useExpandWithCountdown()` hook
  - Thay đổi `displayCount` từ responsive (3 desktop/1 mobile) → **cố định 3 khóa** cho cả mobile và desktop
  - Xóa bỏ `useEffect` theo dõi resize window (không cần thiết nữa)

### Backup
- File gốc đã lưu: `plan_temp/CourseSection.backup_20260505_1200.tsx`

### Trạng thái
- ✅ Loại bỏ thành công ~120 dòng code duplicate (60 dòng × 2 components)
- ✅ Hook `useExpandWithCountdown` hoạt động đúng (expand/collapse/countdown/reset)
- ✅ Mobile hiển thị 3 khóa khi thu gọn (đã test OK)
- ✅ Desktop hiển thị 3 khóa khi thu gọn (giữ nguyên)
- ✅ Behavior không đổi: Click "Xem thêm" → mở rộng toàn bộ, đếm ngược 10s tự đóng, mouse/touch reset countdown

---

## ✅ PHẦN 9: FIX NEWLINE TRONG MÔ TẢ NGẮN (2026-05-05)

### Mục tiêu
Khắc phục lỗi xuống dòng (`\n`) trong trường `mo_ta_ngan` (DB) không hiển thị đúng trên trang chủ (bị dính liền thành 1 dòng do HTML whitespace collapsing).

### Vấn đề
- Newline `\n` trong DB được lưu đúng
- Khi render bằng `dangerouslySetInnerHTML`, trình duyệt HTML tự động gộp tất cả khoảng trắng/xuống dòng thành 1 dấu cách
- Hàm `makeLinksClickable()` cũ chỉ convert URL → `<a>`, không xử lý `\n`

### Các file đã sửa

#### [MODIFY] `components/course/CourseCard.tsx`
- **Fix**: Sửa hàm `makeLinksClickable()` (dòng 12-20):
  - Bước 1: Convert `\n` → `<br />` trước
  - Bước 2: Convert URL → `<a>` sau (để URL không chứa `<br />`)
```typescript
const makeLinksClickable = (html: string): string => {
    if (!html) return ''
    // 1. Convert newlines to <br />
    let processed = html.replace(/\n/g, '<br />')
    // 2. Make URLs clickable
    const urlRegex = /(\b(https?:\/\/)[^\s<]+)/gi
    processed = processed.replace(urlRegex, (match) => {
        return `<a href="${match}" target="_blank" rel="noopener noreferrer" class="text-brk-accent hover:underline font-bold">${match}</a>`
    })
    return processed
}
```

### Backup
- File gốc đã lưu: `plan_temp/CourseCard.backup_20260505_1230.tsx`

### Trạng thái
- ✅ Newline trong `mo_ta_ngan` hiển thị đúng (có xuống dòng)
- ✅ URL trong mô tả vẫn clickable bình thường
- ✅ Thứ tự xử lý đúng: newline trước → URL sau (đã test OK)

---

## ✅ PHẦN 10: TẠO TRANG QUẢN TRỊ HỆ THỐNG (2026-05-05)

### Mục tiêu
Tạo trang `/tools/admin` để quản trị hệ thống (SystemTree, System, SystemClosure) với tính năng tạo mới và xóa an toàn.

### Các file đã tạo/sửa

#### [NEW] `app/actions/system-actions.ts`
- **`getSystemStatsAction()`**: Lấy thống kê hệ thống (số nodes, closures)
- **`createSystemAction()`**: Tạo hệ thống mới (tự động sinh `onSystem` nếu không nhập)
- **`deleteSystemTreeAction()`**: Xóa hệ thống an toàn (theo thứ tự: SystemClosure → System → SystemTree)
- **Bảo vệ**: Không cho xóa `onSystem` 0,1,2 (hệ thống mặc định)
- **Ghi log**: Mọi thao tác xóa đều ghi vào `SyncLog` để có thể khôi phục

#### [NEW] `components/admin/system/CreateSystemModal.tsx`
- Modal tạo hệ thống mới (dùng shadcn/ui Dialog)
- Validation: Tên không được để trống
- Tự động sinh `onSystem` = max + 1 nếu không nhập

#### [NEW] `components/admin/system/DeleteConfirmDialog.tsx`
- Dialog xác nhận xóa (yêu cầu nhập tên hệ thống để xác nhận)
- Hiển thị thống kê: "Sẽ xóa X nodes, Y closure records"
- Bảo vệ: Disable nút xóa nếu chưa nhập đúng tên

#### [NEW] `app/tools/admin/page.tsx`
- Trang quản trị với bảng hiển thị hệ thống
- Stats cards: Tổng số hệ thống, tổng nodes, tổng closures
- Actions: Tạo mới, Xóa (với xác nhận)

#### [MODIFY] `app/tools/AdminNav.tsx`
- Thêm mục "Hệ Thống" vào menu navigation
- **Backup**: `plan_temp/AdminNav_backup_20260505_1400.patch`

### Trạng thái
- ✅ Tạo hệ thống mới hoạt động đúng
- ✅ Xóa hệ thống an toàn (có SyncLog)
- ✅ Bảo vệ hệ thống mặc định (0,1,2)
- ✅ Build thành công (`npm run build` → ✅ Compiled)
- ✅ Đã test thực tế (user xác nhận "ok")

---

## ✅ FIX LỖI ĐĂNG NHẬP "CredentialsSignin" (2026-05-05)

### Mục tiêu
Sửa lỗi hiển thị thông báo sai khi đăng nhập sai thông tin.

### Vấn đề
- NextAuth trả về lỗi `"CredentialsSignin"` (class CredentialsSignin)
- Code cũ kiểm tra `"CredentialsSignin"` (viết hoa C) → không bao giờ khớp
- Kết quả: Luôn hiển thị "Đã xảy ra lỗi không mong muốn" thay vì "Thông tin đăng nhập không chính xác"

### Các file đã sửa

#### [MODIFY] `app/login/page.tsx`
- **Fix (dòng 54)**: Đổi từ `result.error === "CredentialsSignin"` 
  → `result.error.includes("CredentialsSignin")`
- **Cải tiến**: Dùng `includes()` cho tất cả các trường hợp kiểm tra lỗi (USER_NOT_FOUND, INVALID_PASSWORD, etc.)
- **Mặc định**: Nếu lỗi không xác định → hiển thị "Thông tin đăng nhập không chính xác"

### Trạng thái
- ✅ Hiển thị đúng thông báo lỗi khi đăng nhập sai
- ✅ Build thành công (`npm run build` → ✅ Compiled)
- ✅ Đã test thực tế (user xác nhận "ok")

## ✅ Sửa lỗi hiển thị thông báo đăng nhập ([2026-05-05])

### Mục tiêu
Khắc phục lỗi chỉ hiện thông báo generic "CredentialsSignin" khi đăng nhập thất bại, thay vào đó hiển thị lỗi tiếng Việt chi tiết (VD: "Sai mật khẩu", "Không tìm thấy tài khoản").

### Các file đã sửa
#### `app/login/page.tsx`
- Vấn đề: `signIn` dùng `redirect: false` ngăn cản NextAuth v5 đẩy mã lỗi (errorCode) vào URL, khiến client không bắt được lỗi cụ thể.
- Fix:
  - Bỏ `redirect: false` (chuyển sang mặc định `true`).
  - Thêm `useEffect` để bắt `errorCode` từ URL parameters khi trang load lại sau khi redirect.
  - Ánh xạ các mã lỗi (`USER_NOT_FOUND`, `INVALID_PASSWORD`, v.v.) sang thông báo tiếng Việt thân thiện.

### Trạng thái
- ✅ Hiển thị lỗi chi tiết khi sai email/SĐT/mã học viên.
- ✅ Hiển thị lỗi chi tiết khi sai mật khẩu.
- ✅ Tự động bắt lỗi từ URL khi NextAuth redirect về.
