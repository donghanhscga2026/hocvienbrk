# GENEALOGY UI UPGRADE — Kế hoạch Nâng cấp Giao diện Nhân Mạch

> **Ngày bắt đầu**: 2026-07-28
> **Trạng thái hiện tại**: ✅ Steps 1-8 DONE — All tabs wired, polish complete, tsc clean
> **File chính**: `app/tools/genealogy/page.tsx` (~2500 dòng)
> **Liên kết**: `PLAN.md` → Section "Hệ thống Cây Nhân Mạch"

---

## 1. MỤC TIÊU

Nâng cấp giao diện trang Nhân Mạch (`/tools/genealogy`) từ cấu trúc **1 trang đơn** (monolithic) sang kiến trúc **3-tab** hiện đại, tối ưu cho cả điện thoại và máy tính.

### Yêu cầu cốt lõi
- **3 tab**: Dashboard | Diagram | Settings (admin only)
- **Cấu trúc mỗi tab**: Header (fixed) + Content Blocks + Status Bar (fixed bottom) + SlidePanel (ẩn/hiện)
- **Diagram Tab**: Chuyển toàn bộ nội dung trang cũ vào đây
- **Responsive**: Tối ưu cho cả mobile và desktop
- **SlidePanel**: Trượt từ phải/trên/dưới tùy vị trí icon trigger

---

## 2. TÌNH HIỆN TẠI (TRƯỚC NÂNG CẤP)

### File hiện tại
```
app/tools/genealogy/
  page.tsx                    → Monolithic ~2500 dòng (toàn bộ UI)
  ytb_plan.md                 → Planning doc cho YTB system

components/genealogy/
  AdminTab.tsx                → Admin panel CRUD systems (150 dòng)
  GroupModal.tsx              → Modal nhóm A/B (170 dòng)
  SystemConnectionPathModal.tsx → Modal nhân duyên (137 dòng)

app/api/system-tree/
  route.ts                    → POST create root
  add-child/route.ts          → POST add child
  delete-node/route.ts        → POST delete node
```

### Cấu trúc component hiện tại
```
GenealogyPage (default export)
  └── ReactFlowProvider
       └── GenealogyFlow (~1300 dòng — TOÀN BỘ logic)
            ├── MainHeader
            ├── Toolbar (system selector, filters, search, edit mode) ← 250 dòng
            ├── ReactFlow canvas (tree visualization)
            ├── GroupModal
            ├── GenealogyAdminTab (modal)
            ├── SharingTreeModal
            ├── AddF1Modal
            ├── DeleteNodeModal
            ├── CreateRootModal
            ├── MemberDetailsModal (~700 dòng)
            │    ├── InfoItem
            │    ├── WalletItem
            │    ├── HistoryModal
            │    └── SystemConnectionPathModal
            ├── GenealogyCard (custom ReactFlow node)
            └── SearchNodeCard
```

### Server Actions liên quan (16 actions)
| Action | Purpose |
|--------|---------|
| `getGenealogyTreeAction` | Load tree hệ thống Thành viên (system=0) |
| `getGenealogyChildrenAction` | Lazy-load children (system=0) |
| `getSystemTreeAction` | Load tree hệ thống số (TCA, BRK...) |
| `getSystemChildrenAction` | Lazy-load children (hệ thống số) |
| `searchGenealogyByIdAction` | Tìm kiếm theo ID |
| `getAvailableSystemsAction` | Danh sách hệ thống |
| `getCurrentUserRoleAction` | Role, isRoot, canViewFull |
| `createSystemRootAction` | Tạo root cho hệ thống |
| `getMemberDetailsAction` | Chi tiết thành viên |
| `getSystemRootUserAction` | Root user của hệ thống |
| `getSystemPromotionLogicAction` | Logic thăng cấp (A/B) |
| `switchSystemPromotionLogicAction` | Chuyển đổi logic |
| `getMemberPromotionHistoryAction` | Lịch sử thăng tiến |
| `getSystemConnectionPathAction` | Tuyến nhân duyên |
| `getSharingSponsorTreeAction` | Cây chia sẻ |

