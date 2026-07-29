# Tài liệu kỹ thuật — Course Learning & Video Player

**Ngày:** 29/07/2026  
**Phiên bản:** 2.0 (Universal Video Player)  
**Cập nhật từ:** 1.0 (YouTube-only → đa nền tảng)

---

## 1. KIẾN TRÚC HỆ THỐNG

### 1.1 Data Flow

```
Course/[id]/learn (Server Component)
  ├── Lấy Enrollment + Lessons từ DB (Prisma)
  │
  └── Client Component: CoursePlayer
        ├── LessonSidebar (danh sách bài)
        ├── VideoPlayer (video/tài liệu)
        │     ├── YouTube (YT.Player API)
        │     ├── MP4 (<video> tag)
        │     ├── Vimeo (iframe)
        │     ├── Dailymotion (iframe)
        │     ├── TikTok (iframe)
        │     ├── Facebook (iframe)
        │     ├── Google Drive (iframe)
        │     └── Unknown (iframe fallback)
        ├── AssignmentForm (ghi nhận)
        └── ChatSection (bình luận)
```

### 1.2 Component Tree

```
CoursePlayer (state: currentLessonId, courseType)
  ├── LessonSidebar
  │     Props: lessons, currentLessonId, progress, isLibCourse
  │     Logic: isLessonUnlocked, isCompleted
  │
  ├── VideoPlayer (core — 522 dòng)
  │     Props: enrollmentId, lessonId, videoUrl, lessonContent,
  │            initialMaxTime, onProgress, onPercentChange,
  │            playlistData, lastVideoIndex, serverPlaylist,
  │            courseType, lessonType
  │     State: currentIndex, granularProgress, isFullscreen,
  │            isMounted, docTimer, isReading, showPlaylist
  │     Refs: playerRef, videoContainerRef, htmlVideoRef,
  │           saveIntervalRef, docTimerRef, containerRef
  │
  ├── AssignmentForm
  │     Props: enrollmentId, lessonId, lessonOrder, startedAt,
  │            courseType, clientTimeZone
  │
  └── ChatSection
```

---

## 2. VIDEO SOURCE DETECTION

### 2.1 Module: `lib/video-sources.ts`

**Interface:**
```typescript
type VideoPlatform = 'youtube' | 'vimeo' | 'dailymotion' | 'tiktok' | 'facebook' | 'drive' | 'mp4' | 'unknown'

interface VideoSource {
  platform: VideoPlatform
  embedUrl: string | null    // URL để nhúng (iframe/player)
  trackable: boolean         // Có thể track tiến độ không?
  videoId: string | null     // ID video trên platform
}
```

**Hàm chính:**
```typescript
detectVideoSource(url: string): VideoSource
```

### 2.2 Logic phát hiện platform

| Platform | Regex | Embed URL |
|----------|-------|-----------|
| YouTube | `youtube.com/watch?v=`, `youtu.be/`, `shorts/`, `live/` | `youtube.com/embed/{id}` |
| Vimeo | `vimeo.com/{number}` | `player.vimeo.com/video/{id}` |
| Dailymotion | `dailymotion.com/video/`, `dai.ly/` | `dailymotion.com/embed/video/{id}` |
| TikTok | `tiktok.com/@user/video/{id}` | `tiktok.com/embed/v2/{id}` |
| Facebook | `facebook.com/.../videos/{id}` | `facebook.com/plugins/video.php?href=...` |
| Google Drive | `drive.google.com/file/d/{id}` | `drive.google.com/file/d/{id}/preview` |
| MP4 | URL kết thúc `.mp4` | URL gốc (dùng `<video>` tag) |
| Unknown | Không match pattern nào | URL gốc (iframe fallback) |

### 2.3 Trackable platforms

Chỉ các platform sau mới hỗ trợ tracking tiến độ:
- **YouTube**: `YT.Player.getCurrentTime()`, interval 5s
- **MP4**: `<video>.currentTime`, timeupdate event, interval 5s
- **Vimeo**: SDK (có postMessage API thời gian)
- **Dailymotion**: SDK (có postMessage API thời gian)

Các platform còn lại (TikTok, Facebook, Drive, Unknown):
- `trackable = false`
- Scoring: auto 2 điểm trong `submitAssignmentAction`

---

## 3. VIDEO PLAYER — UNIVERSAL

### 3.1 File: `components/course/VideoPlayer.tsx`

#### Flow khởi tạo:

