# Hướng dẫn sử dụng — Học khóa học

**Ngày:** 29/07/2026  
**Phiên bản:** 1.0  
**Phạm vi:** Video Player, Playlist, Ghi nhận bài học

---

## 1. GIAO DIỆN HỌC TẬP

Khi vào một khóa học, giao diện chia làm 3 khu vực chính:

```
┌─────────────────────────────────────┬──────────────┐
│                                     │  DANH SÁCH   │
│         VIDEO PLAYER                │  BÀI HỌC     │
│                                     │              │
│                                     │  ☐ Bài 1     │
│                                     │  ☑ Bài 2     │
│                                     │  ☐ Bài 3     │
├─────────────────────────────────────┼──────────────┤
│  Thanh điều khiển (playlist, nav)   │  GHI NHẬN    │
└─────────────────────────────────────┴──────────────┘
```

### 1.1 Khu vực Video Player (Trung tâm)
- Chiếm phần lớn màn hình
- Hiển thị video/tài liệu/nội dung của bài học hiện tại
- Toàn màn hình: Click nút ⛶ ở góc dưới phải thanh điều khiển

### 1.2 Danh sách bài học (Bên phải — Desktop)
- Liệt kê tất cả bài học trong khóa học
- Tick xanh = đã hoàn thành
- Click để chuyển bài

### 1.3 Tab Ghi nhận (Bên phải — Desktop)
- Nơi học viên ghi lại bài học (phản ánh, đường dẫn, hỗ trợ)
- Chỉ hiển thị với khóa học NORMAL/CHALLENGE
- **Không hiển thị** với khóa học LIB

---

## 2. VIDEO PLAYER — ĐA NỀN TẢNG

Hệ thống hỗ trợ xem video từ **nhiều nền tảng khác nhau**:

### 2.1 Các nền tảng được hỗ trợ

| Nền tảng | Nhập link dạng | Ghi chú |
|----------|---------------|---------|
| **YouTube** | `youtube.com/watch?v=...` | ✅ Có tracking tiến độ |
| | `youtu.be/...` | Tự động resume từ vị trí đã xem |
| | `youtube.com/shorts/...` | |
| | `youtube.com/live/...` | |
| **MP4 trực tiếp** | `https://...video.mp4` | ✅ Có tracking tiến độ |
| | | Link kết thúc bằng `.mp4` |
| **Vimeo** | `vimeo.com/123456` | ✅ Có tracking (qua SDK) |
| | `player.vimeo.com/video/...` | |
| **Dailymotion** | `dailymotion.com/video/...` | ✅ Có tracking (qua SDK) |
| | `dai.ly/...` | |
| **TikTok** | `tiktok.com/@user/video/...` | ⚠️ Không tracking — auto tính điểm |
| **Facebook** | `facebook.com/.../videos/...` | ⚠️ Không tracking — auto tính điểm |
| **Google Drive** | `drive.google.com/file/d/...` | ⚠️ Không tracking — auto tính điểm |
| **Link khác** | Bất kỳ URL video nào | ⚠️ Hiển thị trong iframe, không tracking |

### 2.2 Cách sử dụng
1. Admin nhập link video vào bài học (bất kỳ nền tảng nào ở trên)
2. Học viên mở bài học → Video tự động phát
3. Tiến độ được lưu tự động (nếu nền tảng hỗ trợ)

---

## 3. PLAYLIST (DANH SÁCH PHÁT)

Một bài học có thể chứa **nhiều video/tài liệu** trong 1 playlist.

### 3.1 Định dạng playlist
Admin nhập vào trường "Link Video" với cú pháp:

```
[Tiêu đề 1]https://youtube.com/watch?v=xxx | [Tiêu đề 2]https://vimeo.com/123 | (Tài liệu)https://docs.google.com/...
```

- `[Tiêu đề]url` = Video
- `(Tiêu đề)url` = Google Docs
- Không có dấu ngoặc → Tự động đặt tên "Phần 1", "Phần 2",...

