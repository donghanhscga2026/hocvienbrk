# Care Bridge — cầu nối Zalo cho Care Engine (GĐ4)

Tiến trình phụ nhỏ, chạy trên **máy Windows của chủ hệ thống**, giữ 1 phiên đăng nhập của **nick Zalo phụ (nick trợ lý)** và thực thi các lệnh gửi nhắc mà Care Engine sinh ra trên website. Website không nhúng thư viện Zalo: hai phía chỉ trao đổi qua API ký HMAC-SHA256 (`/api/care-bridge/*`).

Luồng hoạt động:

1. Mỗi 60 giây: gửi nhịp tim về website (panel “Kênh Zalo” trong CRM hiện trạng thái trực tuyến + phiên bản).
2. Mỗi ~20 giây: xin website cấp lệnh gửi đang chờ (tôn trọng công tắc tắt khẩn cấp và trần 200 lệnh/ngày ở phía website).
3. Gửi từng lệnh qua Zalo với **giãn cách ngẫu nhiên 10–25 giây/tin** (tối thiểu 3 giây, tối đa 20 tin/phút), **không gửi trong khung 22:00–06:00**. Gửi xong báo kết quả (thành công/thất bại) về website.
4. Tin học viên nhắn đến nick trợ lý được đẩy về website và tự thành **yêu cầu hỗ trợ trong CRM** để giảng viên trả lời như mọi kênh khác.
5. Chống gửi trùng 2 lớp: website khóa `idempotencyKey` ở cơ sở dữ liệu; bridge lưu các khóa đã gửi thành công vào `data/sent-keys.json` — khởi động lại cũng không gửi trùng.

## Cảnh báo quan trọng — đọc trước khi chạy

- Thư viện `zca-js` là thư viện **không chính thức** (giả lập Zalo Web). Dùng sai cách có thể khiến tài khoản bị hạn chế hoặc khóa. **Chỉ dùng nick Zalo phụ (nick trợ lý)** cho bridge này. **Không bao giờ** đăng nhập nick chính của giảng viên.
- Chỉ nhắn cho học viên **đã ghi danh hoặc đã có hội thoại** với nick trợ lý. Zalo có thể không cho nhắn tới người lạ chưa từng kết bạn/hội thoại — lệnh sẽ báo lỗi và hiện ở tab Kênh Zalo trong CRM.
- Máy chạy bridge cần bật ổn định trong giờ hành chính; tắt máy = bridge ngoại tuyến, lệnh vẫn nằm chờ trên website, không mất.
- File `data/session.json` tương đương mật khẩu của nick phụ: không gửi cho ai, không đưa lên mạng.
- Cần dừng gấp toàn kênh: vào CRM → tab **Kênh Zalo** → bật **Tắt khẩn cấp toàn kênh** (chỉ quản trị viên). Mọi lệnh chờ bị giữ lại ngay; tắt công tắc thì lệnh quay lại hàng chờ.

## Cài đặt trên Windows

Yêu cầu: Node.js bản LTS (18 trở lên) — tải tại nodejs.org.

```bat
cd care-bridge
npm install
copy .env.example .env
```

Mở `.env` và điền:

- `CARE_BRIDGE_API_BASE`: địa chỉ website, ví dụ `https://giautoandien.io.vn` (không có dấu `/` ở cuối).
- `CARE_BRIDGE_SECRET`: khóa bí mật dài, ngẫu nhiên — **phải giống hệt** giá trị `CARE_BRIDGE_SECRET` đặt ở phía máy chủ website. Chưa đặt ở website thì bridge chỉ nhận lỗi 503 và chưa hoạt động được.

Chạy thử:

```bat
npm start
```

Lần chạy đầu chưa có phiên lưu: chương trình lưu **ảnh mã QR đăng nhập vào `data/qr.png`** và tự mở ảnh đó trên Windows. Mở ứng dụng Zalo trên điện thoại của **nick phụ** → quét mã trong ảnh `data/qr.png` → xác nhận đăng nhập. (Không quét mã QR vẽ bằng ký tự trong console: mã đó chỉ chứa chuỗi mã thô, Zalo quét vào chỉ hiện văn bản chứ không mở màn hình đăng nhập — nội dung đăng nhập đúng nằm trong ảnh do máy chủ Zalo tạo.) Phiên được lưu vào `data/session.json`, các lần sau tự đăng nhập lại, không cần quét nữa (trừ khi Zalo thu hồi phiên).

## Chạy nền lâu dài (chọn 1 cách)

- **Task Scheduler**: tạo tác vụ “At log on” chạy `node src\index.js` trong thư mục `care-bridge`, bật “Run whether user is logged on or not” nếu máy có mật khẩu.
- **pm2**: `npm install -g pm2` rồi `pm2 start src/index.js --name care-bridge` và `pm2 save`.

Nhật ký chạy hiện trực tiếp trên console (hoặc log của pm2/Task Scheduler): mỗi lệnh gửi thành công/thất bại đều có 1 dòng kèm mã lệnh để đối chiếu với tab Kênh Zalo trong CRM.

## Sự cố thường gặp

- `Website chưa cấu hình CARE_BRIDGE_SECRET` (lỗi 503): phía máy chủ website chưa đặt biến môi trường này, hoặc khóa ở 2 phía không khớp (lỗi 401/chữ ký không hợp lệ).
- `Không tìm thấy tài khoản Zalo cho số điện thoại`: học viên chưa dùng số đó trên Zalo, hoặc chưa từng kết bạn/hội thoại với nick trợ lý — nhờ học viên nhắn 1 tin bất kỳ vào nick trợ lý trước.
- Mất kết nối Zalo: bridge tự kết nối lại với giãn cách tăng dần (15 giây → tối đa 5 phút). Nếu phiên bị thu hồi, chương trình quay lại luồng quét QR — quét lại bằng nick phụ.
- Muốn đổi nick phụ: dừng bridge, xóa `data/session.json`, chạy lại và quét QR bằng nick mới.

## Cấu trúc thư mục

```text
care-bridge/
  package.json        — gói độc lập, ngoài build Next/Vercel của website
  .env.example        — mẫu cấu hình (bản thật là .env, không commit)
  src/
    index.js          — vòng lặp chính: nhịp tim, lấy lệnh, gửi, nhận tin
    zalo.js           — đăng nhập/phiên/nghe tin/gửi tin qua zca-js
    api-client.js     — gọi API website có ký HMAC
    config.js         — nạp .env + kiểm tra cấu hình
  data/               — dữ liệu chạy (phiên đăng nhập, khóa đã gửi) — không commit
```
