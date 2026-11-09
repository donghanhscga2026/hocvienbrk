/**
 * Câu lệnh mẫu để giảng viên nhờ AI (Gemini/ChatGPT) CHUYỂN trang bán hàng
 * sẵn có của họ (làm bên ngoài, ví dụ một file HTML hoặc trang dựng bằng
 * công cụ khác) thành dạng tương thích với trang bán khóa học trên hệ
 * thống: một khối HTML tự chứa, nút đăng ký trỏ #dang-ky để hệ thống tự
 * nối tới bước đăng ký, ảnh dạng link ngoài, bỏ phần đăng ký/thanh toán
 * riêng của trang gốc vì hệ thống đã lo phần đó.
 */
export const COURSE_SALES_HTML_PROMPT = `Tôi có sẵn một trang bán khóa học làm bên ngoài. Tôi sẽ dán toàn bộ mã HTML của trang đó ngay bên dưới câu lệnh này. Hãy chuyển mã đó thành dạng tương thích để dán vào trang bán khóa học trên hệ thống của tôi, theo đúng các luật sau:

1. Giữ nguyên nội dung chữ, thứ tự các phần và tinh thần trình bày của trang gốc. Chỉ thay đổi về mặt kỹ thuật cho tương thích, không viết lại nội dung, không thêm bớt phần nào.
2. Kết quả là MỘT khối HTML duy nhất, tự chứa toàn bộ: toàn bộ CSS nằm trong một thẻ <style> ở đầu khối. Xoá mọi liên kết tới file CSS, file JS hay thư viện bên ngoài. Không dùng JavaScript — phần nào trong trang gốc chạy bằng JavaScript (ví dụ đồng hồ đếm ngược, popup, hiệu ứng) thì chuyển thành dạng tĩnh hiển thị được ngay, hoặc bỏ phần đó nếu không chuyển được.
3. Bỏ phần đầu trang và chân trang riêng của trang gốc (thanh menu, logo, footer, các link điều hướng sang trang khác). Chỉ giữ phần nội dung bán khóa học.
4. Mọi nút kêu gọi đăng ký, mua học, nhận tư vấn phải trỏ tới href="#dang-ky" — hệ thống sẽ tự nối các nút này tới bước đăng ký. Xoá form đăng ký, cửa sổ đăng ký riêng, mã QR và thông tin chuyển khoản của trang gốc: phần đăng ký và thanh toán do hệ thống xử lý.
5. Ảnh phải là link ngoài đầy đủ dạng https://... — đường dẫn ảnh tương đối (kiểu assets/anh.jpg) phải đổi thành dòng chữ DÁN LINK ẢNH vào thuộc tính src để tôi thay link thật sau. Ảnh nào đã là link https:// thì giữ nguyên.
6. Đặt toàn bộ nội dung trong một thẻ bao ngoài có class="trang-ban-tuong-thich" và viết mọi CSS bắt đầu từ class này, để phần trình bày không tràn sang phần còn lại của trang web. Trang phải hiển thị đẹp trên điện thoại: chữ đủ lớn, nút bấm to, không bị tràn ngang.
7. Chỉ trả về mã HTML đã chuyển đổi, không giải thích gì thêm.

MÃ HTML TRANG BÁN HÀNG CỦA TÔI:
[DÁN MÃ HTML VÀO ĐÂY]`