---

## 3. KIẾN TRÚC MỚI (SAU NÂNG CẤP)

### 3.1 Cấu trúc File

```
app/tools/genealogy/
  page.tsx                              → Shell chính (~200 dòng)
                                          TabNav + ReactFlowProvider + TabRouter

components/genealogy/
  ├── ui/                               → UI Primitives mới
  │   ├── SlidePanel.tsx                → Panel trượt reusable (~120 dòng)
  │   ├── TabShell.tsx                  → Layout shell mỗi tab (~80 dòng)
  │   └── tab-navigation.tsx            → Thanh chuyển tab (~60 dòng)
  │
  ├── diagram/                          → Tab Diagram (toàn bộ nội dung cũ)
  │   ├── DiagramTab.tsx                → Tab wrapper + ReactFlowProvider logic (~100 dòng)
  │   ├── DiagramFlow.tsx               → Core tree logic (GenealogyFlow extract) (~800 dòng)
  │   ├── DiagramHeader.tsx             → Header: system selector + "Cây chính" (~80 dòng)
  │   ├── DiagramToolbar.tsx            → Controls → đặt trong SlidePanel (~150 dòng)
  │   ├── DiagramStatusBar.tsx          → Status bar bottom (~50 dòng)
  │   ├── GenealogyCard.tsx             → Custom ReactFlow node (~220 dòng)
  │   └── SearchNodeCard.tsx            → Search result node (~30 dòng)
  │
  ├── dashboard/                        → Tab Dashboard (nội dung mới)
  │   ├── DashboardTab.tsx              → Dashboard chính (~300 dòng)
  │   └── StatsBlocks.tsx               → Các block thống kê (~150 dòng)
  │
  ├── settings/                         → Tab Settings (admin only)
  │   └── SettingsTab.tsx               → Admin + nâng cao (~250 dòng)
  │
  ├── modals/                           → Các modal tách rời
  │   ├── MemberDetailsModal.tsx        → Chi tiết + History + Nhân duyên (~700 dòng)
  │   ├── GroupModal.tsx                → Nhóm A/B (di chuyển từ components/)
  │   ├── AddF1Modal.tsx                → Thêm F1 (~80 dòng)
  │   ├── DeleteNodeModal.tsx           → Xóa node (~50 dòng)
  │   ├── CreateRootModal.tsx           → Tạo root (~100 dòng)
  │   ├── SharingTreeModal.tsx          → Cây chia sẻ (~100 dòng)
  │   └── SystemConnectionPathModal.tsx → Nhân duyên (di chuyển từ components/)
  │
  └── lib/                              → Utilities tách rời
      ├── genealogy-helpers.ts          → getLevelColor, filterToActiveTree, etc. (~100 dòng)
      └── genealogy-constants.ts        → NODE_WIDTH, VERTICAL_SPACING, etc. (~15 dòng)
```

### 3.2 Kiến trúc Tab Shell

```
┌──────────────────────────────────────────────┐
│ [📊 Dashboard] [🌳 Diagram] [⚙️ Settings]   │  ← TabNavigation (FIXED)
├──────────────────────────────────────────────┤
│ Header Tab (nội dung riêng mỗi tab)         │  ← FIXED (không scroll)
│  Diagram: [Combo Hệ thống] [Cây chính] ... │
│  Dashboard: [Tổng quan] [Chọn hệ thống]    │
│  Settings: [Quản trị hệ thống]             │
├──────────────────────────────────────────────┤
│                                              │
│ Content Blocks                               │  ← SCROLL
│ (các khối thông tin chính)                  │
│                                              │
├──────────────────────────────────────────────┤
│ Status Bar (thông tin trạng thái)            │  ← FIXED (bottom)
│  Diagram: Tổng/Active/BDH/DHTT | Loading... │
│  Dashboard: Thời gian cập nhật              │
│  Settings: Trạng thái hệ thống              │
└──────────────────────────────────────────────┘
              ↕ SlidePanel (ẩn/hiện)
         (icon trigger ở vị trí phù hợp)
```

