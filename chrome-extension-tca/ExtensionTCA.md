# TCA to BRK Sync Extension

## Mục đích
Chrome Extension (Manifest V3) để tự động quét và đồng bộ toàn bộ dữ liệu `group_tree` từ TCA portal về BRK system.

## Tính năng
- ✅ **Auto-scan**: Tự động quét toàn bộ cây hệ thống
- ✅ **Recursive fetch**: Tự động gọi API cho mỗi folder để lấy children
- ✅ **Progress logging**: Hiển thị tiến trình trong console
- ✅ **JSON export**: Tự động tải file JSON sau khi quét xong
- ✅ **LocalStorage backup**: Lưu data trong localStorage

## Cấu trúc thư mục
```
chrome-extension-tca/
├── manifest.json         # Extension config (Manifest V3)
├── content-script.js    # Nhận message, xử lý full tree, sync server
├── injected-script.js    # XHR interceptor + auto-scan logic
└── README.md            # Document này
```

## Cách hoạt động

### 1. Auto-Scan Flow
```
1. Load trang Group Management
2. Initial API call → nhận top-level folders
3. Tự động fetch children cho mỗi folder
4. Lặp lại cho đến khi không còn folder nào
5. Export JSON + Sync lên server
```

### 2. Data Structure
```typescript
interface TCANode {
  id: number;           // TCA User ID
  type: 'folder' | 'item';
  level: string;        // Cấp bậc (1, 2, 3...)
  name: string;         // Tên thành viên
  location: string;     // Địa điểm
  rawHtml: string;      // HTML gốc
}

interface FullTreeResponse {
  source: 'TCA_EXT_FULL';
  timestamp: number;
  stats: {
    total: number;      // Tổng items
    folders: number;     // Số folders đã scan
    items: number;       // Số leaf items
  };
  tree: TreeFolder[];   // Chi tiết từng API response
  allNodes: TCANode[];   // Flattened list tất cả nodes
}
```

## Cài đặt

1. Mở Chrome → `chrome://extensions/`
2. Bật **Developer mode**
3. Click **Load unpacked**
4. Chọn thư mục `chrome-extension-tca`

## Debug Console Logs

| Log | Ý nghĩa |
|-----|---------|
| `[TCA Sync] XHR interceptor initialized` | Extension loaded |
| `[TCA AutoScan] Starting full tree scan...` | Bắt đầu auto-scan |
| `[TCA AutoScan] Fetched X items (Y folders)` | Fetch thành công |
| `[TCA AutoScan] Scan complete!` | Hoàn thành |
| `[TCA Sync] 🌲 FULL TREE CAPTURED!` | Data đã sẵn sàng |
| `[TCA Sync] JSON file downloaded!` | File JSON đã tải |

## Control Messages

Có thể điều khiển scan qua console:
```javascript
// Stop scan
window.postMessage({ type: 'TCA_CONTROL', command: 'stopScan' }, '*');

// Resume scan
window.postMessage({ type: 'TCA_CONTROL', command: 'startScan' }, '*');
```

## Lưu ý
- Scan có delay 100ms giữa mỗi folder để tránh rate limiting
- Data được lưu vào `localStorage.tca_full_tree`
- JSON file tự động tải về sau khi scan xong
