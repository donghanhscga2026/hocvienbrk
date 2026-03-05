export interface ParsedTransfer {
  phone: string | null;
  userId: number | null; // Thêm userId
  amount: number;
  courseCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  transferTime: Date | null;
  rawContent: string;
}

interface BankParser {
  pattern: RegExp;
  extract: (matches: RegExpMatchArray) => ParsedTransfer;
}

const bankParsers: BankParser[] = [
  // Mới: SDT 123456 HV 8286 COC LS03 (linh hoạt khoảng trống, dấu chấm, gạch dưới)
  {
    pattern: /SDT[\s\._]*(\d{6})[\s\._]*HV[\s\._]*(\d+)[\s\._]*COC[\s\._]*(\w+)/i,
    extract: (matches) => ({
      phone: matches[1],
      userId: parseInt(matches[2]),
      courseCode: matches[3].toUpperCase(), // Chuyển sang chữ hoa ngay lập tức
      amount: 0,
      bankName: null,
      accountNumber: null,
      transferTime: null,
      rawContent: matches[0]
    })
  },
  {
    pattern: /(\d{10,11})\s*c[oó]\s*(\w+)|(\w+)\s*c[oó]\s*(\d{10,11})/i,
    extract: (matches) => ({
      phone: matches[1] || matches[4] || null,
      userId: null,
      amount: 0,
      courseCode: matches[2] || matches[3] || null,
      bankName: null,
      accountNumber: null,
      transferTime: null,
      rawContent: matches[0]
    })
  },
  {
    pattern: /ND:\s*(\d{10,11})\s+(\w+)|(\w+)\s+(\d{10,11})/i,
    extract: (matches) => ({
      phone: matches[1] || matches[4] || null,
      amount: 0,
      courseCode: matches[2] || matches[3] || null,
      bankName: null,
      accountNumber: null,
      transferTime: null,
      rawContent: matches[0]
    })
  },
  {
    pattern: /(\d{10,11}).*?(c[oó]?|nạp).*?(\w{2,10})/i,
    extract: (matches) => ({
      phone: matches[1] || null,
      amount: 0,
      courseCode: matches[3] || null,
      bankName: null,
      accountNumber: null,
      transferTime: null,
      rawContent: matches[0]
    })
  }
];

export function parseBankEmail(content: string): ParsedTransfer | null {
  const normalizedContent = content.replace(/\s+/g, ' ').trim();
  
  for (const parser of bankParsers) {
    const matches = normalizedContent.match(parser.pattern);
    if (matches) {
      return parser.extract(matches);
    }
  }
  
  const phoneMatch = normalizedContent.match(/(\d{10,11})/);
  const courseMatch = normalizedContent.match(/c[oó]\s*(\w{2,10})|(\w{2,10})\s*c[oó]/i);
  
  if (phoneMatch || courseMatch) {
    return {
      phone: phoneMatch?.[1] || null,
      amount: 0,
      courseCode: courseMatch?.[1] || courseMatch?.[2] || null,
      bankName: null,
      accountNumber: null,
      transferTime: null,
      rawContent: normalizedContent.substring(0, 200)
    };
  }
  
  return null;
}

export function extractAmount(content: string): number {
  const amountPatterns = [
    /(\d{1,3}(?:\.\d{3})*)\s*đ/gi,
    /SMT:\s*(\d{1,3}(?:\.\d{3})*)/gi,
    /(\d{6,12})/g
  ];
  
  for (const pattern of amountPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      const amountStr = matches[0]
        .replace(/\D/g, '')
        .replace(/^0+/, '');
      const amount = parseInt(amountStr, 10);
      if (amount >= 10000 && amount <= 1000000000) {
        return amount;
      }
    }
  }
  
  return 0;
}

export function extractBankName(content: string): string | null {
  const bankNames = [
    'Vietcombank', 'VCB',
    'Techcombank', 'TCB',
    'MB Bank', 'MBBank', 'MB',
    'BIDV',
    'Agribank', 'AGRIBANK',
    'ACB',
    'Vietinbank', 'VTB',
    'TPBank', 'TPB',
    'Sacombank', 'SCB',
    'SHB',
    'SeABank',
    'Eximbank', 'EIB',
    'HD Bank',
    'Bac A Bank', 'BAB',
    'Oceanbank',
    'GPBank',
    'Kiên Long', 'KLB',
    'Nam A Bank', 'NAB',
    'PGBank',
    'Public Bank', 'PB',
    'Saigonbank', 'SGB'
  ];
  
  const upperContent = content.toUpperCase();
  
  for (const bank of bankNames) {
    if (upperContent.includes(bank.toUpperCase())) {
      return bank;
    }
  }
  
  return null;
}

