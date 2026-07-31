import { Recipient } from "./email-campaign-runner";

/**
 * Trich xuat danh sach email va ten tu chuoi text thong tin nhap thu cong
 * Ho tro cac dinh dang:
 * - email@domain.com
 * - email@domain.com, Nguyen Van A
 * - email@domain.com; Nguyen Van A
 * - Nguyen Van A <email@domain.com>
 */
export function parseEmailsFromRawText(text: string): Recipient[] {
  if (!text) return [];
  
  const lines = text.split(/\r?\n/);
  const recipients: Recipient[] = [];
  const seenEmails = new Set<string>();

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Kiem tra dinh dang Nguyen Van A <email@domain.com>
    const angleBracketMatch = trimmed.match(/(.+?)<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/);
    if (angleBracketMatch) {
      const name = angleBracketMatch[1].replace(/["']/g, "").trim();
      const email = angleBracketMatch[2].toLowerCase().trim();
      if (!seenEmails.has(email)) {
        seenEmails.add(email);
        recipients.push({ email, name });
      }
      continue;
    }

    // Tim kiem email trong dong
    const emailMatch = trimmed.match(emailRegex);
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase().trim();
      if (seenEmails.has(email)) continue;

      seenEmails.add(email);

      // Co gang phan tach ten tu cac phan con lai trong dong
      let name = "";
      const remainingText = trimmed.replace(emailMatch[0], "").trim();
      
      // Xoa cac ky tu phan cach o dau/cuoi nhu comma, semicolon
      const cleanName = remainingText.replace(/^[,\s;:-]+|[,\s;:-]+$/g, "").trim();
      if (cleanName) {
        name = cleanName;
      }

      recipients.push({ email, name });
    }
  }

  return recipients;
}

/**
 * Tai va phan tich danh sach email tu Google Sheet cong khai
 */
export async function parseEmailsFromGoogleSheet(sheetUrl: string): Promise<Recipient[]> {
  if (!sheetUrl) return [];

  // Trich xuat Sheet ID tu URL
  const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetIdMatch) {
    throw new Error("Link Google Sheet khong dung dinh dang. Vui long kiem tra lai.");
  }

  const sheetId = sheetIdMatch[1];
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

  try {
    const res = await fetch(exportUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    if (!res.ok) {
      throw new Error("Khong the tai Google Sheet. Vui long dam bao Sheet dang o che do chia se 'Bat ky ai co lien ket deu xem duoc'.");
    }

    const csvText = await res.text();
    return parseEmailsFromCsv(csvText);
  } catch (error: any) {
    console.error("Error fetching Google Sheet:", error);
    throw new Error(error.message || "Loi ket noi den Google Sheet");
  }
}

/**
 * Helper parse CSV de lay email va name
 */
function parseEmailsFromCsv(csvText: string): Recipient[] {
  if (!csvText) return [];

  const lines = csvText.split(/\r?\n/);
  if (lines.length === 0) return [];

  // Parse header de tim cot email va cot name
  const headers = parseCsvLine(lines[0]);
  let emailColIdx = -1;
  let nameColIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim();
    if (header.includes("email") || header.includes("thu dien tu") || header.includes("mail")) {
      emailColIdx = i;
    } else if (header.includes("name") || header.includes("ten") || header.includes("ho ten") || header.includes("ho va ten")) {
      nameColIdx = i;
    }
  }

  const recipients: Recipient[] = [];
  const seenEmails = new Set<string>();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Neu header khong phai la email, bat dau tu dong 0, nguoc lai tu dong 1
  const startRow = emailColIdx !== -1 ? 1 : 0;

  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = parseCsvLine(line);
    if (row.length === 0) continue;

    let email = "";
    let name = "";

    if (emailColIdx !== -1 && emailColIdx < row.length) {
      email = row[emailColIdx].trim();
    } else {
      // Tu tim email trong tat ca cac cot cua row neu khong co header
      const found = row.find(col => emailRegex.test(col.trim()));
      if (found) email = found.trim();
    }

    if (nameColIdx !== -1 && nameColIdx < row.length) {
      name = row[nameColIdx].replace(/["']/g, "").trim();
    } else {
      // Lay cot dau tien khong phai email lam name
      const foundIdx = row.findIndex(col => !col.includes("@") && col.trim().length > 0);
      if (foundIdx !== -1) {
        name = row[foundIdx].replace(/["']/g, "").trim();
      }
    }

    // Validate email dung chuan
    if (email && emailRegex.test(email)) {
      const lowerEmail = email.toLowerCase();
      if (!seenEmails.has(lowerEmail)) {
        seenEmails.add(lowerEmail);
        recipients.push({ email: lowerEmail, name });
      }
    }
  }

  return recipients;
}

/**
 * Cực kỳ đơn giản để parse 1 dòng CSV có hỗ trợ dấu ngoặc kép
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