---

## 4. CHI TIẾT TỪNG TAB

### 4.1 Dashboard Tab (Mới)

#### Header
- Tiêu đề "Tổng quan" + combo chọn hệ thống

#### Content Blocks

| Block | Nội dung | Data source | Ghi chú |
|-------|----------|-------------|---------|
| **Thẻ Tổng quan** | 4 thẻ: Tổng hệ thống, Tổng thành viên, Tổng nodes, Closures | `getSystemStatsAction()` | Responsive: 2x2 mobile, 4x1 desktop |
| **Phân tích Hệ thống** | Bar chart CSS so sánh các hệ thống (TCA, BRK, YTB...) | `getAvailableSystemsAction()` + stats | Inline SVG hoặc CSS bar chart |
| **Top Thành viên** | Top 10 điểm cao nhất (MBP, team size) | Server action mới hoặc placeholder | Có thể mock data trước |
| **Hoạt động Gần đây** | Timeline các sự kiện thăng cấp, giao dịch mới nhất | Placeholder / History query | Lazy load khi mở tab |
| **Hệ thống Đang hoạt động** | Badge/danh sách hệ thống + trạng thái (active/empty) | `getSystemStatsAction()` | Badge màu theo trạng thái |

#### Status Bar
- Thời gian cập nhật cuối cùng
- Tổng số bản ghi đã tải

#### Slide Panel
- **Hướng**: Trượt từ phải sang trái (icon ở header phải)
- **Nội dung**: Bộ lọc thời gian, chi tiết hệ thống, export data

---

### 4.2 Diagram Tab (Chuyển toàn bộ nội dung cũ)

#### Header (FIXED)
- **Trái**: Combo chọn danh sách hệ thống (`<select>` hiện tại)
- **Trái**: Nút "Cây chính" căn theo lề trái header
- **Phải**: Icon ⚙️ mở SlidePanel (trượt từ trên xuống trên mobile, từ phải trên desktop)

#### Content Block (SCROLL)
- **Toàn bộ ReactFlow canvas** hiện tại
- `GenealogyCard`, `SearchNodeCard` — custom nodes
- `GroupModal` — popup nhóm A/B
- Tất cả modal hiện tại (AddF1, Delete, CreateRoot, SharingTree, MemberDetails, NhanDuyen)

#### Status Bar (FIXED BOTTOM)
- Thống kê thực tế: Tổng/Active/BDH/DHTT (như stats bar hiện tại)
- Loading indicator khi đang fetch data
- Badge hiển thị "Đội của tôi" / "Toàn hệ thống"

#### Slide Panel
- **Hướng**: Trượt từ trên xuống (icon ⚙️ ở lề phải header)
- **Mobile**: Bottom sheet pattern (trượt từ dưới lên)
- **Desktop**: Right side panel
- **Trigger**: Icon ⚙️ lucide-react ở góc phải header
- **Nội dung panel**:
  1. Bộ lọc: Active only, Đội của tôi, Hiển thị đầy đủ
  2. Chế độ: Sửa / Thêm F1 / Xóa
  3. Tìm kiếm theo ID
  4. Promotion Logic Switch (admin + system BRK)
  5. Thống kê chi tiết (nếu cần)

---

### 4.3 Settings Tab (Admin Only)

#### Gate
- Nếu `session.user.role !== 'ADMIN'` → Tab hoàn toàn ẩn, không render

#### Header
- "Quản trị hệ thống"

#### Content Blocks

