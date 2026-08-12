/**
 * Chuyển chuỗi (tên người, tên khóa học, tên danh mục...) về dạng "Title Case":
 * viết hoa chữ cái đầu mỗi từ, phần còn lại viết thường. Hỗ trợ tiếng Việt có dấu
 * và từ ghép có gạch nối (ví dụ "Nguyễn-Văn").
 */
export function toTitleCase(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi")
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part ? part.charAt(0).toLocaleUpperCase("vi") + part.slice(1) : part
        )
        .join("-")
    )
    .join(" ");
}
