/**
 * Xử lý cú pháp content spinning {option1|option2|option3}
 * Ví dụ: "Chào {bạn|anh|chị}, {hôm nay|ngày mai} sẽ có buổi học."
 */
export function spinContent(content: string): string {
  if (!content) return "";
  
  // Biểu thức chính quy tìm các khối {a|b|c}
  const spinRegex = /\{([^{}]*)\}/g;
  
  let spun = content;
  let match;
  
  // Lặp cho đến khi không còn khối nào (hỗ trợ nested sơ bộ nếu cần, nhưng cơ bản là 1 cấp)
  while ((match = spinRegex.exec(spun)) !== null) {
    const fullMatch = match[0];
    const options = match[1].split('|');
    const randomOption = options[Math.floor(Math.random() * options.length)];
    
    // Thay thế khối bằng lựa chọn ngẫu nhiên
    spun = spun.replace(fullMatch, randomOption);
    
    // Reset regex index vì chuỗi đã thay đổi
    spinRegex.lastIndex = 0;
  }
  
  return spun;
}

/**
 * Tạo bản xem trước N phiên bản để admin kiểm tra
 */
export function previewSpin(content: string, count: number = 3): string[] {
  const previews: string[] = [];
  for (let i = 0; i < count; i++) {
    previews.push(spinContent(content));
  }
  return previews;
}