```
useEffect([currentIndex, isMounted, type, url])
  │
  ├── detectVideoSource(url) → source
  │
  ├── source.platform === 'youtube'
  │     ├── Load YouTube IFrame API (1 lần)
  │     ├── new YT.Player(videoContainerRef, { videoId, ... })
  │     └── onStateChange: PLAYING → setInterval(trackYouTubeProgress, 5000)
  │                       ENDED → saveProgress(dur, dur)
  │
  ├── source.platform === 'mp4'
  │     ├── <video ref={htmlVideoRef} src={embedUrl}>
  │     ├── timeupdate → setInterval(trackMp4Progress, 5000)
  │     └── ended → saveProgress(dur, dur)
  │
  ├── source.platform === 'vimeo' | 'dailymotion' | 'tiktok' | 'facebook' | 'drive'
  │     └── <iframe src={embedUrl} allowFullScreen />
  │
  └── source.platform === 'unknown'
        └── <iframe src={url} />
```

#### Playlist:

Playlist được parse từ `videoUrl` (pipe-delimited string):
```
[Title]url → video item
(Title)url → doc item
bare url   → auto-titled video item
```

Mỗi item được gán `source` từ `detectVideoSource(url)`.

Progress per-item được lưu trong `granularProgress: Record<number, {maxTime, duration}>`.

#### Render switch (3 loại):

```typescript
currentItem?.type === 'video'
  ├── YouTube    → renderVideo() → div + videoContainerRef
  ├── MP4        → renderVideo() → <video ref={htmlVideoRef}>
  └── Others     → renderVideo() → <iframe>

currentItem?.type === 'text'
  └── renderNonVideo() → <div dangerouslySetInnerHTML>

currentItem?.type === 'doc'
  └── renderNonVideo() → <iframe src={getEmbedUrl(url)}> + timer
```

### 3.2 Progress tracking

#### YouTube
```typescript
trackYouTubeProgress = () => {
  const currentTime = playerRef.current.getCurrentTime()
  const duration = playerRef.current.getDuration()
  if (currentTime > stored.maxTime) saveProgress(index, currentTime, duration)
}
// Interval: 5 giây khi PLAYING
// ENDED: saveProgress(index, duration, duration)
```

#### MP4
```typescript
trackMp4Progress = () => {
  const currentTime = htmlVideoRef.current.currentTime
  const duration = htmlVideoRef.current.duration
  if (currentTime > stored.maxTime) saveProgress(index, currentTime, duration)
}
// Event: timeupdate → interval 5s
// Event: ended → saveProgress(index, duration, duration)
```

#### Document (Docs)
```typescript
// Timer 30 giây đếm ngược
// Mỗi 5 giây: saveProgress(index, currentSecond, 30)
// Hết 30s: auto complete
```

### 3.3 Save progress

```typescript
saveProgress(index, maxTime, duration) → {
  1. Cập nhật granularProgress state
  2. Tính aggregate (tổng hợp tất cả items trong playlist)
  3. Gọi onProgress, onPercentChange (callback lên CoursePlayer)
  4. Gọi saveVideoProgressAction (server action)
}
```

---

## 4. SCORING SYSTEM

### 4.1 File: `app/actions/course-actions.ts`

#### `saveVideoProgressAction` (Lưu tiến độ real-time)

```typescript
Input: { enrollmentId, lessonId, maxTime, duration, lastIndex, playlistScores }

Logic:
  - Nếu có playlistScores:
      Tính tổng maxTime/tổng duration của tất cả items
      percent = totalMax / totalDur
      vidScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
  - Nếu không có playlistScores (single video):
      percent = duration > 0 ? maxTime / duration : 0
      vidScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0

Output: upsert LessonProgress.scores
```

#### `submitAssignmentAction` (Tính điểm khi nộp bài)

```typescript
Input: { enrollmentId, lessonId, reflection, links, supports, ... }

Logic:
  1. Lấy lesson.videoUrl từ DB
  2. Kiểm tra trackable:
     - Regex: /youtu\.be\/|youtube\.com\/|\.mp4|vimeo\.com\/|dailymotion\.com\//
     - Nếu không match → nonTrackable = true → videoScore = 2 (auto)
     - Nếu match → trackable → tính từ scores DB (playlist / max+duration / client)
  
  3. reflectionScore = reflection.length >= 50 ? 2 : length > 0 ? 1 : 0
  4. linkScore = min(links.length, 3)
  5. supportScore = count(supports === true)
  6. timingScore = dựa trên deadline

Tổng điểm: videoScore + reflectionScore + linkScore + supportScore + timingScore
```

### 4.2 Bảng điểm