### 3.2 Tương tác với playlist
- Click nút **☰** ở thanh điều khiển → Mở danh sách phát
- Click vào một mục trong danh sách → Chuyển đến mục đó
- Thanh tiến độ hiển thị % đã xem của từng mục
- Tick xanh = đã xem xong (≥95%)

### 3.3 Playlist đa nền tảng
Có thể **pha trộn** nhiều nền tảng trong 1 playlist:
```
[Bài 1]youtube.com/xxx | [Bài 2]vimeo.com/yyy | [Bài 3]https://example.com/video.mp4 | (Phụ lục)docs.google.com/...
```

---

## 4. LOẠI BÀI HỌC

Mỗi bài học có thể là một trong các loại sau:

| Loại | Mô tả | Hiển thị |
|------|-------|----------|
| **VIDEO** | Video hoặc playlist | Video player (đa nền tảng) |
| **DOCS** | Google Docs | Iframe nhúng tài liệu |
| **TEXT** | Văn bản thuần | Khung nội dung scroll |
| **ALL** | Văn bản + playlist | Văn bản ở đầu, playlist bên dưới |

---

## 5. THEO DÕI TIẾN ĐỘ

Hệ thống tự động theo dõi tiến độ xem video:

### 5.1 Cơ chế tracking

| Loại | Cách tracking | Tần suất |
|------|---------------|----------|
| **YouTube** | `getCurrentTime()` qua API | 5 giây/lần |
| **MP4** | `timeupdate` event | 5 giây/lần |
| **Vimeo** | SDK timeupdate | 5 giây/lần |
| **Dailymotion** | SDK timeupdate | 5 giây/lần |
| **Tài liệu (Docs)** | Đếm thời gian đọc | 30 giây (tự động xong) |
| **Khác (TikTok/FB/Drive)** | Không tracking | Auto tính điểm |

### 5.2 Cách tính điểm

| Mức xem | Điểm video |
|---------|------------|
| ≥ 95% | 2 điểm (tối đa) |
| ≥ 50% | 1 điểm |
| < 50% | 0 điểm |
| Không tracking (TikTok/FB/Drive) | 2 điểm (tự động) |
| Không có video | 2 điểm (tự động) |

### 5.3 Resume
- Video tự động tiếp tục từ vị trí đã xem lần trước
- Khi chuyển bài, tiến độ được lưu ngay lập tức

---

## 6. GHI NHẬN BÀI HỌC

Sau khi xem video, học viên cần làm **Ghi nhận** (với khóa học NORMAL/CHALLENGE):

### 6.1 Các mục ghi nhận

| Mục | Yêu cầu | Điểm tối đa |
|-----|---------|-------------|
| **Phản ánh (Reflection)** | Viết ≥ 50 ký tự | 2 điểm |
| **Đường dẫn (Links)** | Tối đa 3 link | 3 điểm |
| **Hỗ trợ (Supports)** | Tối đa 6 mục | 6 điểm |
| **Video** | Xem ≥ 95% | 2 điểm |
| **Đúng hạn** | Trước deadline | 1 điểm |

### 6.2 Lưu ý
- Có thể sửa Ghi nhận nếu còn trong thời hạn
- Deadline = ngày bắt đầu + (số thứ tự bài - 1) ngày
- Sau khi ghi nhận xong, bài học chuyển sang trạng thái hoàn thành

---

## 7. KHÓA HỌC LIB (Tài liệu)

Khóa học LIB có các đặc điểm:
- ✅ Xem tự do tất cả bài, không cần theo thứ tự
- ❌ Không có tab Ghi nhận
- ❌ Không tính điểm
- ✅ Video được bảo vệ (không mở được trên YouTube)
- ✅ Cần xác minh email để truy cập

---

## 8. PHÍM TẮT & THỦ THUẬT

| Phím | Chức năng |
|------|-----------|
| `Esc` | Thoát toàn màn hình |
| Click nút ◀ ▶ | Chuyển bài trước/sau |
| Click ⛶ | Toàn màn hình |
| Click nền đen | LIB: vô hiệu hóa nút YouTube |

---

*Tài liệu hướng dẫn sử dụng — Học Viện BRK*
