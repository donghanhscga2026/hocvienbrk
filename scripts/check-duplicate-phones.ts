import prisma from "../lib/prisma";

// Hàm chuẩn hóa thô số điện thoại để so sánh chính xác các biến thể
function cleanAndNormalize(phone: string | null): string {
  if (!phone) return "";
  let p = phone.replace(/\s/g, "");
  // Loại bỏ dấu + và các mã quốc gia 84 hoặc 0 ở đầu
  while (true) {
    if (p.startsWith("+84")) {
      p = p.slice(3);
    } else if (p.startsWith("84")) {
      p = p.slice(2);
    } else if (p.startsWith("0")) {
      p = p.slice(1);
    } else if (p.startsWith("+")) {
      p = p.slice(1);
    } else {
      break;
    }
  }
  return p; // Trả về phần số gốc (ví dụ: 961891863)
}

async function main() {
  console.log("=== KIỂM TRA SỐ ĐIỆN THOẠI TRÙNG LẶP TRONG DATABASE ===");
  try {
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    // Gom nhóm theo số điện thoại đã chuẩn hóa
    const phoneGroups: Record<string, typeof allUsers> = {};

    allUsers.forEach((u) => {
      if (!u.phone) return;
      const normalized = cleanAndNormalize(u.phone);
      if (!normalized) return;

      if (!phoneGroups[normalized]) {
        phoneGroups[normalized] = [];
      }
      phoneGroups[normalized].push(u);
    });

    // Lọc ra các nhóm có từ 2 tài khoản trở lên
    let duplicateCount = 0;
    Object.entries(phoneGroups).forEach(([phoneKey, users]) => {
      if (users.length > 1) {
        duplicateCount++;
        console.log(`\nTrùng lặp số điện thoại gốc [${phoneKey}] (${users.length} tài khoản):`);
        users.forEach((u) => {
          console.log(`- #${u.id} | ${u.name} | ${u.email} | SĐT lưu trong DB: ${u.phone} | Vai trò: ${u.role} | Tạo lúc: ${u.createdAt.toLocaleString("vi-VN")}`);
        });
      }
    });

    console.log(`\n=== TỔNG KẾT: Tìm thấy ${duplicateCount} số điện thoại bị trùng lặp ===`);
  } catch (error: any) {
    console.error("❌ Lỗi kiểm tra database:", error.message || error);
  }
}

main();