| Section | Nội dung | Nguồn |
|---------|----------|-------|
| **Tổng quan** | 4 thẻ thống kê: Tổng hệ thống, Nodes, Closures, Users | `getSystemStatsAction()` |
| **Quản lý Hệ thống** | Bảng CRUD systems (từ GenealogyAdminTab hiện tại) | `getSystemStatsAction()` + modals |
| **Promotion Logic** | Chuyển đổi Phương án A/B cho hệ thống BRK | `switchSystemPromotionLogicAction` |
| **Cài đặt Hiển thị** | Mặc định compact/full, auto-expand root... | LocalStorage preferences |
| **Quyền hạn** | Xem danh sách quyền theo hệ thống | Placeholder / future |

#### Status Bar
- Trạng thái hệ thống (số nodes, closures, mới nhất)
- Thời gian cập nhật

#### Slide Panel
- **Hướng**: Trượt từ phải sang trái
- **Nội dung**: Tạo hệ thống mới, cài đặt nâng cao, backup/restore

---

## 5. COMPONENT SlidePanel (Reusable)

```tsx
interface SlidePanelProps {
  open: boolean                    // Trạng thái mở/đóng
  onClose: () => void             // Hàm đóng
  direction: 'top' | 'bottom' | 'left' | 'right'  // Hướng trượt
  children: React.ReactNode       // Nội dung panel
  trigger?: React.ReactNode       // Icon nút mở (optional nếu controlled)
  width?: string                  // 'w-80', 'w-full', 'max-w-md' etc.
  title?: string                  // Tiêu đề panel
  className?: string              // Custom classes
}
```

### Responsive Behavior
```
Mobile (md: < 768px):
  direction='right' → Trượt từ phải sang trái (side panel, full height)
  direction='top'   → Trượt từ trên xuống (top sheet)
  direction='bottom' → Trượt từ dưới lên (bottom sheet — phổ biến nhất mobile)
  direction='left'  → Trượt từ trái sang phải

Desktop (md: >= 768px):
  Luôn ưu tiên side panel (right hoặc left)
  direction='top'/'bottom' → Centered modal-like panel
```

### Animation
```tsx
// Slide from right
<div className={`fixed inset-y-0 right-0 z-[200] w-80 transform transition-transform duration-300 ease-in-out
  ${open ? 'translate-x-0' : 'translate-x-full'}`}>

// Backdrop
<div className={`fixed inset-0 z-[199] bg-black/30 backdrop-blur-sm transition-opacity duration-300
  ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
  onClick={onClose} />
```

### Usage trong Diagram Tab
```tsx
// Icon trigger ở header phải
<button onClick={() => setPanelOpen(true)} className="...">
  <Settings className="w-5 h-5" />
</button>

// Panel trượt từ phải
<SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} direction="right" title="Bộ lọc & Cài đặt">
  <DiagramToolbar ... />
</SlidePanel>
```

---

## 6. COMPONENT TabShell (Reusable)

```tsx
interface TabShellProps {
  header: React.ReactNode         // Nội dung header (fixed)
  children: React.ReactNode       // Nội dung chính (scroll)
  statusBar?: React.ReactNode     // Status bar (fixed bottom, optional)
  className?: string
}
```

### Layout
```tsx
<div className="h-screen flex flex-col overflow-hidden">
  {/* Header — FIXED */}
  <div className="shrink-0 border-b bg-white z-10">
    {header}
  </div>

  {/* Content — SCROLL */}
  <div className="flex-1 overflow-y-auto">
    {children}
  </div>

  {/* Status Bar — FIXED BOTTOM */}
  {statusBar && (
    <div className="shrink-0 border-t bg-white z-10">
      {statusBar}
    </div>
  )}
