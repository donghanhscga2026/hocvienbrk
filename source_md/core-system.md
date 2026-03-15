This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where comments have been removed, empty lines have been removed.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: lib/**/*, auth.ts, auth.config.ts, middleware.ts
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Code comments have been removed from supported file types
- Empty lines have been removed from all files
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
auth.config.ts
auth.ts
lib/auto-verify.ts
lib/constants.ts
lib/email-parser.ts
lib/id-helper.ts
lib/normalizeGoogleDocsHtml.ts
lib/notifications.ts
lib/prisma.ts
lib/survey-data.ts
lib/utils.ts
lib/utils/id-generator.ts
lib/vietqr.ts
middleware.ts
```

# Files

## File: auth.config.ts
```typescript
import type { NextAuthConfig } from "next-auth"
export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false;
            } else if (isLoggedIn) {
            }
            return true;
        },
    },
    providers: [],
} satisfies NextAuthConfig
```

## File: lib/constants.ts
```typescript
export const RESERVED_IDS = [8668, 3773];
```

## File: lib/utils.ts
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
```

## File: lib/utils/id-generator.ts
```typescript
import { RESERVED_IDS } from '../constants';
import prisma from '@/lib/prisma';
export async function generateStudentId(): Promise<number> {
    const aggregation = await prisma.user.aggregate({
        _max: {
            id: true,
        },
    });
    let nextId = (aggregation._max.id ?? 0) + 1;
    while (RESERVED_IDS.includes(nextId)) {
        nextId++;
    }
    let exists = await prisma.user.findUnique({
        where: { id: nextId },
    });
    while (exists || RESERVED_IDS.includes(nextId)) {
        if (RESERVED_IDS.includes(nextId)) {
            nextId++;
            continue;
        }
        nextId++;
        exists = await prisma.user.findUnique({
            where: { id: nextId },
        });
    }
    return nextId;
}
```