| Thành phần | Điểm tối đa | Cách tính |
|------------|-------------|-----------|
| Video | 2 | Xem ≥95% = 2, ≥50% = 1, <50% = 0. Non-trackable = auto 2 |
| Phản ánh | 2 | ≥50 ký tự = 2, >0 = 1 |
| Đường dẫn | 3 | Mỗi link = 1 (tối đa 3) |
| Hỗ trợ | 6 | Mỗi mục checked = 1 |
| Đúng hạn | 1 | Trước deadline = 1, sau = -1 |

**Tổng tối đa:** 14 điểm

---

## 5. ADMIN — QUẢN LÝ BÀI HỌC

### 5.1 File: `components/admin/courses/LessonEditModal.tsx`

| Field | Kiểu | Ghi chú |
|-------|------|---------|
| Tiêu đề | text | Bắt buộc |
| Loại bài học | select | VIDEO / DOCS / TEXT |
| Link Video | text | Đa nền tảng: YouTube, Vimeo, .mp4, TikTok, FB, Drive |
| Link Tài liệu | text | Google Docs URL |
| Nội dung | textarea | HTML content (cho TEXT type) |
| Thứ tự | number | |
| Bài tập bắt buộc | checkbox | isDailyChallenge |

### 5.2 Định dạng playlist

Khi nhập playlist, dùng pipe (`|`) để phân cách:
```
[Video 1]https://youtube.com/watch?v=xxx | [Video 2]https://vimeo.com/123 | (Tài liệu)https://docs.google.com/...
```

Các nền tảng có thể mix trong cùng playlist.

---

## 6. COURSE TYPES

| Type | Đặc điểm | Video tracking | Assignment |
|------|----------|----------------|------------|
| **NORMAL** | Học có thứ tự, có ghi nhận, tính điểm | ✅ | ✅ |
| **CHALLENGE** | Giống NORMAL + thử thách ngày | ✅ | ✅ |
| **LIB** | Tài liệu, xem tự do, không ghi nhận | ✅ (bảo vệ) | ❌ |

---

## 7. FILE MAP

| File | Vai trò |
|------|---------|
| `lib/video-sources.ts` | Utility: phát hiện platform, tạo embed URL |
| `components/course/CoursePlayer.tsx` | Orchestrator: quản lý lesson state, kết nối các component |
| `components/course/VideoPlayer.tsx` | Core: universal video player, playlist, tracking |
| `components/course/LessonSidebar.tsx` | Sidebar: danh sách bài học, tiến độ |
| `components/course/AssignmentForm.tsx` | Form: ghi nhận bài học, nộp điểm |
| `components/course/LessonTocModal.tsx` | Modal: bảng mục lục (mobile) |
| `app/actions/course-actions.ts` | Server actions: saveVideoProgress, submitAssignment |
| `app/courses/[id]/learn/page.tsx` | Page: server component fetch dữ liệu học tập |
| `components/admin/courses/AddLessonModal.tsx` | Admin: thêm bài học mới |
| `components/admin/courses/LessonEditModal.tsx` | Admin: sửa bài học |

---

## 8. DATABASE SCHEMA

### Lesson
```prisma
model Lesson {
  id               String      @id @default(cuid())
  courseId         Int
  title            String
  videoUrl         String?     // URL gốc hoặc pipe-delimited playlist
  content          String?     // HTML content (TEXT type)
  order            Int
  isDailyChallenge Boolean     @default(false)
  type             LessonType  @default(VIDEO)  // VIDEO | DOCS | TEXT | ALL
}
```

### LessonProgress
```prisma
model LessonProgress {
  enrollmentId Int
  lessonId     String
  scores       Json?      // { video, reflection, link, support, timing, lastVideoIndex, playlist }
  totalScore   Int        @default(0)
  maxTime      Float      @default(0)   // Tổng thời gian đã xem (seconds)
  duration     Float      @default(0)   // Tổng thời lượng video (seconds)
  status       String     @default("IN_PROGRESS")  // IN_PROGRESS | COMPLETED | RESET
  assignment   Json?      // { reflection, links, supports }
}
```

### scores JSON structure
```json
{
  "video": 2,
  "lastVideoIndex": 3,
  "playlist": {
    "0": { "maxTime": 120, "duration": 120 },
    "1": { "maxTime": 45, "duration": 60 },
    "2": { "maxTime": 30, "duration": 30 }
  }
}
```

---

## 9. UPGRADE HISTORY

| Ngày | Phiên | Thay đổi |
|------|-------|----------|
| 12/04/2026 | 1.0 | Tài liệu gốc (YouTube + LIB) |
| 29/07/2026 | 2.0 | Universal Video Player: thêm Vimeo, Dailymotion, TikTok, Facebook, Drive, MP4. Scoring cập nhật cho non-trackable platforms |

---

*Tài liệu kỹ thuật — Học Viện BRK*