</div>
```

---

## 7. CHIẾN LƯỢC TÁCH CODE

### 7.1 Phân loại thay đổi

| Loại | Phần | File | Risk |
|------|------|------|------|
| **Viết mới** | UI Primitives | `SlidePanel.tsx`, `TabShell.tsx`, `tab-navigation.tsx` | Thấp |
| **Viết mới** | Dashboard content | `DashboardTab.tsx`, `StatsBlocks.tsx` | Thấp |
| **Viết mới** | Settings content | `SettingsTab.tsx` | Thấp |
| **Extract** | Core tree logic | `DiagramFlow.tsx` từ `page.tsx` | **Cao** |
| **Extract** | ReactFlow nodes | `GenealogyCard.tsx`, `SearchNodeCard.tsx` | Trung bình |
| **Extract** | Modals | 7 modal files từ `page.tsx` | Trung bình |
| **Extract** | Utilities | `genealogy-helpers.ts`, `genealogy-constants.ts` | Thấp |
| **Refactor** | Shell chính | `page.tsx` → tab shell | Trung bình |

### 7.2 Dependency Graph
```
page.tsx (shell)
  ├── TabShell
  │   ├── DiagramTab
  │   │   ├── DiagramHeader
  │   │   ├── DiagramFlow
  │   │   │   ├── GenealogyCard
  │   │   │   ├── SearchNodeCard
  │   │   │   └── modals/*
  │   │   ├── DiagramToolbar (trong SlidePanel)
  │   │   └── DiagramStatusBar
  │   ├── DashboardTab
  │   │   └── StatsBlocks
  │   └── SettingsTab
  └── SlidePanel (shared)
```

---

## 8. THỨ TỰ THỰC HIỆN

### Bước 1: UI Primitives (Risk: Thấp)
**Files mới**:
- `components/genealogy/ui/SlidePanel.tsx` (~120 dòng)
- `components/genealogy/ui/TabShell.tsx` (~80 dòng)
- `components/genealogy/ui/tab-navigation.tsx` (~60 dòng)

**Lưu ý**:
- SlidePanel hỗ trợ 4 hướng + responsive
- TabShell layout: fixed header + scroll content + fixed statusBar
- TabNavigation: 3 nút tab với icon + label, active state indicator

**Verify**: TypeScript compile OK

---

### Bước 2: Extract Helpers & Constants (Risk: Thấp)
**Files mới**:
- `components/genealogy/lib/genealogy-helpers.ts` (~100 dòng)
- `components/genealogy/lib/genealogy-constants.ts` (~15 dòng)

**Extract từ `page.tsx`**:
- `getLevelColor()` (line 151-162)
- `getLevelBadgeColor()` (line 166-175)
- `getChucDanhStyle()` (line 178-186)
- `filterToActiveTree()` (line 118-149)
- `buildD3Tree()` (line 71-93)
- `calculateNodePositions()` (line 96-113)
- Constants: `NODE_WIDTH`, `NODE_HEIGHT`, `HORIZONTAL_SPACING`, `VERTICAL_SPACING` (line 30-33)
- Type: `D3Node` (line 37)
- Interface: `MemberDetailInfo` (line 38-69)

**Verify**: TypeScript compile OK

---

### Bước 3: Extract Modals (Risk: Trung bình)
**Files mới**:
- `components/genealogy/modals/MemberDetailsModal.tsx` (~700 dòng)
- `components/genealogy/modals/SharingTreeModal.tsx` (~100 dòng)
- `components/genealogy/modals/AddF1Modal.tsx` (~80 dòng)
- `components/genealogy/modals/DeleteNodeModal.tsx` (~50 dòng)
- `components/genealogy/modals/CreateRootModal.tsx` (~100 dòng)

**Di chuyển**:
- `components/genealogy/GroupModal.tsx` → `components/genealogy/modals/GroupModal.tsx`
- `components/genealogy/SystemConnectionPathModal.tsx` → `components/genealogy/modals/SystemConnectionPathModal.tsx`

**Lưu ý**:
- MemberDetailsModal chứa: `InfoItem`, `WalletItem`, `HistoryModal`, `SystemConnectionPathModal` — cần extract cả
- Mỗi modal export default, nhận props interface rõ ràng
- Giữ nguyên logic business, chỉ tách file

**Verify**: Import paths update OK, TypeScript compile OK

---

### Bước 4: Extract ReactFlow Nodes (Risk: Trung bình)
**Files mới**:
- `components/genealogy/diagram/GenealogyCard.tsx` (~220 dòng)
- `components/genealogy/diagram/SearchNodeCard.tsx` (~30 dòng)

**Extract từ `page.tsx`**:
- `GenealogyCard` component (line 188-407)
- `SearchNodeCard` component (line 410-436)
- `nodeTypes` object (line 438)

**Lưu ý**:
- GenealogyCard sử dụng `getLevelColor`, `getLevelBadgeColor`, `getChucDanhStyle` → import từ helpers
- Props interface `NodeProps` từ `@xyflow/react` — giữ nguyên

**Verify**: TypeScript compile OK

---

### Bước 5: Extract Diagram Core (Risk: CAO)
**Files mới**:
- `components/genealogy/diagram/DiagramFlow.tsx` (~800 dòng)
- `components/genealogy/diagram/DiagramHeader.tsx` (~80 dòng)
- `components/genealogy/diagram/DiagramStatusBar.tsx` (~50 dòng)
- `components/genealogy/diagram/DiagramToolbar.tsx` (~150 dòng)

**Extract từ `page.tsx`**:
- `GenealogyFlow` function (line 440-1757) → `DiagramFlow.tsx`
- Toolbar render block (line 1187-1454) → `DiagramToolbar.tsx`
- Stats bar render block (line 1384-1453) → `DiagramStatusBar.tsx`

**Lưu ý QUAN TRỌNG**:
- Đây là phần CỦA LÒNG của quá trình refactor — chứa toàn bộ state + logic
- DiagramFlow cần giữ nguyên TOÀN BỘ state, effects, callbacks
- Chỉ tách render UI: Header, Toolbar, StatusBar ra component con
- Props drilling từ DiagramFlow → con (hoặc dùng Context nếu quá phức tạp)
- **KHÔNG thay đổi logic business** — chỉ tách file

**Verify**: TypeScript compile OK, tree vẫn render đúng

---

### Bước 6: Tạo Dashboard + Settings Tab (Risk: Thấp)
**Files mới**:
- `components/genealogy/dashboard/DashboardTab.tsx` (~300 dòng)
- `components/genealogy/dashboard/StatsBlocks.tsx` (~150 dòng)
- `components/genealogy/settings/SettingsTab.tsx` (~250 dòng)

**DashboardTab**:
- Gọi `getSystemStatsAction()` + `getAvailableSystemsAction()` để lấy data
- Render 4 thẻ tổng quan + bar chart CSS + top members placeholder
- Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`

**SettingsTab**:
- Import + render `GenealogyAdminTab` (hoặc inline lại)
- Thêm section Promotion Logic Switch
- Gate: chỉ render khi `isAdmin === true`

**Verify**: TypeScript compile OK

---

### Bước 7: Refactor page.tsx → Shell (Risk: Trung bình)
**File sửa**: `app/tools/genealogy/page.tsx` (~2500 dòng → ~200 dòng)

**Nội dung mới**:
```tsx
'use client'
import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import MainHeader from '@/components/layout/MainHeader'
import TabNavigation from '@/components/genealogy/ui/tab-navigation'
import TabShell from '@/components/genealogy/ui/TabShell'
import DiagramTab from '@/components/genealogy/diagram/DiagramTab'
import DashboardTab from '@/components/genealogy/dashboard/DashboardTab'
import SettingsTab from '@/components/genealogy/settings/SettingsTab'
import { useSession } from 'next-auth/react'

type TabId = 'dashboard' | 'diagram' | 'settings'

export default function GenealogyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('diagram') // Default: Diagram
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'BarChart3' },
    { id: 'diagram', label: 'Diagram', icon: 'GitBranch' },
    ...(isAdmin ? [{ id: 'settings', label: 'Settings', icon: 'Settings' }] : []),
  ]

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-slate-50">
        <MainHeader title="NHÂN MẠCH" toolSlug="genealogy" />
        <TabNavigation tabs={tabs} active={activeTab} onChange={setActiveTab} />
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'diagram' && <DiagramTab />}
        {activeTab === 'settings' && isAdmin && <SettingsTab />}
      </div>
    </ReactFlowProvider>
  )
}
```

**Verify**: TypeScript compile OK, tab switching hoạt động

---

### Bước 8: Final Polish & Verify (Risk: Thấp)
- [ ] `npx tsc --noEmit` — Exit code 0
- [ ] Test tab switching hoạt động
- [ ] Test Diagram tab: tree render, expand, search, focus subtree
- [ ] Test SlidePanel: mở/đóng, animation, responsive
- [ ] Test Mobile: layout responsive, touch interactions
- [ ] Test Admin gate: Settings tab ẩn/hiện đúng
- [ ] Test modals: MemberDetails, Group, AddF1, Delete, CreateRoot
- [ ] Kiểm tra không có regression

---

## 9. LƯU Ý AN TOÀN

### 9.1 Bảo toàn dữ liệu
- **KHÔNG thay đổi** server actions hoặc API routes
- **KHÔNG thay đổi** Prisma schema hoặc database
- **KHÔNG thay đổi** logic business — chỉ refactor UI layer
- **Backup trước khi refactor**: Tạo patch từ git diff

### 9.2 Backup Plan
```bash
# Tạo backup trước khi bắt đầu
git add app/tools/genealogy/ components/genealogy/
git commit -m "backup: genealogy before UI upgrade"

# Nếu cần restore
git checkout HEAD~1 -- app/tools/genealogy/ components/genealogy/
```

### 9.3 Incremental Deploy
- Sau mỗi bước, chạy `npx tsc --noEmit` để verify
- Nếu bất kỳ bước nào fail → rollback bước đó, giữ nguyên các bước khác
- Deploy test trên dev trước khi merge vào main

### 9.4 Import Path Changes
Sau refactor, cần cập nhật imports ở các file sau (nếu có):
- `app/tools/genealogy/page.tsx` → Import từ `components/genealogy/`
- Kiểm tra không có circular dependency

---

## 10. TIẾN ĐỘ & TRACKING

| Bước | Mô tả | Trạng thái | Ngày | File đã sửa |
|------|-------|------------|------|-------------|
| 1 | Tạo SlidePanel + TabShell + TabNavigation | ✅ Hoàn thành | 2026-07-28 | `ui/SlidePanel.tsx`, `ui/TabShell.tsx`, `ui/tab-navigation.tsx` |
| 2 | Extract Helpers & Constants | ✅ Hoàn thành | 2026-07-28 | `lib/genealogy-helpers.ts`, `lib/genealogy-constants.ts` |
| 3 | Extract Modals | ✅ Hoàn thành | 2026-07-28 | `modals/MemberDetailsModal.tsx`, `modals/SystemConnectionPathModal.tsx` |
| 4 | Extract ReactFlow Nodes | ✅ Hoàn thành | 2026-07-28 | `diagram/GenealogyCard.tsx` |
| 5 | Extract Diagram Core (Flow + Header + Toolbar + StatusBar) | ✅ Hoàn thành | 2026-07-28 | `diagram/DiagramFlow.tsx`, `diagram/DiagramHeader.tsx`, `diagram/DiagramToolbar.tsx`, `diagram/DiagramStatusBar.tsx`, `diagram/DiagramTab.tsx` |
| 6 | Tạo Dashboard + Settings Tab | ✅ Hoàn thành | 2026-07-28 | `dashboard/DashboardTab.tsx`, `settings/SettingsTab.tsx` |
| 7 | Refactor page.tsx → Shell + Wire DiagramTab + Refactor DiagramFlow (SlidePanel, extract components, move files) | ✅ Hoàn thành | 2026-07-28 | `page.tsx` (41 dòng), `DiagramFlow.tsx` (1169 dòng, −187 dòng toolbar), `DiagramHeader.tsx`, `DiagramToolbar.tsx`, `DiagramStatusBar.tsx`, moved GroupModal/AdminTab/SystemConnectionPathModal |
| 8 | Final Polish & Verify | ✅ Hoàn thành | 2026-07-28 | `DashboardTab.tsx` (add cn import), `DiagramHeader.tsx` (add totalMembers badge), `DiagramFlow.tsx` (remove showAdminModal + GenealogyAdminTab import, pass totalMembers) |

**Tổng dòng code ước tính**: ~3500 dòng mới/tách
**page.tsx gốc**: ~2500 dòng → ~200 dòng shell

---

## 11. QUY TẮC LÀM VIỆC CHO CÁC PHIÊN SAU

> **BẮT BUỘC đọc phần này trước khi tiếp tục.**

### Khi tiếp tục từ bước X:
1. Mở file `docs/GENEALOGY_UI_UPGRADE.md` này
2. Tìm section **"Thứ tự thực hiện"** (Section 8)
3. Tìm bước có trạng thái ⬜ "Chưa bắt đầu" đầu tiên
4. Đọc kỹ phần **"Lưu ý"** của bước đó
5. Thực hiện theo thứ tự

### Khi hoàn thành mỗi bước:
1. Cập nhật trạng thái trong **Section 10: Tiến độ & Tracking**
2. Chạy `npx tsc --noEmit` verify
3. Cập nhật `PLAN.md` section "Hệ thống Cây Nhân Mạch"
4. Commit với message: `refactor(genealogy): step X — [mô tả]`

### Khi gặp lỗi:
1. **KHÔNG tự sửa** nếu lỗi nằm ngoài scope
2. **Ghi nhận lỗi** vào section "Lưu ý" của bước hiện tại
3. **Rollback** bước gây lỗi nếu cần
4. **Hỏi user** nếu cần quyết định

### Quy tắc cập nhật tài liệu:
- **`docs/GENEALOGY_UI_UPGRADE.md`** → Ghi nhận **NGAY SAU MỖI BƯỚC** hoàn thành (chi tiết từng bước, file đã sửa, trạng thái)
- **`PLAN.md`** → Chỉ cập nhật **KHI HOÀN THÀNH TOÀN BỘ** nâng cấp (tổng quan kết quả, không chi tiết từng bước)

### Files đã thay đổi (sẽ cập nhật dần):
```
app/tools/genealogy/page.tsx              → Refactored to shell (70 dòng)
app/actions/system-actions.ts              → Added getMySystemsAction, getSystemDetailStatsAction, getLeaderboardAction
components/genealogy/ui/SlidePanel.tsx     → New
components/genealogy/ui/TabShell.tsx       → New
components/genealogy/ui/tab-navigation.tsx → New
components/genealogy/lib/genealogy-helpers.ts      → New
components/genealogy/lib/genealogy-constants.ts    → New
components/genealogy/diagram/DiagramFlow.tsx       → New (extracted, ~1140 dòng)
components/genealogy/diagram/DiagramTab.tsx        → New (thin wrapper)
components/genealogy/diagram/DiagramHeader.tsx     → New (nav + member count badge + settings trigger)
components/genealogy/diagram/DiagramToolbar.tsx    → New (SlidePanel content)
components/genealogy/diagram/DiagramStatusBar.tsx  → New
components/genealogy/diagram/GenealogyCard.tsx     → New (extracted)
components/genealogy/dashboard/DashboardTab.tsx    → New (podium leaderboard + stats)
components/genealogy/settings/SettingsTab.tsx      → New (admin + promotion logic)
components/genealogy/modals/MemberDetailsModal.tsx  → New (extracted)
components/genealogy/modals/GroupModal.tsx          → Moved from components/genealogy/
components/genealogy/modals/SystemConnectionPathModal.tsx → Moved from components/genealogy/
```