## File: middleware.ts
```typescript
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
const { auth } = NextAuth(authConfig)
export default auth((req) => {
})
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

## File: lib/id-helper.ts
```typescript
import prisma from './prisma'
export async function getNextAvailableId(): Promise<number> {
    const reservedIds = await prisma.reservedId.findMany({
        select: { id: true }
    })
    const reservedIdList = reservedIds.map((r: any) => r.id)
    const maxNormalUser = await prisma.user.findFirst({
        where: {
            id: {
                notIn: reservedIdList
            }
        },
        orderBy: { id: 'desc' },
        select: { id: true }
    })
    let nextId = (maxNormalUser?.id || 0) + 1
    while (true) {
        const isReserved = await prisma.reservedId.findUnique({
            where: { id: nextId }
        })
        if (!isReserved) {
            const existingUser = await prisma.user.findUnique({ where: { id: nextId } })
            if (!existingUser) {
                return nextId
            }
        }
        nextId++
    }
}
```

## File: lib/normalizeGoogleDocsHtml.ts
```typescript
import DOMPurify from "dompurify"
export function normalizeGoogleDocsHtml(rawHtml: string) {
  if (!rawHtml) return ""
  // 1️⃣ Sanitize trước
  let clean = DOMPurify.sanitize(rawHtml)
  // 2️⃣ Xoá <p><br></p>
  clean = clean.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, "")
  // 3️⃣ Xoá &nbsp; thừa
  clean = clean.replace(/&nbsp;/gi, " ")
  // 4️⃣ Xoá div rỗng
  clean = clean.replace(/<div>\s*<\/div>/gi, "")
  // 5️⃣ Xoá page-break Google Docs
  clean = clean.replace(/page-break-after:\s*always;?/gi, "")
  // 6️⃣ Xoá margin inline lớn
  clean = clean.replace(/margin-[^:]+:\s*\d+px;?/gi, "")
  // 7️⃣ Xoá style width cố định
  clean = clean.replace(/width="\d+"/gi, "")
  clean = clean.replace(/style="[^"]*width:[^;"]*;?[^"]*"/gi, "")
  // 8️⃣ Gắn attribute để image viewer dễ xử lý (tùy chọn)
  clean = clean.replace(
    /<img([^>]+?)src="([^"]+)"([^>]*)>/gi,
    `<img $1 src="$2" $3 loading="lazy" />`
  )
  return clean
}
```

## File: lib/survey-data.ts
```typescript
export type SurveyOption = {
    id: string;
    label: string;
    nextQuestionId?: string;
    recommendedCourseIds?: number[];
    isAdvice?: boolean;
};
export type SurveyQuestion = {
    id: string;
    question: string;
    subtitle?: string;
    type: 'CHOICE' | 'INPUT_ACCOUNT' | 'INPUT_GOAL';
    options?: SurveyOption[];
};
export const surveyQuestions: Record<string, SurveyQuestion> = {
    q1: {
        id: 'q1',
        question: 'Bạn muốn học để làm gì?',
        subtitle: 'Xác định hướng đi chính của bạn tại Học viện BRK.',
        type: 'CHOICE',
        options: [
            { id: 'selling', label: 'Bán hàng', nextQuestionId: 'q2_selling' },
            { id: 'branding', label: 'Xây dựng nhân hiệu', nextQuestionId: 'q2_branding' },
            { id: 'spreading', label: 'Lan tỏa giá trị TLGDTG', nextQuestionId: 'q2_spreading' },
            { id: 'unknown', label: 'Chưa biết - cần tư vấn thêm', isAdvice: true }
        ]
    },
    q2_selling: {
        id: 'q2_selling',
        question: 'Hình thức bán hàng bạn chọn?',
        type: 'CHOICE',
        options: [
            { id: 'own_product', label: 'Bán sản phẩm của bạn', nextQuestionId: 'q3_account_shop' },
            { id: 'affiliate', label: 'Bán tiếp thị liên kết', nextQuestionId: 'q3_account_1k' },
            { id: 'service', label: 'Bán dịch vụ', nextQuestionId: 'q3_account_basic' },
            { id: 'selling_advice', label: 'Chưa rõ, cần tư vấn thêm', isAdvice: true }
        ]
    },
    q2_branding: {
        id: 'q2_branding',
        question: 'Vị thế hiện tại của bạn?',
        type: 'CHOICE',
        options: [
            { id: 'expert', label: 'Đã là chuyên gia trong lĩnh vực', nextQuestionId: 'q3_account_basic' },
            { id: 'learning_expert', label: 'Đang học trở thành chuyên gia', nextQuestionId: 'q3_account_basic' },
            { id: 'branding_advice', label: 'Chưa rõ, cần tư vấn thêm', isAdvice: true }
        ]
    },
    q2_spreading: {
        id: 'q2_spreading',
        question: 'Nền tảng nội tâm của bạn?',
        type: 'CHOICE',
        options: [
            { id: 'mentor_wit', label: 'Đã tốt nghiệp Mentor WiT trở lên', nextQuestionId: 'q3_account_basic' },
            { id: 'wit_7', label: 'Đang học Mentor WiT 7', nextQuestionId: 'q3_account_basic' }
        ]
    },
    q3_account_shop: {
        id: 'q3_account_shop',
        question: 'Bạn đã có TikTok Shop chưa?',
        type: 'INPUT_ACCOUNT',
        options: [
            { id: 'no', label: 'Chưa có (Cần tạo shop)', nextQuestionId: 'q4_goal' },
            { id: 'yes', label: 'Đã có (Nhập thông tin)', nextQuestionId: 'q4_goal' }
        ]
    },
    q3_account_1k: {
        id: 'q3_account_1k',
        question: 'Tài khoản có trên 1000 follow chưa?',
        type: 'INPUT_ACCOUNT',
        options: [
            { id: 'no', label: 'Chưa có (Cần chinh phục 1k follow)', nextQuestionId: 'q4_goal' },
            { id: 'yes', label: 'Đã có (Nhập thông tin)', nextQuestionId: 'q4_goal' }
        ]
    },
    q3_account_basic: {
        id: 'q3_account_basic',
        question: 'Bạn đã có kênh TikTok/FB/Youtube chưa?',
        type: 'INPUT_ACCOUNT',
        options: [
            { id: 'no', label: 'Chưa có (Cần xây nền tảng)', nextQuestionId: 'q4_goal' },
            { id: 'yes', label: 'Đã có (Nhập thông tin)', nextQuestionId: 'q4_goal' }
        ]
    },
    q4_goal: {
        id: 'q4_goal',
        question: 'Thiết lập mục tiêu hành động',
        type: 'INPUT_GOAL',
        options: [
            { id: 'no', label: 'Chưa có mục tiêu cụ thể', nextQuestionId: 'done' },
            { id: 'yes', label: 'Đã sẵn sàng mục tiêu', nextQuestionId: 'done' }
        ]
    }
};
export function generatePathFromAnswers(answers: Record<string, any>): number[] {
    const commonPath = [15, 18, 4, 19, 2, 20, 21, 22];
    let finalPath = [...commonPath];
    if (answers['q2_selling'] === 'affiliate' && answers['q3_account_1k_status'] === 'no') {
        if (!finalPath.includes(3)) {
            finalPath.splice(2, 0, 3);
        }
    }
    return finalPath;
}
```

## File: lib/email-parser.ts
```typescript
export interface ParsedTransfer {
  phone: string | null;
  userId: number | null;
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
  {
    pattern: /SDT[\s\._]*(\d{6})[\s\._]*HV[\s\._]*(\d+)[\s\._]*COC[\s\._]*(\w+)/i,
    extract: (matches) => ({
      phone: matches[1],
      userId: parseInt(matches[2]),
      courseCode: matches[3].toUpperCase(),
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
    pattern: /(\d{10,11}).*?(c[oó]?|nạp).*?(\w{2,10})/i,
    extract: (matches) => ({
      phone: matches[1] || null,
      userId: null,
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
      userId: null,
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
  userId: number | null;
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
    userId: number;
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
    const courseCodeMatch = transferCourseCode &&
      (courseCode.includes(transferCourseCode) || transferCourseCode.includes(courseCode));
    const amountMatch = transfer.amount >= enrollment.course.phi_coc;
    const userIdMatch = transfer.userId && transfer.userId === enrollment.userId;
    if (userIdMatch && courseCodeMatch && amountMatch) {
      return {
        matched: true,
        enrollmentId: enrollment.id,
        reason: `Khớp tuyệt đối: Mã HV ${transfer.userId} + Mã KH ${transfer.courseCode} + Số tiền ${transfer.amount}`
      };
    }
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
```

## File: lib/vietqr.ts
```typescript
export interface VietQRRequest {
  accountNo: string
  accountName: string
  acqId: string
  amount: number
  addInfo: string
  template?: string
  format?: string
}
export interface VietQRResponse {
  code: string
  desc: string
  data: {
    qrCode: string
    qrDataURL: string
  }
}
export function generateTransferContent(options: {
  phone: string
  userId: number
  courseCode: string
}): string {
  const { phone, userId, courseCode } = options
  const cleanPhone = phone.replace(/\D/g, '').slice(-6)
  const content = `SDT ${cleanPhone} HV ${userId} COC ${courseCode}`.toUpperCase()
  return content.slice(0, 50) // Tăng giới hạn ký tự lên 50 vì có khoảng cách
}
export async function generateVietQR(options: {
  accountNo: string
  accountName: string
  acqId: string // Nhận bank_stk từ Course
  amount: number
  addInfo: string
}): Promise<{ qrCode: string; qrDataURL: string }> {
  // Map tên ngân hàng sang mã BIN
  const bankMap: Record<string, string> = {
    'SACOMBANK': '970403',
    'VIETCOMBANK': '970436',
    'VCB': '970436',
    'ACB': '970416',
    'MBBANK': '970422',
    'MB': '970422',
    'TECHCOMBANK': '970407',
    'TCB': '970407',
    'VIETINBANK': '970415',
    'CTG': '970415',
    'BIDV': '970418',
    'AGRIBANK': '970405',
    'TPBANK': '970423',
    'VPBANK': '970432'
  }
  const bankId = bankMap[options.acqId?.toUpperCase()] || options.acqId || '970403'
  const requestBody: VietQRRequest = {
    accountNo: options.accountNo,
    accountName: options.accountName.toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, ' '),
    acqId: bankId,
    amount: options.amount,
    addInfo: options.addInfo,
    template: 'qr_only',
    format: 'text'
  }
  const response = await fetch('https://api.vietqr.io/v2/generate', {
    method: 'POST',
    headers: {
      'x-client-id': process.env.VIETQR_CLIENT_ID || '',
      'x-api-key': process.env.VIETQR_API_KEY || '',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`VietQR API error: ${response.status} - ${errorText}`)
  }
  const data: VietQRResponse = await response.json()
  if (data.code !== '00') {
    throw new Error(`VietQR error: ${data.desc}`)
  }
  return {
    qrCode: data.data.qrCode,
    qrDataURL: data.data.qrDataURL
  }
}
export async function createPaymentQR(options: {
  phone: string
  userId: number
  courseId: number
  courseCode: string
  accountNo: string
  accountName: string
  acqId: string
  amount: number
}): Promise<{
  transferContent: string
  qrCodeUrl: string
}> {
  const transferContent = generateTransferContent({
    phone: options.phone,
    userId: options.userId,
    courseCode: options.courseCode
  })
  const qrResult = await generateVietQR({
    accountNo: options.accountNo,
    accountName: options.accountName,
    acqId: options.acqId,
    amount: options.amount,
    addInfo: transferContent
  })
  return {
    transferContent,
    qrCodeUrl: qrResult.qrDataURL
  }
}
```

## File: lib/prisma.ts
```typescript
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
export default prisma;
```

## File: auth.ts
```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"
export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma) as any,
    session: { strategy: "jwt" },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            credentials: {
                identifier: { label: "Student ID / Email / Phone", type: "text" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                const parsedCredentials = z
                    .object({ identifier: z.string(), password: z.string() })
                    .safeParse(credentials)
                if (!parsedCredentials.success) return null;
                const { identifier, password } = parsedCredentials.data
                const isNumeric = /^\d+$/.test(identifier);
                const isEmail = identifier.includes("@");
                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            ...(isNumeric ? [{ id: parseInt(identifier) }, { phone: identifier }] : []),
                            ...(isEmail ? [{ email: identifier }] : []),
                            ...(!isNumeric && !isEmail ? [{ phone: identifier }] : [])
                        ]
                    }
                });
                if (!user || !user.password) return null;
                const passwordsMatch = await bcrypt.compare(password, user.password);
                if (passwordsMatch) {
                    return {
                        id: user.id.toString(),
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        image: user.image,
                    };
                }
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.sub = user.id;
                token.role = (user as any).role;
            }
            if (trigger === "update" && session?.role) {
                token.role = session.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
                session.user.role = token.role as Role;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    events: {
        async signIn({ user, account }) {
            console.log(`🔐 Sự kiện signIn kích hoạt cho user: ${user.email}, Provider: ${account?.provider}`);
            if (user && (account?.provider === 'credentials' || account?.provider === 'google')) {
                try {
                    const { headers } = await import("next/headers");
                    const headerList = await headers();
                    const ip = headerList.get('x-forwarded-for')?.split(',')[0] ||
                               headerList.get('x-real-ip') ||
                               '127.0.0.1';
                    const userAgent = headerList.get('user-agent') || 'Unknown';
                    console.log(`📡 Đang gửi thông báo đăng nhập cho #${user.id} từ IP: ${ip}`);
                    const { sendLoginNotification } = await import("@/lib/notifications");
                    await sendLoginNotification(user, ip, userAgent);
                    console.log(`✅ Đã xử lý xong thông báo đăng nhập.`);
                } catch (error: any) {
                    console.error("❌ Lỗi trong sự kiện signIn:", error.message);
                }
            }
        }
    }
})
```

## File: lib/auto-verify.ts
```typescript
import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { sendTelegramAdmin, sendSuccessEmail } from './notifications';
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
function parseSacombankEmail(htmlContent: string) {
  const text = extractTextFromHtml(htmlContent);
  const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i);
  const description = contentMatch ? contentMatch[1].trim() : '';
  const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i);
  const userIdMatch = description.match(/HV[\s\._]*(\d+)/i);
  const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i);
  const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i);
  let amount = 0;
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '');
    amount = parseInt(amountStr) || 0;
  }
  return {
    phone: phoneMatch ? phoneMatch[1] : null,
    userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
    courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
    amount: amount,
    content: description,
  };
}
export async function processPaymentEmails() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http:
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:info@sacombank.com.vn "thong bao giao dich" is:unread',
    maxResults: 10
  });
  const messages = response.data.messages || [];
  if (messages.length === 0) return { processed: 0, matched: 0 };
  let matchedCount = 0;
  const pendingEnrollments = await prisma.enrollment.findMany({
    where: { status: 'PENDING' },
    include: {
      course: { select: { id_khoa: true, phi_coc: true, name_lop: true } },
      user: { select: { id: true, name: true, phone: true, email: true } }
    }
  });
  for (const msg of messages) {
    const message = await gmail.users.messages.get({ userId: 'me', id: msg.id || '', format: 'full' });
    let body = '';
    const payload = message.data.payload;
    if (payload?.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload?.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        }
      }
    }
    const parsed = parseSacombankEmail(body);
    for (const enrollment of pendingEnrollments) {
      const userPhone = enrollment.user.phone?.replace(/\D/g, '') || '';
      const emailPhone = parsed.phone || '';
      const userIdMatch = parsed.userId && parsed.userId === enrollment.userId;
      const phoneMatch = userPhone && emailPhone && userPhone.includes(emailPhone);
      const courseCodeMatch = parsed.courseCode && enrollment.course.id_khoa.toUpperCase().includes(parsed.courseCode);
      const amountMatch = parsed.amount >= enrollment.course.phi_coc;
      if (((parsed.userId ? userIdMatch : phoneMatch) && courseCodeMatch && amountMatch)) {
        await prisma.payment.update({
          where: { enrollmentId: enrollment.id },
          data: {
            amount: parsed.amount, phone: parsed.phone, content: parsed.content,
            bankName: 'Sacombank', status: 'VERIFIED', verifiedAt: new Date(), verifyMethod: 'AUTO_EMAIL'
          }
        });
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: 'ACTIVE' }
        });
        await gmail.users.messages.modify({
          userId: 'me', id: msg.id || '',
          requestBody: { removeLabelIds: ['UNREAD'] }
        });
        const msgAdmin = `✅ <b>KÍCH HOẠT TỰ ĐỘNG THÀNH CÔNG</b>\n\n` +
                         `👤 Học viên: <b>${enrollment.user.name}</b>\n` +
                         `📞 SĐT: ${enrollment.user.phone}\n` +
                         `🎓 Khóa học: <b>${enrollment.course.name_lop} (${enrollment.course.id_khoa})</b>\n` +
                         `💰 Số tiền: ${parsed.amount.toLocaleString()}đ\n` +
                         `🏦 Ngân hàng: Sacombank\n` +
                         `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
        await sendTelegramAdmin(msgAdmin);
        if (enrollment.user.email) {
          const { sendActivationEmail } = await import("./notifications");
          await sendActivationEmail(
            enrollment.user.email,
            enrollment.user.name || 'Bạn',
            enrollment.user.id,
            enrollment.course.name_lop || enrollment.course.id_khoa,
            null
          );
        }
        matchedCount++;
      }
    }
  }
  return { processed: messages.length, matched: matchedCount };
}
```

