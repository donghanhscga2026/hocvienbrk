# Hướng Dẫn Sử Dụng Theme System

## Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Danh Sách Themes](#danh-sách-themes)
3. [Bảng Màu Chi Tiết](#bảng-màu-chi-tiết)
4. [Đối Tượng Áp Dụng Màu](#đối-tượng-áp-dụng-màu)
5. [Cách Sử Dụng CSS Classes](#cách-sử-dụng-css-classes)

---

## Tổng Quan

Hệ thống theme cho phép thay đổi giao diện website với 5 bảng màu khác nhau. Mỗi theme được thiết kế riêng cho từng phong cách và đối tượng mục tiêu.

### Đặc điểm:
- **5 themes presets** với bảng màu được thiết kế chuyên nghiệp
- **Hỗ trợ Dark Mode** tự động cho các theme có nền tối
- **CSS Classes** dễ sử dụng: `bg-brk-primary`, `text-brk-accent`, v.v.
- **Lưu trữ local** - theme được ghi nhớ khi user quay lại

### Cách chuyển theme:
- Header website có các nút tròn màu sắc đại diện cho từng theme
- Click để áp dụng ngay lập tức

---

## Danh Sách Themes

| # | Tên Theme | Icon | Mô tả | Đối tượng |
|---|-----------|------|--------|-----------|
| 1 | Royal Empire | [■](#1-royal-empire-) | Sang trọng, đẳng cấp | Khóa học Master, tư duy triệu phú |
| 2 | Energy & Growth | [■](#2-energy--growth-) | Năng lượng, hành động | Affiliate, Marketing Online |
| 3 | Digital Leader | [■](#3-digital-leader-) | Hiện đại, công nghệ | Đào tạo kỹ năng số |
| 4 | Dark | [■](#4-dark-) | Bí ẩn, đặc quyền | Nhóm kín, cốt cán |
| 5 | Trust & Wisdom | [■](#5-trust--wisdom-) | Điềm tĩnh, bền vững | Tư duy lãnh đạo |

---

## Bảng Màu Chi Tiết

### 1. Royal Empire 👑

**Mô tả:** Phong cách Hoàng gia - Sang trọng, đẳng cấp, dành cho các khóa học "Master" hoặc tư duy triệu phú.

```
┌────────────────┬───────────┬─────────────────────────────────────┐
│ primary        │ #D4AF37  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ secondary      │ #1A252F  │ ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ bg             │ #FFFFFF  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ bgSecondary    │ #F9F6EE  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ text           │ #111111  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ textSecondary  │ #555555  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ accent         │ #10ee5aff  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ border         │ #E5E5E5  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ header         │ #0F172A  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└────────────────┴───────────┴─────────────────────────────────────┘
```

**Sử dụng:**
- `primary` - Nút CTA chính, đăng ký
- `secondary` - Badge chức danh
- `bg` - Nền chính
- `bgSecondary` - Nền phụ, section
- `text` - Chữ chính
- `textSecondary` - Chữ mô tả
- `accent` - Hiệu ứng hover
- `border` - Viền, border
- `header` - Header, navigation

---

### 2. Energy & Growth ⚡

**Mô tả:** Năng lượng cao - Kích thích hành động "chốt đơn", phù hợp đào tạo Affiliate, Marketing Online.

```
┌────────────────┬───────────┬─────────────────────────────────────┐
│ primary        │ #FF6B00  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ secondary      │ #222222  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ bg             │ #FFFFFF  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ bgSecondary    │ #FFF5ED  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ text           │ #1A1A1A  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ textSecondary  │ #666666  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ accent         │ #00C853  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ border         │ #FFDBC2  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ header         │ #222222  │ ████████████████░░░░░░░░░░░░░░░░░░ │
└────────────────┴───────────┴─────────────────────────────────────┘
```

**Sử dụng:**
- `primary` - Nút CTA, đăng ký
- `secondary` - Header tối
- `bg` - Nền chính
- `bgSecondary` - Nền section
- `text` - Chữ chính
- `textSecondary` - Chữ mô tả
- `accent` - Chỉ số tăng trưởng
- `border` - Viền nhạt
- `header` - Header đen

---

### 3. Digital Leader 💻

**Mô tả:** Hiện đại, công nghệ - Thực chiến, phù hợp đào tạo kỹ năng số.

```
┌────────────────┬───────────┬─────────────────────────────────────┐
│ primary        │ #0066FF  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ secondary      │ #EBF4FF  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ bg             │ #FFFFFF  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ bgSecondary    │ #F4F7FA  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ text           │ #0A1F44  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ textSecondary  │ #64748B  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ accent         │ #FF4D4D  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ border         │ #D1D5DB  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ header         │ #FFFFFF  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└────────────────┴───────────┴─────────────────────────────────────┘
```

**Sử dụng:**
- `primary` - Nút CTA, links
- `secondary` - Nền nhấn nhẹ
- `bg` - Nền chính
- `bgSecondary` - Nền phụ
- `text` - Chữ chính
- `textSecondary` - Chữ mô tả
- `accent` - Countdown, urgency
- `border` - Viền
- `header` - Header trắng + shadow

---

### 4. Dark 🌙

**Mô tả:** Bí ẩn, đặc quyền - Dành cho nhóm kín, cốt cán, cực kỳ hút mắt trên mobile.

```
┌────────────────┬───────────┬─────────────────────────────────────┐
│ primary        │ #BB86FC  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ secondary      │ #03DAC6  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ bg             │ #121212  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ bgSecondary    │ #1E1E1E  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ text           │ #FFFFFF  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ textSecondary  │ #A0A0A0  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ accent         │ #CF6679  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ border         │ #333333  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ header         │ #121212  │ ████████████████░░░░░░░░░░░░░░░░░░ │
└────────────────┴───────────┴─────────────────────────────────────┘
```

**Sử dụng:**
- `primary` - Nút CTA tím neon
- `secondary` - Trạng thái thành công
- `bg` - Nền đen sâu
- `bgSecondary` - Nền phân lớp
- `text` - Chữ trắng
- `textSecondary` - Chữ xám nhạt
- `accent` - Lưu ý quan trọng
- `border` - Viền tối
- `header` - Header đen sâu

---

### 5. Trust & Wisdom 🌿

**Mô tả:** Điềm tĩnh, bền vững - Phù hợp đào tạo hệ thống về tư duy con người và lãnh đạo bền vững.

```
┌────────────────┬───────────┬─────────────────────────────────────┐
│ primary        │ #059669  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ secondary      │ #1F2937  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ bg             │ #FDFDFD  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ bgSecondary    │ #ECFDF5  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ text           │ #064E3B  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ textSecondary  │ #4B5563  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ accent         │ #F59E0B  │ ████████████████░░░░░░░░░░░░░░░░░░ │
│ border         │ #D1FAE5  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ header         │ #065F46  │ ████████████████░░░░░░░░░░░░░░░░░░ │
└────────────────┴───────────┴─────────────────────────────────────┘
```

**Sử dụng:**
- `primary` - Nút CTA xanh lục
- `secondary` - Xám than
- `bg` - Nền trắng tinh
- `bgSecondary` - Nền xanh bạc hà
- `text` - Chữ xanh đậm
- `textSecondary` - Chữ xám
- `accent` - Đánh giá 5 sao
- `border` - Viền xanh nhạt
- `header` - Header xanh đậm

---

## Đối Tượng Áp Dụng Màu

### 1. Background Colors (Màu nền)

| CSS Class | Mô tả | Ví dụ sử dụng |
|-----------|-------|----------------|
| `bg-brk-bg` | Nền chính | `<div class="bg-brk-bg">` |
| `bg-brk-section` | Nền section | Thẻ div chính |
| `bg-brk-section-alt` | Nền phụ | Cards, containers |
| `bg-brk-primary` | Nền primary | Nút CTA |
| `bg-brk-primary-light` | Nền primary nhạt | Hover states |
| `bg-brk-primary-dark` | Nền primary đậm | Active states |
| `bg-brk-header` | Nền header | Navigation |

**Áp dụng:**
- Body, main containers
- Cards, panels, modals
- Buttons (CTA chính)
- Header navigation

---

### 2. Text Colors (Màu chữ)

| CSS Class | Mô tả | Ví dụ sử dụng |
|-----------|-------|----------------|
| `text-brk-text` | Chữ chính | Tiêu đề, nội dung |
| `text-brk-bg` | Chữ trên nền tối | Text trên primary/accent |
| `text-brk-primary` | Chữ primary | Links, nhấn mạnh |
| `text-brk-secondary` | Chữ secondary | Navigation |
| `text-brk-section` | Chữ section | Nội dung chính |
| `text-brk-section-secondary` | Chữ phụ | Mô tả, caption |
| `text-brk-accent` | Chữ accent | Highlight |
| `text-brk-success` | Chữ thành công | Success messages |
| `text-brk-error` | Chữ lỗi | Error messages |

**Áp dụng:**
- Tiêu đề (h1, h2, h3)
- Đoạn văn (p)
- Links (a)
- Buttons text
- Labels

---

### 3. Border Colors (Màu viền)

| CSS Class | Mô tả |
|-----------|-------|
| `border-brk-section` | Viền section |
| `border-brk-primary` | Viền primary |
| `ring-brk-section` | Ring effect |

**Áp dụng:**
- Input borders
- Card borders
- Dividers
- Focus rings

---

### 4. Tailwind Color Overrides (Override màu gốc)

Hệ thống theme tự động override các màu Tailwind sau:

#### Primary Overrides (Nút CTA chính):
- `.bg-yellow-400`, `.bg-yellow-500`, `.bg-amber-400`, `.bg-amber-500`, `.bg-orange-500`
- `.text-yellow-400`, `.text-yellow-500`, `.text-amber-400`
- `.border-yellow-400`, `.border-yellow-500`
- `.bg-yellow-50`, `.bg-yellow-50/10`, `.bg-yellow-50/20`

#### Secondary Overrides (Header, Badge):
- `.bg-sky-500`, `.bg-sky-600`
- `.text-sky-500`, `.text-sky-600`
- `.text-orange-400`, `.text-orange-500`, `.text-orange-600`
- `.text-glow-3d`

#### Background Overrides:
- `.bg-white` → theme.bg
- `.bg-gray-50` → theme.bgSecondary
- `.bg-zinc-900`, `.bg-zinc-950` → theme.header (dark mode)

#### Text Overrides:
- `.text-white` → theme.text (light mode) / #ffffff (dark mode)
- `.text-gray-500`, `.text-zinc-500` → theme.textSecondary

---

## Cách Sử Dụng CSS Classes

### Ví dụ 1: Button CTA
```tsx
// Primary button - dùng bg-brk-primary
<button className="bg-brk-primary text-brk-bg px-6 py-3 rounded-xl">
  Đăng ký ngay
</button>

// Secondary button - dùng bg-brk-secondary
<button className="bg-brk-secondary text-brk-primary px-6 py-3 rounded-xl">
  Tìm hiểu thêm
</button>
```

### Ví dụ 2: Card Container
```tsx
// Card với nền section
<div className="bg-brk-section rounded-2xl border border-brk-section p-6">
  <h3 className="text-brk-section font-bold">Tiêu đề Card</h3>
  <p className="text-brk-section-secondary">Mô tả...</p>
</div>

// Card với nền phụ
<div className="bg-brk-section-alt rounded-xl p-4">
  Nội dung phụ
</div>
```

### Ví dụ 3: Navigation Link
```tsx
// Link active
<Link className="text-brk-primary font-bold">Trang chủ</Link>

// Link không active  
<Link className="text-brk-section-secondary hover:text-brk-primary">Khóa học</Link>
```

### Ví dụ 4: Form Input
```tsx
<input 
  className="border border-brk-section bg-brk-section text-brk-text px-4 py-2 rounded-lg focus:border-brk-primary focus:ring-brk-primary"
  placeholder="Nhập email..."
/>
```

### Ví dụ 5: Alert/Message
```tsx
// Success
<div className="bg-brk-accent/30 text-brk-accent p-4 rounded-xl">
  ✓ Thành công!
</div>

// Error
<div className="bg-brk-error/30 text-brk-error p-4 rounded-xl">
  ✗ Đã xảy ra lỗi
</div>
```

---

## Cấu Trúc File

```
app/
├── contexts/
│   └── theme-config.ts    # Cấu hình themes
├── globals.css            # CSS gốc + theme variables
└── ...

components/
└── layout/
    └── Header.tsx        # Theme picker + apply
```

---

## Cập Nhật Theme

### Thêm/Sửa theme trong `theme-config.ts`:

```typescript
export const presetThemes: Theme[] = [
  {
    id: 'default',        // unique ID
    name: 'Royal Empire', // Tên hiển thị
    icon: '👑',           // Emoji icon
    colors: {
      primary: '#D4AF37',
      secondary: '#1A252F',
      bg: '#FFFFFF',
      bgSecondary: '#F9F6EE',
      text: '#111111',
      textSecondary: '#555555',
      accent: '#C5A028',
      border: '#E5E5E5',
      header: '#0F172A',
    },
    locked: true,        // true = không cho xóa
  },
  // ... thêm theme khác
];
```

### Cập nhật Dark Mode logic:

```typescript
export function isDarkTheme(themeId: ThemeId | string): boolean {
  return themeId === 'dark' || themeId === 'highend'
}
```

---

## Lưu Ý Quan Trọng

1. **Primary = CTA Color**: Luôn dùng `bg-brk-primary` cho nút hành động chính
2. **Section Colors**: Dùng `bg-brk-section` và `bg-brk-section-alt` cho containers
3. **Text Contrast**: Đảm bảo `text-brk-text` có độ tương phản đủ với background
4. **Border Consistency**: Dùng `border-brk-section` để borders tự động thay đổi theo theme
5. **Override Classes**: Các class Tailwind như `.bg-yellow-400` sẽ tự động được override bởi theme primary

---

## Quick Reference - Bảng Màu 1 Dòng

```
┌─────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│         │   Royal     │  Energy     │  Digital    │    Dark     │   Trust     │
│         │   Empire    │  & Growth   │   Leader    │             │   & Wisdom  │
├─────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ primary │ #D4AF37 ▓▓ │ #FF6B00 ▓▓▓ │ #0066FF ▓▓▓ │ #BB86FC ▓▓ │ #059669 ▓▓ │
│ header  │ #0F172A ▓▓ │ #222222 ▓▓▓ │ #FFFFFF ░░░ │ #121212 ▓▓ │ #065F46 ▓▓ │
│ bg      │ #FFFFFF ░░ │ #FFFFFF ░░░ │ #FFFFFF ░░░ │ #121212 ▓▓ │ #FDFDFD ░░ │
│ text    │ #111111 ▓▓ │ #1A1A1A ▓▓▓ │ #0A1F44 ▓▓▓ │ #FFFFFF ░░ │ #064E3B ▓▓ │
│ accent  │ #C5A028 ▓▓ │ #00C853 ▓▓▓ │ #FF4D4D ▓▓▓ │ #CF6679 ▓▓ │ #F59E0B ▓▓ │
└─────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

▓▓ = Màu tối/saturated  |  ░░ = Màu sáng/nhạt
```

---

## Hỗ Trợ

Nếu cần thêm theme mới hoặc điều chỉnh màu sắc, liên hệ developer hoặc chỉnh sửa trực tiếp file `theme-config.ts`.