export function extractAccountNumber(content: string): string | null {
  const patterns = [
    /STK[:\s]*(\d{6,20})/i,
    /TK[:\s]*(\d{6,20})/i,
    /(\d{6,20})/g
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches && matches[1]) {
      return matches[1];
    }
  }
  
  return null;
}

export function extractTransferTime(content: string): Date | null {
  const patterns = [
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/,
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,
    /(\d{1,2}):(\d{2})\s+(\d{2})[\/\-](\d{2})[\/\-](\d{4})/
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      try {
        if (matches.length >= 6) {
          const [_, d1, d2, y, h, min] = matches;
          return new Date(`${y}-${d2}-${d1}T${h || '00'}:${min || '00'}:00`);
        }
      } catch {
        continue;
      }
    }
  }
  
  return null;
}

export interface FullParsedTransfer {
  phone: string | null;
  userId: number | null; // Thêm userId
  amount: number;
  courseCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  transferTime: Date | null;
  rawContent: string;
}

export function parseFullTransferEmail(content: string): FullParsedTransfer {
  const parsed = parseBankEmail(content);
  const amount = extractAmount(content);
  const bankName = extractBankName(content);
  const accountNumber = extractAccountNumber(content);
  const transferTime = extractTransferTime(content);
  
  return {
    phone: parsed?.phone || null,
    userId: parsed?.userId || null,
    amount,
    courseCode: parsed?.courseCode || null,
    bankName,
    accountNumber,
    transferTime,
    rawContent: content.substring(0, 500)
  };
}

export function matchWithEnrollment(
  transfer: FullParsedTransfer,
  enrollments: Array<{
    id: number;
    userId: number; // Thêm userId vào input
    courseId: number;
    course: {
      id_khoa: string;
      phi_coc: number;
      noidung_stk: string | null;
    };
    user: {
      phone: string | null;
    };
    status: string;
  }>
): { matched: boolean; enrollmentId: number | null; reason: string } {
  
  for (const enrollment of enrollments) {
    if (enrollment.status !== 'PENDING') continue;
    
    const courseCode = enrollment.course.id_khoa.toUpperCase();
    const transferCourseCode = transfer.courseCode?.toUpperCase();
    
    // Khớp mã khóa học
    const courseCodeMatch = transferCourseCode && 
      (courseCode.includes(transferCourseCode) || transferCourseCode.includes(courseCode));
    
    // Khớp số tiền
    const amountMatch = transfer.amount >= enrollment.course.phi_coc;

    // Ưu tiên 1: Khớp theo userId
    const userIdMatch = transfer.userId && transfer.userId === enrollment.userId;
    
    if (userIdMatch && courseCodeMatch && amountMatch) {
      return {
        matched: true,
        enrollmentId: enrollment.id,
        reason: `Khớp tuyệt đối: Mã HV ${transfer.userId} + Mã KH ${transfer.courseCode} + Số tiền ${transfer.amount}`
      };
    }

    // Ưu tiên 2: Khớp theo SĐT (6 số cuối hoặc full)
    const userPhone = enrollment.user.phone?.replace(/\D/g, '') || '';
    const transferPhone = transfer.phone?.replace(/\D/g, '') || '';
    const phoneMatch = transferPhone && userPhone && userPhone.includes(transferPhone);
    
    if (phoneMatch && courseCodeMatch && amountMatch) {
      return {
        matched: true,
        enrollmentId: enrollment.id,
        reason: `Khớp: SĐT ${transfer.phone} + Mã KH ${transfer.courseCode} + Số tiền ${transfer.amount}`
      };
    }
    
    // Ưu tiên 3: Chỉ khớp SĐT + Số tiền
    if (phoneMatch && amountMatch && !transfer.courseCode) {
      return {
        matched: true,
        enrollmentId: enrollment.id,
        reason: `Khớp: SĐT ${transfer.phone} + Số tiền ${transfer.amount}`
      };
    }
    
    // Ưu tiên 4: Chỉ khớp Mã KH + Số tiền
    if (courseCodeMatch && amountMatch && !transfer.phone && !transfer.userId) {
      return {
        matched: true,
        enrollmentId: enrollment.id,
        reason: `Khớp: Mã KH ${transfer.courseCode} + Số tiền ${transfer.amount}`
      };
    }
  }
  
  return {
    matched: false,
    enrollmentId: null,
    reason: 'Không tìm thấy enrollment phù hợp'
  };
}