## File: lib/notifications.ts
```typescript
import { google } from 'googleapis';
export async function sendTelegram(message: string, type: 'REGISTER' | 'ACTIVATE' | 'LESSON' = 'ACTIVATE') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIdMap = {
    REGISTER: process.env.TELEGRAM_CHAT_ID_REGISTER || process.env.TELEGRAM_CHAT_ID,
    ACTIVATE: process.env.TELEGRAM_CHAT_ID_ACTIVATE || process.env.TELEGRAM_CHAT_ID,
    LESSON: process.env.TELEGRAM_CHAT_ID_LESSON || process.env.TELEGRAM_CHAT_ID,
  };
  const chatId = chatIdMap[type];
  if (!token || !chatId) {
    console.error(`⚠️ Thiếu cấu hình Telegram cho loại: ${type}`);
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const result = await response.json();
    if (!result.ok) {
        console.error(`❌ Telegram API Error (${type}):`, result.description);
    } else {
        console.log(`✅ Telegram API Success (${type}): Tin nhắn đã được gửi đến ID ${chatId}`);
    }
  } catch (error) {
    console.error(`❌ Lỗi hệ thống khi gửi Telegram (${type}):`, error);
  }
}
function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}
async function sendGmail(to: string, subject: string, htmlBody: string, bcc?: string) {
  const gmail = getGmailClient();
  const adminEmail = process.env.GMAIL_USER || 'hocvienbrk@gmail.com';
  const fromName = 'Học Viện BRK';
  const encodedFromName = `=?utf-8?B?${Buffer.from(fromName).toString('base64')}?=`;
  const encodedSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `From: ${encodedFromName} <${adminEmail}>`,
    `To: ${to}`,
    bcc ? `Bcc: ${bcc}` : '',
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    `Subject: ${encodedSubject}`,
    ``,
    htmlBody,
  ].filter(line => line !== '').join('\n');
  const encodedMessage = Buffer.from(messageParts)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });
    console.log(`✅ Đã gửi email thành công: ${subject} -> ${to}`);
  } catch (error) {
    console.error(`❌ Lỗi gửi Email (${subject}):`, error);
  }
}
export async function sendWelcomeEmail(to: string, studentName: string, studentId: number) {
  const subject = `[Học Viện BRK] Chào mừng bạn gia nhập học viện - Mã học tập của bạn là #${studentId}`;
  const htmlBody = `
    Chào mừng <b>${studentName}</b> đến với Học Viện BRK,<br><br>
    Tài khoản của bạn đã được khởi tạo thành công.<br>
    <b>Mã số học tập của bạn là: <span style="font-size: 18px; color: #7c3aed;">#${studentId}</span></b><br><br>
    Mã số này rất quan trọng, bạn vui lòng ghi nhớ để sử dụng khi chuyển khoản cam kết hoặc nhận hỗ trợ từ học viện.<br><br>
    Chúc bạn có những trải nghiệm học tập tuyệt vời!<br><br>
    Trân trọng,<br>
    Đội ngũ Học Viện BRK
  `;
  await sendGmail(to, subject, htmlBody);
}
export async function sendActivationEmail(to: string, studentName: string, studentId: number, courseName: string, customContent: string | null) {
  const subject = `[Học Viện BRK] Kích hoạt thành công khóa học: ${courseName}`;
  const adminEmail = process.env.GMAIL_USER || 'hocvienbrk@gmail.com';
  const htmlBody = `
    Chào <b>${studentName}</b> (Mã số học tập: <b>#${studentId}</b>),<br><br>
    Chúc mừng bạn! Khóa học <b>${courseName}</b> của bạn đã được <b>kích hoạt thành công</b>.<br><br>
    ${customContent ? `---<br><b>Thông tin bổ sung từ giảng viên:</b><br>${customContent}<br>---<br><br>` : ''}
    Bây giờ bạn có thể đăng nhập để bắt đầu lộ trình học tập.<br><br>
    Trân trọng,<br>
    Đội ngũ Học Viện BRK
  `;
  await sendGmail(to, subject, htmlBody, adminEmail);
}
export async function sendLoginNotification(user: any, ip: string, userAgent: string) {
  try {
    let location = 'Không xác định';
    let isp = '';
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success') {
        location = `${geoData.city}, ${geoData.regionName}, ${geoData.country}`;
        isp = geoData.isp || '';
      }
    } catch (e) {
      console.error('Lỗi tra cứu GeoIP:', e);
    }
    // 2. Phân tích User Agent đơn giản (Trình duyệt/Hệ điều hành)
    const browser = userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : userAgent.includes('Safari') ? 'Safari' : 'Trình duyệt khác';
    const os = userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Android') ? 'Android' : userAgent.includes('iPhone') ? 'iPhone/iOS' : 'Hệ điều hành khác';
    const msg = `🔑 <b>THÔNG BÁO ĐĂNG NHẬP</b>\n\n` +
                `👤 Học viên: <b>${user.name}</b> (#${user.id})\n` +
                `📧 Email: ${user.email}\n` +
                `📍 Vị trí: <b>${location}</b>\n` +
                `🌐 IP: ${ip} (${isp})\n` +
                `📱 Thiết bị: ${browser} on ${os}\n` +
                `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
    await sendTelegram(msg, 'REGISTER');
  } catch (error) {
    console.error('Lỗi gửi thông báo đăng nhập:', error);
  }
}
export const sendTelegramAdmin = (msg: string) => sendTelegram(msg, 'ACTIVATE');
export const sendSuccessEmail = (to: string, name: string, course: string) => sendActivationEmail(to, name, 0, course, null);
```
