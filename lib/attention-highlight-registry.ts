/**
 * Danh sách các "vị trí" (đối tượng cụ thể trên Header/Footer) đang tham gia
 * cơ chế lóe sáng + tooltip tự động (xem hooks/useAttentionCycle.ts và
 * components/ui/attention-highlight.tsx).
 *
 * File này chỉ định nghĩa những vị trí NÀO tồn tại và nhãn hiển thị cho admin
 * (việc gắn vào đúng component vẫn là code, không thể chuyển thành dữ liệu) —
 * nhưng NỘI DUNG tooltip + bật/tắt cho từng vị trí thì đọc từ DB
 * (SystemConfig, xem app/actions/attention-highlight-actions.ts) nên đổi được
 * không cần deploy lại.
 */
export interface AttentionPositionDef {
    /** Khóa duy nhất toàn hệ thống — đặt tên dạng "trang.vị-trí" để tránh trùng
     * giữa các trang khác nhau (vd MainHeader và CoursePlayer cùng có nút "back"). */
    id: string
    /** Nhóm hiển thị trong trang cài đặt, để admin dễ định vị */
    group: string
    /** Tên ngắn gọn cho admin, không phải nội dung tooltip thật */
    label: string
    /** Nội dung tooltip mặc định khi admin chưa tuỳ chỉnh trong DB */
    defaultTooltip: string
}

export const ATTENTION_POSITIONS: AttentionPositionDef[] = [
    { id: 'mainheader.logo', group: 'Header trang chủ', label: 'Logo', defaultTooltip: 'Cộng đồng' },
    { id: 'mainheader.home', group: 'Header trang chủ', label: 'Nút Trang chủ', defaultTooltip: 'Trang chủ' },
    { id: 'mainheader.back', group: 'Header trang chủ', label: 'Nút Quay lại', defaultTooltip: 'Quay lại' },
    { id: 'mainheader.help', group: 'Header trang chủ', label: 'Nút Trợ giúp', defaultTooltip: 'Trợ giúp' },
    { id: 'mainheader.tools', group: 'Header trang chủ', label: 'Nút Công cụ', defaultTooltip: 'Công cụ & Tiện ích' },
    { id: 'mainheader.share', group: 'Header trang chủ', label: 'Nút Chia sẻ', defaultTooltip: 'Chia sẻ link' },
    { id: 'mainheader.wallet', group: 'Header trang chủ', label: 'Nút Ví MBW', defaultTooltip: 'Ngân hàng Phước báu' },
    { id: 'mainheader.avatar', group: 'Header trang chủ', label: 'Avatar cá nhân', defaultTooltip: 'Cá nhân' },

    { id: 'courseplayer.back', group: 'Trang học (/courses/{slug}/learn)', label: 'Nút Thoát ra (Header)', defaultTooltip: 'Thoát ra khỏi bài học' },
    { id: 'courseplayer.tab.list', group: 'Trang học (/courses/{slug}/learn)', label: 'Tab Danh sách (Footer)', defaultTooltip: 'Danh sách toàn bộ bài học' },
    { id: 'courseplayer.tab.content', group: 'Trang học (/courses/{slug}/learn)', label: 'Tab Nội dung (Footer)', defaultTooltip: 'Xem video & tương tác' },
    { id: 'courseplayer.tab.record', group: 'Trang học (/courses/{slug}/learn)', label: 'Tab Ghi nhận (Footer)', defaultTooltip: 'Nộp bài & xem điểm' },
]
