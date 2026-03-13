This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where empty lines have been removed, line numbers have been added.

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
- Only files matching these patterns are included: app/**/*, components/**/*, lib/**/*, prisma/**/*, scripts/**/*, types/**/*, *.ts, *.json, *.md
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Empty lines have been removed from all files
- Line numbers have been added to the beginning of each line
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
app/account-settings/page.tsx
app/actions/account-actions.ts
app/actions/admin-actions.ts
app/actions/auth-actions.ts
app/actions/comment-actions.ts
app/actions/course-actions.ts
app/actions/message-actions.ts
app/actions/payment-actions.ts
app/actions/post-actions.ts
app/actions/survey-actions.ts
app/admin/courses/[id]/page.tsx
app/admin/courses/page.tsx
app/admin/layout.tsx
app/admin/payments/page.tsx
app/admin/posts/page.tsx
app/admin/reserved-ids/add-form.tsx
app/admin/reserved-ids/change-id-form.tsx
app/admin/reserved-ids/page.tsx
app/admin/students/[id]/page.tsx
app/admin/students/page.tsx
app/api/auth/[...nextauth]/route.ts
app/api/courses/[id]/route.ts
app/api/cron/gmail-watch/route.ts
app/api/docs/route.ts
app/api/upload/payment/route.ts
app/api/webhooks/gmail/route.ts
app/courses/[id]/learn/error.tsx
app/courses/[id]/learn/page.tsx
app/favicon.ico
app/globals.css
app/layout.tsx
app/login/page.tsx
app/page.tsx
app/register/page.tsx
auth.config.ts
auth.ts
CODE_HISTORY05032026.md
components/course/AssignmentForm.tsx
components/course/ChatSection.tsx
components/course/CourseCard.tsx
components/course/CoursePlayer.tsx
components/course/LessonSidebar.tsx
components/course/PaymentModal.tsx
components/course/StartDateModal.tsx
components/course/VideoPlayer.tsx
components/home/CommunityBoard.tsx
components/home/CourseSection.tsx
components/home/MessageCard.tsx
components/home/PostCard.tsx
components/home/PostDetailModal.tsx
components/home/RealityMap.tsx
components/home/Zero2HeroSurvey.tsx
components/ImageViewer.tsx
components/layout/Header.tsx
components/payment/UploadProofModal.tsx
components/ui/button.tsx
components/ui/checkbox.tsx
components/ui/dialog.tsx
components/ui/input.tsx
components/ui/label.tsx
components/ui/textarea.tsx
DESIGN_SYSTEM.md
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
next.config.ts
package.json
prisma/cleanup-duplicates.js
prisma/migrations/20260217131807_add_autoincrement/migration.sql
prisma/migrations/migration_lock.toml
prisma/schema.prisma
prisma/seed.ts
README.md
repomix.config.json
scripts/add-reserved-id.ts
scripts/auto-commit-push.ps1
scripts/auto-commit-push.sh
scripts/auto-verify-payment.js
scripts/auto-verify-payment.ts
scripts/backup.ps1
scripts/change-id.ts
scripts/check-duplicates.ts
scripts/check-gmail-info.js
scripts/check-latest-sacombank.js
scripts/check-latest-sacombank.ts
scripts/check-missing-ids.ts
scripts/cleanup-v3-data.js
scripts/debug-data.ts
scripts/debug-enrollment.js
scripts/fill-missing-ids.ts
scripts/generate-code-history.ts
scripts/hash.js
scripts/import-csv.ts
scripts/import-lessons-from-csv.ts
scripts/import-reserved-list.ts
scripts/import-students.ts
scripts/import-v3-data.ts
scripts/inspect_csv.py
scripts/inspect-csv.js
scripts/make-admin.ts
scripts/payment-watcher.js
scripts/process-legacy-users.ts
scripts/push.ps1
scripts/seed-courses.ts
scripts/seed-enrollments.ts
scripts/seed-lessons.ts
scripts/seed-messages.ts
scripts/seed-sample-lessons.ts
scripts/setup-gmail-watch.js
scripts/sync-to-drive.ts
scripts/test-gmail.ts
scripts/test-new-format.ts
scripts/test-pure-js.js
scripts/test-sacombank.ts
scripts/test-vietqr.ts
scripts/validate-v3-data.js
tsconfig.json
tsconfig.seed.json
types/next-auth.d.ts
vercel.json
```

# Files

## File: repomix.config.json
````json
 1: {
 2:   "output": {
 3:     "filePath": "project-source.md",
 4:     "style": "markdown",
 5:     "removeComments": false,
 6:     "removeEmptyLines": true,
 7:     "topFilesLength": 20,
 8:     "showLineNumbers": true
 9:   },
10:   "include": [
11:     "app/**/*",
12:     "components/**/*",
13:     "lib/**/*",
14:     "prisma/**/*",
15:     "scripts/**/*",
16:     "types/**/*",
17:     "*.ts",
18:     "*.json",
19:     "*.md"
20:   ],
21:   "exclude": [
22:     "node_modules",
23:     ".next",
24:     ".git",
25:     "public/uploads",
26:     "backups",
27:     "package-lock.json",
28:     "project-source.md",
29:     "CODE_HISTORY*.md",
30:     "Course.csv",
31:     "User.csv",
32:     "Enrollment.csv",
33:     "Danh sach*.csv"
34:   ],
35:   "security": {
36:     "enableSecurityCheck": true
37:   }
38: }
````

## File: scripts/sync-to-drive.ts
````typescript
 1: import * as fs from 'fs';
 2: import * as path from 'path';
 3: import { google } from 'googleapis';
 4: require('dotenv').config();
 5: const FOLDER_ID = '1XudNfFRNBM3t3Ty0uSuG2MVELTE7J2Dm';
 6: const FILE_NAME = 'project-source.md';
 7: const FILE_PATH = path.join(process.cwd(), FILE_NAME);
 8: async function getDriveClient() {
 9:   const oAuth2Client = new google.auth.OAuth2(
10:     process.env.GMAIL_CLIENT_ID,
11:     process.env.GMAIL_CLIENT_SECRET,
12:     'http://localhost'
13:   );
14:   oAuth2Client.setCredentials({
15:     refresh_token: process.env.GMAIL_REFRESH_TOKEN,
16:   });
17:   return google.drive({ version: 'v3', auth: oAuth2Client });
18: }
19: async function syncToDrive() {
20:   console.log('🚀 Đang chuẩn bị đồng bộ lên Google Drive...');
21:   if (!fs.existsSync(FILE_PATH)) {
22:     console.error(`❌ Không tìm thấy file ${FILE_NAME}. Hãy chạy 'npx repomix' trước.`);
23:     return;
24:   }
25:   try {
26:     const drive = await getDriveClient();
27:     // 1. Tìm xem file đã tồn tại trong thư mục chưa
28:     const response = await drive.files.list({
29:       q: `name = '${FILE_NAME}' and '${FOLDER_ID}' in parents and trashed = false`,
30:       fields: 'files(id, name)',
31:       spaces: 'drive',
32:     });
33:     const existingFile = response.data.files?.[0];
34:     const media = {
35:       mimeType: 'text/markdown',
36:       body: fs.createReadStream(FILE_PATH),
37:     };
38:     if (existingFile && existingFile.id) {
39:       // 2. Cập nhật file cũ
40:       console.log(`📝 Đang cập nhật file hiện tại (ID: ${existingFile.id})...`);
41:       await drive.files.update({
42:         fileId: existingFile.id as string,
43:         media: media,
44:       });
45:       console.log('✅ Cập nhật thành công!');
46:     } else {
47:       // 3. Tạo file mới
48:       console.log('🆕 Đang tạo file mới trên Drive...');
49:       await drive.files.create({
50:         requestBody: {
51:           name: FILE_NAME,
52:           parents: [FOLDER_ID],
53:         },
54:         media: media,
55:       } as any);
56:       console.log('✅ Tải lên file mới thành công!');
57:     }
58:   } catch (error: any) {
59:     console.error('❌ Lỗi khi đồng bộ lên Drive:', error.message);
60:     if (error.message.includes('invalid_grant')) {
61:       console.error('💡 Gợi ý: Refresh token có thể đã hết hạn hoặc sai.');
62:     }
63:   }
64: }
65: syncToDrive();
````

## File: app/actions/account-actions.ts
````typescript
 1: 'use server'
 2: import { auth } from "@/auth"
 3: import prisma from "@/lib/prisma"
 4: import { revalidatePath } from "next/cache"
 5: export async function getUserWithAccounts() {
 6:     const session = await auth()
 7:     if (!session?.user?.id) return null
 8:     const userId = parseInt(session.user.id as string)
 9:     const user = await prisma.user.findUnique({
10:         where: { id: userId },
11:         include: {
12:             accounts: {
13:                 select: {
14:                     provider: true,
15:                     providerAccountId: true,
16:                 }
17:             }
18:         }
19:     })
20:     return user
21: }
22: export async function updateUserProfile(data: {
23:     name?: string
24:     phone?: string
25:     image?: string
26: }) {
27:     const session = await auth()
28:     if (!session?.user?.id) return { success: false, message: "Unauthorized" }
29:     const userId = parseInt(session.user.id as string)
30:     try {
31:         await prisma.user.update({
32:             where: { id: userId },
33:             data: {
34:                 name: data.name,
35:                 phone: data.phone,
36:                 image: data.image,
37:             }
38:         })
39:         revalidatePath('/account-settings')
40:         return { success: true, message: "Cập nhật thành công" }
41:     } catch (error) {
42:         console.error("Update profile error:", error)
43:         return { success: false, message: "Cập nhật thất bại" }
44:     }
45: }
46: export async function changePassword(currentPassword: string, newPassword: string) {
47:     const session = await auth()
48:     if (!session?.user?.id) return { success: false, message: "Unauthorized" }
49:     const userId = parseInt(session.user.id as string)
50:     const bcrypt = await import('bcryptjs')
51:     const user = await prisma.user.findUnique({
52:         where: { id: userId }
53:     })
54:     if (!user?.password) {
55:         return { success: false, message: "Tài khoản này không sử dụng mật khẩu" }
56:     }
57:     const passwordsMatch = await bcrypt.compare(currentPassword, user.password)
58:     if (!passwordsMatch) {
59:         return { success: false, message: "Mật khẩu hiện tại không đúng" }
60:     }
61:     const hashedPassword = await bcrypt.hash(newPassword, 10)
62:     await prisma.user.update({
63:         where: { id: userId },
64:         data: { password: hashedPassword }
65:     })
66:     return { success: true, message: "Đổi mật khẩu thành công" }
67: }
````

## File: app/actions/payment-actions.ts
````typescript
  1: 'use server'
  2: import { auth } from "@/auth"
  3: import prisma from "@/lib/prisma"
  4: import { revalidatePath } from "next/cache"
  5: export async function getPaymentByEnrollmentId(enrollmentId: number) {
  6:   try {
  7:     const payment = await prisma.payment.findUnique({
  8:       where: { enrollmentId }
  9:     })
 10:     return { success: true, payment }
 11:   } catch (error: any) {
 12:     console.error("Get Payment Error:", error)
 13:     return { success: false, error: error.message }
 14:   }
 15: }
 16: export async function createPaymentForEnrollment(enrollmentId: number, courseFee: number) {
 17:   try {
 18:     const existingPayment = await prisma.payment.findUnique({
 19:       where: { enrollmentId }
 20:     })
 21:     if (existingPayment) {
 22:       return { success: true, payment: existingPayment }
 23:     }
 24:     const payment = await prisma.payment.create({
 25:       data: {
 26:         enrollmentId,
 27:         amount: courseFee,
 28:         status: 'PENDING'
 29:       }
 30:     })
 31:     return { success: true, payment }
 32:   } catch (error: any) {
 33:     console.error("Create Payment Error:", error)
 34:     return { success: false, error: error.message }
 35:   }
 36: }
 37: export async function updatePaymentProof(enrollmentId: number, proofImageUrl: string) {
 38:   try {
 39:     const payment = await prisma.payment.update({
 40:       where: { enrollmentId },
 41:       data: {
 42:         proofImage: proofImageUrl,
 43:         verifyMethod: 'MANUAL_UPLOAD'
 44:       }
 45:     })
 46:     revalidatePath('/')
 47:     revalidatePath('/courses')
 48:     return { success: true, payment }
 49:   } catch (error: any) {
 50:     console.error("Update Payment Proof Error:", error)
 51:     return { success: false, error: error.message }
 52:   }
 53: }
 54: export async function verifyPaymentAction(
 55:   enrollmentId: number,
 56:   method: 'AUTO_EMAIL' | 'MANUAL_UPLOAD' | 'MANUAL_ADMIN',
 57:   note?: string
 58: ) {
 59:   try {
 60:     const session = await auth()
 61:     if (!session?.user?.id) {
 62:       return { success: false, error: "Unauthorized" }
 63:     }
 64:     const enrollment = await prisma.enrollment.findUnique({
 65:       where: { id: enrollmentId },
 66:       include: { course: true, payment: true }
 67:     })
 68:     if (!enrollment) {
 69:       return { success: false, error: "Enrollment not found" }
 70:     }
 71:     if (enrollment.status === 'ACTIVE') {
 72:       return { success: false, error: "Enrollment already active" }
 73:     }
 74:     const [payment, updatedEnrollment] = await prisma.$transaction([
 75:       prisma.payment.update({
 76:         where: { enrollmentId },
 77:         data: {
 78:           status: 'VERIFIED',
 79:           verifiedAt: new Date(),
 80:           verifyMethod: method,
 81:           note: note || null
 82:         }
 83:       }),
 84:       prisma.enrollment.update({
 85:         where: { id: enrollmentId },
 86:         data: { status: 'ACTIVE' }
 87:       })
 88:     ])
 89:     revalidatePath('/')
 90:     revalidatePath('/courses')
 91:     revalidatePath(`/courses/${enrollment.course.id_khoa}/learn`)
 92:     return { 
 93:       success: true, 
 94:       payment,
 95:       enrollment: updatedEnrollment,
 96:       message: `Đã kích hoạt khóa học "${enrollment.course.name_lop}" thành công!`
 97:     }
 98:   } catch (error: any) {
 99:     console.error("Verify Payment Error:", error)
100:     return { success: false, error: error.message }
101:   }
102: }
103: export async function rejectPaymentAction(enrollmentId: number, reason: string) {
104:   try {
105:     const session = await auth()
106:     if (!session?.user?.id) {
107:       return { success: false, error: "Unauthorized" }
108:     }
109:     const enrollment = await prisma.enrollment.findUnique({
110:       where: { id: enrollmentId },
111:       include: { course: true }
112:     })
113:     if (!enrollment) {
114:       return { success: false, error: "Enrollment not found" }
115:     }
116:     const payment = await prisma.payment.update({
117:       where: { enrollmentId },
118:       data: {
119:         status: 'REJECTED',
120:         note: reason,
121:         verifyMethod: 'MANUAL_ADMIN'
122:       }
123:     })
124:     revalidatePath('/')
125:     revalidatePath('/courses')
126:     return { success: true, payment }
127:   } catch (error: any) {
128:     console.error("Reject Payment Error:", error)
129:     return { success: false, error: error.message }
130:   }
131: }
132: export async function getPendingPayments() {
133:   try {
134:     const payments = await prisma.payment.findMany({
135:       where: { status: 'PENDING' },
136:       include: {
137:         enrollment: {
138:           include: {
139:             user: {
140:               select: { id: true, name: true, email: true, phone: true }
141:             },
142:             course: {
143:               select: { id: true, id_khoa: true, name_lop: true, phi_coc: true }
144:             }
145:           }
146:         }
147:       },
148:       orderBy: { createdAt: 'desc' }
149:     })
150:     return { success: true, payments }
151:   } catch (error: any) {
152:     console.error("Get Pending Payments Error:", error)
153:     return { success: false, error: error.message }
154:   }
155: }
156: export async function getAllPayments() {
157:   try {
158:     const payments = await prisma.payment.findMany({
159:       include: {
160:         enrollment: {
161:           include: {
162:             user: {
163:               select: { id: true, name: true, email: true, phone: true }
164:             },
165:             course: {
166:               select: { id: true, id_khoa: true, name_lop: true, phi_coc: true }
167:             }
168:           }
169:         }
170:       },
171:       orderBy: { createdAt: 'desc' }
172:     })
173:     return { success: true, payments }
174:   } catch (error: any) {
175:     console.error("Get All Payments Error:", error)
176:     return { success: false, error: error.message }
177:   }
178: }
179: export async function autoVerifyPayment(enrollmentId: number, transferData: {
180:   amount: number;
181:   phone: string | null;
182:   courseCode: string | null;
183:   bankName: string | null;
184:   accountNumber: string | null;
185:   transferTime: Date | null;
186:   content: string;
187: }) {
188:   try {
189:     const payment = await prisma.payment.update({
190:       where: { enrollmentId },
191:       data: {
192:         amount: transferData.amount,
193:         phone: transferData.phone,
194:         courseCode: transferData.courseCode,
195:         bankName: transferData.bankName,
196:         accountNumber: transferData.accountNumber,
197:         transferTime: transferData.transferTime,
198:         content: transferData.content,
199:         status: 'VERIFIED',
200:         verifiedAt: new Date(),
201:         verifyMethod: 'AUTO_EMAIL'
202:       }
203:     })
204:     await prisma.enrollment.update({
205:       where: { id: enrollmentId },
206:       data: { status: 'ACTIVE' }
207:     })
208:     return { success: true, payment }
209:   } catch (error: any) {
210:     console.error("Auto Verify Payment Error:", error)
211:     return { success: false, error: error.message }
212:   }
213: }
````

## File: app/actions/post-actions.ts
````typescript
 1: 'use server'
 2: import { auth } from "@/auth"
 3: import prisma from "@/lib/prisma"
 4: import { revalidatePath } from "next/cache"
 5: import { Role } from "@prisma/client"
 6: /**
 7:  * Lấy danh sách bài viết
 8:  */
 9: export async function getPostsAction() {
10:     try {
11:         const posts = await prisma.post.findMany({
12:             where: { published: true },
13:             include: {
14:                 author: { select: { name: true, image: true } },
15:                 _count: { select: { comments: true } }
16:             },
17:             orderBy: [{ pin: 'desc' }, { createdAt: 'desc' }]
18:         })
19:         return { success: true, posts }
20:     } catch (error: any) {
21:         return { success: false, error: error.message }
22:     }
23: }
24: /**
25:  * Tạo bài viết mới (Chỉ Admin)
26:  */
27: export async function createPostAction(data: { title: string, content: string, image?: string }) {
28:     const session = await auth()
29:     if (session?.user?.role !== Role.ADMIN) {
30:         return { success: false, error: "Chỉ quản trị viên mới có quyền đăng bài." }
31:     }
32:     try {
33:         const post = await prisma.post.create({
34:             data: {
35:                 title: data.title,
36:                 content: data.content,
37:                 image: data.image,
38:                 authorId: parseInt(session.user.id!)
39:             }
40:         })
41:         revalidatePath('/')
42:         return { success: true, post }
43:     } catch (error: any) {
44:         return { success: false, error: error.message }
45:     }
46: }
47: /**
48:  * Lấy chi tiết bài viết kèm bình luận
49:  */
50: export async function getPostDetailAction(postId: string) {
51:     try {
52:         const post = await prisma.post.findUnique({
53:             where: { id: postId },
54:             include: {
55:                 author: { select: { name: true, image: true } },
56:                 comments: {
57:                     include: {
58:                         user: { select: { name: true, image: true } }
59:                     },
60:                     orderBy: { createdAt: 'asc' }
61:                 }
62:             }
63:         })
64:         return { success: true, post }
65:     } catch (error: any) {
66:         return { success: false, error: error.message }
67:     }
68: }
69: /**
70:  * Bình luận vào bài viết
71:  */
72: export async function commentOnPostAction(postId: string, content: string) {
73:     const session = await auth()
74:     if (!session?.user?.id) {
75:         return { success: false, error: "Vui lòng đăng nhập để bình luận." }
76:     }
77:     try {
78:         const comment = await prisma.postComment.create({
79:             data: {
80:                 postId,
81:                 userId: parseInt(session.user.id),
82:                 content
83:             }
84:         })
85:         revalidatePath('/')
86:         return { success: true, comment }
87:     } catch (error: any) {
88:         return { success: false, error: error.message }
89:     }
90: }
````

## File: app/actions/survey-actions.ts
````typescript
 1: 'use server'
 2: import { auth } from "@/auth"
 3: import prisma from "@/lib/prisma"
 4: import { revalidatePath } from "next/cache"
 5: import { generatePathFromAnswers, surveyQuestions } from "@/lib/survey-data"
 6: /**
 7:  * Lưu kết quả khảo sát và tạo lộ trình học tập cá nhân hóa
 8:  */
 9: export async function saveSurveyResultAction(answers: Record<string, string>) {
10:     const session = await auth()
11:     if (!session?.user?.id) {
12:         return { success: false, error: "Vui lòng đăng nhập để lưu lộ trình." }
13:     }
14:     try {
15:         const userId = parseInt(session.user.id)
16:         // Tạo danh sách khóa học đề xuất
17:         const customPath = generatePathFromAnswers(answers)
18:         // Phân tích "Mục tiêu chính" từ câu hỏi đầu tiên (q1)
19:         const q1AnswerId = answers['q1']
20:         const goalOption = surveyQuestions['q1'].options.find(o => o.id === q1AnswerId)
21:         const goal = goalOption ? goalOption.label : 'Hoàn thiện kỹ năng TikTok'
22:         // Lấy dữ liệu cũ để lưu lịch sử
23:         const user = await prisma.user.findUnique({
24:             where: { id: userId },
25:             select: { surveyResults: true, customPath: true, goal: true }
26:         });
27:         const oldResults: any = user?.surveyResults || { history: [] };
28:         const newHistory = Array.isArray(oldResults.history) ? [...oldResults.history] : [];
29:         // Đưa TOÀN BỘ snapshot cũ (bao gồm roadmap ID) vào lịch sử
30:         if (oldResults.current || user?.customPath) {
31:             newHistory.push({
32:                 answers: oldResults.current?.answers || oldResults,
33:                 customPath: user?.customPath, // LƯU LẠI LỘ TRÌNH CŨ
34:                 goal: user?.goal,             // LƯU LẠI MỤC TIÊU CŨ
35:                 archivedAt: new Date().toISOString()
36:             });
37:         }
38:         const surveyData = {
39:             current: {
40:                 answers,
41:                 customPath: customPath,
42:                 goal: goal,
43:                 completedAt: new Date().toISOString()
44:             },
45:             history: newHistory
46:         };
47:         // Cập nhật Database
48:         await prisma.user.update({
49:             where: { id: userId },
50:             data: {
51:                 surveyResults: surveyData,
52:                 customPath: customPath,
53:                 goal: goal
54:             }
55:         })
56:         revalidatePath('/')
57:         return { success: true, customPath, goal }
58:     } catch (error: any) {
59:         console.error("Lỗi khi lưu khảo sát:", error)
60:         return { success: false, error: "Hệ thống đang bận, vui lòng thử lại sau." }
61:     }
62: }
63: /**
64:  * Reset lộ trình để làm lại khảo sát
65:  */
66: export async function resetSurveyAction() {
67:     const session = await auth()
68:     if (!session?.user?.id) return { success: false }
69:     try {
70:         await prisma.user.update({
71:             where: { id: parseInt(session.user.id) },
72:             data: { customPath: null }
73:         })
74:         revalidatePath('/')
75:         return { success: true }
76:     } catch (error) {
77:         return { success: false }
78:     }
79: }
````

## File: app/admin/courses/[id]/page.tsx
````typescript
  1: 'use client'
  2: import { useState, useEffect, use } from 'react'
  3: import { updateCourseAction, updateLessonAction } from '@/app/actions/admin-actions'
  4: import { ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle, Play, Edit2, X, List, Settings } from 'lucide-react'
  5: import Link from 'next/link'
  6: // ─── Component Popup Chỉnh sửa Bài học ──────────────────────────────────────────
  7: function LessonEditModal({ lesson, onClose, onSave }: { lesson: any, onClose: () => void, onSave: (data: any) => Promise<void> }) {
  8:     const [title, setTitle] = useState(lesson.title || '')
  9:     const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || '')
 10:     const [order, setOrder] = useState(lesson.order || 0)
 11:     const [saving, setSaving] = useState(false)
 12:     const handleSubmit = async (e: React.FormEvent) => {
 13:         e.preventDefault()
 14:         setSaving(true)
 15:         await onSave({ id: lesson.id, title, videoUrl, order })
 16:         setSaving(false)
 17:         onClose()
 18:     }
 19:     return (
 20:         <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
 21:             <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
 22:                 <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
 23:                     <h3 className="font-black text-sm uppercase tracking-widest">Sửa bài học #{lesson.order}</h3>
 24:                     <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5 text-yellow-400" /></button>
 25:                 </div>
 26:                 <form onSubmit={handleSubmit} className="p-6 space-y-5">
 27:                     <div className="space-y-1.5">
 28:                         <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tiêu đề bài học</label>
 29:                         <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />
 30:                     </div>
 31:                     <div className="space-y-1.5">
 32:                         <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link Video (YouTube)</label>
 33:                         <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" placeholder="https://youtube.com/..." />
 34:                     </div>
 35:                     <div className="space-y-1.5">
 36:                         <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Thứ tự hiển thị</label>
 37:                         <input type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value))} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />
 38:                     </div>
 39:                     <button type="submit" disabled={saving} className="w-full bg-black text-yellow-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
 40:                         {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
 41:                         Cập nhật bài học
 42:                     </button>
 43:                 </form>
 44:             </div>
 45:         </div>
 46:     )
 47: }
 48: export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
 49:     const { id } = use(params)
 50:     const [course, setCourse] = useState<any>(null)
 51:     const [loading, setLoading] = useState(true)
 52:     const [saving, setSaving] = useState(false)
 53:     const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
 54:     const [selectedLesson, setSelectedLesson] = useState<any>(null)
 55:     const [nameLop, setNameLop] = useState('')
 56:     const [phiCoc, setPhiCoc] = useState(0)
 57:     const [idKhoa, setIdKhoa] = useState('')
 58:     const [noidungEmail, setNoidungEmail] = useState('')
 59:     const fetchData = async () => {
 60:         setLoading(true)
 61:         const res = await fetch(`/api/courses/${id}`).then(r => r.json())
 62:         if (res && !res.error) {
 63:             setCourse(res)
 64:             setNameLop(res.name_lop || '')
 65:             setPhiCoc(res.phi_coc || 0)
 66:             setIdKhoa(res.id_khoa || '')
 67:             setNoidungEmail(res.noidung_email || '')
 68:         }
 69:         setLoading(false)
 70:     }
 71:     useEffect(() => { fetchData() }, [id])
 72:     const handleSubmit = async (e: React.FormEvent) => {
 73:         e.preventDefault()
 74:         setSaving(true)
 75:         setMessage(null)
 76:         const res = await updateCourseAction(parseInt(id), {
 77:             name_lop: nameLop, phi_coc: phiCoc, id_khoa: idKhoa, noidung_email: noidungEmail
 78:         })
 79:         if (res.success) setMessage({ type: 'success', text: 'Đã lưu thông tin khóa học!' })
 80:         else setMessage({ type: 'error', text: res.error || 'Lỗi khi lưu.' })
 81:         setSaving(false)
 82:     }
 83:     const handleUpdateLesson = async (data: any) => {
 84:         const res = await updateLessonAction(data.id, {
 85:             title: data.title, videoUrl: data.videoUrl, order: data.order
 86:         })
 87:         if (res.success) {
 88:             setMessage({ type: 'success', text: 'Đã cập nhật bài học thành công!' })
 89:             fetchData() // Tải lại danh sách
 90:         }
 91:     }
 92:     if (loading) return (
 93:         <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
 94:             <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2" />
 95:             <p className="text-xs font-black uppercase">Đang tải...</p>
 96:         </div>
 97:     )
 98:     return (
 99:         <div className="max-w-md mx-auto space-y-8 pb-32">
100:             <Link href="/admin/courses" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-purple-600 transition-colors">
101:                 <ArrowLeft className="w-4 h-4" /> Khóa học
102:             </Link>
103:             {/* PHẦN 1: THÔNG TIN KHÓA HỌC */}
104:             <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100">
105:                 <h1 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
106:                     <Edit2 className="w-5 h-5 text-purple-500" /> Sửa Khóa học
107:                 </h1>
108:                 <form onSubmit={handleSubmit} className="space-y-5">
109:                     <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tên lớp học</label>
110:                         <input type="text" value={nameLop} onChange={(e) => setNameLop(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />
111:                     </div>
112:                     <div className="grid grid-cols-2 gap-4">
113:                         <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Học phí</label>
114:                             <input type="number" value={phiCoc} onChange={(e) => setPhiCoc(parseInt(e.target.value))} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
115:                         </div>
116:                         <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mã khóa</label>
117:                             <input type="text" value={idKhoa} onChange={(e) => setIdKhoa(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
118:                         </div>
119:                     </div>
120:                     <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email kích hoạt</label>
121:                         <textarea value={noidungEmail} onChange={(e) => setNoidungEmail(e.target.value)} rows={4} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none" />
122:                     </div>
123:                     {message && (
124:                         <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
125:                             {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
126:                             {message.text}
127:                         </div>
128:                     )}
129:                     <button type="submit" disabled={saving} className="w-full bg-black text-yellow-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
130:                         {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Lưu Khóa học
131:                     </button>
132:                 </form>
133:             </div>
134:             {/* PHẦN 2: DANH SÁCH BÀI HỌC */}
135:             <div className="space-y-4">
136:                 <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 px-2 uppercase tracking-tight">
137:                     <List className="w-5 h-5 text-indigo-500" /> Bài giảng ({course?.lessons?.length || 0})
138:                 </h2>
139:                 <div className="space-y-3">
140:                     {course?.lessons?.map((lesson: any) => (
141:                         <div key={lesson.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-lg shadow-gray-100/50 flex items-center justify-between group">
142:                             <div className="flex items-center gap-4">
143:                                 <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-black font-mono">
144:                                     #{lesson.order}
145:                                 </div>
146:                                 <div className="space-y-0.5">
147:                                     <h4 className="text-sm font-black text-gray-800 leading-tight">{lesson.title}</h4>
148:                                     <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
149:                                         <Play className="w-3 h-3" /> {lesson.videoUrl ? 'Đã có Video' : 'Chưa có Video'}
150:                                     </div>
151:                                 </div>
152:                             </div>
153:                             <button 
154:                                 onClick={() => setSelectedLesson(lesson)}
155:                                 className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-900 hover:text-white transition-all active:scale-90"
156:                             >
157:                                 <Settings className="w-4 h-4" />
158:                             </button>
159:                         </div>
160:                     ))}
161:                 </div>
162:             </div>
163:             {/* MODAL SỬA BÀI HỌC */}
164:             {selectedLesson && (
165:                 <LessonEditModal 
166:                     lesson={selectedLesson} 
167:                     onClose={() => setSelectedLesson(null)} 
168:                     onSave={handleUpdateLesson} 
169:                 />
170:             )}
171:         </div>
172:     )
173: }
````

## File: app/admin/courses/page.tsx
````typescript
 1: 'use client'
 2: import { useState, useEffect } from 'react'
 3: import { getAdminCoursesAction } from '@/app/actions/admin-actions'
 4: import { BookOpen, Users, DollarSign, Settings, Loader2, Plus, ArrowLeft } from 'lucide-react'
 5: import Link from 'next/link'
 6: export default function AdminCoursesPage() {
 7:     const [courses, setCourses] = useState<any[]>([])
 8:     const [loading, setLoading] = useState(true)
 9:     useEffect(() => {
10:         const fetchCourses = async () => {
11:             setLoading(true)
12:             const res = await getAdminCoursesAction()
13:             if (res.success) {
14:                 setCourses(res.courses || [])
15:             }
16:             setLoading(false)
17:         }
18:         fetchCourses()
19:     }, [])
20:     return (
21:         <div className="space-y-6 pb-20">
22:             <div className="flex items-center justify-between">
23:                 <div>
24:                     <h1 className="text-2xl font-bold text-gray-900 leading-tight">Khóa học</h1>
25:                     <p className="text-gray-500 text-xs font-medium">Quản lý nội dung & học phí</p>
26:                 </div>
27:                 <button className="bg-black text-yellow-400 p-2.5 rounded-2xl shadow-lg active:scale-95 transition-all">
28:                     <Plus className="w-5 h-5" />
29:                 </button>
30:             </div>
31:             <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
32:                 <div className="w-full">
33:                     <table className="w-full text-left border-collapse table-fixed">
34:                         <thead>
35:                             <tr className="bg-gray-50 border-b border-gray-200">
36:                                 <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-14 border-r border-gray-100">ID</th>
37:                                 <th className="px-3 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Thông tin Khóa học</th>
38:                             </tr>
39:                         </thead>
40:                         <tbody className="divide-y divide-gray-100">
41:                             {loading ? (
42:                                 <tr>
43:                                     <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
44:                                         <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-2" />
45:                                         <p className="text-[10px] font-black uppercase">Đang tải...</p>
46:                                     </td>
47:                                 </tr>
48:                             ) : courses.length === 0 ? (
49:                                 <tr>
50:                                     <td colSpan={2} className="px-6 py-12 text-center text-gray-400 text-[10px] font-black uppercase">
51:                                         Chưa có khóa học nào
52:                                     </td>
53:                                 </tr>
54:                             ) : (
55:                                 courses.map((course) => (
56:                                     <tr key={course.id} className="hover:bg-orange-50/30 transition-colors">
57:                                         <td className="px-2 py-4 text-center align-top space-y-3">
58:                                             <div className="text-[10px] font-black font-mono text-gray-900 bg-gray-100 px-1 py-0.5 rounded border border-gray-200">
59:                                                 #{course.id}
60:                                             </div>
61:                                             <Link 
62:                                                 href={`/admin/courses/${course.id}`} 
63:                                                 className="inline-flex items-center justify-center w-8 h-8 bg-black text-yellow-400 rounded-full hover:bg-zinc-800 active:scale-90 transition-all shadow-md"
64:                                             >
65:                                                 <Settings className="w-4 h-4" />
66:                                             </Link>
67:                                         </td>
68:                                         <td className="px-3 py-4 space-y-1 overflow-hidden">
69:                                             <div className="font-black text-orange-600 text-sm truncate leading-tight uppercase tracking-tight">
70:                                                 {course.name_lop}
71:                                             </div>
72:                                             <div className="flex items-center gap-3">
73:                                                 <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
74:                                                     <DollarSign className="w-3 h-3 text-green-500" />
75:                                                     {course.phi_coc.toLocaleString()}đ
76:                                                 </div>
77:                                                 <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
78:                                                     <BookOpen className="w-3 h-3 text-blue-400" />
79:                                                     {course._count?.lessons} bài
80:                                                 </div>
81:                                                 <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
82:                                                     <Users className="w-3 h-3 text-purple-400" />
83:                                                     {course._count?.enrollments} HV
84:                                                 </div>
85:                                             </div>
86:                                             <div className="text-[10px] text-gray-400 font-medium">
87:                                                 Mã: <span className="font-bold text-gray-600">{course.id_khoa}</span>
88:                                             </div>
89:                                         </td>
90:                                     </tr>
91:                                 ))
92:                             )}
93:                         </tbody>
94:                     </table>
95:                 </div>
96:             </div>
97:         </div>
98:     )
99: }
````

## File: app/admin/payments/page.tsx
````typescript
  1: 'use client'
  2: import { useEffect, useState } from 'react'
  3: import { getPendingPayments, getAllPayments, verifyPaymentAction, rejectPaymentAction } from '@/app/actions/payment-actions'
  4: import Image from 'next/image'
  5: interface PaymentData {
  6:   id: number
  7:   amount: number
  8:   status: string
  9:   phone: string | null
 10:   courseCode: string | null
 11:   bankName: string | null
 12:   accountNumber: string | null
 13:   content: string | null
 14:   proofImage: string | null
 15:   verifyMethod: string | null
 16:   verifiedAt: Date | null
 17:   createdAt: Date
 18:   enrollment: {
 19:     id: number
 20:     status: string
 21:     user: {
 22:       id: number
 23:       name: string | null
 24:       email: string
 25:       phone: string | null
 26:     }
 27:     course: {
 28:       id: number
 29:       id_khoa: string
 30:       name_lop: string
 31:       phi_coc: number
 32:     }
 33:   }
 34: }
 35: export default function PaymentsPage() {
 36:   const [payments, setPayments] = useState<PaymentData[]>([])
 37:   const [loading, setLoading] = useState(true)
 38:   const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING')
 39:   const [actionLoading, setActionLoading] = useState<number | null>(null)
 40:   useEffect(() => {
 41:     loadPayments()
 42:   }, [filter])
 43:   async function loadPayments() {
 44:     setLoading(true)
 45:     const result = filter === 'PENDING' 
 46:       ? await getPendingPayments()
 47:       : await getAllPayments()
 48:     if (result.success) {
 49:       setPayments(result.payments as PaymentData[])
 50:     }
 51:     setLoading(false)
 52:   }
 53:   async function handleVerify(paymentId: number) {
 54:     setActionLoading(paymentId)
 55:     const enrollmentId = payments.find(p => p.id === paymentId)?.enrollment.id
 56:     if (!enrollmentId) return
 57:     const result = await verifyPaymentAction(enrollmentId, 'MANUAL_ADMIN', 'Admin xác nhận thủ công')
 58:     if (result.success) {
 59:       await loadPayments()
 60:     }
 61:     setActionLoading(null)
 62:   }
 63:   async function handleReject(paymentId: number) {
 64:     const reason = prompt('Nhập lý do từ chối:')
 65:     if (!reason) return
 66:     setActionLoading(paymentId)
 67:     const enrollmentId = payments.find(p => p.id === paymentId)?.enrollment.id
 68:     if (!enrollmentId) return
 69:     const result = await rejectPaymentAction(enrollmentId, reason)
 70:     if (result.success) {
 71:       await loadPayments()
 72:     }
 73:     setActionLoading(null)
 74:   }
 75:   const statusColors: Record<string, string> = {
 76:     PENDING: 'bg-yellow-100 text-yellow-800',
 77:     VERIFIED: 'bg-green-100 text-green-800',
 78:     REJECTED: 'bg-red-100 text-red-800',
 79:     CANCELLED: 'bg-gray-100 text-gray-800'
 80:   }
 81:   return (
 82:     <div className="p-6">
 83:       <div className="flex items-center justify-between mb-6">
 84:         <div>
 85:           <h1 className="text-2xl font-bold text-gray-900">Quản lý thanh toán</h1>
 86:           <p className="text-gray-600">Xem và xác nhận thanh toán khóa học</p>
 87:         </div>
 88:         <div className="flex gap-2">
 89:           <button
 90:             onClick={() => setFilter('PENDING')}
 91:             className={`px-4 py-2 rounded-lg font-medium ${
 92:               filter === 'PENDING' 
 93:                 ? 'bg-purple-600 text-white' 
 94:                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 95:             }`}
 96:           >
 97:             Chờ xác nhận
 98:           </button>
 99:           <button
100:             onClick={() => setFilter('ALL')}
101:             className={`px-4 py-2 rounded-lg font-medium ${
102:               filter === 'ALL' 
103:                 ? 'bg-purple-600 text-white' 
104:                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
105:             }`}
106:           >
107:             Tất cả
108:           </button>
109:         </div>
110:       </div>
111:       {loading ? (
112:         <div className="text-center py-12">
113:           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
114:           <p className="mt-4 text-gray-600">Đang tải...</p>
115:         </div>
116:       ) : payments.length === 0 ? (
117:         <div className="text-center py-12 bg-gray-50 rounded-xl">
118:           <p className="text-gray-500">Không có thanh toán nào</p>
119:         </div>
120:       ) : (
121:         <div className="space-y-4">
122:           {payments.map((payment) => (
123:             <div key={payment.id} className="bg-white border rounded-xl p-4 shadow-sm">
124:               <div className="flex items-start justify-between">
125:                 <div className="flex-1">
126:                   <div className="flex items-center gap-3 mb-2">
127:                     <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[payment.status]}`}>
128:                       {payment.status === 'PENDING' ? '⏳ Chờ xác nhận' :
129:                        payment.status === 'VERIFIED' ? '✓ Đã xác nhận' :
130:                        payment.status === 'REJECTED' ? '✗ Từ chối' : 'Đã hủy'}
131:                     </span>
132:                     <span className="text-sm text-gray-500">
133:                       #{payment.id} • {new Date(payment.createdAt).toLocaleString('vi-VN')}
134:                     </span>
135:                   </div>
136:                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
137:                     <div>
138:                       <p className="text-xs text-gray-500">Học viên</p>
139:                       <p className="font-medium">{payment.enrollment.user.name || 'N/A'}</p>
140:                       <p className="text-sm text-gray-600">{payment.enrollment.user.email}</p>
141:                       {payment.enrollment.user.phone && (
142:                         <p className="text-sm text-gray-500">📱 {payment.enrollment.user.phone}</p>
143:                       )}
144:                     </div>
145:                     <div>
146:                       <p className="text-xs text-gray-500">Khóa học</p>
147:                       <p className="font-medium">{payment.enrollment.course.name_lop}</p>
148:                       <p className="text-sm text-gray-500">Mã: {payment.enrollment.course.id_khoa}</p>
149:                       <p className="text-sm text-gray-500">Phí: {payment.enrollment.course.phi_coc.toLocaleString()}đ</p>
150:                     </div>
151:                     <div>
152:                       <p className="text-xs text-gray-500">Thông tin chuyển khoản</p>
153:                       {payment.amount > 0 && (
154:                         <p className="font-medium text-green-600">Số tiền: {payment.amount.toLocaleString()}đ</p>
155:                       )}
156:                       {payment.phone && <p className="text-sm">📱 {payment.phone}</p>}
157:                       {payment.bankName && <p className="text-sm">🏦 {payment.bankName}</p>}
158:                       {payment.content && <p className="text-sm text-gray-600">ND: {payment.content}</p>}
159:                       {payment.verifyMethod && (
160:                         <p className="text-xs text-gray-500 mt-1">
161:                           Cách xác nhận: {
162:                             payment.verifyMethod === 'AUTO_EMAIL' ? 'Tự động email' :
163:                             payment.verifyMethod === 'MANUAL_UPLOAD' ? 'Upload biên lai' :
164:                             'Thủ công'
165:                           }
166:                         </p>
167:                       )}
168:                     </div>
169:                   </div>
170:                   {payment.proofImage && (
171:                     <div className="mt-3 p-3 bg-blue-50 rounded-lg">
172:                       <p className="text-xs text-blue-600 font-medium mb-2">📎 Biên lai đã upload:</p>
173:                       <div className="relative w-48 h-36 border rounded-lg overflow-hidden">
174:                         <Image
175:                           src={payment.proofImage}
176:                           alt="Biên lai"
177:                           fill
178:                           className="object-cover"
179:                         />
180:                       </div>
181:                     </div>
182:                   )}
183:                 </div>
184:                 {payment.status === 'PENDING' && (
185:                   <div className="flex flex-col gap-2 ml-4">
186:                     <button
187:                       onClick={() => handleVerify(payment.id)}
188:                       disabled={actionLoading === payment.id}
189:                       className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
190:                     >
191:                       {actionLoading === payment.id ? '...' : '✓ Xác nhận'}
192:                     </button>
193:                     <button
194:                       onClick={() => handleReject(payment.id)}
195:                       disabled={actionLoading === payment.id}
196:                       className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50"
197:                     >
198:                       {actionLoading === payment.id ? '...' : '✗ Từ chối'}
199:                     </button>
200:                   </div>
201:                 )}
202:               </div>
203:             </div>
204:           ))}
205:         </div>
206:       )}
207:     </div>
208:   )
209: }
````

## File: app/admin/posts/page.tsx
````typescript
  1: 'use client'
  2: import { useState, useEffect } from 'react'
  3: import { getPostsAction, createPostAction } from '@/app/actions/post-actions'
  4: import { Plus, Newspaper, Save, Loader2, Image as ImageIcon, X, Trash2 } from 'lucide-react'
  5: import Link from 'next/link'
  6: export default function AdminPostsPage() {
  7:     const [posts, setPosts] = useState<any[]>([])
  8:     const [loading, setLoading] = useState(true)
  9:     const [showCreate, setShowCreate] = useState(false)
 10:     const [title, setTitle] = useState('')
 11:     const [content, setContent] = useState('')
 12:     const [image, setImage] = useState('')
 13:     const [saving, setSaving] = useState(false)
 14:     const fetchPosts = async () => {
 15:         setLoading(true)
 16:         const res = await getPostsAction()
 17:         if (res.success) {
 18:             setPosts(res.posts || [])
 19:         }
 20:         setLoading(false)
 21:     }
 22:     useEffect(() => {
 23:         fetchPosts()
 24:     }, [])
 25:     const handleCreate = async (e: React.FormEvent) => {
 26:         e.preventDefault()
 27:         setSaving(true)
 28:         const res = await createPostAction({ title, content, image })
 29:         if (res.success) {
 30:             setTitle('')
 31:             setContent('')
 32:             setImage('')
 33:             setShowCreate(false)
 34:             fetchPosts()
 35:         } else {
 36:             alert(res.error)
 37:         }
 38:         setSaving(false)
 39:     }
 40:     return (
 41:         <div className="space-y-6 pb-20">
 42:             <div className="flex items-center justify-between">
 43:                 <div>
 44:                     <h1 className="text-2xl font-bold text-gray-900 leading-tight">Bảng tin</h1>
 45:                     <p className="text-gray-500 text-xs font-medium">Quản lý bài viết cộng đồng</p>
 46:                 </div>
 47:                 <button 
 48:                     onClick={() => setShowCreate(!showCreate)}
 49:                     className="bg-black text-yellow-400 p-2.5 rounded-2xl shadow-lg active:scale-95 transition-all"
 50:                 >
 51:                     {showCreate ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
 52:                 </button>
 53:             </div>
 54:             {/* Form Đăng bài mới */}
 55:             {showCreate && (
 56:                 <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-purple-100 animate-in slide-in-from-top-4 duration-300">
 57:                     <h2 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight flex items-center gap-2">
 58:                         <Newspaper className="w-5 h-5 text-purple-500" /> Đăng bài mới
 59:                     </h2>
 60:                     <form onSubmit={handleCreate} className="space-y-4">
 61:                         <div className="space-y-1.5">
 62:                             <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tiêu đề bản tin</label>
 63:                             <input 
 64:                                 type="text" 
 65:                                 value={title}
 66:                                 onChange={(e) => setTitle(e.target.value)}
 67:                                 className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
 68:                                 placeholder="Nhập tiêu đề thu hút..."
 69:                                 required
 70:                             />
 71:                         </div>
 72:                         <div className="space-y-1.5">
 73:                             <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nội dung chi tiết</label>
 74:                             <textarea 
 75:                                 value={content}
 76:                                 onChange={(e) => setContent(e.target.value)}
 77:                                 rows={5}
 78:                                 className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 transition-all"
 79:                                 placeholder="Bạn muốn chia sẻ điều gì với cộng đồng?"
 80:                                 required
 81:                             />
 82:                         </div>
 83:                         <div className="space-y-1.5">
 84:                             <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link ảnh minh họa (không bắt buộc)</label>
 85:                             <div className="relative">
 86:                                 <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 87:                                 <input 
 88:                                     type="text" 
 89:                                     value={image}
 90:                                     onChange={(e) => setImage(e.target.value)}
 91:                                     className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
 92:                                     placeholder="https://postimg.cc/..."
 93:                                 />
 94:                             </div>
 95:                         </div>
 96:                         <button 
 97:                             type="submit"
 98:                             disabled={saving}
 99:                             className="w-full bg-black text-yellow-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
100:                         >
101:                             {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
102:                             Đăng bản tin ngay
103:                         </button>
104:                     </form>
105:                 </div>
106:             )}
107:             {/* Danh sách bài viết hiện có */}
108:             <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
109:                 <div className="w-full">
110:                     <table className="w-full text-left border-collapse table-fixed">
111:                         <thead>
112:                             <tr className="bg-gray-50 border-b border-gray-200">
113:                                 <th className="px-3 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Bản tin đã đăng</th>
114:                                 <th className="px-3 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-16">Xóa</th>
115:                             </tr>
116:                         </thead>
117:                         <tbody className="divide-y divide-gray-100">
118:                             {loading ? (
119:                                 <tr>
120:                                     <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
121:                                         <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-2" />
122:                                         <p className="text-[10px] font-black uppercase">Đang tải bản tin...</p>
123:                                     </td>
124:                                 </tr>
125:                             ) : posts.length === 0 ? (
126:                                 <tr>
127:                                     <td colSpan={2} className="px-6 py-12 text-center text-gray-400 text-[10px] font-black uppercase">
128:                                         Chưa có bài viết nào
129:                                     </td>
130:                                 </tr>
131:                             ) : (
132:                                 posts.map((post) => (
133:                                     <tr key={post.id} className="hover:bg-purple-50/30 transition-colors">
134:                                         <td className="px-3 py-4">
135:                                             <div className="font-black text-gray-900 text-sm truncate leading-tight uppercase">{post.title}</div>
136:                                             <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">
137:                                                 {new Date(post.createdAt).toLocaleDateString('vi-VN')} • {post._count?.comments || 0} bình luận
138:                                             </div>
139:                                         </td>
140:                                         <td className="px-3 py-4 text-center">
141:                                             <button className="p-2 text-gray-300 hover:text-red-600 transition-colors">
142:                                                 <Trash2 className="w-4 h-4" />
143:                                             </button>
144:                                         </td>
145:                                     </tr>
146:                                 ))
147:                             )}
148:                         </tbody>
149:                     </table>
150:                 </div>
151:             </div>
152:         </div>
153:     )
154: }
````

## File: app/admin/reserved-ids/add-form.tsx
````typescript
 1: 'use client'
 2: import { useActionState } from "react"
 3: import { addReservedIdAction } from "@/app/actions/admin-actions"
 4: const initialState = {
 5:     message: '',
 6: }
 7: export function AddReservedIdForm() {
 8:     const [state, formAction, isPending] = useActionState(addReservedIdAction, initialState)
 9:     return (
10:         <div className="bg-gray-50 border p-6 rounded-lg shadow-sm">
11:             <form action={formAction} className="flex flex-col gap-4">
12:                 <div>
13:                     <label className="block text-sm font-medium text-gray-700 mb-1">ID cần giữ</label>
14:                     <input name="id" type="number" required placeholder="VD: 6868" className="border p-2 rounded w-full" />
15:                 </div>
16:                 <div>
17:                     <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (Tùy chọn)</label>
18:                     <input name="note" type="text" placeholder="VD: Để dành cho VIP..." className="border p-2 rounded w-full" />
19:                 </div>
20:                 <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium mt-2">
21:                     ➕ Thêm vào danh sách
22:                 </button>
23:             </form>
24:             {state?.message && (
25:                 <div className={`mt-4 p-3 rounded text-sm ${state.message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
26:                     {state.message}
27:                 </div>
28:             )}
29:             <div className="mt-4 text-sm text-gray-500 bg-white p-3 rounded border">
30:                 <strong>Lưu ý:</strong> Khi bạn thêm một số vào đây, các user đăng ký mới sẽ <u>tự động bỏ qua</u> số này. Bạn có thể dùng chức năng &quot;Cấp số đẹp&quot; ở trên để gán số này cho user cụ thể sau.
31:             </div>
32:         </div>
33:     )
34: }
````

## File: app/admin/reserved-ids/change-id-form.tsx
````typescript
 1: 'use client'
 2: import { useActionState } from "react"
 3: import { changeUserIdAction } from "@/app/actions/admin-actions"
 4: const initialState = {
 5:     message: '',
 6: }
 7: export function ChangeUserIdForm() {
 8:     const [state, formAction, isPending] = useActionState(changeUserIdAction, initialState)
 9:     return (
10:         <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow-sm">
11:             <p className="text-sm text-blue-700 mb-4">
12:                 Chức năng này cho phép đổi ID của học viên hiện tại sang một ID mới (thường là số đẹp).
13:                 <br />Hệ thống sẽ tự động cập nhật mọi dữ liệu liên quan (lịch sử, giới thiệu...).
14:             </p>
15:             <form action={formAction} className="flex gap-4 items-end flex-wrap">
16:                 <div>
17:                     <label className="block text-sm font-medium text-gray-700 mb-1">ID Hiện tại (Cũ)</label>
18:                     <input name="currentId" type="number" required placeholder="VD: 123" className="border p-2 rounded w-40" />
19:                 </div>
20:                 <div>
21:                     <label className="block text-sm font-medium text-gray-700 mb-1">ID Mới (Số đẹp)</label>
22:                     <input name="newId" type="number" required placeholder="VD: 8888" className="border p-2 rounded w-40 font-bold text-blue-600" />
23:                 </div>
24:                 <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition">
25:                     🚀 Thực hiện Đổi ID
26:                 </button>
27:             </form>
28:             {state?.message && (
29:                 <div className={`mt-4 p-3 rounded text-sm ${state.message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
30:                     {state.message}
31:                 </div>
32:             )}
33:         </div>
34:     )
35: }
````

## File: app/admin/students/[id]/page.tsx
````typescript
  1: 'use client'
  2: import { useState, useEffect, use } from 'react'
  3: import { getStudentDetailsAction } from '@/app/actions/admin-actions'
  4: import { User, Mail, Phone, Calendar, BookOpen, CheckCircle, ArrowLeft, Loader2, Award, Info, X, ExternalLink } from 'lucide-react'
  5: import Link from 'next/link'
  6: // ─── Component Popup Bảng Điểm ─────────────────────────────────────────────
  7: function ScoreModal({ enroll, onClose }: { enroll: any, onClose: () => void }) {
  8:     return (
  9:         <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
 10:             <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
 11:                 <div className="bg-purple-600 p-4 text-white flex items-center justify-between">
 12:                     <div>
 13:                         <h3 className="font-black text-sm uppercase tracking-tight line-clamp-1">{enroll.course.name_lop}</h3>
 14:                         <p className="text-[10px] opacity-80 font-bold uppercase">Bảng điểm chi tiết</p>
 15:                     </div>
 16:                     <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
 17:                 </div>
 18:                 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
 19:                     <div className="space-y-3">
 20:                         {enroll.course.lessons.map((lesson: any) => {
 21:                             const prog = enroll.lessonProgress.find((p: any) => p.lessonId === lesson.id)
 22:                             const scores = prog?.scores || {}
 23:                             return (
 24:                                 <div key={lesson.id} className={`p-3 rounded-2xl border ${prog?.status === 'COMPLETED' ? 'border-green-100 bg-green-50/30' : 'border-gray-100 bg-gray-50/50 opacity-60'}`}>
 25:                                     <div className="flex justify-between items-start mb-2">
 26:                                         <div className="flex items-start gap-2">
 27:                                             <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[10px] font-black font-mono">#{lesson.order}</span>
 28:                                             <span className="font-bold text-gray-800 text-xs leading-tight">{lesson.title}</span>
 29:                                         </div>
 30:                                         <span className={`text-xs font-black ${prog?.status === 'COMPLETED' ? 'text-green-600' : 'text-gray-400'}`}>
 31:                                             {prog?.totalScore ?? 0}/10
 32:                                         </span>
 33:                                     </div>
 34:                                     {prog && (
 35:                                         <div className="grid grid-cols-5 gap-1 text-[9px] font-bold text-center uppercase tracking-tighter">
 36:                                             <div className="bg-white p-1 rounded-md border border-gray-100">Vid: {scores.video ?? 0}</div>
 37:                                             <div className="bg-white p-1 rounded-md border border-gray-100">Tâm: {scores.reflection ?? 0}</div>
 38:                                             <div className="bg-white p-1 rounded-md border border-gray-100">Làm: {scores.link ?? 0}</div>
 39:                                             <div className="bg-white p-1 rounded-md border border-gray-100">Giúp: {scores.support ?? 0}</div>
 40:                                             <div className={`p-1 rounded-md border border-gray-100 ${scores.timing === 1 ? 'bg-green-100 text-green-700' : scores.timing === -1 ? 'bg-red-100 text-red-700' : 'bg-white'}`}>
 41:                                                 Hạn: {scores.timing ?? 0}
 42:                                             </div>
 43:                                         </div>
 44:                                     )}
 45:                                 </div>
 46:                             )
 47:                         })}
 48:                     </div>
 49:                 </div>
 50:             </div>
 51:         </div>
 52:     )
 53: }
 54: export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
 55:     const { id } = use(params)
 56:     const [student, setStudent] = useState<any>(null)
 57:     const [loading, setLoading] = useState(true)
 58:     const [error, setError] = useState<string | null>(null)
 59:     const [selectedEnroll, setSelectedEnroll] = useState<any>(null)
 60:     useEffect(() => {
 61:         const fetchDetails = async () => {
 62:             setLoading(true)
 63:             const res = await getStudentDetailsAction(parseInt(id))
 64:             if (res.success) {
 65:                 setStudent(res.student)
 66:             } else {
 67:                 setError(res.error || 'Lỗi tải dữ liệu')
 68:             }
 69:             setLoading(false)
 70:         }
 71:         fetchDetails()
 72:     }, [id])
 73:     if (loading) return (
 74:         <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 text-gray-400">
 75:             <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
 76:             <p className="text-xs font-black uppercase">Đang tải hồ sơ...</p>
 77:         </div>
 78:     )
 79:     return (
 80:         <div className="max-w-md mx-auto space-y-6 pb-20">
 81:             {/* Nút quay lại */}
 82:             <Link href="/admin/students" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-purple-600 transition-colors">
 83:                 <ArrowLeft className="w-4 h-4" /> Danh sách học viên
 84:             </Link>
 85:             {/* Thẻ Hồ sơ (Profile Card) */}
 86:             <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-purple-100 border border-purple-50">
 87:                 <div className="flex flex-col items-center text-center space-y-3">
 88:                     <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-purple-200 ring-4 ring-purple-50">
 89:                         {student.name ? student.name.charAt(0).toUpperCase() : '?'}
 90:                     </div>
 91:                     <div>
 92:                         <h1 className="text-2xl font-black text-gray-900 leading-tight">{student.name || 'N/A'}</h1>
 93:                         <p className="text-xs font-black text-purple-500 font-mono tracking-widest mt-1 uppercase">Mã học tập: #{student.id}</p>
 94:                     </div>
 95:                     <div className="grid grid-cols-1 w-full gap-2 pt-4">
 96:                         <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
 97:                             <Phone className="w-4 h-4 text-purple-400" />
 98:                             <span className="text-sm font-bold text-gray-700">{student.phone || 'Chưa cập nhật'}</span>
 99:                         </div>
100:                         <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
101:                             <Mail className="w-4 h-4 text-purple-400" />
102:                             <span className="text-sm font-bold text-gray-700 truncate">{student.email}</span>
103:                         </div>
104:                         <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
105:                             <Calendar className="w-4 h-4 text-purple-400" />
106:                             <span className="text-xs font-bold text-gray-500 italic">Gia nhập: {new Date(student.createdAt).toLocaleDateString('vi-VN')}</span>
107:                         </div>
108:                     </div>
109:                 </div>
110:             </div>
111:             {/* Phần Khóa học */}
112:             <div className="space-y-4">
113:                 <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 px-2 uppercase tracking-tight">
114:                     <Award className="w-5 h-5 text-yellow-500" />
115:                     Lộ trình học tập
116:                 </h2>
117:                 {student.enrollments.length === 0 ? (
118:                     <div className="bg-gray-100 rounded-3xl p-8 text-center text-gray-400 text-xs font-bold uppercase border-2 border-dashed border-gray-200">
119:                         Chưa đăng ký khóa nào
120:                     </div>
121:                 ) : (
122:                     student.enrollments.map((enroll: any) => {
123:                         const totalLessons = enroll.course.lessons.length
124:                         const completedCount = enroll.lessonProgress.filter((p: any) => p.status === 'COMPLETED').length
125:                         const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
126:                         return (
127:                             <div key={enroll.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-100/50 space-y-4">
128:                                 <div className="flex items-center gap-4">
129:                                     <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl shadow-inner border border-indigo-100">
130:                                         📘
131:                                     </div>
132:                                     <div className="flex-1 min-w-0">
133:                                         <h3 className="font-black text-gray-900 text-sm uppercase leading-tight truncate">{enroll.course.name_lop}</h3>
134:                                         <p className={`text-[10px] font-black uppercase mt-0.5 ${enroll.status === 'ACTIVE' ? 'text-green-500' : 'text-orange-500'}`}>
135:                                             ● {enroll.status === 'ACTIVE' ? 'Đã kích hoạt' : 'Chờ thanh toán'}
136:                                         </p>
137:                                     </div>
138:                                 </div>
139:                                 <div className="space-y-1.5">
140:                                     <div className="flex justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest">
141:                                         <span>Tiến độ</span>
142:                                         <span className="text-purple-600">{progressPct}%</span>
143:                                     </div>
144:                                     <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
145:                                         <div 
146:                                             className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000" 
147:                                             style={{ width: `${progressPct}%` }}
148:                                         />
149:                                     </div>
150:                                     <p className="text-[9px] font-black text-gray-400 uppercase text-right">Đã xong {completedCount}/{totalLessons} bài</p>
151:                                 </div>
152:                                 <button 
153:                                     onClick={() => setSelectedEnroll(enroll)}
154:                                     className="w-full bg-gray-900 text-white py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all"
155:                                 >
156:                                     <Info className="w-4 h-4 text-yellow-400" />
157:                                     Xem bảng điểm chi tiết
158:                                 </button>
159:                             </div>
160:                         )
161:                     })
162:                 )}
163:             </div>
164:             {/* Popup Bảng Điểm */}
165:             {selectedEnroll && (
166:                 <ScoreModal enroll={selectedEnroll} onClose={() => setSelectedEnroll(null)} />
167:             )}
168:         </div>
169:     )
170: }
````

## File: app/admin/students/page.tsx
````typescript
  1: 'use client'
  2: import { useState, useEffect } from 'react'
  3: import Link from 'next/link'
  4: import { getStudentsAction } from '@/app/actions/admin-actions'
  5: import { Search, User, Mail, Phone, Calendar, BookOpen, CheckCircle, Loader2, Info, ArrowUpDown } from 'lucide-react'
  6: export default function AdminStudentsPage() {
  7:     const [students, setStudents] = useState<any[]>([])
  8:     const [loading, setLoading] = useState(true)
  9:     const [searchQuery, setSearchQuery] = useState('')
 10:     const [selectedRole, setSelectedRole] = useState<string>('STUDENT') 
 11:     const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
 12:     const fetchStudents = async (query?: string, role?: string) => {
 13:         setLoading(true)
 14:         const res = await getStudentsAction(query, (role || selectedRole) as any)
 15:         if (res.success) {
 16:             let data = res.students || []
 17:             // Sắp xếp dữ liệu theo thời gian tạo (createdAt)
 18:             data.sort((a: any, b: any) => {
 19:                 const timeA = new Date(a.createdAt).getTime()
 20:                 const timeB = new Date(b.createdAt).getTime()
 21:                 return sortOrder === 'asc' ? timeA - timeB : timeB - timeA
 22:             })
 23:             setStudents(data)
 24:         }
 25:         setLoading(false)
 26:     }
 27:     useEffect(() => {
 28:         fetchStudents(searchQuery, selectedRole)
 29:     }, [sortOrder, selectedRole])
 30:     const toggleSort = () => {
 31:         setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
 32:     }
 33:     const handleSearch = (e: React.FormEvent) => {
 34:         e.preventDefault()
 35:         fetchStudents(searchQuery, selectedRole)
 36:     }
 37:     return (
 38:         <div className="space-y-6 pb-20">
 39:             <div className="flex flex-col gap-4">
 40:                 <div className="flex items-center justify-between">
 41:                     <div>
 42:                         <h1 className="text-2xl font-bold text-gray-900 leading-tight">Quản lý</h1>
 43:                         <p className="text-gray-500 text-xs font-medium">Thành viên & tiến độ</p>
 44:                     </div>
 45:                     <select 
 46:                         value={selectedRole}
 47:                         onChange={(e) => setSelectedRole(e.target.value)}
 48:                         className="bg-black text-yellow-400 border-none rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-tighter focus:ring-2 focus:ring-yellow-500 outline-none shadow-lg cursor-pointer"
 49:                     >
 50:                         <option value="ALL">Tất cả</option>
 51:                         <option value="STUDENT">Học viên</option>
 52:                         <option value="ADMIN">Quản trị</option>
 53:                         <option value="INSTRUCTOR">Giảng viên</option>
 54:                         <option value="AFFILIATE">Đối tác</option>
 55:                         <option value="COURSE_86_DAYS">Coach 1:1</option>
 56:                     </select>
 57:                 </div>
 58:                 <form onSubmit={handleSearch} className="relative w-full">
 59:                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 60:                     <input
 61:                         type="text"
 62:                         placeholder="Tìm Tên, SĐT hoặc #ID..."
 63:                         className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm text-sm"
 64:                         value={searchQuery}
 65:                         onChange={(e) => setSearchQuery(e.target.value)}
 66:                     />
 67:                 </form>
 68:             </div>
 69:             <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
 70:                 <div className="w-full">
 71:                     <table className="w-full text-left border-collapse table-fixed">
 72:                         <thead>
 73:                             <tr className="bg-gray-50 border-b border-gray-200">
 74:                                 <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-14 border-r border-gray-100">ID</th>
 75:                                 <th className="px-3 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest relative">
 76:                                     <div className="flex items-center">
 77:                                         <span>Thông tin cơ bản</span>
 78:                                         <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
 79:                                             <div className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-orange-200 shadow-sm">
 80:                                                 {students.length}
 81:                                             </div>
 82:                                             <button 
 83:                                                 onClick={toggleSort}
 84:                                                 className="flex items-center gap-1 hover:text-gray-900 transition-colors bg-gray-100 p-1 rounded-lg border border-gray-200"
 85:                                                 title={sortOrder === 'desc' ? 'Mới nhất lên đầu' : 'Cũ nhất lên đầu'}
 86:                                             >
 87:                                                 <ArrowUpDown className={`w-3.5 h-3.5 ${sortOrder === 'desc' ? 'text-gray-900' : 'text-purple-600'}`} />
 88:                                             </button>
 89:                                         </div>
 90:                                     </div>
 91:                                 </th>
 92:                             </tr>
 93:                         </thead>
 94:                         <tbody className="divide-y divide-gray-100">
 95:                             {loading ? (
 96:                                 <tr>
 97:                                     <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
 98:                                         <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-2" />
 99:                                         <p className="text-[10px] font-black uppercase">Đang tải...</p>
100:                                     </td>
101:                                 </tr>
102:                             ) : students.length === 0 ? (
103:                                 <tr>
104:                                     <td colSpan={2} className="px-6 py-12 text-center text-gray-400 text-[10px] font-black uppercase">
105:                                         Trống
106:                                     </td>
107:                                 </tr>
108:                             ) : (
109:                                     students.map((student) => {
110:                                         const hasCourseOne = student.enrollments.some((e: any) => e.courseId === 1)
111:                                         return (
112:                                             <tr key={student.id} className="hover:bg-orange-50/30 transition-colors">
113:                                                 <td className="px-2 py-4 text-center align-top space-y-3">
114:                                                     <div className="text-[10px] font-black font-mono text-gray-900 bg-gray-100 px-1 py-0.5 rounded border border-gray-200">
115:                                                         #{student.id}
116:                                                     </div>
117:                                                     <Link 
118:                                                         href={`/admin/students/${student.id}`} 
119:                                                         className="inline-flex items-center justify-center w-8 h-8 bg-black text-yellow-400 rounded-full hover:bg-zinc-800 active:scale-90 transition-all shadow-md"
120:                                                     >
121:                                                         <Info className="w-4 h-4" />
122:                                                     </Link>
123:                                                 </td>
124:                                                 <td className="px-3 py-4 space-y-1 overflow-hidden">
125:                                                     <div className={`font-black text-sm truncate leading-tight capitalize tracking-tight ${hasCourseOne ? 'text-purple-600' : 'text-orange-600'}`}>
126:                                                         {student.name ? student.name.toLowerCase() : 'N/A'}
127:                                                     </div>
128:                                                     <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium truncate">
129:                                                         <Mail className="w-3 h-3 text-gray-300 shrink-0" />
130:                                                         {student.email}
131:                                                     </div>
132:                                                     <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold truncate">
133:                                                         <Phone className="w-3 h-3 text-gray-300 shrink-0" />
134:                                                         {student.phone || '---'}
135:                                                     </div>
136:                                                 </td>
137:                                             </tr>
138:                                         )
139:                                     })
140:                             )}
141:                         </tbody>
142:                     </table>
143:                 </div>
144:             </div>
145:         </div>
146:     )
147: }
````

## File: app/api/auth/[...nextauth]/route.ts
````typescript
1: import { handlers } from "@/auth"
2: export const { GET, POST } = handlers
````

## File: app/api/courses/[id]/route.ts
````typescript
 1: import { NextRequest, NextResponse } from 'next/server';
 2: import prisma from '@/lib/prisma';
 3: import { auth } from '@/auth';
 4: import { Role } from '@prisma/client';
 5: export async function GET(
 6:   req: NextRequest,
 7:   { params }: { params: Promise<{ id: string }> }
 8: ) {
 9:   try {
10:     const session = await auth();
11:     if (!session || session.user?.role !== Role.ADMIN) {
12:       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
13:     }
14:     const { id } = await params;
15:     const course = await prisma.course.findUnique({
16:       where: { id: parseInt(id) },
17:       include: {
18:         lessons: {
19:           orderBy: { order: 'asc' }
20:         }
21:       }
22:     });
23:     if (!course) {
24:       return NextResponse.json({ error: 'Course not found' }, { status: 404 });
25:     }
26:     return NextResponse.json(course);
27:   } catch (error: any) {
28:     return NextResponse.json({ error: error.message }, { status: 500 });
29:   }
30: }
````

## File: app/api/docs/route.ts
````typescript
 1: import { NextRequest } from 'next/server'
 2: export async function GET(req: NextRequest) {
 3:   const url = req.nextUrl.searchParams.get('url')
 4:   if (!url) {
 5:     return new Response('Missing URL', { status: 400 })
 6:   }
 7:   try {
 8:     const res = await fetch(url, {
 9:       headers: {
10:         // Giả lập browser để Google không chặn
11:         'User-Agent': 'Mozilla/5.0',
12:       },
13:       cache: 'no-store',
14:     })
15:     if (!res.ok) {
16:       return new Response('Failed to fetch document', { status: 500 })
17:     }
18:     const html = await res.text()
19:     return new Response(html, {
20:       headers: {
21:         'Content-Type': 'text/html; charset=utf-8',
22:       },
23:     })
24:   } catch (err) {
25:     return new Response('Server error', { status: 500 })
26:   }
27: }
````

## File: app/api/upload/payment/route.ts
````typescript
 1: import { NextRequest, NextResponse } from 'next/server'
 2: import { writeFile, mkdir } from 'fs/promises'
 3: import path from 'path'
 4: import { existsSync } from 'fs'
 5: export async function POST(request: NextRequest) {
 6:   try {
 7:     const formData = await request.formData()
 8:     const file = formData.get('file') as File | null
 9:     if (!file) {
10:       return NextResponse.json(
11:         { error: 'No file uploaded' },
12:         { status: 400 }
13:       )
14:     }
15:     const bytes = await file.arrayBuffer()
16:     const buffer = Buffer.from(bytes)
17:     const uploadDir = path.join(process.cwd(), 'public', 'uploads')
18:     if (!existsSync(uploadDir)) {
19:       await mkdir(uploadDir, { recursive: true })
20:     }
21:     const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`
22:     const ext = file.name.split('.').pop() || 'jpg'
23:     const filename = `payment-${uniqueSuffix}.${ext}`
24:     const filepath = path.join(uploadDir, filename)
25:     await writeFile(filepath, buffer)
26:     const url = `/uploads/${filename}`
27:     return NextResponse.json({ url, filename })
28:   } catch (error) {
29:     console.error('Upload error:', error)
30:     return NextResponse.json(
31:       { error: 'Upload failed' },
32:       { status: 500 }
33:     )
34:   }
35: }
````

## File: app/courses/[id]/learn/error.tsx
````typescript
 1: 'use client'
 2: import { useEffect } from 'react'
 3: import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
 4: import Link from 'next/link'
 5: export default function CourseLearnError({
 6:   error,
 7:   reset,
 8: }: {
 9:   error: Error & { digest?: string }
10:   reset: () => void
11: }) {
12:   useEffect(() => {
13:     // Log lỗi ra console để bạn xem được trong F12 trình duyệt (nếu là client error)
14:     // Hoặc gửi về hệ thống giám sát lỗi
15:     console.error('Course Learn Page Error:', error)
16:   }, [error])
17:   return (
18:     <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
19:       <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
20:         <AlertCircle className="w-10 h-10 text-red-500" />
21:       </div>
22:       <h2 className="text-xl font-bold text-white mb-2">Đã xảy ra lỗi hệ thống</h2>
23:       <p className="text-zinc-400 text-sm max-w-md mb-8">
24:         Hệ thống không thể tải nội dung bài học. Điều này có thể do phiên đăng nhập hết hạn hoặc dữ liệu khóa học gặp sự cố.
25:       </p>
26:       {error.digest && (
27:         <div className="mb-8 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
28:           <p className="text-[10px] text-zinc-500 font-mono">Mã lỗi (Digest): {error.digest}</p>
29:         </div>
30:       )}
31:       <div className="flex flex-col sm:flex-row gap-3">
32:         <button
33:           onClick={() => reset()}
34:           className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all"
35:         >
36:           <RefreshCcw className="w-4 h-4" /> Thử lại ngay
37:         </button>
38:         <Link
39:           href="/"
40:           className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all"
41:         >
42:           <Home className="w-4 h-4" /> Quay về trang chủ
43:         </Link>
44:       </div>
45:       <p className="mt-12 text-xs text-zinc-600 italic">
46:         Nếu lỗi vẫn tiếp tục, vui lòng liên hệ Ban quản trị để được hỗ trợ.
47:       </p>
48:     </div>
49:   )
50: }
````

## File: auth.config.ts
````typescript
 1: import type { NextAuthConfig } from "next-auth"
 2: export const authConfig = {
 3:     pages: {
 4:         signIn: '/login',
 5:     },
 6:     callbacks: {
 7:         authorized({ auth, request: { nextUrl } }) {
 8:             const isLoggedIn = !!auth?.user;
 9:             const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
10:             if (isOnDashboard) {
11:                 if (isLoggedIn) return true;
12:                 return false; // Redirect unauthenticated users to login page
13:             } else if (isLoggedIn) {
14:                 // Logic redirection if needed
15:                 // return Response.redirect(new URL('/dashboard', nextUrl))
16:             }
17:             return true;
18:         },
19:     },
20:     providers: [], // Add providers with an empty array for now
21: } satisfies NextAuthConfig
````

## File: CODE_HISTORY05032026.md
````markdown
   1: # CODE_HISTORY.md
   2: 
   3: ================================================================================
   4: PHIÊN BẢN: 2
   5: NGÀY CẬP NHẬT: 2026-03-04
   6: MÔ TẢ: Lưu toàn bộ code dự án BRK Academy - Phiên bản đầy đủ
   7: ================================================================================
   8: 
   9: ================================================================================
  10: CẤU TRÚC DỰ ÁN VÀ Ý NGHĨA CÁC FILE
  11: ================================================================================
  12: 
  13: Dự án: BRK Academy (Học viện BRK - Nền tảng đào tạo trực tuyến)
  14: Framework: Next.js 16.1.6 + NextAuth v5 + Prisma + PostgreSQL + Tailwind CSS v4
  15: 
  16: Cấu trúc thư mục:
  17: ------------------
  18: HocVien-BRK/
  19: ├── app/                          # Next.js App Router
  20: │   ├── page.tsx                  # Trang chủ - Hiển thị danh sách khóa học + MessageCard
  21: │   ├── layout.tsx                # Root layout - Font Be Vietnam Pro, Inter
  22: │   ├── globals.css               # Tailwind CSS v4 + Custom animations (text-glow-3d)
  23: │   ├── login/page.tsx            # Trang đăng nhập (credentials + Google)
  24: │   ├── register/page.tsx         # Trang đăng ký tài khoản
  25: │   ├── account-settings/page.tsx # Trang cài đặt tài khoản
  26: │   ├── courses/[id]/learn/page.tsx # Trang học video + nộp bài
  27: │   ├── courses/[id]/learn/error.tsx # Error page cho trang học
  28: │   ├── admin/                    # Trang admin
  29: │   │   ├── layout.tsx            # Admin layout
  30: │   │   └── reserved-ids/         # Quản lý ID đặt trước
  31: │   │       ├── page.tsx          # Danh sách reserved IDs
  32: │   │       ├── add-form.tsx      # Form thêm ID mới
  33: │   │       └── change-id-form.tsx # Form đổi ID user
  34: │   ├── api/
  35: │   │   ├── auth/[...nextauth]/route.ts # NextAuth API route
  36: │   │   └── docs/route.ts         # API docs
  37: │   └── actions/                  # Server Actions
  38: │       ├── auth-actions.ts       # Đăng ký user mới
  39: │       ├── course-actions.ts     # Đăng ký khóa, lưu tiến độ, nộp bài, reset lộ trình
  40: │       ├── comment-actions.ts    # Bình luận bài học
  41: │       ├── account-actions.ts    # Quản lý tài khoản
  42: │       ├── admin-actions.ts      # Chức năng admin
  43: │       ├── message-actions.ts    # Tin nhắn chào mừng
  44: │       └── auth-actions.ts       # Authentication actions
  45: │
  46: ├── components/                   # React Components
  47: │   ├── layout/
  48: │   │   └── Header.tsx           # Header với menu, user dropdown
  49: │   ├── course/
  50: │   │   ├── CourseCard.tsx       # Card hiển thị khóa học
  51: │   │   ├── CoursePlayer.tsx     # Trình phát video + sidebar + nộp bài
  52: │   │   ├── LessonSidebar.tsx    # Danh sách bài học (Desktop)
  53: │   │   ├── VideoPlayer.tsx      # YouTube player với tracking
  54: │   │   ├── AssignmentForm.tsx   # Form nộp bài tập (5 section: Video, Reflection, Links, Support, Timing)
  55: │   │   ├── ChatSection.tsx      # Bình luận bài học
  56: │   │   ├── PaymentModal.tsx     # Modal thanh toán QR
  57: │   │   ├── StartDateModal.tsx   # Modal chọn ngày bắt đầu
  58: │   │   └── ImageViewer.tsx       # Xem ảnh PDF/Docs
  59: │   ├── home/
  60: │   │   └── MessageCard.tsx      # Card hiển thị tin nhắn chào mừng
  61: │   └── ui/                      # UI Components (shadcn-ui style)
  62: │       ├── button.tsx
  63: │       ├── input.tsx
  64: │       ├── dialog.tsx
  65: │       ├── checkbox.tsx
  66: │       ├── label.tsx
  67: │       └── textarea.tsx
  68: │
  69: ├── lib/                         # Thư viện tiện ích
  70: │   ├── prisma.ts                # Prisma client singleton
  71: │   ├── utils.ts                # Hàm cn() cho Tailwind
  72: │   ├── constants.ts             # Hằng số (reserved IDs)
  73: │   ├── id-helper.ts             # Tính toán ID user (tránh số đẹp)
  74: │   ├── normalizeGoogleDocsHtml.ts # Parse HTML từ Google Docs
  75: │   └── utils/id-generator.ts    # Generator ID
  76: │
  77: ├── prisma/
  78: │   ├── schema.prisma             # Database schema
  79: │   ├── seed.ts                  # Seed data script
  80: │   ├── cleanup-duplicates.js     # Cleanup duplicate data
  81: │   └── migrations/               # Database migrations
  82: │
  83: ├── scripts/                     # Scripts tiện ích
  84: │   ├── import-csv.ts            # Import user từ CSV
  85: │   ├── import-students.ts       # Import học viên
  86: │   ├── seed-courses.ts          # Seed khóa học
  87: │   ├── seed-lessons.ts          # Seed bài học
  88: │   ├── seed-enrollments.ts      # Seed đăng ký
  89: │   ├── make-admin.ts            # Script tạo admin
  90: │   ├── import-v3-data.ts        # Import data v3
  91: │   ├── change-id.ts             # Đổi ID user
  92: │   ├── add-reserved-id.ts       # Thêm ID đặt trước
  93: │   ├── import-reserved-list.ts  # Import danh sách ID đặt trước
  94: │   ├── process-legacy-users.ts  # Xử lý users cũ
  95: │   ├── check-missing-ids.ts    # Kiểm tra ID thiếu
  96: │   ├── fill-missing-ids.ts      # Điền ID thiếu
  97: │   ├── check-duplicates.ts      # Kiểm tra trùng lặp
  98: │   ├── debug-data.ts            # Debug database
  99: │   ├── backup.ps1               # Script backup
 100: │   ├── push.ps1                 # Script push lên GitHub
 101: │   └── auto-commit-push.ps1     # Auto commit & push
 102: │
 103: ├── public/                       # Static assets
 104: │   ├── logobrk-50px.png         # Logo
 105: │   ├── *.svg                    # Icons
 106: │
 107: ├── types/
 108: │   └── next-auth.d.ts           # TypeScript definitions for NextAuth
 109: │
 110: ├── auth.ts                      # NextAuth configuration (Google + Credentials)
 111: ├── auth.config.ts               # NextAuth config chi tiết
 112: ├── middleware.ts                # Next.js middleware
 113: ├── package.json                 # Dependencies & scripts
 114: ├── next.config.ts              # Next.js config
 115: ├── tsconfig.json               # TypeScript config
 116: ├── postcss.config.mjs          # PostCSS config
 117: ├── eslint.config.mjs           # ESLint config
 118: ├── docker-compose.yml          # Docker compose for PostgreSQL
 119: ├── .env                        # Environment variables
 120: ├── .env.local                  # Local environment variables
 121: ├── .gitignore                  # Git ignore
 122: ├── README.md                   # Project README
 123: ├── DESIGN_SYSTEM.md            # Design system documentation
 124: 
 125: ================================================================================
 126: PACKAGE.JSON
 127: ================================================================================
 128: 
 129: {
 130:   "name": "brk-academy",
 131:   "version": "0.1.0",
 132:   "private": true,
 133:   "scripts": {
 134:     "dev": "next dev",
 135:     "postinstall": "prisma generate",
 136:     "build": "prisma generate && next build",
 137:     "start": "next start",
 138:     "lint": "eslint",
 139:     "import-csv": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/import-csv.ts",
 140:     "process-legacy": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/process-legacy-users.ts",
 141:     "check-missing": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/check-missing-ids.ts",
 142:     "fill-missing": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/fill-missing-ids.ts",
 143:     "change-id": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/change-id.ts",
 144:     "add-reserved": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/add-reserved-id.ts",
 145:     "import-reserved": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/import-reserved-list.ts",
 146:     "make-admin": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/make-admin.ts",
 147:     "seed-courses": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/seed-courses.ts",
 148:     "seed-enrollments": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/seed-enrollments.ts",
 149:     "import-v3": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/import-v3-data.ts",
 150:     "push": "powershell -ExecutionPolicy Bypass -File ./scripts/push.ps1"
 151:   },
 152:   "dependencies": {
 153:     "@auth/prisma-adapter": "^2.11.1",
 154:     "@hookform/resolvers": "^5.2.2",
 155:     "@prisma/client": "5.22.0",
 156:     "@supabase/supabase-js": "^2.95.3",
 157:     "@types/bcryptjs": "^2.4.6",
 158:     "bcryptjs": "^3.0.3",
 159:     "clsx": "^2.1.1",
 160:     "csv-parser": "^3.2.0",
 161:     "csv-writer": "^1.6.0",
 162:     "date-fns": "^4.1.0",
 163:     "dompurify": "^3.3.1",
 164:     "dotenv": "^17.3.1",
 165:     "fs": "^0.0.1-security",
 166:     "lucide-react": "^0.570.0",
 167:     "next": "16.1.6",
 168:     "next-auth": "^5.0.0-beta.30",
 169:     "prisma": "5.22.0",
 170:     "react": "19.2.3",
 171:     "react-day-picker": "^9.14.0",
 172:     "react-dom": "19.2.3",
 173:     "react-hook-form": "^7.71.1",
 174:     "tailwind-merge": "^3.4.1",
 175:     "zod": "^4.3.6"
 176:   },
 177:   "devDependencies": {
 178:     "@tailwindcss/postcss": "^4",
 179:     "@types/node": "^20",
 180:     "@types/react": "^19",
 181:     "@types/react-dom": "^19",
 182:     "eslint": "^9",
 183:     "eslint-config-next": "16.1.6",
 184:     "tailwindcss": "^4",
 185:     "ts-node": "^10.9.2",
 186:     "typescript": "^5"
 187:   },
 188:   "prisma": {
 189:     "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
 190:   }
 191: }
 192: 
 193: ================================================================================
 194: DATABASE SCHEMA ĐẦY ĐỦ (Prisma Schema)
 195: ================================================================================
 196: 
 197: generator client {
 198:   provider = "prisma-client-js"
 199: }
 200: 
 201: datasource db {
 202:   provider  = "postgresql"
 203:   url       = env("DATABASE_URL")
 204:   directUrl = env("DIRECT_URL")
 205: }
 206: 
 207: ================================================================================
 208: 1. USER - Bảng người dùng
 209: ================================================================================
 210: | Trường | Kiểu | Mô tả |
 211: |--------|------|-------|
 212: | id | Int (PK, auto) | ID người dùng |
 213: | name | String? | Tên người dùng |
 214: | email | String (unique) | Email đăng nhập |
 215: | emailVerified | DateTime? | Thời điểm xác thực email |
 216: | image | String? | Ảnh đại diện |
 217: | password | String? | Mật khẩu (đã hash) |
 218: | phone | String? (unique) | Số điện thoại |
 219: | role | Role (enum) | Vai trò: ADMIN, STUDENT, INSTRUCTOR, AFFILIATE |
 220: | referrerId | Int? | ID người giới thiệu |
 221: | createdAt | DateTime | Thời điểm tạo |
 222: | updatedAt | DateTime | Thời điểm cập nhật |
 223: 
 224: model User {
 225:   id            Int          @id @default(autoincrement())
 226:   name          String?
 227:   email         String       @unique
 228:   emailVerified DateTime?
 229:   image         String?
 230:   password      String?
 231:   phone         String?      @unique
 232:   role          Role         @default(STUDENT)
 233:   referrerId    Int?
 234:   createdAt     DateTime     @default(now())
 235:   updatedAt     DateTime     @updatedAt
 236:   accounts      Account[]
 237:   enrollments   Enrollment[]
 238:   sessions      Session[]
 239:   comments      LessonComment[]
 240:   referrer      User?        @relation("ReferrerToReferee", fields: [referrerId], references: [id])
 241:   referrals     User[]       @relation("ReferrerToReferee")
 242: 
 243:   @@index([email])
 244:   @@index([phone])
 245:   @@index([referrerId])
 246: }
 247: 
 248: ================================================================================
 249: 2. ACCOUNT - Bảng tài khoản OAuth
 250: ================================================================================
 251: | Trường | Kiểu | Mô tả |
 252: |--------|------|-------|
 253: | userId | Int (FK) | Liên kết User |
 254: | type | String | Loại tài khoản |
 255: | provider | String | Provider (google, etc.) |
 256: | providerAccountId | String | ID tài khoản provider |
 257: | refresh_token | String? | Token làm mới |
 258: | access_token | String? | Token truy cập |
 259: | expires_at | Int? | Thời hạn token |
 260: | token_type | String? | Loại token |
 261: | scope | String? | Phạm vi quyền |
 262: | id_token | String? | ID token |
 263: | session_state | String? | Trạng thái session |
 264: | createdAt | DateTime | Thời điểm tạo |
 265: | updatedAt | DateTime | Thời điểm cập nhật |
 266: 
 267: model Account {
 268:   userId            Int
 269:   type              String
 270:   provider          String
 271:   providerAccountId String
 272:   refresh_token     String?
 273:   access_token      String?
 274:   expires_at        Int?
 275:   token_type        String?
 276:   scope             String?
 277:   id_token          String?
 278:   session_state     String?
 279:   createdAt         DateTime @default(now())
 280:   updatedAt         DateTime @updatedAt
 281:   user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
 282: 
 283:   @@id([provider, providerAccountId])
 284: }
 285: 
 286: ================================================================================
 287: 3. SESSION - Bảng phiên đăng nhập
 288: ================================================================================
 289: | Trường | Kiểu | Mô tả |
 290: |--------|------|-------|
 291: | sessionToken | String (PK) | Token phiên |
 292: | userId | Int (FK) | Liên kết User |
 293: | expires | DateTime | Thời hạn phiên |
 294: | createdAt | DateTime | Thời điểm tạo |
 295: | updatedAt | DateTime | Thời điểm cập nhật |
 296: 
 297: model Session {
 298:   sessionToken String   @unique
 299:   userId       Int
 300:   expires      DateTime
 301:   createdAt    DateTime @default(now())
 302:   updatedAt    DateTime @updatedAt
 303:   user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
 304: }
 305: 
 306: ================================================================================
 307: 4. VERIFICATIONTOKEN - Bảng xác thực email
 308: ================================================================================
 309: | Trường | Kiểu | Mô tả |
 310: |--------|------|-------|
 311: | identifier | String (PK) | Định danh |
 312: | token | String (PK) | Token xác thực |
 313: | expires | DateTime | Thời hạn token |
 314: 
 315: model VerificationToken {
 316:   identifier String
 317:   token      String
 318:   expires    DateTime
 319: 
 320:   @@id([identifier, token])
 321: }
 322: 
 323: ================================================================================
 324: 5. SYSTEMCONFIG - Bảng cấu hình hệ thống
 325: ================================================================================
 326: | Trường | Kiểu | Mô tả |
 327: |--------|------|-------|
 328: | key | String (PK) | Khóa cấu hình |
 329: | value | Json | Giá trị cấu hình |
 330: 
 331: model SystemConfig {
 332:   key   String @id
 333:   value Json
 334: }
 335: 
 336: ================================================================================
 337: 6. RESERVEDID - Bảng ID đã đặt trước
 338: ================================================================================
 339: | Trường | Kiểu | Mô tả |
 340: |--------|------|-------|
 341: | id | Int (PK) | ID đã đặt trước |
 342: | note | String? | Ghi chú |
 343: | createdAt | DateTime | Thời điểm tạo |
 344: 
 345: model ReservedId {
 346:   id        Int      @id
 347:   note      String?
 348:   createdAt DateTime @default(now())
 349: }
 350: 
 351: ================================================================================
 352: 7. COURSE - Bảng khóa học
 353: ================================================================================
 354: | Trường | Kiểu | Mô tả |
 355: |--------|------|-------|
 356: | id | Int (PK, auto) | ID khóa học |
 357: | id_khoa | String (unique) | Mã khóa học |
 358: | name_lop | String | Tên lớp |
 359: | name_khoa | String? | Tên khóa |
 360: | date_join | String? | Ngày tham gia |
 361: | status | Boolean | Trạng thái hiển thị |
 362: | pin | Int | Thứ tự ghim (số nhỏ hiển thị trước) |
 363: | mo_ta_ngan | String? | Mô tả ngắn |
 364: | mo_ta_dai | String? | Mô tả chi tiết |
 365: | link_anh_bia | String? | Link ảnh bìa |
 366: | link_zalo | String? | Link Zalo |
 367: | phi_coc | Int | Phí cọc |
 368: | stk | String? | Số tài khoản |
 369: | name_stk | String? | Tên tài khoản |
 370: | bank_stk | String? | Ngân hàng |
 371: | noidung_stk | String? | Nội dung chuyển khoản |
 372: | link_qrcode | String? | Link QR code |
 373: | file_email | String? | File email mẫu |
 374: | noidung_email | String? | Nội dung email |
 375: | type | CourseType (enum) | Loại: NORMAL, CHALLENGE |
 376: | createdAt | DateTime | Thời điểm tạo |
 377: | updatedAt | DateTime | Thời điểm cập nhật |
 378: 
 379: model Course {
 380:   id            Int          @id @default(autoincrement())
 381:   id_khoa       String       @unique
 382:   name_lop      String
 383:   name_khoa     String?
 384:   date_join     String?
 385:   status        Boolean      @default(true)
 386:   pin           Int          @default(0)
 387:   mo_ta_ngan    String?
 388:   mo_ta_dai     String?
 389:   link_anh_bia  String?      @map("link_anh_bia_khoa")
 390:   link_zalo     String?
 391:   phi_coc       Int          @default(0)
 392:   stk           String?
 393:   name_stk      String?
 394:   bank_stk      String?
 395:   noidung_stk   String?
 396:   link_qrcode   String?
 397:   file_email    String?
 398:   noidung_email String?
 399:   createdAt     DateTime     @default(now())
 400:   updatedAt     DateTime     @updatedAt
 401:   type          CourseType   @default(NORMAL)
 402:   lessons       Lesson[]
 403:   enrollments   Enrollment[]
 404: }
 405: 
 406: ================================================================================
 407: 8. LESSON - Bảng bài học
 408: ================================================================================
 409: | Trường | Kiểu | Mô tả |
 410: |--------|------|-------|
 411: | id | String (PK, cuid) | ID bài học |
 412: | courseId | Int (FK) | Liên kết Course |
 413: | title | String | Tiêu đề bài học |
 414: | videoUrl | String? | Link video YouTube |
 415: | content | String? | Nội dung bài học (Google Docs HTML) |
 416: | order | Int | Thứ tự bài học |
 417: | isDailyChallenge | Boolean | Là bài Challenge hàng ngày |
 418: 
 419: model Lesson {
 420:   id               String           @id @default(cuid())
 421:   courseId         Int
 422:   title            String
 423:   videoUrl         String?
 424:   content          String?
 425:   order            Int
 426:   isDailyChallenge Boolean          @default(false)
 427:   course           Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)
 428:   progress         LessonProgress[]
 429:   comments         LessonComment[]
 430: 
 431:   @@unique([courseId, order])
 432: }
 433: 
 434: ================================================================================
 435: 9. ENROLLMENT - Bảng đăng ký khóa học
 436: ================================================================================
 437: | Trường | Kiểu | Mô tả |
 438: |--------|------|-------|
 439: | id | Int (PK, auto) | ID đăng ký |
 440: | userId | Int (FK) | Liên kết User |
 441: | courseId | Int (FK) | Liên kết Course |
 442: | status | EnrollmentStatus | Trạng thái: PENDING, ACTIVE |
 443: | link_anh_coc | String? | Ảnh minh chứng đặt cọc |
 444: | phi_coc | Int | Phí cọc đã nộp |
 445: | startedAt | DateTime? | Thời điểm bắt đầu học |
 446: | resetAt | DateTime? | Thời điểm reset lộ trình |
 447: | lastLessonId | String? | Bài học cuối đang học |
 448: | challengeDays | Int? | Số ngày Challenge |
 449: | createdAt | DateTime | Thời điểm tạo |
 450: | updatedAt | DateTime | Thời điểm cập nhật |
 451: 
 452: model Enrollment {
 453:   id           Int              @id @default(autoincrement())
 454:   userId       Int
 455:   courseId     Int
 456:   status       EnrollmentStatus @default(PENDING)
 457:   createdAt    DateTime         @default(now())
 458:   updatedAt    DateTime         @updatedAt
 459:   link_anh_coc String?
 460:   phi_coc      Int              @default(0)
 461:   startedAt    DateTime?
 462:   resetAt      DateTime?
 463:   lastLessonId String?
 464:   challengeDays Int?
 465:   course       Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)
 466:   user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
 467:   lessonProgress LessonProgress[]
 468: 
 469:   @@unique([userId, courseId])
 470:   @@index([userId])
 471:   @@index([courseId])
 472: }
 473: 
 474: ================================================================================
 475: 10. LESSONPROGRESS - Bảng tiến độ học
 476: ================================================================================
 477: | Trường | Kiểu | Mô tả |
 478: |--------|------|-------|
 479: | id | Int (PK, auto) | ID tiến độ |
 480: | enrollmentId | Int (FK) | Liên kết Enrollment |
 481: | lessonId | String (FK) | Liên kết Lesson |
 482: | scores | Json? | Điểm số: {vid, ref, prac, support, timing} |
 483: | totalScore | Int | Tổng điểm |
 484: | assignment | Json? | Bài tập: {reflection, links, supports} |
 485: | status | String | Trạng thái: IN_PROGRESS, COMPLETED, RESET |
 486: | maxTime | Float | Thời gian tối đa |
 487: | duration | Float | Thời gian học |
 488: | submittedAt | DateTime? | Thời điểm nộp bài |
 489: | createdAt | DateTime | Thời điểm tạo |
 490: | updatedAt | DateTime | Thời điểm cập nhật |
 491: 
 492: model LessonProgress {
 493:   id           Int        @id @default(autoincrement())
 494:   enrollmentId Int
 495:   lessonId     String
 496:   scores       Json?
 497:   totalScore   Int        @default(0)
 498:   assignment   Json?
 499:   status       String     @default("IN_PROGRESS")
 500:   maxTime      Float      @default(0)
 501:   duration     Float      @default(0)
 502:   submittedAt  DateTime?
 503:   createdAt    DateTime   @default(now())
 504:   updatedAt    DateTime   @updatedAt
 505:   enrollment   Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
 506:   lesson       Lesson     @relation(fields: [lessonId], references: [id], onDelete: Cascade)
 507: 
 508:   @@unique([enrollmentId, lessonId])
 509:   @@index([enrollmentId])
 510:   @@index([lessonId])
 511:   @@index([status])
 512: }
 513: 
 514: ================================================================================
 515: 11. LESSONCOMMENT - Bảng bình luận bài học
 516: ================================================================================
 517: | Trường | Kiểu | Mô tả |
 518: |--------|------|-------|
 519: | id | Int (PK, auto) | ID bình luận |
 520: | lessonId | String (FK) | Liên kết Lesson |
 521: | userId | Int (FK) | Liên kết User |
 522: | content | String | Nội dung bình luận |
 523: | createdAt | DateTime | Thời điểm tạo |
 524: 
 525: model LessonComment {
 526:   id        Int      @id @default(autoincrement())
 527:   lessonId  String
 528:   userId    Int
 529:   content   String
 530:   createdAt DateTime @default(now())
 531:   user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
 532:   lesson    Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
 533: 
 534:   @@index([lessonId])
 535:   @@index([userId])
 536: }
 537: 
 538: ================================================================================
 539: 12. MESSAGE - Bảng tin nhắn trang chủ
 540: ================================================================================
 541: | Trường | Kiểu | Mô tả |
 542: |--------|------|-------|
 543: | id | Int (PK, auto) | ID tin nhắn |
 544: | content | String | Nội dung chính |
 545: | detail | String | Chi tiết |
 546: | imageUrl | String? | Link ảnh |
 547: | isActive | Boolean | Hiển thị hay không |
 548: | createdAt | DateTime | Thời điểm tạo |
 549: 
 550: model Message {
 551:   id        Int      @id @default(autoincrement())
 552:   content   String
 553:   detail    String
 554:   imageUrl  String?
 555:   isActive  Boolean  @default(true)
 556:   createdAt DateTime @default(now())
 557: }
 558: 
 559: ================================================================================
 560: ENUMS (Các kiểu liệt kê)
 561: ================================================================================
 562: 
 563: enum EnrollmentStatus {
 564:   PENDING    # Chờ xác nhận
 565:   ACTIVE     # Đang học
 566: }
 567: 
 568: enum Role {
 569:   ADMIN      # Quản trị viên
 570:   STUDENT    # Học viên
 571:   INSTRUCTOR # Giảng viên
 572:   AFFILIATE  # Cộng tác viên
 573: }
 574: 
 575: enum CourseType {
 576:   NORMAL     # Khóa học thường
 577:   CHALLENGE  # Khóa học thử thách
 578: }
 579: 
 580: ================================================================================
 581: RELATIONSHIPS (Quan hệ giữa các bảng)
 582: ================================================================================
 583: 
 584: - User 1-n Account         (Một user có nhiều tài khoản OAuth)
 585: - User 1-n Session        (Một user có nhiều phiên đăng nhập)
 586: - User 1-n Enrollment     (Một user có thể đăng nhiều khóa)
 587: - User n-1 User (referrer) (User có thể được giới thiệu bởi user khác)
 588: - User 1-n LessonComment  (Một user có thể viết nhiều bình luận)
 589: - Course 1-n Lesson       (Một khóa học có nhiều bài học)
 590: - Course 1-n Enrollment  (Một khóa học có nhiều học viên)
 591: - Lesson 1-n LessonProgress (Một bài học có nhiều tiến độ của từng học viên)
 592: - Lesson 1-n LessonComment (Một bài học có nhiều bình luận)
 593: - Enrollment 1-n LessonProgress (Một đăng ký có nhiều tiến độ bài học)
 594: 
 595: ================================================================================
 596: QUY TẮC QUAN TRỌNG
 597: ================================================================================
 598: 
 599: ### 1. Authentication (Xác thực)
 600: - Sử dụng NextAuth v5 với Credentials + Google provider
 601: - Login bằng: ID, Email, hoặc Số điện thoại + Mật khẩu
 602: - JWT session strategy
 603: - Role-based access: ADMIN, STUDENT, INSTRUCTOR, AFFILIATE
 604: 
 605: ### 2. User ID (QUAN TRỌNG)
 606: - KHÔNG dùng ID ngẫu nhiên tự tăng
 607: - Sử dụng `lib/id-helper.ts` để tạo ID tránh "số đẹp"
 608: - "Số đẹp" = các chữ số trùng nhau (1111, 2222, 3333...)
 609: - Khi tạo user mới phải dùng `getNextAvailableId()`
 610: 
 611: ### 3. Server Actions
 612: - Tất cả form submissions sử dụng Server Actions
 613: - Validate với Zod schema
 614: - Redirect sau khi thành công
 615: 
 616: ### 4. Database Queries
 617: - Sử dụng Prisma với singleton pattern (`lib/prisma.ts`)
 618: - Dùng `Promise.all()` cho các query độc lập
 619: - Index các trường thường query: email, phone, userId, courseId, lessonId, status
 620: 
 621: ### 5. UI Components
 622: - Sử dụng TailwindCSS v4 với CSS variables
 623: - Font: Be Vietnam Pro + Inter
 624: - UI components trong `components/ui/` theo pattern shadcn
 625: 
 626: ### 6. Scripts
 627: Chạy scripts với npm:
 628: ```bash
 629: npm run import-csv          # Import CSV data
 630: npm run process-legacy      # Xử lý users cũ
 631: npm run seed-courses        # Seed courses
 632: npm run seed-lessons        # Seed lessons
 633: npm run make-admin <id>     # Tạo user thành admin
 634: npm run add-reserved <id>  # Thêm ID reserved
 635: npm run change-id           # Đổi ID user
 636: npm run push               # Push code lên GitHub
 637: ```
 638: 
 639: ================================================================================
 640: ENV VARIABLES (Biến môi trường)
 641: ================================================================================
 642: 
 643: Các biến môi trường cần thiết:
 644: - DATABASE_URL      # PostgreSQL connection string
 645: - DIRECT_URL        # PostgreSQL direct connection (for Prisma)
 646: - AUTH_SECRET       # NextAuth secret key
 647: - GOOGLE_CLIENT_ID  # Google OAuth Client ID
 648: - GOOGLE_CLIENT_SECRET # Google OAuth Client Secret
 649: - NEXT_PUBLIC_APP_URL  # Application URL (e.g., http://localhost:3000)
 650: 
 651: ================================================================================
 652: CHẠY DỰ ÁN
 653: ================================================================================
 654: 
 655: # Cài đặt dependencies
 656: npm install
 657: 
 658: # Generate Prisma client
 659: npx prisma generate
 660: 
 661: # Chạy dev server
 662: npm run dev
 663: 
 664: # Build production
 665: npm run build
 666: 
 667: # Push database schema
 668: npx prisma db push
 669: 
 670: # Run database migration
 671: npx prisma migrate dev
 672: 
 673: ================================================================================
 674: GHI CHÚ KHÁC
 675: ================================================================================
 676: 
 677: - Trang chủ hiển thị danh sách khóa học (đã đăng ký và chưa đăng ký)
 678: - Khóa học có thể được "ghim" lên đầu bằng trường `pin` (số nhỏ hiển thị trước)
 679: - Hỗ trợ khóa học Challenge với daily lessons
 680: - Theo dõi tiến độ học qua LessonProgress với 5 tiêu chí chấm điểm:
 681:   1. Mở TRÍ = Xem Video (max 2đ)
 682:   2. Bồi NHÂN = Bài học Tâm đắc (max 2đ)
 683:   3. Hành LỄ = Link thực hành (max 3đ)
 684:   4. Trọng NGHĨA = Hỗ trợ đồng đội (max 2đ)
 685:   5. Giữ TÍN = Làm đúng hạn (max 1đ)
 686: - Comments cho từng bài học
 687: - Reset lộ trình học khi cần
 688: - Xem nội dung Google Docs trong video player
 689: 
 690: ================================================================================
 691: 
 692: 
 693: ================================================================================
 694: FILE: app/layout.tsx - Root Layout
 695: ================================================================================
 696: 
 697: import type { Metadata } from "next";
 698: import { Be_Vietnam_Pro, Inter } from "next/font/google";
 699: import "./globals.css";
 700: 
 701: const beVietnamPro = Be_Vietnam_Pro({
 702:   weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
 703:   subsets: ["vietnamese", "latin"],
 704:   variable: "--font-be-vietnam-pro",
 705: });
 706: 
 707: const inter = Inter({
 708:   subsets: ["vietnamese", "latin"],
 709:   variable: "--font-inter",
 710: });
 711: 
 712: export const metadata: Metadata = {
 713:   title: "Học Viện BRK - Nâng Tầm Năng Lực",
 714:   description: "Học viện đào tạo thực chiến về AI, Nhân hiệu và Affiliate",
 715: };
 716: 
 717: export default function RootLayout({
 718:   children,
 719: }: Readonly<{
 720:   children: React.ReactNode;
 721: }>) {
 722:   return (
 723:     <html lang="vi" suppressHydrationWarning>
 724:       <body
 725:         className={`${beVietnamPro.variable} ${inter.variable} antialiased`}
 726:         suppressHydrationWarning
 727:       >
 728:         {children}
 729:       </body>
 730:     </html>
 731:   );
 732: }
 733: 
 734: 
 735: ================================================================================
 736: FILE: app/globals.css - Global Styles
 737: ================================================================================
 738: 
 739: @import "tailwindcss";
 740: 
 741: :root {
 742:   --background: #ffffff;
 743:   --foreground: #171717;
 744: }
 745: 
 746: @keyframes glow {
 747:   0%, 100% {
 748:     text-shadow: 0 0 10px #facc15, 0 0 20px #facc15, 2px 2px 0px #854d0e;
 749:   }
 750:   50% {
 751:     text-shadow: 0 0 20px #fde047, 0 0 35px #fde047, 2px 2px 0px #854d0e;
 752:   }
 753: }
 754: 
 755: .text-glow-3d {
 756:   animation: glow 3s ease-in-out infinite;
 757:   color: #facc15;
 758:   letter-spacing: 0.1em;
 759: }
 760: 
 761: @media (prefers-color-scheme: dark) {
 762:   :root {
 763:     --background: #0a0a0a;
 764:     --foreground: #ededed;
 765:   }
 766: }
 767: 
 768: body {
 769:   background: var(--background);
 770:   color: var(--foreground);
 771:   font-family: var(--font-be-vietnam-pro), ui-sans-serif, system-ui, sans-serif;
 772: }
 773: 
 774: /* GOOGLE DOCS CONTENT FIX */
 775: .prose img {
 776:   width: 100% !important;
 777:   max-width: 100% !important;
 778:   height: auto !important;
 779:   display: block;
 780:   margin: 1em auto;
 781:   cursor: zoom-in;
 782:   transition: transform 0.2s ease;
 783:   user-select: none;
 784: }
 785: 
 786: .prose img:hover {
 787:   transform: scale(1.02);
 788: }
 789: 
 790: .prose table {
 791:   width: 100% !important;
 792:   display: block;
 793:   overflow-x: auto;
 794: }
 795: 
 796: .prose div {
 797:   max-width: 100% !important;
 798: }
 799: 
 800: .prose p {
 801:   margin-top: 0.6em !important;
 802:   margin-bottom: 0.6em !important;
 803: }
 804: 
 805: .prose h1, .prose h2, .prose h3 {
 806:   margin-top: 1.4em !important;
 807:   margin-bottom: 0.7em !important;
 808: }
 809: 
 810: 
 811: ================================================================================
 812: FILE: app/page.tsx - Trang chủ
 813: ================================================================================
 814: 
 815: import { auth } from "@/auth";
 816: import Header from "@/components/layout/Header";
 817: import CourseCard from "@/components/course/CourseCard";
 818: import MessageCard from "@/components/home/MessageCard";
 819: import prisma from "@/lib/prisma";
 820: import { getRandomMessage } from "./actions/message-actions";
 821: 
 822: export default async function Home() {
 823:   const session = await auth();
 824: 
 825:   const [courses, userRecord, message] = await Promise.all([
 826:     (prisma as any).course.findMany({
 827:       where: { status: true },
 828:       orderBy: [{ pin: 'asc' }, { id: 'asc' }]
 829:     }),
 830:     session?.user?.id
 831:       ? (prisma as any).user.findUnique({
 832:         where: { id: parseInt(session.user.id) },
 833:         select: { name: true, id: true, image: true }
 834:       })
 835:       : Promise.resolve(null),
 836:     getRandomMessage()
 837:   ]);
 838: 
 839:   const userName = userRecord?.name ?? null;
 840:   const userId = userRecord?.id ?? null;
 841:   const userImage = userRecord?.image ?? session?.user?.image ?? null;
 842: 
 843:   let myCourseIds: Set<number> = new Set();
 844:   let enrollmentsMap: Record<number, any> = {};
 845:   if (session?.user?.id) {
 846:     const enrollments = await (prisma as any).enrollment.findMany({
 847:       where: { userId: parseInt(session.user.id), status: 'ACTIVE' },
 848:       select: {
 849:         courseId: true, status: true, startedAt: true,
 850:         course: { select: { _count: { select: { lessons: true } } } },
 851:         _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } }
 852:       }
 853:     });
 854:     enrollments.forEach((e: any) => {
 855:       myCourseIds.add(e.courseId);
 856:       enrollmentsMap[e.courseId] = {
 857:         status: e.status, startedAt: e.startedAt,
 858:         completedCount: e._count?.lessonProgress || 0,
 859:         totalLessons: e.course?._count?.lessons || 0
 860:       };
 861:     });
 862:   }
 863: 
 864:   const myCourses = courses.filter((c: any) => myCourseIds.has(c.id));
 865:   const otherCourses = courses.filter((c: any) => !myCourseIds.has(c.id));
 866: 
 867:   return (
 868:     <main className="min-h-screen bg-gray-50">
 869:       <Header session={session} userImage={userImage} />
 870:       <div className="pt-16">
 871:         <MessageCard message={message} session={session} userName={userName || ''} userId={userId ? String(userId) : ''} />
 872:       </div>
 873:       <section id="khoa-hoc" className="container mx-auto px-4 pb-24">
 874:         {session?.user ? (
 875:           <>
 876:             {myCourses.length > 0 && (
 877:               <div className="mb-12 -mx-4 px-4 py-8 bg-zinc-950 rounded-b-3xl">
 878:                 <div className="mb-8 text-center">
 879:                   <h2 className="text-2xl font-bold text-white">Khóa học của tôi</h2>
 880:                   <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-emerald-500"></div>
 881:                 </div>
 882:                 <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
 883:                   {myCourses.map((course: any, index: number) => (
 884:                     <CourseCard key={course.id} course={course} isLoggedIn={!!session} enrollment={enrollmentsMap[course.id] || null} priority={index < 3} darkMode={true} />
 885:                   ))}
 886:                 </div>
 887:               </div>
 888:             )}
 889:             {otherCourses.length > 0 && (
 890:               <div>
 891:                 <div className="mb-8 text-center">
 892:                   <h2 className="text-2xl font-bold text-gray-900">Tất cả khóa học</h2>
 893:                   <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-blue-600"></div>
 894:                 </div>
 895:                 <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
 896:                   {otherCourses.map((course: any, index: number) => (
 897:                     <CourseCard key={course.id} course={course} isLoggedIn={!!session} enrollment={enrollmentsMap[course.id] || null} priority={index < 3} />
 898:                   ))}
 899:                 </div>
 900:               </div>
 901:             )}
 902:           </>
 903:         ) : (
 904:           <>
 905:             <div className="mb-12 text-center">
 906:               <h2 className="text-3xl font-bold text-gray-900">Danh Sách Khóa Học</h2>
 907:               <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-blue-600"></div>
 908:             </div>
 909:             <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
 910:               {courses.map((course: any, index: number) => (
 911:                 <CourseCard key={course.id} course={course} isLoggedIn={false} enrollment={null} priority={index < 6} />
 912:               ))}
 913:             </div>
 914:           </>
 915:         )}
 916:       </section>
 917:       <footer className="bg-gray-100 py-12 text-center text-gray-500 text-sm">
 918:         <p>© 2026 Học viện BRK. All rights reserved.</p>
 919:       </footer>
 920:     </main>
 921:   );
 922: }
 923: 
 924: 
 925: ================================================================================
 926: FILE: app/login/page.tsx - Trang đăng nhập
 927: ================================================================================
 928: 
 929: 'use client'
 930: 
 931: import { signIn } from "next-auth/react"
 932: import { useForm } from "react-hook-form"
 933: import { useState } from "react"
 934: import Link from "next/link"
 935: import { useRouter } from "next/navigation"
 936: import { Loader2, Eye, EyeOff } from "lucide-react"
 937: 
 938: export default function LoginPage() {
 939:     const [isLoading, setIsLoading] = useState(false)
 940:     const [error, setError] = useState<string | null>(null)
 941:     const [showPassword, setShowPassword] = useState(false)
 942:     const router = useRouter()
 943: 
 944:     const { register, handleSubmit, formState: { errors } } = useForm({
 945:         defaultValues: { identifier: "", password: "" }
 946:     })
 947: 
 948:     async function onSubmit(data: any) {
 949:         setIsLoading(true)
 950:         setError(null)
 951:         try {
 952:             const result = await signIn("credentials", {
 953:                 identifier: data.identifier,
 954:                 password: data.password,
 955:                 redirect: false,
 956:             })
 957:             if (result?.error) {
 958:                 setError("Invalid credentials. Please try again.")
 959:             } else {
 960:                 router.push("/")
 961:                 router.refresh()
 962:             }
 963:         } catch (err) {
 964:             setError("An unexpected error occurred.")
 965:         } finally {
 966:             setIsLoading(false)
 967:         }
 968:     }
 969: 
 970:     const handleGoogleSignIn = () => {
 971:         setIsLoading(true)
 972:         signIn("google", { callbackUrl: "/" })
 973:     }
 974: 
 975:     return (
 976:         <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4">
 977:             <div className="w-full max-w-sm">
 978:                 <div className="text-center mb-8">
 979:                     <h1 className="text-2xl font-black text-white tracking-tight">HỌC VIỆN BRK</h1>
 980:                     <p className="text-zinc-400 text-sm mt-1">Đăng nhập để tiếp tục hành trình</p>
 981:                 </div>
 982:                 <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
 983:                     <button onClick={handleGoogleSignIn} disabled={isLoading} className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-600 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50">
 984:                         <svg className="h-4 w-4 shrink-0" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" /></svg>
 985:                         Đăng nhập bằng Google
 986:                     </button>
 987:                     <div className="relative">
 988:                         <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700" /></div>
 989:                         <div className="relative flex justify-center text-xs"><span className="bg-transparent px-2 text-zinc-500">hoặc dùng tài khoản</span></div>
 990:                     </div>
 991:                     <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 992:                         {error && <div className="rounded-lg bg-red-900/30 border border-red-700/50 p-3 text-sm text-red-400">{error}</div>}
 993:                         <div>
 994:                             <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email / SĐT / Mã học viên</label>
 995:                             <input {...register("identifier", { required: "Vui lòng nhập thông tin" })} type="text" autoComplete="username" className="w-full rounded-xl border border-zinc-700 bg-white/5 px-4 py-3 text-white text-sm placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="Nhập email hoặc mã học viên" />
 996:                             {errors.identifier && <p className="mt-1 text-xs text-red-400">{errors.identifier.message}</p>}
 997:                         </div>
 998:                         <div>
 999:                             <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mật khẩu</label>
1000:                             <div className="relative">
1001:                                 <input {...register("password", { required: "Vui lòng nhập mật khẩu" })} type={showPassword ? "text" : "password"} autoComplete="current-password" className="w-full rounded-xl border border-zinc-700 bg-white/5 px-4 py-3 pr-10 text-white text-sm placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="••••••••" />
1002:                                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white">
1003:                                     {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
1004:                                 </button>
1005:                             </div>
1006:                             {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
1007:                         </div>
1008:                         <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
1009:                             {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Đăng nhập'}
1010:                         </button>
1011:                     </form>
1012:                     <p className="text-center text-sm text-zinc-500">Chưa có tài khoản? <Link href="/register" className="font-semibold text-orange-400 hover:text-orange-300">Đăng ký ngay</Link></p>
1013:                 </div>
1014:             </div>
1015:         </div>
1016:     )
1017: }
1018: 
1019: 
1020: ================================================================================
1021: FILE: app/register/page.tsx - Trang đăng ký
1022: ================================================================================
1023: 
1024: 'use client'
1025: 
1026: import { useForm } from "react-hook-form"
1027: import { useState } from "react"
1028: import Link from "next/link"
1029: import { Loader2, Eye, EyeOff } from "lucide-react"
1030: import { registerUser } from "../actions/auth-actions"
1031: 
1032: export default function RegisterPage() {
1033:     const [isLoading, setIsLoading] = useState(false)
1034:     const [error, setError] = useState<string | null>(null)
1035:     const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)
1036:     const [showPassword, setShowPassword] = useState(false)
1037: 
1038:     const { register, handleSubmit, formState: { errors } } = useForm({
1039:         defaultValues: { name: "", email: "", phone: "", password: "" }
1040:     })
1041: 
1042:     async function onSubmit(data: any) {
1043:         setIsLoading(true)
1044:         setError(null)
1045:         setFieldErrors(null)
1046:         try {
1047:             const formData = new FormData()
1048:             formData.append("name", data.name)
1049:             formData.append("email", data.email)
1050:             formData.append("phone", data.phone)
1051:             formData.append("password", data.password)
1052:             const result = await registerUser(null, formData)
1053:             if (result?.message || result?.errors) {
1054:                 if (result.errors) setFieldErrors(result.errors)
1055:                 if (result.message) setError(result.message)
1056:             }
1057:         } catch (err: any) { } finally {
1058:             setIsLoading(false)
1059:         }
1060:     }
1061: 
1062:     return (
1063:         <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
1064:             <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
1065:                 <div className="text-center">
1066:                     <h2 className="text-3xl font-bold tracking-tight text-gray-900">Create an account</h2>
1067:                     <p className="mt-2 text-sm text-gray-600">Join BRK Academy today</p>
1068:                 </div>
1069:                 <div className="space-y-4">
1070:                     <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
1071:                         {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-500">{error}</div>}
1072:                         <div>
1073:                             <label className="block text-sm font-medium text-gray-700">Full Name</label>
1074:                             <input {...register("name", { required: "Name is required" })} type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500" />
1075:                             {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
1076:                             {fieldErrors?.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>}
1077:                         </div>
1078:                         <div>
1079:                             <label className="block text-sm font-medium text-gray-700">Email</label>
1080:                             <input {...register("email", { required: "Email is required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email" } })} type="email" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500" />
1081:                             {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
1082:                             {fieldErrors?.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email[0]}</p>}
1083:                         </div>
1084:                         <div>
1085:                             <label className="block text-sm font-medium text-gray-700">Phone Number</label>
1086:                             <input {...register("phone", { required: "Phone is required" })} type="tel" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500" />
1087:                             {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
1088:                             {fieldErrors?.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone[0]}</p>}
1089:                         </div>
1090:                         <div>
1091:                             <label className="block text-sm font-medium text-gray-700">Password</label>
1092:                             <div className="relative">
1093:                                 <input {...register("password", { required: "Password is required", minLength: { value: 6, message: "Min 6 characters" } })} type={showPassword ? "text" : "password"} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500" />
1094:                                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
1095:                                     {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
1096:                                 </button>
1097:                             </div>
1098:                             {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
1099:                             {fieldErrors?.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password[0]}</p>}
1100:                         </div>
1101:                         <button type="submit" disabled={isLoading} className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
1102:                             {isLoading ? <Loader2 className="animate-spin" /> : "Sign up"}
1103:                         </button>
1104:                     </form>
1105:                     <p className="text-center text-sm text-gray-600">Already have an account? <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">Sign in</Link></p>
1106:                 </div>
1107:             </div>
1108:         </div>
1109:     )
1110: }
1111: 
1112: 
1113: ================================================================================
1114: FILE: app/courses/[id]/learn/page.tsx - Trang học khóa học
1115: ================================================================================
1116: 
1117: import { auth } from "@/auth"
1118: import prisma from "@/lib/prisma"
1119: import { redirect } from "next/navigation"
1120: import CoursePlayer from "@/components/course/CoursePlayer"
1121: 
1122: export const dynamic = "force-dynamic";
1123: 
1124: export default async function CourseLearnPage({ params }: { params: Promise<{ id: string }> }) {
1125:   const { id } = await params
1126:   const session = await auth()
1127:   if (!session?.user?.id) redirect("/login")
1128: 
1129:   const userId = Number(session.user.id)
1130: 
1131:   const course = await prisma.course.findUnique({
1132:     where: { id_khoa: id },
1133:     select: { id: true },
1134:   })
1135: 
1136:   if (!course) redirect(`/courses/${id}`)
1137: 
1138:   const enrollment = await prisma.enrollment.findUnique({
1139:     where: { userId_courseId: { userId, courseId: course.id } },
1140:     select: {
1141:       id: true, status: true, startedAt: true, resetAt: true, lastLessonId: true,
1142:       course: {
1143:         select: {
1144:           id: true, id_khoa: true, name_lop: true,
1145:           lessons: {
1146:             select: { id: true, title: true, order: true, videoUrl: true, isDailyChallenge: true },
1147:             orderBy: { order: "asc" },
1148:           },
1149:         },
1150:       },
1151:       lessonProgress: {
1152:         where: { status: { not: "RESET" } },
1153:         select: { lessonId: true, status: true, totalScore: true, maxTime: true, duration: true, submittedAt: true, assignment: true, scores: true },
1154:       },
1155:     },
1156:   })
1157: 
1158:   if (!enrollment || enrollment.status !== "ACTIVE") redirect(`/courses/${id}`)
1159: 
1160:   return (
1161:     <div className="h-screen h-dvh bg-black overflow-hidden flex flex-col">
1162:       <CoursePlayer course={enrollment.course} enrollment={enrollment} session={session} />
1163:     </div>
1164:   )
1165: }
1166: 
1167: 
1168: ================================================================================
1169: FILE: app/courses/[id]/learn/error.tsx - Error page
1170: ================================================================================
1171: 
1172: 'use client'
1173: 
1174: import { useEffect } from 'react'
1175:  
1176: export default function Error({
1177:   error,
1178:   reset,
1179: }: {
1180:   error: Error & { digest?: string }
1181:   reset: () => void
1182: }) {
1183:   useEffect(() => {
1184:     console.error(error)
1185:   }, [error])
1186:  
1187:   return (
1188:     <div className="flex min-h-screen items-center justify-center bg-black">
1189:       <div className="text-center">
1190:         <h2 className="text-2xl font-bold text-white mb-4">Đã xảy ra lỗi!</h2>
1191:         <p className="text-zinc-400 mb-6">Không thể tải khóa học. Vui lòng thử lại.</p>
1192:         <button
1193:           onClick={() => reset()}
1194:           className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold"
1195:         >
1196:           Thử lại
1197:         </button>
1198:       </div>
1199:     </div>
1200:   )
1201: }
1202: 
1203: 
1204: ================================================================================
1205: FILE: app/account-settings/page.tsx - Cài đặt tài khoản
1206: ================================================================================
1207: 
1208: 'use client'
1209: 
1210: import { useState, useEffect } from 'react'
1211: import { getUserWithAccounts, updateUserProfile, changePassword } from '@/app/actions/account-actions'
1212: import { Camera, User, Phone, Mail, Key, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
1213: import Link from 'next/link'
1214: 
1215: export default function AccountSettingsPage() {
1216:     const [loading, setLoading] = useState(true)
1217:     const [saving, setSaving] = useState(false)
1218:     const [user, setUser] = useState<any>(null)
1219:     const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
1220:     const [name, setName] = useState('')
1221:     const [phone, setPhone] = useState('')
1222:     const [avatarUrl, setAvatarUrl] = useState('')
1223:     const [showPasswordForm, setShowPasswordForm] = useState(false)
1224:     const [currentPassword, setCurrentPassword] = useState('')
1225:     const [newPassword, setNewPassword] = useState('')
1226:     const [confirmPassword, setConfirmPassword] = useState('')
1227: 
1228:     useEffect(() => {
1229:         async function fetchUser() {
1230:             setLoading(true)
1231:             const userData = await getUserWithAccounts()
1232:             if (userData) {
1233:                 setUser(userData)
1234:                 setName(userData.name || '')
1235:                 setPhone(userData.phone || '')
1236:                 setAvatarUrl(userData.image || '')
1237:             }
1238:             setLoading(false)
1239:         }
1240:         fetchUser()
1241:     }, [])
1242: 
1243:     async function handleUpdateProfile(e: React.FormEvent) {
1244:         e.preventDefault()
1245:         setSaving(true)
1246:         setMessage(null)
1247:         const result = await updateUserProfile({ name, phone, image: avatarUrl })
1248:         setMessage({ type: result.success ? 'success' : 'error', text: result.message })
1249:         setSaving(false)
1250:     }
1251: 
1252:     async function handleChangePassword(e: React.FormEvent) {
1253:         e.preventDefault()
1254:         if (newPassword !== confirmPassword) {
1255:             setMessage({ type: 'error', text: 'Mật khẩu mới không khớp' })
1256:             return
1257:         }
1258:         setSaving(true)
1259:         setMessage(null)
1260:         const result = await changePassword(currentPassword, newPassword)
1261:         setMessage({ type: result.success ? 'success' : 'error', text: result.message })
1262:         if (result.success) {
1263:             setCurrentPassword('')
1264:             setNewPassword('')
1265:             setConfirmPassword('')
1266:             setShowPasswordForm(false)
1267:         }
1268:         setSaving(false)
1269:     }
1270: 
1271:     const hasPassword = user?.accounts?.some((a: any) => a.provider === 'credentials')
1272: 
1273:     if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-yellow-400" /></div>
1274:     if (!user) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><p className="text-white">Vui lòng đăng nhập</p></div>
1275: 
1276:     return (
1277:         <div className="min-h-screen bg-zinc-950 py-12 px-4">
1278:             <div className="max-w-2xl mx-auto">
1279:                 <div className="flex items-center gap-4 mb-8">
1280:                     <Link href="/" className="shrink-0 p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>
1281:                     <h1 className="text-2xl font-bold text-white">Cài đặt tài khoản</h1>
1282:                 </div>
1283:                 {message && <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-900/30 border border-emerald-700 text-emerald-400' : 'bg-red-900/30 border border-red-700 text-red-400'}`}>{message.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}{message.text}</div>}
1284:                 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
1285:                     <h2 className="text-lg font-semibold text-white mb-4">Thông tin tài khoản</h2>
1286:                     <form onSubmit={handleUpdateProfile} className="space-y-4">
1287:                         <div><label className="block text-sm text-zinc-400 mb-2"><User className="inline h-4 w-4 mr-2" />Họ và tên</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white" /></div>
1288:                         <div><label className="block text-sm text-zinc-400 mb-2"><Mail className="inline h-4 w-4 mr-2" />Email</label><input type="email" value={user.email || ''} disabled className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-500 cursor-not-allowed" /></div>
1289:                         <div><label className="block text-sm text-zinc-400 mb-2"><Phone className="inline h-4 w-4 mr-2" />Số điện thoại</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white" /></div>
1290:                         <button type="submit" disabled={saving} className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
1291:                     </form>
1292:                 </div>
1293:                 {hasPassword && (
1294:                     <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
1295:                         <h2 className="text-lg font-semibold text-white mb-4">Đổi mật khẩu</h2>
1296:                         {!showPasswordForm ? (
1297:                             <button onClick={() => setShowPasswordForm(true)} className="flex items-center gap-2 text-yellow-400"><Key className="h-4 w-4" />Đổi mật khẩu</button>
1298:                         ) : (
1299:                             <form onSubmit={handleChangePassword} className="space-y-4">
1300:                                 <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Mật khẩu hiện tại" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white" required />
1301:                                 <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mật khẩu mới" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white" required />
1302:                                 <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Xác nhận mật khẩu mới" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white" required />
1303:                                 <div className="flex gap-3">
1304:                                     <button type="button" onClick={() => setShowPasswordForm(false)} className="flex-1 bg-zinc-700 text-white py-3 rounded-xl">Hủy</button>
1305:                                     <button type="submit" disabled={saving} className="flex-1 bg-yellow-400 text-black font-bold py-3 rounded-xl">{saving ? 'Đang lưu...' : 'Xác nhận'}</button>
1306:                                 </div>
1307:                             </form>
1308:                         )}
1309:                     </div>
1310:                 )}
1311:             </div>
1312:         </div>
1313:     )
1314: }
1315: 
1316: 
1317: ================================================================================
1318: FILE: app/admin/layout.tsx - Admin Layout
1319: ================================================================================
1320: 
1321: import Link from "next/link"
1322: 
1323: export default function AdminLayout({ children }: { children: React.ReactNode }) {
1324:     return (
1325:         <div className="min-h-screen bg-gray-50">
1326:             <nav className="bg-white border-b px-6 py-4">
1327:                 <div className="container mx-auto flex items-center gap-6">
1328:                     <h1 className="text-xl font-bold text-gray-800">BRK Admin</h1>
1329:                     <Link href="/admin/reserved-ids" className="text-sm font-medium text-gray-600 hover:text-gray-900">Quản lý ID</Link>
1330:                 </div>
1331:             </nav>
1332:             <main className="container mx-auto py-8 px-6">{children}</main>
1333:         </div>
1334:     )
1335: }
1336: 
1337: 
1338: ================================================================================
1339: FILE: app/admin/reserved-ids/page.tsx - Admin Reserved IDs Page
1340: ================================================================================
1341: 
1342: import { deleteReservedIdAction, getReservedIds } from "@/app/actions/admin-actions"
1343: import { AddReservedIdForm } from "./add-form"
1344: import { ChangeUserIdForm } from "./change-id-form"
1345: 
1346: export default async function ReservedIdsPage() {
1347:     const reservedIds = await getReservedIds()
1348: 
1349:     return (
1350:         <div className="space-y-8">
1351:             <div>
1352:                 <h2 className="text-2xl font-bold mb-4 text-gray-800">💎 Cấp số đẹp cho Học viên</h2>
1353:                 <ChangeUserIdForm />
1354:             </div>
1355:             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
1356:                 <div>
1357:                     <h3 className="text-xl font-bold mb-4 text-gray-800">Danh sách ID Đã giữ ({reservedIds.length})</h3>
1358:                     <div className="bg-white border rounded-lg overflow-hidden shadow-sm max-h-[500px] overflow-y-auto">
1359:                         <table className="min-w-full divide-y divide-gray-200">
1360:                             <thead className="bg-gray-50">
1361:                                 <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Ghi chú</th><th className="px-6 py-3 text-right">Action</th></tr>
1362:                             </thead>
1363:                             <tbody className="bg-white divide-y divide-gray-200">
1364:                                 {reservedIds.map((item) => (
1365:                                     <tr key={item.id} className="hover:bg-gray-50">
1366:                                         <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">{item.id}</td>
1367:                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.note}</td>
1368:                                         <td className="px-6 py-4 whitespace-nowrap text-right">
1369:                                             <form action={async () => { 'use server'; await deleteReservedIdAction(item.id) }}>
1370:                                                 <button className="text-red-600 hover:text-red-900 border px-2 py-1 rounded">Xóa</button>
1371:                                             </form>
1372:                                         </td>
1373:                                     </tr>
1374:                                 ))}
1375:                                 {reservedIds.length === 0 && <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">Chưa có ID nào</td></tr>}
1376:                             </tbody>
1377:                         </table>
1378:                     </div>
1379:                 </div>
1380:                 <div><h3 className="text-xl font-bold mb-4 text-gray-800">Giữ thêm số mới</h3><AddReservedIdForm /></div>
1381:             </div>
1382:         </div>
1383:     )
1384: }
1385: 
1386: 
1387: ================================================================================
1388: FILE: app/admin/reserved-ids/add-form.tsx - Add Reserved ID Form
1389: ================================================================================
1390: 
1391: 'use client'
1392: 
1393: import { useActionState } from "react"
1394: import { addReservedIdAction } from "@/app/actions/admin-actions"
1395: 
1396: const initialState = { message: '' }
1397: 
1398: export function AddReservedIdForm() {
1399:     const [state, formAction, isPending] = useActionState(addReservedIdAction, initialState)
1400: 
1401:     return (
1402:         <div className="bg-gray-50 border p-6 rounded-lg shadow-sm">
1403:             <form action={formAction} className="flex flex-col gap-4">
1404:                 <div><label className="block text-sm font-medium text-gray-700 mb-1">ID cần giữ</label><input name="id" type="number" required placeholder="VD: 6868" className="border p-2 rounded w-full" /></div>
1405:                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label><input name="note" type="text" placeholder="VD: VIP..." className="border p-2 rounded w-full" /></div>
1406:                 <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">➕ Thêm vào danh sách</button>
1407:             </form>
1408:             {state?.message && <div className={`mt-4 p-3 rounded text-sm ${state.message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{state.message}</div>}
1409:         </div>
1410:     )
1411: }
1412: 
1413: 
1414: ================================================================================
1415: FILE: app/admin/reserved-ids/change-id-form.tsx - Change User ID Form
1416: ================================================================================
1417: 
1418: 'use client'
1419: 
1420: import { useActionState } from "react"
1421: import { changeUserIdAction } from "@/app/actions/admin-actions"
1422: 
1423: const initialState = { message: '' }
1424: 
1425: export function ChangeUserIdForm() {
1426:     const [state, formAction, isPending] = useActionState(changeUserIdAction, initialState)
1427: 
1428:     return (
1429:         <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow-sm">
1430:             <p className="text-sm text-blue-700 mb-4">Chức năng này cho phép đổi ID của học viên hiện tại sang một ID mới (thường là số đẹp).</p>
1431:             <form action={formAction} className="flex gap-4 items-end flex-wrap">
1432:                 <div><label className="block text-sm font-medium text-gray-700 mb-1">ID Hiện tại (Cũ)</label><input name="currentId" type="number" required placeholder="VD: 123" className="border p-2 rounded w-40" /></div>
1433:                 <div><label className="block text-sm font-medium text-gray-700 mb-1">ID Mới (Số đẹp)</label><input name="newId" type="number" required placeholder="VD: 8888" className="border p-2 rounded w-40 font-bold text-blue-600" /></div>
1434:                 <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium">🚀 Thực hiện Đổi ID</button>
1435:             </form>
1436:             {state?.message && <div className={`mt-4 p-3 rounded text-sm ${state.message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{state.message}</div>}
1437:         </div>
1438:     )
1439: }
1440: 
1441: 
1442: ================================================================================
1443: HẾT PHẦN CODE
1444: ================================================================================
1445: 
1446: 
1447: ================================================================================
1448: COMPONENTS - COMPONENT FILES
1449: ================================================================================
1450: 
1451: 
1452: ================================================================================
1453: FILE: components/layout/Header.tsx - Header Component
1454: ================================================================================
1455: 
1456: 'use client'
1457: 
1458: import React, { useState, useRef, useEffect } from 'react'
1459: import Link from 'next/link'
1460: import Image from 'next/image'
1461: import { signOut } from 'next-auth/react'
1462: import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
1463: 
1464: export default function Header({ session, userImage }: { session: any, userImage?: string | null }) {
1465:     const [isMenuOpen, setIsMenuOpen] = useState(false)
1466:     const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
1467:     const userMenuRef = useRef<HTMLDivElement>(null)
1468: 
1469:     useEffect(() => {
1470:         function handleClickOutside(event: MouseEvent) {
1471:             if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
1472:                 setIsUserMenuOpen(false)
1473:             }
1474:         }
1475:         document.addEventListener('mousedown', handleClickOutside)
1476:         return () => document.removeEventListener('mousedown', handleClickOutside)
1477:     }, [])
1478: 
1479:     const userInitials = session?.user?.name
1480:         ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
1481:         : '?'
1482: 
1483:     return (
1484:         <header className="fixed top-0 z-50 w-full bg-black text-white shadow-xl border-b border-white/5">
1485:             <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
1486:                 <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
1487:                     <Image src="/logobrk-50px.png" alt="Học Viện BRK Logo" width={150} height={50} priority className="object-contain" style={{ height: '48px', width: 'auto' }} />
1488:                 </Link>
1489:                 <nav className="hidden flex-1 items-center justify-center gap-12 text-[13px] font-black md:flex">
1490:                     <Link href="/" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">TRANG CHỦ</Link>
1491:                     <Link href="#khoa-hoc" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">KHÓA HỌC</Link>
1492:                     <Link href="#" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">GIỚI THIỆU</Link>
1493:                 </nav>
1494:                 <div className="flex items-center gap-2 sm:gap-6">
1495:                     {session ? (
1496:                         <div className="relative" ref={userMenuRef}>
1497:                             <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-1.5 transition-all hover:bg-zinc-700">
1498:                                 {userImage || session?.user?.image ? (
1499:                                     <img src={userImage || session?.user?.image} alt="Avatar" className="h-7 w-7 rounded-full object-cover border-2 border-yellow-400" />
1500:                                 ) : (
1501:                                     <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-xs font-black text-black">{userInitials}</div>
1502:                                 )}
1503:                                 <ChevronDown className={`h-3 w-3 text-zinc-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
1504:                             </button>
1505:                             {isUserMenuOpen && (
1506:                                 <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-zinc-700 bg-zinc-900 py-2 shadow-xl">
1507:                                     <div className="border-b border-zinc-800 px-4 py-2 mb-1">
1508:                                         <p className="text-xs font-bold text-white truncate">{session.user?.name}</p>
1509:                                         <p className="text-[10px] text-zinc-500 truncate">{session.user?.email}</p>
1510:                                     </div>
1511:                                     <Link href="/account-settings" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white">
1512:                                         <Settings className="h-4 w-4" />Cài đặt tài khoản
1513:                                     </Link>
1514:                                     <button onClick={() => signOut()} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800">
1515:                                         <LogOut className="h-4 w-4" />Đăng xuất
1516:                                     </button>
1517:                                 </div>
1518:                             )}
1519:                         </div>
1520:                     ) : (
1521:                         <Link href="/login" className="hidden sm:inline-block rounded-full bg-white px-6 py-2 text-xs font-black text-black shadow-md transition-all hover:bg-yellow-400 hover:scale-105">ĐĂNG NHẬP</Link>
1522:                     )}
1523:                     <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white transition-all hover:bg-white/10 md:hidden">
1524:                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-6 w-6">
1525:                             {isMenuOpen ? (<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />) : (<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />)}
1526:                         </svg>
1527:                     </button>
1528:                 </div>
1529:             </div>
1530:             {isMenuOpen && (
1531:                 <div className="animate-in slide-in-from-top-4 absolute left-0 top-16 w-full border-b border-white/5 bg-black px-4 py-8 shadow-2xl md:hidden">
1532:                     <nav className="flex flex-col gap-6 text-center text-sm font-black">
1533:                         <Link href="/" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400">TRANG CHỦ</Link>
1534:                         <Link href="#khoa-hoc" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400">KHÓA HỌC</Link>
1535:                         <Link href="#" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400">GIỚI THIỆU</Link>
1536:                         {!session ? (
1537:                             <Link href="/login" onClick={() => setIsMenuOpen(false)} className="mt-4 rounded-xl bg-white py-4 text-black shadow-lg">ĐĂNG NHẬP</Link>
1538:                         ) : (
1539:                             <button onClick={() => signOut()} className="mt-4 rounded-xl bg-red-600 py-4 text-white shadow-lg">ĐĂNG XUẤT</button>
1540:                         )}
1541:                     </nav>
1542:                 </div>
1543:             )}
1544:         </header>
1545:     )
1546: }
1547: 
1548: 
1549: ================================================================================
1550: FILE: components/course/CourseCard.tsx - Course Card Component
1551: ================================================================================
1552: 
1553: 'use client'
1554: 
1555: import React, { useState } from 'react'
1556: import Image from 'next/image'
1557: import PaymentModal from './PaymentModal'
1558: import { enrollInCourseAction } from '@/app/actions/course-actions'
1559: 
1560: interface CourseCardProps {
1561:     course: any
1562:     isLoggedIn: boolean
1563:     enrollment?: { status: string; startedAt: Date | null; completedCount: number; totalLessons: number } | null
1564:     priority?: boolean
1565:     darkMode?: boolean
1566: }
1567: 
1568: export default function CourseCard({ course, isLoggedIn, enrollment, priority = false, darkMode = false }: CourseCardProps) {
1569:     const [showPayment, setShowPayment] = useState(false)
1570:     const [loading, setLoading] = useState(false)
1571: 
1572:     const isActive = enrollment?.status === 'ACTIVE'
1573:     const isPending = enrollment?.status === 'PENDING'
1574: 
1575:     const handleAction = async (e: React.MouseEvent) => {
1576:         e.preventDefault()
1577:         e.stopPropagation()
1578:         if (!isLoggedIn) {
1579:             alert('Vui lòng Đăng nhập / Đăng ký tài khoản miễn phí để tiếp tục!')
1580:             window.location.href = '/login'
1581:             return
1582:         }
1583:         if (isActive) {
1584:             window.location.href = `/courses/${course.id_khoa}/learn`
1585:             return
1586:         }
1587:         if (course.phi_coc === 0) {
1588:             setLoading(true)
1589:             try {
1590:                 const res = await enrollInCourseAction(course.id)
1591:                 if (res.success) window.location.href = `/courses/${course.id_khoa}/learn`
1592:             } catch (err: any) { alert(err.message) } finally { setLoading(false) }
1593:         } else {
1594:             if (isPending) setShowPayment(true)
1595:             else {
1596:                 setLoading(true)
1597:                 try {
1598:                     const res = await enrollInCourseAction(course.id)
1599:                     if (res.success) setShowPayment(true)
1600:                 } catch (err: any) { alert(err.message) } finally { setLoading(false) }
1601:             }
1602:         }
1603:     }
1604: 
1605:     const progressPct = enrollment && enrollment.totalLessons > 0 ? Math.round((enrollment.completedCount / enrollment.totalLessons) * 100) : 0
1606: 
1607:     return (
1608:         <>
1609:             <div className={`group overflow-hidden rounded-2xl shadow-lg transition-all hover:shadow-2xl flex flex-col h-full ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-gray-100'}`}>
1610:                 <div className="relative aspect-[16/9] w-full overflow-hidden shrink-0 bg-zinc-800">
1611:                     <Image src={course.link_anh_bia || 'https://i.postimg.cc/PJPkm7vB/1.jpg'} alt={course.name_lop} fill priority={priority} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
1612:                 </div>
1613:                 <div className="p-5 flex flex-col flex-grow">
1614:                     <div className="mb-3 flex items-center gap-2.5">
1615:                         <span className="text-2xl leading-none drop-shadow-sm select-none shrink-0">📘</span>
1616:                         <h3 className={`text-base sm:text-lg font-black leading-tight truncate flex-1 ${darkMode ? 'text-white' : 'text-black'}`}>{course.name_lop}</h3>
1617:                     </div>
1618:                     <div className="mb-3 flex flex-wrap items-center gap-2">
1619:                         <span className={`inline-block rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-wider shadow-sm ${course.phi_coc === 0 ? 'bg-yellow-400 text-gray-900' : 'bg-red-600 text-white'}`}>
1620:                             {course.phi_coc === 0 ? 'Miễn phí' : 'Phí cam kết'}
1621:                         </span>
1622:                         {isActive && (
1623:                             <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm border border-sky-400">
1624:                                 <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />Đã kích hoạt
1625:                                 {enrollment?.startedAt && <span className="opacity-80 font-normal">· Từ {new Date(enrollment.startedAt).toLocaleDateString('vi-VN')}</span>}
1626:                             </span>
1627:                         )}
1628:                     </div>
1629:                     <div className={`mb-5 flex-grow text-[14px] font-medium leading-relaxed text-justify break-words ${darkMode ? 'text-gray-300' : 'text-gray-500'}`} dangerouslySetInnerHTML={{ __html: course.mo_ta_ngan || '' }} />
1630:                     <button onClick={handleAction} disabled={loading} className={`group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-1.5 text-sm sm:text-base font-black shadow-xl transition-all active:scale-[0.97] ${loading ? 'bg-gray-400 text-white cursor-not-allowed' : isActive ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-sky-500 text-white hover:bg-sky-600'}`}>
1631:                         {loading ? (<span className="flex items-center gap-2">Đang kết nối...</span>) : (
1632:                             <>
1633:                                 {isActive && enrollment && enrollment.totalLessons > 0 && <span className="absolute inset-0 transition-all duration-700" style={{ width: `${progressPct}%`, background: 'rgba(255,255,255,0.18)' }} />}
1634:                                 <span className="relative z-10 flex items-center gap-2">
1635:                                     <span>{isActive ? '📖' : '⚡'}</span>
1636:                                     <span>{isActive ? 'Vào học tiếp' : course.phi_coc === 0 ? 'Kích hoạt miễn phí' : 'Kích hoạt ngay'}{isActive && enrollment && enrollment.totalLessons > 0 && <span className="ml-1.5 font-normal opacity-90 text-[12px]">{enrollment.completedCount}/{enrollment.totalLessons} bài · {progressPct}%</span>}</span>
1637:                                     <span>{isActive ? '▶' : '🚀'}</span>
1638:                                 </span>
1639:                             </>
1640:                         )}
1641:                     </button>
1642:                     {isPending && !loading && <p className="mt-3 text-center text-xs font-bold text-orange-600 animate-pulse italic">Đang chờ thanh toán...</p>}
1643:                 </div>
1644:             </div>
1645:             {showPayment && <PaymentModal course={course} onClose={() => setShowPayment(false)} />}
1646:         </>
1647:     )
1648: }
1649: 
1650: 
1651: ================================================================================
1652: FILE: components/course/VideoPlayer.tsx - Video Player Component
1653: ================================================================================
1654: 
1655: 'use client'
1656: 
1657: import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
1658: import { cn } from "@/lib/utils"
1659: import { saveVideoProgressAction } from '@/app/actions/course-actions'
1660: 
1661: interface VideoPlayerProps {
1662:     enrollmentId: number
1663:     lessonId: string
1664:     videoUrl: string | null
1665:     lessonContent: string | null
1666:     initialMaxTime: number
1667:     onProgress: (maxTime: number, duration: number) => void
1668:     onPercentChange: (percent: number) => void
1669:     playlistData?: any
1670:     lastVideoIndex?: number
1671: }
1672: 
1673: type PlaylistItem = { type: 'video' | 'doc'; title: string; url: string; id?: string | null }
1674: 
1675: export default function VideoPlayer({ enrollmentId, lessonId, videoUrl, lessonContent, initialMaxTime, onProgress, onPercentChange, playlistData, lastVideoIndex = 0 }: VideoPlayerProps) {
1676:     const playlist = useMemo(() => {
1677:         if (!videoUrl) return []
1678:         return videoUrl.split('|').map((item, index) => {
1679:             const videoMatch = item.match(/^\[(.*?)\](.*)$/)
1680:             if (videoMatch) return { type: 'video' as const, title: videoMatch[1], url: videoMatch[2].trim(), id: extractVideoId(videoMatch[2].trim()) }
1681:             const docMatch = item.match(/^\((.*?)\)(.*)$/)
1682:             if (docMatch) return { type: 'doc' as const, title: docMatch[1], url: docMatch[2].trim() }
1683:             return { type: 'video' as const, title: `Phần ${index + 1}`, url: item.trim(), id: extractVideoId(item.trim()) }
1684:         })
1685:     }, [videoUrl])
1686: 
1687:     const [currentIndex, setCurrentVideoIndex] = useState(lastVideoIndex < playlist.length ? lastVideoIndex : 0)
1688:     const [showPlaylist, setShowPlaylist] = useState(false)
1689:     const [isMounted, setIsMounted] = useState(false)
1690:     const [isFullscreen, setIsFullscreen] = useState(false)
1691:     const [docTimer, setDocTimer] = useState<number>(0)
1692:     const [isReading, setIsReading] = useState(false)
1693:     const [granularProgress, setGranularProgress] = useState<Record<number, {maxTime: number, duration: number}>>(() => playlistData || {})
1694: 
1695:     const playerRef = useRef<any>(null)
1696:     const containerRef = useRef<HTMLDivElement>(null)
1697:     const saveIntervalRef = useRef<any>(null)
1698:     const docTimerRef = useRef<any>(null)
1699:     const currentItem = playlist[currentIndex]
1700: 
1701:     useEffect(() => { setIsMounted(true) }, [])
1702: 
1703:     useEffect(() => {
1704:         const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false) }
1705:         window.addEventListener('keydown', handleEsc)
1706:         return () => window.removeEventListener('keydown', handleEsc)
1707:     }, [])
1708: 
1709:     const toggleFullScreen = () => setIsFullscreen(!isFullscreen)
1710: 
1711:     const calculateAggregateProgress = useCallback((updatedGranular: any) => {
1712:         let totalMaxTime = 0, totalDuration = 0
1713:         playlist.forEach((item, idx) => {
1714:             const p = updatedGranular[idx] || { maxTime: 0, duration: item.type === 'doc' ? 30 : 0 }
1715:             totalMaxTime += p.maxTime
1716:             totalDuration += p.duration
1717:         })
1718:         if (totalDuration === 0) return { maxTime: initialMaxTime, duration: 0 }
1719:         return { maxTime: totalMaxTime, duration: totalDuration }
1720:     }, [playlist, initialMaxTime])
1721: 
1722:     const saveProgress = useCallback(async (index: number, maxTime: number, duration: number) => {
1723:         const nextGranular = { ...granularProgress, [index]: { maxTime, duration } }
1724:         setGranularProgress(nextGranular)
1725:         const aggregate = calculateAggregateProgress(nextGranular)
1726:         setTimeout(() => {
1727:             onProgress(aggregate.maxTime, aggregate.duration)
1728:             if (aggregate.duration > 0) onPercentChange(Math.min(100, Math.round((aggregate.maxTime / aggregate.duration) * 100)))
1729:             saveVideoProgressAction({ enrollmentId, lessonId, maxTime: aggregate.maxTime, duration: aggregate.duration, lastIndex: index, playlistScores: nextGranular }).catch(() => {})
1730:         }, 0)
1731:     }, [enrollmentId, lessonId, granularProgress, calculateAggregateProgress, onProgress, onPercentChange])
1732: 
1733:     const trackVideoProgress = useCallback(() => {
1734:         if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return
1735:         const currentTime = playerRef.current.getCurrentTime()
1736:         const duration = playerRef.current.getDuration()
1737:         const currentStored = granularProgress[currentIndex] || { maxTime: 0, duration: 0 }
1738:         if (currentTime > currentStored.maxTime) saveProgress(currentIndex, currentTime, duration)
1739:     }, [currentIndex, granularProgress, saveProgress])
1740: 
1741:     useEffect(() => {
1742:         if (currentItem?.type === 'doc') {
1743:             const currentStored = granularProgress[currentIndex] || { maxTime: 0, duration: 30 }
1744:             if (currentStored.maxTime < 30) {
1745:                 setDocTimer(currentStored.maxTime)
1746:                 setIsReading(true)
1747:                 docTimerRef.current = setInterval(() => {
1748:                     setDocTimer(prev => {
1749:                         const next = prev + 1
1750:                         if (next >= 30) {
1751:                             clearInterval(docTimerRef.current)
1752:                             setIsReading(false)
1753:                             saveProgress(currentIndex, 30, 30)
1754:                             return 30
1755:                         }
1756:                         if (next % 5 === 0) saveProgress(currentIndex, next, 30)
1757:                         return next
1758:                     })
1759:                 }, 1000)
1760:             } else { setDocTimer(30); setIsReading(false); }
1761:         }
1762:         return () => { if (docTimerRef.current) clearInterval(docTimerRef.current) }
1763:     }, [currentIndex, currentItem?.type])
1764: 
1765:     useEffect(() => {
1766:         if (!isMounted || currentItem?.type !== 'video' || !currentItem?.id) return
1767:         const initPlayer = () => {
1768:             if (playerRef.current) playerRef.current.destroy()
1769:             const stored = granularProgress[currentIndex] || { maxTime: 0, duration: 0 }
1770:             const startTime = Math.floor(stored.maxTime)
1771:             playerRef.current = new (window as any).YT.Player(`multimedia-player`, {
1772:                 videoId: currentItem.id,
1773:                 playerVars: { autoplay: 1, modestbranding: 1, rel: 0, start: startTime },
1774:                 events: {
1775:                     onStateChange: (e: any) => {
1776:                         const YT = (window as any).YT.PlayerState
1777:                         if (e.data === YT.PLAYING) {
1778:                             if (!saveIntervalRef.current) saveIntervalRef.current = setInterval(trackVideoProgress, 5000)
1779:                         } else {
1780:                             if (saveIntervalRef.current) { clearInterval(saveIntervalRef.current); saveIntervalRef.current = null; }
1781:                         }
1782:                         if (e.data === YT.ENDED) {
1783:                             const dur = playerRef.current.getDuration()
1784:                             saveProgress(currentIndex, dur, dur)
1785:                         }
1786:                     }
1787:                 }
1788:             })
1789:         }
1790:         if ((window as any).YT?.Player) initPlayer()
1791:         else {
1792:             const tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(tag)
1793:             ;(window as any).onYouTubeIframeAPIReady = initPlayer
1794:         }
1795:         return () => { if (saveIntervalRef.current) clearInterval(saveIntervalRef.current); if (playerRef.current?.destroy) playerRef.current.destroy() }
1796:     }, [currentIndex, isMounted, currentItem?.type, currentItem?.id])
1797: 
1798:     const handleNext = () => setCurrentVideoIndex((prev) => (prev + 1) % playlist.length)
1799:     const handlePrev = () => setCurrentVideoIndex((prev) => (prev - 1 + playlist.length) % playlist.length)
1800: 
1801:     const getEmbedUrl = (url: string) => {
1802:         if (!url.includes('docs.google.com')) return url
1803:         if (url.includes('/pub')) return url
1804:         const cleanUrl = url.split('/edit')[0].split('/view')[0].split('/preview')[0].replace(/\/+$/, '')
1805:         return `${cleanUrl}/preview`
1806:     }
1807: 
1808:     if (!isMounted) return <div className="w-full aspect-video bg-black animate-pulse" />
1809: 
1810:     return (
1811:         <div className={cn("flex flex-col bg-zinc-950 transition-all duration-300", isFullscreen ? "fixed inset-0 z-[9999] h-screen w-screen" : "w-full")}>
1812:             <div className={cn("relative bg-black overflow-hidden shadow-2xl transition-all", isFullscreen ? "flex-1" : "w-full aspect-video")}>
1813:                 {currentItem?.type === 'video' ? (
1814:                     <div id="multimedia-player" className="w-full h-full" />
1815:                 ) : (
1816:                     <div className="w-full h-full bg-white relative flex flex-col">
1817:                         <iframe src={getEmbedUrl(currentItem.url)} className="flex-1 border-0" allow="autoplay" title="Tài liệu" />
1818:                         {isReading && (<div className="absolute top-0 left-0 right-0 h-1 bg-zinc-200 z-10"><div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${(docTimer / 30) * 100}%` }} /></div>)}
1819:                     </div>
1820:                 )}
1821:                 {showPlaylist && (
1822:                     <div className="absolute inset-0 bg-black/95 z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
1823:                         <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
1824:                             <h3 className="text-white font-black text-base flex items-center gap-3">DANH SÁCH HỌC ({playlist.length})</h3>
1825:                             <button onClick={() => setShowPlaylist(false)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
1826:                         </div>
1827:                         <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[66vh]">
1828:                             {playlist.map((item, idx) => {
1829:                                 const isCurrent = idx === currentIndex
1830:                                 const prog = granularProgress[idx] || { maxTime: 0, duration: item.type === 'doc' ? 30 : 0 }
1831:                                 const pct = prog.duration > 0 ? Math.round((prog.maxTime / prog.duration) * 100) : 0
1832:                                 return (
1833:                                     <button key={idx} onClick={() => { setCurrentVideoIndex(idx); setShowPlaylist(false); }} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all border ${isCurrent ? 'bg-orange-500/10 border-orange-500' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800'}`}>
1834:                                         <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isCurrent ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{item.type === 'video' ? '▶' : '📄'}</div>
1835:                                         <div className="flex-1 text-left min-w-0">
1836:                                             <p className={`text-xs font-bold truncate ${isCurrent ? 'text-white' : 'text-zinc-400'}`}>{item.title}</p>
1837:                                             <div className="flex items-center gap-2 mt-1">
1838:                                                 <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden"><div className={`h-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} /></div>
1839:                                                 <span className="text-[9px] text-zinc-500 font-bold">{pct}%</span>
1840:                                             </div>
1841:                                         </div>
1842:                                     </button>
1843:                                 )
1844:                             })}
1845:                         </div>
1846:                     </div>
1847:                 )}
1848:             </div>
1849:             <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
1850:                 <button onClick={() => setShowPlaylist(!showPlaylist)} className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700">☰ <span className="text-[10px] font-black hidden sm:inline">LỘ TRÌNH ({currentIndex + 1}/{playlist.length})</span></button>
1851:                 <div className="flex-1 flex flex-col items-center min-w-0 px-1">
1852:                     <p className="text-[10px] sm:text-[11px] font-black text-orange-400 truncate">{currentItem?.title}</p>
1853:                 </div>
1854:                 <div className="flex items-center gap-1">
1855:                     <button onClick={handlePrev} className="p-1.5 bg-zinc-800 hover:bg-orange-500 text-zinc-400 rounded-lg">⏮</button>
1856:                     <button onClick={handleNext} className="p-1.5 bg-zinc-800 hover:bg-orange-500 text-zinc-400 rounded-lg">⏭</button>
1857:                     <button onClick={toggleFullScreen} className="p-1.5 bg-orange-500/10 hover:bg-orange-500 text-orange-500 rounded-lg ml-1">⛶</button>
1858:                 </div>
1859:             </div>
1860:         </div>
1861:     )
1862: }
1863: 
1864: function extractVideoId(url: string) {
1865:     const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?v=)|(shorts\/)|(\&v=))([^#\&\?]*).*/
1866:     const match = url.match(regExp)
1867:     return (match && match[9].length === 11) ? match[9] : null
1868: }
1869: 
1870: 
1871: ================================================================================
1872: FILE: components/course/LessonSidebar.tsx - Lesson Sidebar Component
1873: ================================================================================
1874: 
1875: 'use client'
1876: 
1877: import { useState } from 'react'
1878: import { cn } from "@/lib/utils"
1879: import { CheckCircle2, PlayCircle, Lock, CalendarDays, RefreshCw } from "lucide-react"
1880: 
1881: interface LessonSidebarProps {
1882:     lessons: any[]
1883:     currentLessonId: string
1884:     onLessonSelect: (lessonId: string) => void
1885:     progress: Record<string, any>
1886:     startedAt: Date | null
1887:     resetAt: Date | null
1888:     onResetStartDate: (date: Date) => Promise<void>
1889: }
1890: 
1891: function formatDateVN(date: Date | null) { if (!date) return ''; return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
1892: function toInputValue(date: Date | null): string { if (!date) return ''; return new Date(date).toISOString().slice(0, 10) }
1893: 
1894: export default function LessonSidebar({ lessons, currentLessonId, onLessonSelect, progress, startedAt, resetAt, onResetStartDate }: LessonSidebarProps) {
1895:     const [showDatePicker, setShowDatePicker] = useState(false)
1896:     const [dateInput, setDateInput] = useState(toInputValue(startedAt))
1897:     const [saving, setSaving] = useState(false)
1898: 
1899:     const filteredProgress = Object.entries(progress).reduce((acc, [lessonId, p]: [string, any]) => { if (p.status !== 'RESET') acc[lessonId] = p; return acc }, {} as Record<string, any>)
1900: 
1901:     const handleReset = async () => {
1902:         if (!dateInput) return
1903:         const confirmReset = window.confirm("⚠️ Cảnh báo: Dữ liệu học tập cũ sẽ không được tính vào lộ trình mới.\n\nNhấn OK để xác nhận đổi ngày bắt đầu mới.")
1904:         if (!confirmReset) return
1905:         setSaving(true)
1906:         try { await onResetStartDate(new Date(dateInput)); setShowDatePicker(false) } finally { setSaving(false) }
1907:     }
1908: 
1909:     return (
1910:         <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-80 shrink-0">
1911:             <div className="p-4 border-b border-zinc-800 space-y-2">
1912:                 <div className="flex items-center justify-between">
1913:                     <div className="flex items-center gap-2 text-zinc-300">
1914:                         <CalendarDays className="w-4 h-4 text-orange-400 shrink-0" />
1915:                         <div><p className="text-[10px] text-zinc-500 uppercase tracking-wide">Ngày bắt đầu lộ trình</p><p className="text-sm font-semibold text-white">{startedAt ? formatDateVN(startedAt) : '-- / -- / ----'}</p></div>
1916:                     </div>
1917:                     <button onClick={() => setShowDatePicker(!showDatePicker)} className="flex items-center gap-1 text-[11px] text-orange-400 border border-orange-500/40 rounded-lg px-2 py-1"><RefreshCw className="w-3 h-3" />Đặt lại</button>
1918:                 </div>
1919:                 {showDatePicker && (
1920:                     <div className="bg-zinc-800 rounded-lg p-3 space-y-2 border border-zinc-700">
1921:                         <p className="text-[10px] text-zinc-400">Chọn ngày mới:</p>
1922:                         <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} className="w-full bg-zinc-700 text-white text-sm rounded-lg px-3 py-2 border border-zinc-600" />
1923:                         <div className="flex gap-2">
1924:                             <button onClick={handleReset} disabled={!dateInput || saving} className="flex-1 text-xs font-bold bg-orange-500 text-white rounded-lg py-1.5 disabled:opacity-50">{saving ? 'Đang lưu...' : 'Xác nhận'}</button>
1925:                             <button onClick={() => setShowDatePicker(false)} className="flex-1 text-xs text-zinc-400 border border-zinc-600 rounded-lg py-1.5">Hủy</button>
1926:                         </div>
1927:                     </div>
1928:                 )}
1929:             </div>
1930:             <div className="px-4 py-2 border-b border-zinc-800"><h2 className="font-bold text-sm text-zinc-400 uppercase tracking-wide">Nội dung khóa học</h2></div>
1931:             <div className="flex-1 overflow-y-auto">
1932:                 {lessons.map((lesson) => {
1933:                     const prog = filteredProgress[lesson.id]
1934:                     const isCompleted = prog?.status === 'COMPLETED'
1935:                     const isActive = currentLessonId === lesson.id
1936:                     const unlocked = lesson.order === 1 || (filteredProgress[lessons.find(l=>l.order===lesson.order-1)?.id]?.status === 'COMPLETED')
1937:                     return (
1938:                         <button key={lesson.id} onClick={() => unlocked && onLessonSelect(lesson.id)} disabled={!unlocked} className={cn("w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-zinc-800/50", isActive && "bg-zinc-800 border-l-2 border-l-orange-500", unlocked && !isActive && "hover:bg-zinc-800/50", !unlocked && "opacity-40 cursor-not-allowed")}>
1939:                             <div className="shrink-0">
1940:                                 {isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : isActive ? <PlayCircle className="w-5 h-5 text-orange-400" /> : !unlocked ? <Lock className="w-4 h-4 text-zinc-600" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500">{lesson.order}</div>}
1941:                             </div>
1942:                             <div className="flex-1 min-w-0">
1943:                                 <p className={cn("text-sm font-medium line-clamp-2", isActive ? "text-white" : "text-zinc-400")}>{lesson.title}</p>
1944:                                 {prog?.totalScore !== undefined && <span className={cn("text-[10px] font-bold", prog.totalScore >= 5 ? "text-emerald-500" : "text-orange-400")}>{prog.totalScore >= 5 ? '✓' : '✗'} {prog.totalScore}/10đ</span>}
1945:                             </div>
1946:                         </button>
1947:                     )
1948:                 })}
1949:             </div>
1950:         </div>
1951:     )
1952: }
1953: 
1954: 
1955: ================================================================================
1956: FILE: components/course/AssignmentForm.tsx - Assignment Form Component
1957: ================================================================================
1958: 
1959: 'use client'
1960: 
1961: import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
1962: import { Loader2, Info, X, Send } from "lucide-react"
1963: import { saveAssignmentDraftAction } from '@/app/actions/course-actions'
1964: 
1965: interface AssignmentFormProps {
1966:     lessonId: string
1967:     lessonOrder: number
1968:     startedAt: Date | null
1969:     videoPercent: number
1970:     videoUrl: string | null
1971:     onSubmit: (data: any, isUpdate?: boolean) => Promise<{ success: boolean; totalScore: number } | void>
1972:     initialData?: any
1973:     onSaveDraft?: React.MutableRefObject<(() => Promise<void>) | undefined>
1974:     onDraftSaved?: (draftInfo: any) => void
1975:     onFormDataChange?: (data: { reflection: string; links: string[]; supports: boolean[] }) => void
1976: }
1977: 
1978: function formatDate(date: Date | null) { if (!date) return '--/--/----'; return new Date(date).toLocaleDateString('vi-VN') }
1979: function calcDeadline(startedAt: Date | null, order: number) { if (!startedAt) return null; const d = new Date(startedAt); d.setDate(d.getDate() + (order - 1)); return d }
1980: 
1981: function RulesModal({ onClose }: { onClose: () => void }) {
1982:     return (
1983:         <div className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/50" onClick={onClose}>
1984:             <div className="mt-16 mr-2 w-80 bg-white rounded-xl shadow-2xl border border-orange-200 text-sm text-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
1985:                 <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between"><span className="font-bold">📋 Quy tắc chấm điểm (Thang 10)</span><button onClick={onClose}><X className="w-4 h-4" /></button></div>
1986:                 <div className="p-4 space-y-3">
1987:                     <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2"><p className="text-orange-700 text-xs font-semibold">✅ Điểm ≥ 5/10: Hoàn thành bài học</p></div>
1988:                     <div><p className="font-bold text-orange-600">1. Học theo Video (Max 2đ)</p><p className="text-gray-600">Xem &gt;50% (+1đ), Xem hết (+2đ).</p></div>
1989:                     <div><p className="font-bold text-orange-600">2. Bài học Tâm đắc (Max 2đ)</p><p className="text-gray-600">Có chia sẻ (+1đ), Dài &gt;50 ký tự (+1đ).</p></div>
1990:                     <div><p className="font-bold text-orange-600">3. Thực hành nộp link (Max 3đ)</p><p className="text-gray-600">Mỗi link (+1đ).</p></div>
1991:                     <div><p className="font-bold text-orange-600">4. Hỗ trợ (Max 2đ)</p><p className="text-gray-600">Giúp 2 người (+1đ), Giúp người giúp người (+1đ).</p></div>
1992:                     <div><p className="font-bold text-orange-600">5. Giữ tín (1đ)</p><p className="text-gray-600">Nộp trước 23:59 (+1đ), Trễ (-1đ).</p></div>
1993:                 </div>
1994:             </div>
1995:         </div>
1996:     )
1997: }
1998: 
1999: function SectionHead({ num, label, max, current }: { num: number; label: string; max: number; current: number }) {
2000:     return (<div className="flex items-center justify-between mb-1.5"><span className="font-semibold text-gray-800 text-sm">{num}. {label}</span><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${current > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>{current}/{max}</span></div>)
2001: }
2002: 
2003: export default function AssignmentForm({ lessonId, lessonOrder, startedAt, videoPercent = 0, videoUrl = null, onSubmit, initialData, onSaveDraft, onDraftSaved, onFormDataChange }: AssignmentFormProps) {
2004:     const [loading, setLoading] = useState(false)
2005:     const [showRules, setShowRules] = useState(false)
2006:     const [reflection, setReflection] = useState<string>(initialData?.assignment?.reflection || "")
2007:     const [links, setLinks] = useState<string[]>(initialData?.assignment?.links?.length > 0 ? [...initialData.assignment.links, "", "", ""].slice(0, 3) : ["", "", ""])
2008:     const [supports, setSupports] = useState<boolean[]>(initialData?.assignment?.supports || [false, false])
2009:     const isDirtyRef = useRef(false)
2010:     const initialRenderRef = useRef(true)
2011: 
2012:     const deadline = calcDeadline(startedAt, lessonOrder)
2013:     const isCompleted = initialData?.status === 'COMPLETED'
2014:     const existingTotalScore = initialData?.totalScore ?? 0
2015:     const existingScores = initialData?.scores ?? {}
2016: 
2017:     const saveDraft = useCallback(async () => {
2018:         if (isCompleted) return
2019:         const hasData = reflection.trim() || links.some(l => l.trim()) || supports.some(s => s)
2020:         if (hasData) {
2021:             try { await saveAssignmentDraftAction({ enrollmentId: initialData?.enrollmentId, lessonId, reflection, links, supports }); if (onDraftSaved) onDraftSaved({ reflection, links, supports }); isDirtyRef.current = false } catch (error) { console.error('Failed to save draft:', error) }
2022:         }
2023:     }, [reflection, links, supports, lessonId, initialData?.enrollmentId, onDraftSaved, isCompleted])
2024: 
2025:     useEffect(() => {
2026:         if (initialRenderRef.current) { initialRenderRef.current = false; return }
2027:         isDirtyRef.current = true
2028:         if (onFormDataChange) onFormDataChange({ reflection, links, supports })
2029:     }, [reflection, links, supports, onFormDataChange])
2030: 
2031:     useEffect(() => {
2032:         if (onSaveDraft) { onSaveDraft.current = async () => { if (isDirtyRef.current) { await saveDraft(); isDirtyRef.current = false } } }
2033:     }, [onSaveDraft, saveDraft])
2034: 
2035:     useEffect(() => {
2036:         if (isCompleted) return
2037:         const handleBeforeUnload = () => { if (isDirtyRef.current) saveDraft() }
2038:         window.addEventListener('beforeunload', handleBeforeUnload)
2039:         window.addEventListener('pagehide', handleBeforeUnload)
2040:         return () => { window.removeEventListener('beforeunload', handleBeforeUnload); window.removeEventListener('pagehide', handleBeforeUnload) }
2041:     }, [saveDraft, isCompleted])
2042: 
2043:     const hasYouTubeVideo = !!videoUrl && /youtu\.be\/|youtube\.com\/|v=/.test(videoUrl)
2044:     const displayPercent = hasYouTubeVideo ? videoPercent : 100
2045: 
2046:     const vidScore = useMemo(() => { if (!hasYouTubeVideo) return 2; if (videoPercent >= 95) return 2; if (videoPercent >= 50) return 1; return 0 }, [videoPercent, hasYouTubeVideo])
2047:     const refScore = useMemo(() => { if (reflection.trim().length >= 86) return 2; if (reflection.trim().length > 0) return 1; return 0 }, [reflection])
2048:     const validLinksCount = useMemo(() => links.filter(l => l.trim().length > 0).length, [links])
2049:     const pracScore = useMemo(() => Math.min(validLinksCount, 3), [validLinksCount])
2050:     const supportScore = useMemo(() => supports.filter(Boolean).length, [supports])
2051: 
2052:     const currentTimingScore = useMemo(() => {
2053:         if (!deadline) return 0
2054:         const dl = new Date(deadline); dl.setHours(23, 59, 59, 999)
2055:         const isNowOnTime = new Date().getTime() <= dl.getTime()
2056:         if (isCompleted) return isNowOnTime ? 1 : (existingScores.timing ?? -1)
2057:         return isNowOnTime ? 1 : -1
2058:     }, [deadline, isCompleted, existingScores.timing])
2059: 
2060:     const total = Math.max(0, vidScore + refScore + pracScore + supportScore + currentTimingScore)
2061:     const isOverdue = currentTimingScore === -1 && !isCompleted
2062: 
2063:     const handleSubmit = async () => {
2064:         if (!startedAt) { alert("Bạn chưa xác nhận ngày bắt đầu!"); return }
2065:         if (isCompleted && isOverdue) { alert("Bài học đã nộp trễ hạn. Không thể cập nhật."); return }
2066:         const isUpdate = isCompleted
2067:         setLoading(true)
2068:         try {
2069:             const result = await onSubmit({ reflection, links, supports }, isUpdate)
2070:             if (result?.success) { isDirtyRef.current = false; if (onFormDataChange && !isUpdate) onFormDataChange({ reflection: '', links: ['', '', ''], supports: [false, false] }) }
2071:         } finally { setLoading(false) }
2072:     }
2073: 
2074:     return (
2075:         <div className="flex flex-col h-full min-h-0 bg-[#FFFDE7]">
2076:             {showRules && <RulesModal onClose={() => setShowRules(false)} />}
2077:             <div className="shrink-0 z-10 bg-[#FFFDE7] border-b border-orange-200 px-4 py-2">
2078:                 <div className="flex items-center justify-between">
2079:                     <p className="text-[11px] text-gray-500">Hoàn thành trước 23:59 ngày <span className="font-semibold text-gray-700">{formatDate(deadline)}</span></p>
2080:                     <span className="text-sm font-black text-orange-500">Tổng: {total}/10</span>
2081:                 </div>
2082:                 <div className="flex gap-1.5 mt-1.5">
2083:                     <button onClick={handleSubmit} disabled={loading || (isCompleted && isOverdue)} className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl py-2 disabled:opacity-60 text-sm">
2084:                         {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" />{isCompleted ? 'CẬP NHẬT' : 'GHI NHẬN'}</>}
2085:                     </button>
2086:                     <button onClick={() => setShowRules(true)} className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-600 rounded-xl border border-orange-300 text-xs font-semibold"><Info className="w-3.5 h-3.5" />Quy tắc</button>
2087:                 </div>
2088:             </div>
2089:             <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 p-3">
2090:                 <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
2091:                     <SectionHead num={1} label={hasYouTubeVideo ? "Mở TRÍ = học Video (2đ)" : "Mở TRÍ = Nội dung (2đ)"} max={2} current={vidScore} />
2092:                     <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${!hasYouTubeVideo ? 'bg-emerald-500' : 'bg-orange-400'}`} style={{ width: `${displayPercent}%` }} /></div>
2093:                     <p className="text-[10px] text-gray-400 mt-0.5">{hasYouTubeVideo ? `Đang xem: ${videoPercent.toFixed(0)}%` : '✓ Không có video - Hoàn thành'}</p>
2094:                 </div>
2095:                 <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
2096:                     <SectionHead num={2} label="Bồi NHÂN = Tâm đắc (2đ)" max={2} current={refScore} />
2097:                     <textarea value={reflection} onChange={e => setReflection(e.target.value)}iều b placeholder="Đạn tâm đắc ngộ được..." rows={3} className="w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300" />
2098:                     <p className="text-[10px] text-gray-400 mt-0.5">{reflection.length} ký tự {reflection.length >= 86 ? '✓' : '(cần ≥86)'}</p>
2099:                 </div>
2100:                 <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
2101:                     <SectionHead num={3} label="Hành LỄ = Link thực hành (3đ)" max={3} current={pracScore} />
2102:                     <div className="flex flex-col gap-1.5">{links.map((link, i) => (<input key={i} type="url" value={link} onChange={e => { const next = [...links]; next[i] = e.target.value; setLinks(next) }} placeholder={`link ${i + 1}`} className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5" />))}</div>
2103:                 </div>
2104:                 <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
2105:                     <SectionHead num={4} label="Trọng NGHĨA = hỗ trợ (2đ)" max={2} current={supportScore} />
2106:                     <div className="flex flex-col gap-1.5">
2107:                         {['Giúp người (+1đ)', 'Giúp người giúp người (+1đ)'].map((label, i) => (<label key={i} className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={supports[i]} onChange={e => { const next = [...supports]; next[i] = e.target.checked; setSupports(next) }} className="w-4 h-4 accent-orange-500" /><span className={`text-sm ${supports[i] ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>{label}</span></label>))}
2108:                     </div>
2109:                 </div>
2110:                 <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
2111:                     <SectionHead num={5} label="Giữ TÍN = Đúng hạn (1đ)" max={1} current={currentTimingScore === 1 ? 1 : 0} />
2112:                     <div className="flex justify-between text-sm"><span className="text-gray-500">Đúng hạn:</span><span className="text-green-600 font-bold">+1đ</span></div>
2113:                     <div className="flex justify-between text-sm"><span className="text-gray-500">Muộn:</span><span className="text-red-500 font-bold">-1đ</span></div>
2114:                 </div>
2115:             </div>
2116:         </div>
2117:     )
2118: }
2119: 
2120: 
2121: ================================================================================
2122: FILE: components/course/ChatSection.tsx - Chat/Comment Section
2123: ================================================================================
2124: 
2125: 'use client'
2126: 
2127: import { useState, useEffect, useRef, useMemo, useOptimistic, useTransition } from 'react'
2128: import { getCommentsByLesson, createComment } from '@/app/actions/comment-actions'
2129: import { Send, LogIn, Loader2, MessageCircle } from 'lucide-react'
2130: import Link from 'next/link'
2131: 
2132: interface Comment { id: number | string; content: string; createdAt: Date; userId: number; userName: string | null; userAvatar: string | null; sending?: boolean }
2133: interface ChatSectionProps { lessonId: string; session: any }
2134: 
2135: const CommentItem = ({ comment }: { comment: Comment }) => {
2136:     const getInitials = (name: string | null) => !name ? '?' : name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
2137:     const formatTime = (date: Date) => date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
2138:     return (
2139:         <div className={`mb-3 group ${comment.sending ? 'opacity-50' : 'opacity-100'}`}>
2140:             <div className="flex gap-3">
2141:                 <div className="shrink-0">
2142:                     {comment.userAvatar ? <img src={comment.userAvatar} alt={comment.userName || ''} className="w-8 h-8 rounded-full object-cover border border-zinc-800" /> : <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-black">{getInitials(comment.userName)}</div>}
2143:                 </div>
2144:                 <div className="flex-1 min-w-0">
2145:                     <div className="flex items-baseline gap-2"><span className="text-sm font-semibold text-white">{comment.userName || 'Người dùng'}</span><span className="text-[10px] text-zinc-500">{formatTime(comment.createdAt)}</span></div>
2146:                     <p className="text-[13px] italic text-zinc-300 mt-0.5 break-words">{comment.content}</p>
2147:                 </div>
2148:             </div>
2149:         </div>
2150:     )
2151: }
2152: 
2153: export default function ChatSection({ lessonId, session }: ChatSectionProps) {
2154:     const [comments, setComments] = useState<Comment[]>([])
2155:     const [loading, setLoading] = useState(true)
2156:     const [isPending, startTransition] = useTransition()
2157:     const [newComment, setNewComment] = useState('')
2158:     const [error, setError] = useState('')
2159:     const commentsEndRef = useRef<HTMLDivElement>(null)
2160:     const [optimisticComments, addOptimisticComment] = useOptimistic(comments, (state: Comment[], newItem: Comment) => [...state, newItem])
2161:     const commentCache = useRef<Map<string, Comment[]>>(new Map())
2162: 
2163:     useEffect(() => {
2164:         if (commentCache.current.has(lessonId)) { setComments(commentCache.current.get(lessonId)!); setLoading(false); return }
2165:         setLoading(true)
2166:         getCommentsByLesson(lessonId).then(data => {
2167:             const mapped = data.map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) }))
2168:             commentCache.current.set(lessonId, mapped)
2169:             setComments(mapped); setLoading(false)
2170:         })
2171:     }, [lessonId])
2172: 
2173:     useEffect(() => { commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [optimisticComments])
2174: 
2175:     async function handleSendComment(e: React.FormEvent) {
2176:         e.preventDefault()
2177:         const content = newComment.trim()
2178:         if (!content || !session?.user) return
2179:         setNewComment(''); setError('')
2180:         const tempId = Date.now().toString()
2181:         const tempComment: Comment = { id: tempId, content, createdAt: new Date(), userId: parseInt(session.user.id), userName: session.user.name || 'Bạn', userAvatar: session.user.image || null, sending: true }
2182:         startTransition(async () => {
2183:             addOptimisticComment(tempComment)
2184:             const result = await createComment(lessonId, content)
2185:             if (result.success && result.comment) {
2186:                 setComments(prev => { const updated = [...prev, { ...result.comment, createdAt: new Date(result.comment.createdAt) }]; commentCache.current.set(lessonId, updated); return updated })
2187:             } else { setError(result.message || 'Gửi thất bại.') }
2188:         })
2189:     }
2190: 
2191:     const groupedComments = useMemo(() => { const map: Record<string, Comment[]> = {}; optimisticComments.forEach(c => { const dateKey = new Date(c.createdAt).toDateString(); if (!map[dateKey]) map[dateKey] = []; map[dateKey].push(c) }); return map }, [optimisticComments])
2192:     const formatDate = (dateKey: string) => { const date = new Date(dateKey); const today = new Date(); if (date.toDateString() === today.toDateString()) return 'Hôm nay'; const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua'; return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) }
2193: 
2194:     return (
2195:         <div className="flex flex-col h-full bg-zinc-950">
2196:             <div className="shrink-0 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50"><h3 className="text-sm font-semibold text-white flex items-center gap-2"><MessageCircle className="h-4 w-4 text-yellow-400" />Tương tác<span className="text-zinc-500 font-normal text-xs">({optimisticComments.length})</span></h3></div>
2197:             <div className="flex-1 overflow-y-auto px-4 py-3">
2198:                 {loading ? (<div className="flex flex-col items-center justify-center py-12 gap-3"><Loader2 className="h-6 w-6 animate-spin text-yellow-400" /><span className="text-xs text-zinc-500">Đang tải...</span></div>) : optimisticComments.length === 0 ? (<div className="flex flex-col items-center justify-center py-12 text-center"><div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3"><MessageCircle className="h-6 w-6 text-zinc-700" /></div><p className="text-zinc-500 text-sm">Chưa có bình luận</p></div>) : (
2199:                     Object.entries(groupedComments).map(([dateKey, dateComments]) => (<div key={dateKey} className="mb-6"><div className="flex items-center gap-4 mb-4"><div className="h-px flex-1 bg-zinc-800/50"></div><span className="text-[10px] font-medium text-zinc-500 uppercase">{formatDate(dateKey)}</span><div className="h-px flex-1 bg-zinc-800/50"></div></div>{dateComments.map(comment => (<CommentItem key={comment.id} comment={comment} />))}</div>))
2200:                 )}
2201:                 <div ref={commentsEndRef} className="h-4" />
2202:             </div>
2203:             <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/80 p-3">
2204:                 {session?.user ? (<form onSubmit={handleSendComment} className="relative flex items-center"><input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Nhập nội dung..." className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl pl-4 pr-12 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50" disabled={isPending} /><button type="submit" disabled={!newComment.trim() || isPending} className="absolute right-1.5 w-8 h-8 rounded-xl bg-yellow-400 text-black flex items-center justify-center disabled:opacity-30">{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></form>) : (<div className="bg-zinc-800/50 rounded-xl py-3 px-4 border border-zinc-700/50 text-center"><Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-400"><LogIn className="h-4 w-4" />Đăng nhập để tương tác</Link></div>)}
2205:                 {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mt-2"><p className="text-red-400 text-[10px] text-center">{error}</p></div>}
2206:             </div>
2207:         </div>
2208:     )
2209: }
2210: 
2211: 
2212: ================================================================================
2213: FILE: components/course/PaymentModal.tsx - Payment Modal
2214: ================================================================================
2215: 
2216: 'use client'
2217: 
2218: import React from 'react'
2219: import Image from 'next/image'
2220: 
2221: interface PaymentModalProps { course: any; onClose: () => void }
2222: 
2223: export default function PaymentModal({ course, onClose }: PaymentModalProps) {
2224:     return (
2225:         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
2226:             <div className="relative w-full max-w-2xl animate-in zoom-in-95 duration-200 overflow-hidden rounded-3xl bg-white shadow-2xl">
2227:                 <div className="bg-[#7c3aed] px-8 py-6 text-white"><h2 className="text-2xl font-bold">Kích hoạt khóa học</h2><p className="text-purple-100 italic opacity-90">{course.name_lop}</p></div>
2228:                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
2229:                     <div className="flex flex-col items-center justify-center text-center">
2230:                         <div className="relative mb-4 h-56 w-56 overflow-hidden rounded-xl border-4 border-purple-100 p-2 shadow-inner"><Image src={course.link_qrcode || `https://img.vietqr.io/image/${course.bank_stk}-${course.stk}-compact.png?amount=${course.phi_coc}&addInfo=${course.noidung_stk}`} alt="QR" fill className="object-contain" /></div>
2231:                         <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Quét mã QR để thanh toán</p>
2232:                     </div>
2233:                     <div className="flex flex-col justify-center space-y-4">
2234:                         <div className="rounded-2xl bg-gray-50 p-5 border border-gray-100"><p className="text-sm font-semibold text-gray-400">Số tiền:</p><p className="text-3xl font-black text-[#7c3aed]">{course.phi_coc?.toLocaleString()}đ</p></div>
2235:                         <div className="space-y-3 px-1">
2236:                             <div><span className="block text-xs font-bold text-gray-400 uppercase">Ngân hàng</span><span className="font-bold text-gray-800">{course.bank_stk || 'N/A'}</span></div>
2237:                             <div><span className="block text-xs font-bold text-gray-400 uppercase">Số tài khoản</span><span className="font-bold text-gray-800 select-all">{course.stk || 'N/A'}</span></div>
2238:                             <div><span className="block text-xs font-bold text-gray-400 uppercase">Chủ TK</span><span className="font-bold text-gray-800">{course.name_stk || 'N/A'}</span></div>
2239:                             <div><span className="block text-xs font-bold text-gray-400 uppercase">Nội dung</span><span className="inline-block rounded bg-purple-50 px-2 py-1 font-mono font-bold text-[#7c3aed] border border-purple-100">{course.noidung_stk || 'Kich hoat khoa hoc'}</span></div>
2240:                         </div>
2241:                     </div>
2242:                 </div>
2243:                 <div className="bg-orange-50 px-8 py-4 text-center"><p className="text-sm font-medium text-orange-700">🚀 Sau chuyển khoạt thành công, khóa học sẽ được kích hoạt tự động.</p></div>
2244:                 <div className="border-t p-4 flex justify-end"><button onClick={onClose} className="rounded-xl px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-100">Để sau</button></div>
2245:                 <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
2246:             </div>
2247:         </div>
2248:     )
2249: }
2250: 
2251: 
2252: ================================================================================
2253: FILE: components/course/StartDateModal.tsx - Start Date Modal
2254: ================================================================================
2255: 
2256: 'use client'
2257: 
2258: import { useState, useMemo } from 'react'
2259: import { format, isBefore, isAfter, startOfDay, addDays, differenceInDays } from 'date-fns'
2260: import { vi } from 'date-fns/locale'
2261: import { DayPicker } from 'react-day-picker'
2262: import { CalendarDays, Loader2 } from "lucide-react"
2263: import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
2264: import { Button } from "@/components/ui/button"
2265: import { Label } from "@/components/ui/label"
2266: 
2267: interface StartDateModalProps { isOpen: boolean; onConfirm: (date: Date) => Promise<void> }
2268: 
2269: export default function StartDateModal({ isOpen, onConfirm }: StartDateModalProps) {
2270:     const today = startOfDay(new Date())
2271:     const maxSelectableDate = addDays(today, 90)
2272:     const courseDuration = 60
2273:     const [selectedDate, setSelectedDate] = useState<Date>(today)
2274:     const [loading, setLoading] = useState(false)
2275:     const deadline = useMemo(() => addDays(selectedDate, courseDuration), [selectedDate])
2276:     const daysRemaining = useMemo(() => differenceInDays(deadline, today), [deadline, today])
2277: 
2278:     const handleConfirm = async () => { setLoading(true); try { await onConfirm(selectedDate) } catch (error: any) { alert(error.message) } finally { setLoading(false) } }
2279: 
2280:     return (
2281:         <Dialog open={isOpen}>
2282:             <DialogContent className="sm:max-w-[520px] bg-zinc-900 border-zinc-800 text-white">
2283:                 <DialogHeader>
2284:                     <div className="w-12 h-12 bg-sky-500/10 rounded-full flex items-center justify-center mb-4"><CalendarDays className="w-6 h-6 text-sky-500" /></div>
2285:                     <DialogTitle className="text-xl font-bold">Xác nhận ngày bắt đầu</DialogTitle>
2286:                     <DialogDescription className="text-zinc-400">Hệ thống sẽ dựa vào ngày này để tính Deadline cho toàn bộ các bài học.</DialogDescription>
2287:                 </DialogHeader>
2288:                 <div className="py-4 space-y-6">
2289:                     <div className="space-y-2">
2290:                         <Label className="text-sm text-zinc-300">Ngày bắt đầu:</Label>
2291:                         <div className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm font-medium">{format(selectedDate, 'dd/MM/yyyy', { locale: vi })}</div>
2292:                     </div>
2293:                     <div className="bg-zinc-950 border border-zinc-800 rounded-md p-3">
2294:                         <DayPicker mode="single" selected={selectedDate} locale={vi} onSelect={(date) => { if (date && !isBefore(date, today) && !isAfter(date, maxSelectableDate)) setSelectedDate(date) }} disabled={(date) => isBefore(date, today) || isAfter(date, maxSelectableDate)} classNames={{ day_selected: "bg-sky-600 text-white", day_today: "border border-sky-500", head_cell: "text-zinc-400 text-xs", cell: "text-sm" }} />
2295:                     </div>
2296:                     <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-4 space-y-2 text-sm">
2297:                         <div className="flex justify-between"><span className="text-zinc-400">Deadline dự kiến:</span><span className="font-semibold text-white">{format(deadline, 'dd/MM/yyyy', { locale: vi })}</span></div>
2298:                         <div className="flex justify-between"><span className="text-zinc-400">Thời lượng:</span><span className="font-semibold text-white">{courseDuration} ngày</span></div>
2299:                         <div className="flex justify-between"><span className="text-zinc-400">Còn lại:</span><span className="font-semibold text-sky-400">{daysRemaining} ngày</span></div>
2300:                     </div>
2301:                 </div>
2302:                 <DialogFooter>
2303:                     <Button onClick={handleConfirm} disabled={loading} className="w-full bg-sky-600 hover:bg-sky-500 text-white h-11 font-bold">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "XÁC NHẬN BẮT ĐẦU"}</Button>
2304:                 </DialogFooter>
2305:             </DialogContent>
2306:         </Dialog>
2307:     )
2308: }
2309: 
2310: 
2311: ================================================================================
2312: FILE: components/course/CoursePlayer.tsx - Main Course Player
2313: ================================================================================
2314: 
2315: 'use client'
2316: 
2317: import { useState, useCallback, useEffect, useRef } from 'react'
2318: import Link from "next/link"
2319: import { ArrowLeft, ListVideo, FileText, X, ClipboardCheck, Loader2 } from "lucide-react"
2320: import { cn } from "@/lib/utils"
2321: import LessonSidebar from "./LessonSidebar"
2322: import VideoPlayer from "./VideoPlayer"
2323: import AssignmentForm from "./AssignmentForm"
2324: import ChatSection from "./ChatSection"
2325: import StartDateModal from "./StartDateModal"
2326: import { confirmStartDateAction, saveVideoProgressAction, submitAssignmentAction, updateLastLessonAction } from "@/app/actions/course-actions"
2327: 
2328: interface CoursePlayerProps { course: any; enrollment: any; session: any }
2329: type MobileTab = 'list' | 'content' | 'record'
2330: 
2331: export default function CoursePlayer({ course, enrollment: initialEnrollment, session }: CoursePlayerProps) {
2332:     const [enrollment, setEnrollment] = useState(initialEnrollment)
2333:     const isSubmittingRef = useRef(false)
2334:     const [isMounted, setIsMounted] = useState(false)
2335:     const filteredLessonProgress = enrollment.lessonProgress.filter((p: any) => p.status !== 'RESET')
2336:     const [currentLessonId, setCurrentLessonId] = useState<string>(course.lessons[0]?.id)
2337:     const [videoPercent, setVideoPercent] = useState(0)
2338:     const [mobileTab, setMobileTab] = useState<MobileTab>('content')
2339:     const [progressMap, setProgressMap] = useState<Record<string, any>>(() => filteredLessonProgress.reduce((acc: any, p: any) => { acc[p.lessonId] = p; return acc }, {}))
2340:     const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'loading' | 'success' | 'error' } | null>(null)
2341:     const assignmentFormRef = useRef<(() => Promise<void>) | undefined>(undefined)
2342:     const lastSavedPercentRef = useRef<number>(-1)
2343:     const videoProgressRef = useRef<{ maxTime: number; duration: number } | null>(null)
2344: 
2345:     useEffect(() => { setIsMounted(true); if (enrollment.lastLessonId) setCurrentLessonId(enrollment.lastLessonId) }, [])
2346: 
2347:     const notify = useCallback((text: string, type: 'loading' | 'success' | 'error' = 'success', duration = 3000) => { setStatusMsg({ text, type }); if (type !== 'loading') setTimeout(() => setStatusMsg(null), duration) }, [])
2348: 
2349:     const [isMobile, setIsMobile] = useState(false)
2350:     useEffect(() => { const mq = window.matchMedia('(max-width: 767px)'); setIsMobile(mq.matches); const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches); mq.addEventListener('change', handler); return () => mq.removeEventListener('change', handler) }, [])
2351: 
2352:     const handleLessonSelect = async (lessonId: string) => {
2353:         if (isSubmittingRef.current) return
2354:         if (assignmentFormRef.current) await assignmentFormRef.current().catch(() => {})
2355:         if (currentLessonId && videoProgressRef.current) await saveVideoProgressAction({ enrollmentId: enrollment.id, lessonId: currentLessonId, maxTime: videoProgressRef.current.maxTime, duration: videoProgressRef.current.duration }).catch(() => {})
2356:         setCurrentLessonId(lessonId); setVideoPercent(0); setMobileTab('content'); updateLastLessonAction(enrollment.id, lessonId).catch(() => {})
2357:     }
2358: 
2359:     const handleVideoProgress = useCallback(async (maxTime: number, duration: number) => {
2360:         if (!currentLessonId || duration === 0) return
2361:         const pct = Math.min(100, Math.round((maxTime / duration) * 100))
2362:         setVideoPercent(pct); videoProgressRef.current = { maxTime, duration }
2363:         const threshold = Math.floor(pct / 10) * 10
2364:         if ((threshold > lastSavedPercentRef.current || pct === 100) && threshold <= 100) { lastSavedPercentRef.current = threshold; saveVideoProgressAction({ enrollmentId: enrollment.id, lessonId: currentLessonId, maxTime, duration }).catch(() => {}) }
2365:     }, [currentLessonId, enrollment.id])
2366: 
2367:     const handleSubmitAssignment = async (data: any, isUpdate: boolean = false) => {
2368:         if (isSubmittingRef.current) return
2369:         isSubmittingRef.current = true; notify(isUpdate ? 'Đang cập nhật...' : 'Đang chấm điểm...', 'loading')
2370:         try {
2371:             const currentProg = progressMap[currentLessonId!]
2372:             const currentLessonData = course.lessons.find((l: any) => l.id === currentLessonId)
2373:             const result = await submitAssignmentAction({ enrollmentId: enrollment.id, lessonId: currentLessonId!, reflection: data.reflection, links: data.links, supports: data.supports, isUpdate, lessonOrder: currentLessonData?.order, startedAt: enrollment.startedAt, existingVideoScore: currentProg?.scores?.video, existingTimingScore: currentProg?.scores?.timing })
2374:             if (!(result as any)?.success) { notify((result as any)?.message || 'Lỗi!', 'error'); return }
2375:             const res = result as any; notify(res.totalScore >= 5 ? `✅ Hoàn thành! Điểm: ${res.totalScore}/10` : `📊 Đã ghi nhận: ${res.totalScore}/10đ`, 'success')
2376:             const updatedProgress = { ...(progressMap[currentLessonId!] || {}), assignment: { reflection: data.reflection, links: data.links, supports: data.supports }, status: res.totalScore >= 5 ? 'COMPLETED' : 'IN_PROGRESS', totalScore: res.totalScore }
2377:             setProgressMap(prev => ({ ...prev, [currentLessonId!]: updatedProgress }))
2378:         } catch (error: any) { console.error("[SUBMIT-ERROR]", error); notify('Lỗi máy chủ!', 'error') } finally { isSubmittingRef.current = false; setStatusMsg(null) }
2379:     }
2380: 
2381:     const currentLesson = course.lessons.find((l: any) => l.id === currentLessonId)
2382:     const currentProgress = progressMap[currentLessonId]
2383:     const completedCount = Object.values(progressMap).filter((p: any) => p.status === 'COMPLETED').length
2384: 
2385:     if (!isMounted) return <div className="h-screen w-full bg-black flex items-center justify-center text-zinc-700 font-mono text-xs">Đang tải...</div>
2386: 
2387:     return (
2388:         <div className="flex flex-col h-full bg-black text-zinc-300">
2389:             <header className="h-14 shrink-0 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900 fixed top-0 left-0 right-0 z-50">
2390:                 <div className="flex items-center gap-3 min-w-0"><Link href="/" className="shrink-0 text-zinc-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link><h1 className="font-bold text-white truncate text-sm sm:text-base">{course.name_lop}</h1></div>
2391:                 {statusMsg && <div className={`absolute left-1/2 -translate-x-1/2 top-16 px-4 py-1.5 rounded-full text-xs font-bold flex z-[100] ${statusMsg.type === 'loading' ? 'bg-orange-500' : statusMsg.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{statusMsg.type === 'loading' && <Loader2 className="w-3 h-3 animate-spin mr-2" />}{statusMsg.text}</div>}
2392:                 <div className="flex items-center gap-2"><span className="text-[10px] text-zinc-400">{completedCount}/{course.lessons.length}</span><div className="h-2 w-16 bg-zinc-800 rounded-full"><div className="h-full bg-emerald-500" style={{ width: `${(completedCount / course.lessons.length) * 100}%` }} /></div></div>
2393:             </header>
2394:             <div className={`flex flex-1 min-h-0 pt-14 ${isMobile ? 'pb-14' : ''}`}>
2395:                 {!isMobile && <LessonSidebar lessons={course.lessons} currentLessonId={currentLessonId} onLessonSelect={handleLessonSelect} progress={progressMap} startedAt={enrollment.startedAt ? new Date(enrollment.startedAt) : null} resetAt={enrollment.resetAt ? new Date(enrollment.resetAt) : null} onResetStartDate={async (d: Date) => { await confirmStartDateAction(course.id, d); window.location.reload() }} />}
2396:                 <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-zinc-950">
2397:                     {!isMobile && <div className="p-5 pb-0 shrink-0 w-full max-w-5xl"><VideoPlayer enrollmentId={enrollment.id} lessonId={currentLessonId!} videoUrl={currentLesson?.videoUrl || null} lessonContent={currentLesson?.content || null} initialMaxTime={currentProgress?.maxTime || 0} playlistData={currentProgress?.scores?.playlist} lastVideoIndex={currentProgress?.scores?.lastVideoIndex} onProgress={handleVideoProgress} onPercentChange={setVideoPercent} /></div>}
2398:                     {!isMobile && <div className="p-5 flex-1 flex flex-col gap-4 min-h-0 w-full max-w-5xl"><h2 className="text-lg font-bold text-white">{currentLesson?.title}</h2><div className="flex-1 min-h-0 border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden"><ChatSection lessonId={currentLessonId!} session={session} /></div></div>}
2399:                     {isMounted && isMobile && (<div className="flex-1 min-h-0 flex flex-col">
2400:                         {mobileTab === 'list' && <div className="flex-1 overflow-y-auto"><LessonSidebar lessons={course.lessons} currentLessonId={currentLessonId} onLessonSelect={handleLessonSelect} progress={progressMap} startedAt={enrollment.startedAt ? new Date(enrollment.startedAt) : null} resetAt={null} onResetStartDate={async () => {}} /></div>}
2401:                         {mobileTab === 'content' && <div className="flex-1 flex flex-col min-h-0"><div className="px-4 py-4 bg-zinc-900 border-b border-zinc-800"><p className="text-base font-bold text-white">{currentLesson?.title}</p></div><div className="flex-1 min-h-0"><ChatSection lessonId={currentLessonId} /></div></div>}
2402:                         {mobileTab === 'record' && !} session={session<div className="flex-1 overflow-hidden"><AssignmentForm lessonId={currentLessonId!} lessonOrder={currentLesson?.order ?? 1} startedAt={enrollment.startedAt ? new Date(enrollment.startedAt) : null} videoPercent={videoPercent} videoUrl={currentLesson?.videoUrl || null} onSubmit={handleSubmitAssignment} initialData={{ ...currentProgress, enrollmentId: enrollment.id }} onSaveDraft={assignmentFormRef} onFormDataChange={() => {}} onDraftSaved={() => {}} /></div>}
2403:                     </div>)}
2404:                     {isMounted && isMobile && <nav className="h-14 bg-zinc-900 border-t border-zinc-800 flex fixed bottom-0 left-0 right-0 z-50">{[{ id: 'list', icon: ListVideo, label: 'DS' }, { id: 'content', icon: FileText, label: 'ND' }, { id: 'record', icon: ClipboardCheck, label: 'Ghi nhận' }].map(tab => (<button key={tab.id} onClick={() => setMobileTab(tab.id as MobileTab)} className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] ${mobileTab === tab.id ? 'text-orange-400 bg-orange-400/5 border-t-2 border-orange-400' : 'text-zinc-500'}`}><tab.icon className="w-5 h-5" />{tab.label}</button>))}</nav>}
2405:                 </main>
2406:                 {!isMobile && <div className="w-[400px] shrink-0 border-l border-zinc-800 flex flex-col"><AssignmentForm lessonId={currentLessonId!} lessonOrder={currentLesson?.order ?? 1} startedAt={enrollment.startedAt ? new Date(enrollment.startedAt) : null} videoPercent={videoPercent} videoUrl={currentLesson?.videoUrl || null} onSubmit={handleSubmitAssignment} initialData={{ ...currentProgress, enrollmentId: enrollment.id }} onSaveDraft={assignmentFormRef} onFormDataChange={() => {}} onDraftSaved={() => {}} /></div>}
2407:             </div>
2408:             <StartDateModal isOpen={!enrollment.startedAt} onConfirm={async (d) => { await confirmStartDateAction(course.id, d); window.location.reload() }} />
2409:         </div>
2410:     )
2411: }
2412: 
2413: 
2414: ================================================================================
2415: FILE: components/home/MessageCard.tsx - Hero Message Card
2416: ================================================================================
2417: 
2418: 'use client'
2419: 
2420: import { useState } from 'react'
2421: import Image from 'next/image'
2422: import dynamic from 'next/dynamic'
2423: import { Lightbulb } from 'lucide-react'
2424: 
2425: const Dialog = dynamic(() => import("@/components/ui/dialog").then(mod => mod.Dialog), { ssr: false })
2426: const DialogContent = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogContent), { ssr: false })
2427: 
2428: interface Message { id: number; content: string; detail: string; imageUrl: string | null }
2429: interface MessageCardProps { message: Message | null; session: any; userName: string; userId: string }
2430: 
2431: const DEFAULT_MESSAGE: Message = { id: 0, content: "Tri thức là sức mạnh - Học hôm nay, thành công ngày mai", detail: "Học viện BRK mang đến những tri thức thực chiến giúp bạn phát triển bản thân và sự nghiệp.", imageUrl: null }
2432: 
2433: export default function MessageCard({ message, session, userName, userId }: MessageCardProps) {
2434:     const [isOpen, setIsOpen] = useState(false)
2435:     const displayMessage = message || DEFAULT_MESSAGE
2436: 
2437:     return (
2438:         <>
2439:             <div className="relative w-full aspect-[5/3] sm:overflow-hidden rounded-2xl md:rounded-none shadow-2xl border border-white/5 group cursor-pointer" onClick={() => setIsOpen(true)}>
2440:                 <div className="absolute inset-0">
2441:                     {displayMessage.imageUrl ? (<Image src={displayMessage.imageUrl} alt="BG" fill priority className="object-cover object-center transition-transform duration-1000 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 1200px" />) : (<div className="w-full h-full bg-gradient-to-br from-black via-zinc-900 to-indigo-950" />)}
2442:                     <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
2443:                 </div>
2444:                 <div className="absolute inset-0 z-10 flex flex-col px-[5%] pt-[30px] md:pt-[70px] pb-[4%] text-center">
2445:                     <div className="flex flex-col items-center shrink-0">
2446:                         <h1 className="flex flex-col items-center font-black tracking-tighter leading-[1.2]">
2447:                             <span className="uppercase text-white drop-shadow-xl" style={{ fontSize: 'clamp(0.5rem, 6vw, 4rem)' }}>HỌC VIỆN BRK</span>
2448:                             <span className="text-glow-3d uppercase drop-shadow-xl" style={{ fontSize: 'clamp(0.5rem, 5vw, 3rem)' }}>NGÂN HÀNG PHƯỚC BÁU</span>
2449:                             <span className="rounded-full bg-white/10 border border-white/20 backdrop-blur-md mt-4 px-4 py-1"><span className="font-semibold text-white" style={{ fontSize: 'clamp(0.7rem, 1.8vw, 1.2rem)' }}>{session?.user ? `Mến chào ${userName || 'Học viên'} - Mã ${userId}` : 'Mến chào bạn hữu đường xa!'}</span></span>
2450:                         </h1>
2451:                     </div>
2452:                     <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full">
2453:                         <div className="flex items-center justify-center gap-2 max-w-[95%] md:max-w-[85%] w-full">
2454:                             <p className="text-yellow-400 font-medium italic leading-tight drop-shadow-lg whitespace-pre-line" style={{ fontSize: `clamp(0.7rem, 2.5vw, 2rem)` }}>“{displayMessage.content}”</p>
2455:                             <div className="shrink-0 rounded-full bg-yellow-400 flex items-center justify-center opacity-80 group-hover:opacity-100 shadow-lg" style={{ width: 'clamp(1.4rem, 3.2vw, 2.6rem)', height: 'clamp(1.4rem, 3.2vw, 2.6rem)' }}><Lightbulb className="text-black animate-pulse" style={{ width: '55%', height: '55%' }} /></div>
2456:                         </div>
2457:                         <p className="text-white/40 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all text-[10px] mt-4">Nhấn để xem chi tiết →</p>
2458:                     </div>
2459:                 </div>
2460:             </div>
2461:             {isOpen && (
2462:                 <Dialog open={isOpen}>
2463:                     <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-800 text-white p-0 shadow-2xl">
2464:                         <div className="relative w-full h-64">
2465:                             {displayMessage.imageUrl ? (<Image src={displayMessage.imageUrl} alt="BG" fill className="object-cover" sizes="(max-width: 768px) 100vw, 500px" />) : (<div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-950" />)}
2466:                             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
2467:                                 <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center mb-4 shadow-xl"><Lightbulb className="w-6 h-6 text-black" /></div>
2468:                                 <p className="text-yellow-400 text-xl font-bold italic leading-tight whitespace-pre-line">“{displayMessage.content}”</p>
2469:                             </div>
2470:                         </div>
2471:                         <div className="p-6 space-y-4 bg-zinc-950">
2472:                             <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line bg-white/5 p-5 rounded-2xl border border-white/5">{displayMessage.detail}</div>
2473:                             <p className="text-zinc-600 text-[11px] text-center pt-2 italic tracking-widest">💡 HỌC VIỆN BRK - NGÂN HÀNG PHƯỚC BÁU</p>
2474:                         </div>
2475:                         <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 z-20"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
2476:                     </DialogContent>
2477:                 </Dialog>
2478:             )}
2479:         </>
2480:     )
2481: }
2482: 
2483: 
2484: ================================================================================
2485: FILE: components/ImageViewer.tsx - Image Viewer for Docs
2486: ================================================================================
2487: 
2488: "use client"
2489: 
2490: import { useEffect, useRef, useState } from "react"
2491: 
2492: export default function ImageViewer() {
2493:     const [src, setSrc] = useState<string | null>(null)
2494:     const [scale, setScale] = useState(1)
2495:     const [position, setPosition] = useState({ x: 0, y: 0 })
2496:     const dragging = useRef(false)
2497:     const lastPos = useRef({ x: 0, y: 0 })
2498: 
2499:     useEffect(() => {
2500:         const handleClick = (e: any) => { const img = e.target.closest(".prose img"); if (!img) return; setSrc(img.src); setScale(1); setPosition({ x: 0, y: 0 }) }
2501:         document.addEventListener("click", handleClick); return () => document.removeEventListener("click", handleClick)
2502:     }, [])
2503: 
2504:     useEffect(() => { const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSrc(null) }; if (src) document.addEventListener("keydown", handleKey); return () => document.removeEventListener("keydown", handleKey) }, [src])
2505: 
2506:     if (!src) return null
2507: 
2508:     const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); setScale(prev => e.deltaY < 0 ? Math.min(prev + 0.15, 6) : Math.max(prev - 0.15, 1)) }
2509:     const handleMouseDown = (e: React.MouseEvent) => { if (scale <= 1) return; dragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY } }
2510:     const handleMouseMove = (e: React.MouseEvent) => { if (!dragging.current) return; const dx = e.clientX - lastPos.current.x; const dy = e.clientY - lastPos.current.y; setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy })); lastPos.current = { x: e.clientX, y: e.clientY } }
2511:     const handleMouseUp = () => { dragging.current = false }
2512:     const handleDoubleClick = () => { setScale(scale === 1 ? 2 : 1); if (scale !== 1) setPosition({ x: 0, y: 0 }) }
2513: 
2514:     return (
2515:         <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center" onClick={() => setSrc(null)}>
2516:             <div className="relative w-full h-full flex items-center justify-center overflow-hidden" onClick={e => e.stopPropagation()} onWheel={handleWheel} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
2517:                 <img src={src} alt="" draggable={false} className="max-w-[90vw] max-h-[90vh] object-contain select-none" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transition: dragging.current ? "none" : "transform 0.2s ease", cursor: scale > 1 ? "grab" : "zoom-in" }} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} />
2518:                 <div className="absolute top-5 right-5 flex gap-2">
2519:                     <button onClick={() => setScale(s => Math.min(s + 0.3, 6))} className="bg-white text-black px-3 py-1 rounded shadow">+</button>
2520:                     <button onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }) }} className="bg-white text-black px-3 py-1 rounded shadow">Reset</button>
2521:                     <button onClick={() => setSrc(null)} className="bg-white text-black px-3 py-1 rounded shadow">✕</button>
2522:                 </div>
2523:             </div>
2524:         </div>
2525:     )
2526: }
2527: 
2528: 
2529: ================================================================================
2530: FILE: components/ui/button.tsx
2531: ================================================================================
2532: 
2533: import * as React from "react"
2534: import { cn } from "@/lib/utils"
2535: 
2536: export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'; size?: 'default' | 'sm' | 'lg' | 'icon' }
2537: 
2538: const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
2539:     const variants = { default: "bg-primary text-primary-foreground hover:bg-primary/90", destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90", outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground", secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80", ghost: "hover:bg-accent hover:text-accent-foreground", link: "text-primary underline-offset-4 hover:underline" }
2540:     const sizes = { default: "h-10 px-4 py-2", sm: "h-9 rounded-md px-3", lg: "h-11 rounded-md px-8", icon: "h-10 w-10" }
2541:     return <button className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)} ref={ref} {...props} />
2542: })
2543: Button.displayName = "Button"
2544: export { Button }
2545: 
2546: 
2547: ================================================================================
2548: FILE: components/ui/input.tsx
2549: ================================================================================
2550: 
2551: import * as React from "react"
2552: import { cn } from "@/lib/utils"
2553: 
2554: export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }
2555: 
2556: const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
2557:     return <input type={type} className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)} ref={ref} {...props} />
2558: })
2559: Input.displayName = "Input"
2560: export { Input }
2561: 
2562: 
2563: ================================================================================
2564: FILE: components/ui/textarea.tsx
2565: ================================================================================
2566: 
2567: import * as React from "react"
2568: import { cn } from "@/lib/utils"
2569: 
2570: export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }
2571: 
2572: const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
2573:     return <textarea className={cn("flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)} ref={ref} {...props} />
2574: })
2575: Textarea.displayName = "Textarea"
2576: export { Textarea }
2577: 
2578: 
2579: ================================================================================
2580: FILE: components/ui/checkbox.tsx
2581: ================================================================================
2582: 
2583: import * as React from "react"
2584: import { cn } from "@/lib/utils"
2585: 
2586: export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> { onCheckedChange?: (checked: boolean) => void }
2587: 
2588: const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, onCheckedChange, checked, ...props }, ref) => {
2589:     return <input type="checkbox" checked={checked} onChange={e => onCheckedChange?.(e.target.checked)} className={cn("h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer", className)} ref={ref} {...props} />
2590: })
2591: Checkbox.displayName = "Checkbox"
2592: export { Checkbox }
2593: 
2594: 
2595: ================================================================================
2596: FILE: components/ui/label.tsx
2597: ================================================================================
2598: 
2599: import * as React from "react"
2600: import { cn } from "@/lib/utils"
2601: 
2602: const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ className, ...props }, ref) => (
2603:     <label ref={ref} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
2604: ))
2605: Label.displayName = "Label"
2606: export { Label }
2607: 
2608: 
2609: ================================================================================
2610: FILE: components/ui/dialog.tsx (Custom Simple Dialog)
2611: ================================================================================
2612: 
2613: 'use client'
2614: 
2615: import * as React from "react"
2616: import { cn } from "@/lib/utils"
2617: 
2618: interface DialogProps { open?: boolean; children: React.ReactNode }
2619: export function Dialog({ open, children }: DialogProps) { if (!open) return null; return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">{children}</div> }
2620: export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) { return <div className={cn("bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 relative shadow-2xl animate-in zoom-in-95 duration-200", className)}>{children}</div> }
2621: export function DialogHeader({ className, children }: { className?: string; children: React.ReactNode }) { return <div className={cn("space-y-1.5 text-center sm:text-left", className)}>{children}</div> }
2622: export function DialogTitle({ className, children }: { className?: string; children: React.ReactNode }) { return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>{children}</h2> }
2623: export function DialogDescription({ className, children }: { className?: string; children: React.ReactNode }) { return <p className={cn("text-sm text-zinc-400", className)}>{children}</p> }
2624: export function DialogFooter({ className, children }: { className?: string; children: React.ReactNode }) { return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)}>{children}</div> }
2625: 
2626: 
2627: ================================================================================
2628: FILE: lib/normalizeGoogleDocsHtml.ts
2629: ================================================================================
2630: 
2631: export function normalizeGoogleDocsHtml(html: string): string {
2632:     if (!html) return ''
2633:     let normalized = html
2634:     normalized = normalized.replace(/<p><\/p>/g, '')
2635:     normalized = normalized.replace(/<br\s*\/?>/gi, '')
2636:     normalized = normalized.replace(/\s+/g, ' ').trim()
2637:     return normalized
2638: }
2639: 
2640: 
2641: ================================================================================
2642: FILE: lib/utils/id-generator.ts
2643: ================================================================================
2644: 
2645: export function generateUniqueId(): string {
2646:     return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
2647: }
2648: 
2649: 
2650: ================================================================================
2651: FILE: next.config.ts
2652: ================================================================================
2653: 
2654: import type { NextConfig } from "next";
2655: 
2656: const nextConfig: NextConfig = {
2657:     images: {
2658:         remotePatterns: [
2659:             { protocol: 'https', hostname: 'i.postimg.cc' },
2660:             { protocol: 'https', hostname: 'img.vietqr.io' },
2661:             { protocol: 'https', hostname: 'drive.google.com' },
2662:             { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
2663:         ],
2664:     },
2665: };
2666: 
2667: export default nextConfig;
2668: 
2669: 
2670: ================================================================================
2671: FILE: postcss.config.mjs
2672: ================================================================================
2673: 
2674: export default {
2675:     plugins: {
2676:         "@tailwindcss/postcss": {},
2677:     },
2678: };
2679: 
2680: 
2681: ================================================================================
2682: FILE: tsconfig.json
2683: ================================================================================
2684: 
2685: {
2686:   "compilerOptions": {
2687:     "target": "ES2017",
2688:     "lib": ["dom", "dom.iterable", "esnext"],
2689:     "allowJs": true,
2690:     "skipLibCheck": true,
2691:     "strict": true,
2692:     "noEmit": true,
2693:     "esModuleInterop": true,
2694:     "module": "esnext",
2695:     "moduleResolution": "bundler",
2696:     "resolveJsonModule": true,
2697:     "isolatedModules": true,
2698:     "jsx": "preserve",
2699:     "incremental": true,
2700:     "plugins": [{ "name": "next" }],
2701:     "paths": { "@/*": ["./*"] }
2702:   },
2703:   "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
2704:   "exclude": ["node_modules"]
2705: }
2706: 
2707: 
2708: ================================================================================
2709: FILE: package.json
2710: ================================================================================
2711: 
2712: {
2713:   "name": "brk-academy",
2714:   "version": "0.1.0",
2715:   "private": true,
2716:   "scripts": {
2717:     "dev": "next dev",
2718:     "postinstall": "prisma generate",
2719:     "build": "prisma generate && next build",
2720:     "start": "next start",
2721:     "lint": "eslint",
2722:     "import-csv": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/import-csv.ts",
2723:     "process-legacy": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/process-legacy-users.ts",
2724:     "make-admin": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/make-admin.ts",
2725:     "add-reserved": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/add-reserved-id.ts",
2726:     "change-id": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/change-id.ts",
2727:     "push": "powershell -ExecutionPolicy Bypass -File ./scripts/push.ps1"
2728:   },
2729:   "dependencies": {
2730:     "@auth/prisma-adapter": "^2.11.1",
2731:     "@hookform/resolvers": "^5.2.2",
2732:     "@prisma/client": "5.22.0",
2733:     "@supabase/supabase-js": "^2.95.3",
2734:     "@types/bcryptjs": "^2.4.6",
2735:     "bcryptjs": "^3.0.3",
2736:     "clsx": "^2.1.1",
2737:     "csv-parser": "^3.2.0",
2738:     "csv-writer": "^1.6.0",
2739:     "date-fns": "^4.1.0",
2740:     "dompurify": "^3.3.1",
2741:     "dotenv": "^17.3.1",
2742:     "fs": "^0.0.1-security",
2743:     "lucide-react": "^0.570.0",
2744:     "next": "16.1.6",
2745:     "next-auth": "^5.0.0-beta.30",
2746:     "prisma": "5.22.0",
2747:     "react": "19.2.3",
2748:     "react-day-picker": "^9.14.0",
2749:     "react-dom": "19.2.3",
2750:     "react-hook-form": "^7.71.1",
2751:     "tailwind-merge": "^3.4.1",
2752:     "zod": "^4.3.6"
2753:   },
2754:   "devDependencies": {
2755:     "@tailwindcss/postcss": "^4",
2756:     "@types/node": "^20",
2757:     "@types/react": "^19",
2758:     "@types/react-dom": "^19",
2759:     "eslint": "^9",
2760:     "eslint-config-next": "16.1.6",
2761:     "tailwindcss": "^4",
2762:     "ts-node": "^10.9.2",
2763:     "typescript": "^5"
2764:   },
2765:   "prisma": {
2766:     "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
2767:   }
2768: }
2769: 
2770: 
2771: ================================================================================
2772: HẾT TOÀN BỘ DỰ ÁN
2773: ================================================================================
````

## File: components/home/CommunityBoard.tsx
````typescript
  1: 'use client'
  2: import React, { useState, useEffect, useRef } from 'react'
  3: import { getPostsAction } from '@/app/actions/post-actions'
  4: import PostCard from './PostCard'
  5: import PostDetailModal from './PostDetailModal'
  6: import { Newspaper, Loader2, PlusCircle, ChevronLeft, ChevronRight, ArrowRightCircle, ArrowLeftCircle } from 'lucide-react'
  7: import Link from 'next/link'
  8: interface CommunityBoardProps {
  9:     isAdmin: boolean
 10: }
 11: export default function CommunityBoard({ isAdmin }: CommunityBoardProps) {
 12:     const [posts, setPosts] = useState<any[]>([])
 13:     const [loading, setLoading] = useState(true)
 14:     const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
 15:     // Quản lý trang (mỗi trang 5 bài)
 16:     const [currentPage, setCurrentPage] = useState(0)
 17:     const postsPerPage = 5
 18:     const fetchPosts = async () => {
 19:         setLoading(true)
 20:         const res = await getPostsAction()
 21:         if (res.success) {
 22:             setPosts(res.posts || [])
 23:         }
 24:         setLoading(false)
 25:     }
 26:     useEffect(() => {
 27:         fetchPosts()
 28:     }, [])
 29:     const totalPages = Math.ceil(posts.length / postsPerPage)
 30:     const startIndex = currentPage * postsPerPage
 31:     const currentVisiblePosts = posts.slice(startIndex, startIndex + postsPerPage)
 32:     const hasNextPage = currentPage < totalPages - 1
 33:     const hasPrevPage = currentPage > 0
 34:     const nextGroup = () => { if (hasNextPage) setCurrentPage(prev => prev + 1) }
 35:     const prevGroup = () => { if (hasPrevPage) setCurrentPage(prev => prev - 1) }
 36:     return (
 37:         <div className="space-y-6">
 38:             <div className="flex items-center justify-between px-2">
 39:                 <div className="flex items-center gap-2">
 40:                     <Newspaper className="w-6 h-6 text-purple-600" />
 41:                     <div>
 42:                         <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none">Bảng tin</h2>
 43:                         <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Trang {currentPage + 1} / {totalPages || 1}</p>
 44:                     </div>
 45:                 </div>
 46:                 <div className="flex items-center gap-3">
 47:                     {/* Nút điều hướng */}
 48:                     <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
 49:                         <button 
 50:                             onClick={prevGroup}
 51:                             disabled={!hasPrevPage}
 52:                             className="p-1.5 rounded-lg hover:bg-white disabled:opacity-20 transition-all active:scale-90"
 53:                         >
 54:                             <ChevronLeft className="w-4 h-4 text-gray-900" />
 55:                         </button>
 56:                         <button 
 57:                             onClick={nextGroup}
 58:                             disabled={!hasNextPage}
 59:                             className="p-1.5 rounded-lg hover:bg-white disabled:opacity-20 transition-all active:scale-90"
 60:                         >
 61:                             <ChevronRight className="w-4 h-4 text-gray-900" />
 62:                         </button>
 63:                     </div>
 64:                     {isAdmin && (
 65:                         <Link 
 66:                             href="/admin/posts" 
 67:                             className="bg-black text-yellow-400 p-2 rounded-xl hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
 68:                         >
 69:                             <PlusCircle className="w-5 h-5" />
 70:                         </Link>
 71:                     )}
 72:                 </div>
 73:             </div>
 74:             {loading ? (
 75:                 <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
 76:                     <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
 77:                     <p className="text-[10px] font-black uppercase tracking-widest">Đang cập nhật tin mới...</p>
 78:                 </div>
 79:             ) : posts.length === 0 ? (
 80:                 <div className="py-12 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 text-gray-400 mx-2">
 81:                     <p className="text-[10px] font-black uppercase tracking-widest">Hộp thư đang trống</p>
 82:                 </div>
 83:             ) : (
 84:                 <div className="relative group">
 85:                     {/* Danh sách vuốt ngang */}
 86:                     <div className="flex gap-4 overflow-x-auto pb-6 px-2 no-scrollbar scroll-smooth snap-x snap-mandatory">
 87:                         {/* Nút Quay lại ở đầu trang nếu không phải trang đầu */}
 88:                         {hasPrevPage && (
 89:                             <div className="flex-none w-[120px] snap-center flex flex-col items-center justify-center gap-3">
 90:                                 <button 
 91:                                     onClick={prevGroup}
 92:                                     className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-black hover:text-yellow-400 transition-all shadow-lg active:scale-90"
 93:                                 >
 94:                                     <ArrowLeftCircle className="w-8 h-8" />
 95:                                 </button>
 96:                                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Quay lại</span>
 97:                             </div>
 98:                         )}
 99:                         {currentVisiblePosts.map((post) => (
100:                             <div key={post.id} className="flex-none w-[85%] sm:w-[350px] snap-center">
101:                                 <PostCard 
102:                                     post={post} 
103:                                     onClick={(p) => setSelectedPostId(p.id)} 
104:                                 />
105:                             </div>
106:                         ))}
107:                         {/* Nút Xem thêm ở cuối trang nếu còn bài */}
108:                         {hasNextPage && (
109:                             <div className="flex-none w-[150px] snap-center flex flex-col items-center justify-center gap-3">
110:                                 <button 
111:                                     onClick={nextGroup}
112:                                     className="w-16 h-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-600 hover:text-white transition-all shadow-lg active:scale-90"
113:                                 >
114:                                     <ArrowRightCircle className="w-8 h-8" />
115:                                 </button>
116:                                 <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Tiếp tục ({posts.length - (startIndex + postsPerPage)})</span>
117:                             </div>
118:                         )}
119:                     </div>
120:                 </div>
121:             )}
122:             {/* Modal Chi tiết */}
123:             {selectedPostId && (
124:                 <PostDetailModal 
125:                     postId={selectedPostId} 
126:                     onClose={() => setSelectedPostId(null)} 
127:                 />
128:             )}
129:         </div>
130:     )
131: }
````

## File: components/home/CourseSection.tsx
````typescript
  1: 'use client'
  2: import React, { useState, useEffect, useRef } from 'react'
  3: import CourseCard from '@/components/course/CourseCard'
  4: import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
  5: interface CourseSectionProps {
  6:     title: string
  7:     courses: any[]
  8:     session: any
  9:     enrollmentsMap: any
 10:     isCourseOneActive: boolean
 11:     userPhone: string | null
 12:     userId: number | null
 13:     darkMode?: boolean
 14:     accentColor?: string
 15: }
 16: export default function CourseSection({
 17:     title,
 18:     courses,
 19:     session,
 20:     enrollmentsMap,
 21:     isCourseOneActive,
 22:     userPhone,
 23:     userId,
 24:     darkMode = false,
 25:     accentColor = 'bg-blue-600'
 26: }: CourseSectionProps) {
 27:     const [isExpanded, setIsExpanded] = useState(false)
 28:     const [countdown, setCountdown] = useState(10)
 29:     const timerRef = useRef<NodeJS.Timeout | null>(null)
 30:     const intervalRef = useRef<NodeJS.Timeout | null>(null)
 31:     // Hàm reset bộ đếm thời gian
 32:     const resetTimer = () => {
 33:         if (timerRef.current) clearTimeout(timerRef.current)
 34:         if (intervalRef.current) clearInterval(intervalRef.current)
 35:         if (isExpanded) {
 36:             setCountdown(10)
 37:             // Đếm ngược số giây
 38:             intervalRef.current = setInterval(() => {
 39:                 setCountdown(prev => (prev > 0 ? prev - 1 : 0))
 40:             }, 1000)
 41:             // Thực hiện thu gọn sau 10 giây
 42:             timerRef.current = setTimeout(() => {
 43:                 setIsExpanded(false)
 44:             }, 10000)
 45:         }
 46:     }
 47:     useEffect(() => {
 48:         if (isExpanded) {
 49:             resetTimer()
 50:             const handleActivity = () => resetTimer()
 51:             window.addEventListener('scroll', handleActivity)
 52:             window.addEventListener('touchmove', handleActivity)
 53:             return () => {
 54:                 if (timerRef.current) clearTimeout(timerRef.current)
 55:                 if (intervalRef.current) clearInterval(intervalRef.current)
 56:                 window.removeEventListener('scroll', handleActivity)
 57:                 window.removeEventListener('touchmove', handleActivity)
 58:             }
 59:         }
 60:     }, [isExpanded])
 61:     // Chỉ hiển thị 3 khóa học đầu tiên nếu chưa nhấn "Xem thêm"
 62:     const visibleCourses = isExpanded ? courses : courses.slice(0, 3)
 63:     const hasMore = courses.length > 3
 64:     return (
 65:         <div className={`mb-12 rounded-3xl transition-all duration-500 ${darkMode ? '-mx-4 px-4 py-10 bg-zinc-950 shadow-2xl shadow-black/50' : ''}`}>
 66:             {/* Thông báo đếm ngược nổi */}
 67:             {isExpanded && (
 68:                 <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
 69:                     <div className="bg-black/90 backdrop-blur-md text-yellow-400 px-4 py-2 rounded-full border border-yellow-400/30 shadow-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ring-4 ring-black/10">
 70:                         <Clock className="w-3 h-3 animate-pulse" />
 71:                         <span>Tự động thu gọn sau <span className="text-white text-xs">{countdown}</span> giây</span>
 72:                     </div>
 73:                 </div>
 74:             )}
 75:             <div className="mb-8 text-center">
 76:                 <h2 className={`text-2xl font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
 77:                     {title}
 78:                 </h2>
 79:                 <div className={`mx-auto mt-2 h-1 w-12 rounded-full ${accentColor}`}></div>
 80:             </div>
 81:             <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
 82:                 {visibleCourses.map((course: any, index: number) => (
 83:                     <div key={course.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
 84:                         <CourseCard
 85:                             course={course}
 86:                             isLoggedIn={!!session}
 87:                             enrollment={enrollmentsMap[course.id] || null}
 88:                             isCourseOneActive={isCourseOneActive}
 89:                             userPhone={userPhone}
 90:                             userId={userId}
 91:                             priority={index < 3}
 92:                             darkMode={darkMode}
 93:                         />
 94:                     </div>
 95:                 ))}
 96:             </div>
 97:             {hasMore && (
 98:                 <div className="mt-10 flex justify-center">
 99:                     <button
100:                         onClick={() => setIsExpanded(!isExpanded)}
101:                         className={`group flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
102:                             darkMode 
103:                             ? 'bg-white text-black hover:bg-yellow-400' 
104:                             : 'bg-black text-white hover:bg-zinc-800'
105:                         }`}
106:                     >
107:                         {isExpanded ? (
108:                             <> Thu gọn <ChevronUp className="w-4 h-4" /> </>
109:                         ) : (
110:                             <> Xem thêm ({courses.length - 3}) <ChevronDown className="w-4 h-4 animate-bounce group-hover:animate-none" /> </>
111:                         )}
112:                     </button>
113:                 </div>
114:             )}
115:         </div>
116:     )
117: }
````

## File: components/home/PostCard.tsx
````typescript
 1: 'use client'
 2: import React from 'react'
 3: import { MessageSquare, Clock, User as UserIcon } from 'lucide-react'
 4: import { formatDistanceToNow } from 'date-fns'
 5: import { vi } from 'date-fns/locale'
 6: interface PostCardProps {
 7:     post: any
 8:     onClick: (post: any) => void
 9: }
10: export default function PostCard({ post, onClick }: PostCardProps) {
11:     return (
12:         <div 
13:             onClick={() => onClick(post)}
14:             className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-100/50 space-y-4 cursor-pointer hover:shadow-xl transition-all active:scale-[0.98]"
15:         >
16:             {post.image && (
17:                 <div className="aspect-video w-full rounded-2xl overflow-hidden bg-gray-100">
18:                     <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
19:                 </div>
20:             )}
21:             <div className="space-y-2">
22:                 <div className="flex items-center justify-between">
23:                     <div className="flex items-center gap-2 text-[10px] font-black text-purple-600 uppercase tracking-widest">
24:                         <UserIcon className="w-3 h-3" />
25:                         <span>{post.author?.name || 'Admin'}</span>
26:                     </div>
27:                     <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase">
28:                         <Clock className="w-3 h-3" />
29:                         <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })}</span>
30:                     </div>
31:                 </div>
32:                 <h3 className="font-black text-gray-900 text-lg leading-tight line-clamp-2 uppercase tracking-tight">
33:                     {post.title}
34:                 </h3>
35:                 <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed">
36:                     {post.content}
37:                 </p>
38:             </div>
39:             <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
40:                 <div className="flex items-center gap-1.5">
41:                     <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
42:                     <span>{post._count?.comments || 0} bình luận</span>
43:                 </div>
44:                 <span className="text-purple-600">Xem chi tiết →</span>
45:             </div>
46:         </div>
47:     )
48: }
````

## File: components/home/PostDetailModal.tsx
````typescript
  1: 'use client'
  2: import React, { useState, useEffect } from 'react'
  3: import { X, Send, User as UserIcon, Clock, MessageCircle, Loader2 } from 'lucide-react'
  4: import { getPostDetailAction, commentOnPostAction } from '@/app/actions/post-actions'
  5: import { formatDistanceToNow } from 'date-fns'
  6: import { vi } from 'date-fns/locale'
  7: interface PostDetailModalProps {
  8:     postId: string
  9:     onClose: () => void
 10: }
 11: export default function PostDetailModal({ postId, onClose }: PostDetailModalProps) {
 12:     const [post, setPost] = useState<any>(null)
 13:     const [loading, setLoading] = useState(true)
 14:     const [comment, setComment] = useState('')
 15:     const [submitting, setSubmitting] = useState(false)
 16:     const fetchDetail = async () => {
 17:         setLoading(true)
 18:         const res = await getPostDetailAction(postId)
 19:         if (res.success) {
 20:             setPost(res.post)
 21:         }
 22:         setLoading(false)
 23:     }
 24:     useEffect(() => {
 25:         fetchDetail()
 26:     }, [postId])
 27:     const handleComment = async (e: React.FormEvent) => {
 28:         e.preventDefault()
 29:         if (!comment.trim() || submitting) return
 30:         setSubmitting(true)
 31:         const res = await commentOnPostAction(postId, comment)
 32:         if (res.success) {
 33:             setComment('')
 34:             fetchDetail() // Refresh comments
 35:         } else {
 36:             alert(res.error)
 37:         }
 38:         setSubmitting(false)
 39:     }
 40:     return (
 41:         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
 42:             <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
 43:                 {/* Header */}
 44:                 <div className="bg-black p-5 text-white flex justify-between items-center shrink-0">
 45:                     <div className="flex items-center gap-3">
 46:                         <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-black font-black">
 47:                             BRK
 48:                         </div>
 49:                         <div>
 50:                             <h3 className="font-black text-xs uppercase tracking-widest text-yellow-400">Bảng tin cộng đồng</h3>
 51:                             <p className="text-[9px] opacity-60 font-bold uppercase">Chi tiết bài viết & thảo luận</p>
 52:                         </div>
 53:                     </div>
 54:                     <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
 55:                 </div>
 56:                 {loading ? (
 57:                     <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
 58:                         <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
 59:                         <p className="text-[10px] font-black uppercase">Đang tải bài viết...</p>
 60:                     </div>
 61:                 ) : post ? (
 62:                     <div className="flex-1 flex flex-col overflow-hidden">
 63:                         {/* Post Content */}
 64:                         <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
 65:                             <div className="space-y-4">
 66:                                 <div className="flex items-center justify-between">
 67:                                     <div className="flex items-center gap-2">
 68:                                         <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
 69:                                             {post.author?.name?.charAt(0) || 'A'}
 70:                                         </div>
 71:                                         <div>
 72:                                             <p className="text-xs font-black text-gray-900">{post.author?.name || 'Admin'}</p>
 73:                                             <p className="text-[9px] text-gray-400 font-bold uppercase">
 74:                                                 {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })}
 75:                                             </p>
 76:                                         </div>
 77:                                     </div>
 78:                                 </div>
 79:                                 <h2 className="text-2xl font-black text-gray-900 leading-tight uppercase tracking-tight">
 80:                                     {post.title}
 81:                                 </h2>
 82:                                 {post.image && (
 83:                                     <div className="rounded-3xl overflow-hidden border border-gray-100">
 84:                                         <img src={post.image} alt={post.title} className="w-full h-auto" />
 85:                                     </div>
 86:                                 )}
 87:                                 <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
 88:                                     {post.content}
 89:                                 </div>
 90:                             </div>
 91:                             {/* Comments Section */}
 92:                             <div className="pt-10 space-y-6 border-t border-gray-100">
 93:                                 <div className="flex items-center gap-2">
 94:                                     <MessageCircle className="w-5 h-5 text-blue-500" />
 95:                                     <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">
 96:                                         Thảo luận ({post.comments?.length || 0})
 97:                                     </h4>
 98:                                 </div>
 99:                                 <div className="space-y-4">
100:                                     {post.comments?.map((c: any) => (
101:                                         <div key={c.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2">
102:                                             <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] font-black shrink-0">
103:                                                 {c.user?.name?.charAt(0) || '?'}
104:                                             </div>
105:                                             <div className="bg-gray-50 p-3 rounded-2xl rounded-tl-none flex-1">
106:                                                 <div className="flex justify-between items-center mb-1">
107:                                                     <span className="text-[10px] font-black text-gray-900">{c.user?.name}</span>
108:                                                     <span className="text-[8px] text-gray-400 font-bold uppercase">
109:                                                         {formatDistanceToNow(new Date(c.createdAt), { locale: vi })}
110:                                                     </span>
111:                                                 </div>
112:                                                 <p className="text-xs text-gray-600 leading-relaxed font-medium">{c.content}</p>
113:                                             </div>
114:                                         </div>
115:                                     ))}
116:                                     {post.comments?.length === 0 && (
117:                                         <p className="text-center py-4 text-gray-400 text-[10px] font-black uppercase tracking-tighter">
118:                                             Chưa có thảo luận nào. Hãy là người đầu tiên!
119:                                         </p>
120:                                     )}
121:                                 </div>
122:                             </div>
123:                         </div>
124:                         {/* Comment Input */}
125:                         <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
126:                             <form onSubmit={handleComment} className="flex gap-2 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-purple-500 transition-all">
127:                                 <input 
128:                                     type="text" 
129:                                     value={comment}
130:                                     onChange={(e) => setComment(e.target.value)}
131:                                     placeholder="Viết cảm nghĩ của bạn..." 
132:                                     className="flex-1 bg-transparent px-4 py-2 text-xs font-bold outline-none"
133:                                 />
134:                                 <button 
135:                                     type="submit"
136:                                     disabled={!comment.trim() || submitting}
137:                                     className="w-10 h-10 bg-black text-yellow-400 rounded-xl flex items-center justify-center hover:bg-zinc-800 active:scale-90 transition-all disabled:opacity-30"
138:                                 >
139:                                     {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
140:                                 </button>
141:                             </form>
142:                         </div>
143:                     </div>
144:                 ) : (
145:                     <div className="flex-1 flex items-center justify-center text-gray-400 uppercase text-[10px] font-black">
146:                         Không tìm thấy nội dung
147:                     </div>
148:                 )}
149:             </div>
150:         </div>
151:     )
152: }
````

## File: components/home/RealityMap.tsx
````typescript
  1: 'use client'
  2: import React, { useState, useEffect } from 'react'
  3: import { CheckCircle2, Lock, Flame, Star, Trophy, ArrowRight, Flag, ChevronRight, RefreshCcw, X, PlayCircle, BookOpen } from 'lucide-react'
  4: import Link from 'next/link'
  5: interface RealityMapProps {
  6:     customPath: number[]
  7:     enrollmentsMap: any
  8:     allCourses: any[]
  9:     userGoal: string
 10:     onReset: () => void
 11: }
 12: // ─── Component Popup Chi tiết Khóa học ─────────────────────────────────────
 13: function CourseDetailModal({ course, enrollment, onClose }: { course: any, enrollment: any, onClose: () => void }) {
 14:     const isCompleted = enrollment?.completedCount === enrollment?.totalLessons && enrollment?.totalLessons > 0
 15:     const isActive = enrollment?.status === 'ACTIVE'
 16:     return (
 17:         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
 18:             <div className="bg-zinc-900 w-full max-w-sm rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
 19:                 {/* Ảnh bìa hoặc Header */}
 20:                 <div className="h-32 bg-gradient-to-br from-purple-600 to-indigo-800 relative flex items-center justify-center">
 21:                     <BookOpen className="w-12 h-12 text-white/20" />
 22:                     <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors">
 23:                         <X className="w-5 h-5 text-white" />
 24:                     </button>
 25:                 </div>
 26:                 <div className="p-8 space-y-6">
 27:                     <div className="space-y-2">
 28:                         <div className="flex items-center gap-2">
 29:                             <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
 30:                                 {isActive ? 'Đã kích hoạt' : 'Chưa sở hữu'}
 31:                             </span>
 32:                         </div>
 33:                         <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">{course.name_lop}</h3>
 34:                         <p className="text-gray-400 text-sm font-medium line-clamp-3">{course.mo_ta_ngan || 'Khám phá những kiến thức thực chiến cùng Học viện BRK.'}</p>
 35:                     </div>
 36:                     {isActive ? (
 37:                         <Link 
 38:                             href={`/courses/${course.id_khoa}/learn`}
 39:                             className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-500 transition-all active:scale-95 shadow-lg shadow-yellow-400/10"
 40:                         >
 41:                             <PlayCircle className="w-5 h-5" /> Vào học ngay
 42:                         </Link>
 43:                     ) : (
 44:                         <Link 
 45:                             href={`/#khoa-hoc`}
 46:                             onClick={onClose}
 47:                             className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95"
 48:                         >
 49:                             Tìm hiểu thêm
 50:                         </Link>
 51:                     )}
 52:                 </div>
 53:             </div>
 54:         </div>
 55:     )
 56: }
 57: export default function RealityMap({ customPath, enrollmentsMap, allCourses, userGoal, onReset }: RealityMapProps) {
 58:     const [activeStage, setActiveStage] = useState<number | null>(null)
 59:     const [highlightedIds, setHighlightedIds] = useState<number[]>([])
 60:     const [selectedCourse, setSelectedCourse] = useState<any>(null)
 61:     const stages = [
 62:         { id: 1, name: 'Nền tảng số', courseIds: [15] },
 63:         { id: 2, name: 'Video & Traffic', courseIds: [18, 3] },
 64:         { id: 3, name: 'Livestream CB', courseIds: [4] },
 65:         { id: 4, name: 'Kỹ năng NC', courseIds: [19] },
 66:         { id: 5, name: 'Nhân hiệu & Đào tạo', courseIds: [2, 20] },
 67:         { id: 6, name: 'Hệ thống bền vững', courseIds: [21, 22] },
 68:     ]
 69:     const handleStageClick = (stage: any) => {
 70:         if (activeStage === stage.id) {
 71:             setActiveStage(null)
 72:             setHighlightedIds([])
 73:         } else {
 74:             setActiveStage(stage.id)
 75:             setHighlightedIds(stage.courseIds)
 76:         }
 77:     }
 78:     useEffect(() => {
 79:         if (highlightedIds.length > 0) {
 80:             const timer = setTimeout(() => setHighlightedIds([]), 5000)
 81:             return () => clearTimeout(timer)
 82:         }
 83:     }, [highlightedIds])
 84:     return (
 85:         <div className="bg-zinc-950 rounded-[3rem] p-6 md:p-10 text-white border border-white/10 shadow-2xl relative overflow-hidden">
 86:             <div className="absolute -top-24 -left-24 w-64 h-64 bg-yellow-500/10 rounded-full blur-[100px]"></div>
 87:             <div className="relative z-10 space-y-10">
 88:                 {/* 1. Header & Reset Button */}
 89:                 <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
 90:                     <div className="space-y-2">
 91:                         <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">
 92:                             Bức tranh <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 text-glow">hiện thực</span>
 93:                         </h2>
 94:                         <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Mục tiêu: <span className="text-white">{userGoal}</span></p>
 95:                     </div>
 96:                     <button 
 97:                         onClick={onReset}
 98:                         className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-gray-400 active:scale-95"
 99:                     >
100:                         <RefreshCcw className="w-3.5 h-3.5" /> Thiết lập lại lộ trình
101:                     </button>
102:                 </div>
103:                 {/* 2. Timeline ngang */}
104:                 <div className="space-y-4">
105:                     <div className="flex items-center gap-2 px-2">
106:                         <Flag className="w-4 h-4 text-yellow-400" />
107:                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Lộ trình chặng đường</span>
108:                     </div>
109:                     <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x">
110:                         {stages.map((stage, idx) => (
111:                             <button
112:                                 key={stage.id}
113:                                 onClick={() => handleStageClick(stage)}
114:                                 className={`flex-none w-40 snap-start p-4 rounded-2xl border transition-all duration-300 relative group ${
115:                                     activeStage === stage.id 
116:                                     ? 'bg-yellow-400 border-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.3)]' 
117:                                     : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
118:                                 }`}
119:                             >
120:                                 <div className="text-[9px] font-black uppercase opacity-60 mb-1">Chặng {stage.id}</div>
121:                                 <div className="font-black text-[11px] uppercase leading-tight">{stage.name}</div>
122:                                 {idx < stages.length - 1 && (
123:                                     <ChevronRight className={`absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 z-20 ${activeStage === stage.id ? 'text-yellow-400' : 'text-gray-700'}`} />
124:                                 )}
125:                             </button>
126:                         ))}
127:                     </div>
128:                 </div>
129:                 {/* 3. Ma trận Mảnh ghép */}
130:                 <div className="space-y-4">
131:                     <div className="flex items-center gap-2 px-2">
132:                         <Star className="w-4 h-4 text-purple-500" />
133:                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ma trận mảnh ghép kiến thức (Nhấn để xem)</span>
134:                     </div>
135:                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
136:                         {customPath.map((courseId) => {
137:                             const course = allCourses.find(c => c.id === courseId)
138:                             if (!course) return null
139:                             const enrollment = enrollmentsMap[courseId]
140:                             const isCompleted = enrollment?.completedCount === enrollment?.totalLessons && enrollment?.totalLessons > 0
141:                             const isActive = enrollment?.status === 'ACTIVE'
142:                             const isHighlighted = highlightedIds.includes(courseId)
143:                             return (
144:                                 <button 
145:                                     key={courseId}
146:                                     onClick={() => setSelectedCourse({ ...course, enrollment })}
147:                                     className={`relative aspect-square rounded-[2rem] p-4 flex flex-col items-center justify-center text-center border-2 transition-all duration-500 active:scale-90 ${
148:                                         isHighlighted 
149:                                         ? 'border-yellow-400 bg-yellow-400/20 animate-pulse scale-105 z-20 shadow-[0_0_30px_rgba(250,204,21,0.5)]' 
150:                                         : isCompleted
151:                                         ? 'border-emerald-500/50 bg-emerald-500/10'
152:                                         : isActive
153:                                         ? 'border-orange-500/50 bg-orange-500/10'
154:                                         : 'border-white/5 bg-white/5 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 hover:bg-white/10'
155:                                     }`}
156:                                 >
157:                                     <div className="absolute top-3 right-3">
158:                                         {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : isActive ? <Flame className="w-4 h-4 text-orange-500 animate-bounce" /> : <Lock className="w-3 h-3 text-gray-600" />}
159:                                     </div>
160:                                     <div className="text-2xl mb-2 filter drop-shadow-md">{isCompleted ? '🌟' : isActive ? '📖' : '🧩'}</div>
161:                                     <h4 className="text-[9px] font-black uppercase tracking-tighter leading-tight line-clamp-2 px-1">{course.name_lop}</h4>
162:                                     {isActive && !isCompleted && (
163:                                         <div className="mt-2 w-full px-2">
164:                                             <div className="h-1 bg-black/40 rounded-full overflow-hidden">
165:                                                 <div className="h-full bg-yellow-500 transition-all duration-1000" style={{ width: `${Math.round((enrollment.completedCount / enrollment.totalLessons) * 100)}%` }} />
166:                                             </div>
167:                                         </div>
168:                                     )}
169:                                 </button>
170:                             )
171:                         })}
172:                         <div className={`aspect-square rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center text-center ${activeStage === 6 ? 'border-yellow-400 bg-yellow-400/5 text-yellow-400' : 'border-white/10 text-white/10'}`}>
173:                             <Trophy className="w-8 h-8 mb-1" />
174:                             <span className="text-[8px] font-black uppercase tracking-widest">Hero<br/>Status</span>
175:                         </div>
176:                     </div>
177:                 </div>
178:                 <div className="pt-4 flex flex-wrap gap-4 justify-center border-t border-white/5 text-[8px] font-black uppercase tracking-widest text-gray-500">
179:                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Hoàn thành</div>
180:                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Đang học</div>
181:                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-700"></div> Chưa mở</div>
182:                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div> Đang chọn</div>
183:                 </div>
184:             </div>
185:             {/* Popup chi tiết mảnh ghép */}
186:             {selectedCourse && (
187:                 <CourseDetailModal 
188:                     course={selectedCourse} 
189:                     enrollment={selectedCourse.enrollment} 
190:                     onClose={() => setSelectedCourse(null)} 
191:                 />
192:             )}
193:         </div>
194:     )
195: }
````

## File: components/home/Zero2HeroSurvey.tsx
````typescript
  1: 'use client'
  2: import React, { useState } from 'react'
  3: import { surveyQuestions } from '@/lib/survey-data'
  4: import { saveSurveyResultAction } from '@/app/actions/survey-actions'
  5: import { Target, CheckCircle2, ChevronRight, Loader2, ArrowLeft, HelpCircle, Play, Info, Send } from 'lucide-react'
  6: // ─── Component Popup Tư Vấn ────────────────────────────────────────────────
  7: function AdviceModal({ type, onClose }: { type: string, onClose: () => void }) {
  8:     return (
  9:         <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
 10:             <div className="bg-zinc-900 w-full max-w-xl rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
 11:                 <div className="aspect-video bg-black relative flex items-center justify-center group cursor-pointer">
 12:                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
 13:                     <Play className="w-16 h-16 text-yellow-400 fill-current group-hover:scale-110 transition-transform" />
 14:                     <p className="absolute bottom-4 left-6 text-white font-black uppercase tracking-widest text-xs">Video tư vấn lộ trình BRK</p>
 15:                 </div>
 16:                 <div className="p-8 space-y-4">
 17:                     <h3 className="text-2xl font-black text-white uppercase">Cố vấn định hướng</h3>
 18:                     <p className="text-gray-400 text-sm leading-relaxed font-medium">
 19:                         Chúng tôi hiểu bạn đang phân vân. Video trên sẽ giúp bạn hiểu rõ từng hướng đi tại Học viện. 
 20:                         Sau khi xem xong, hãy quay lại và chọn mục tiêu mà bạn cảm thấy tự tin nhất để bắt đầu.
 21:                     </p>
 22:                     <button 
 23:                         onClick={onClose}
 24:                         className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-yellow-500 transition-all active:scale-95"
 25:                     >
 26:                         Tôi đã hiểu - Quay lại chọn
 27:                     </button>
 28:                 </div>
 29:             </div>
 30:         </div>
 31:     )
 32: }
 33: export default function Zero2HeroSurvey({ onComplete }: { onComplete?: () => void }) {
 34:     const [currentStep, setCurrentStep] = useState('q1')
 35:     const [history, setHistory] = useState<string[]>([])
 36:     const [answers, setAnswers] = useState<Record<string, any>>({})
 37:     const [isSubmitting, setIsSubmitting] = useState(false)
 38:     const [showSuccess, setShowSuccess] = useState(false)
 39:     const [showAdvice, setShowAdvice] = useState(false)
 40:     // Form inputs state
 41:     const [input1, setInput1] = useState('') // Tên kênh/shop/lĩnh vực
 42:     const [input2, setInput2] = useState('') // ID TikTok
 43:     const [videoPerDay, setVideoPerDay] = useState('1')
 44:     const [days, setDays] = useState('30')
 45:     const [targetVal, setTargetVal] = useState('1000')
 46:     const question = surveyQuestions[currentStep]
 47:     const handleBack = () => {
 48:         if (history.length > 0) {
 49:             const prev = [...history]
 50:             const last = prev.pop()!
 51:             setHistory(prev)
 52:             setCurrentStep(last)
 53:         }
 54:     }
 55:     const handleNext = async (optionId: string, nextId?: string, isAdvice?: boolean) => {
 56:         if (isAdvice) {
 57:             setShowAdvice(true)
 58:             return
 59:         }
 60:         const newAnswers = { ...answers, [currentStep]: optionId }
 61:         // Xử lý các Input đặc biệt trước khi đi tiếp
 62:         if (question.type === 'INPUT_ACCOUNT') {
 63:             newAnswers[`${currentStep}_name`] = input1
 64:             newAnswers[`${currentStep}_id`] = input2
 65:             newAnswers[`${currentStep}_status`] = optionId
 66:         }
 67:         if (question.type === 'INPUT_GOAL') {
 68:             newAnswers['goal_config'] = { videoPerDay, days, targetVal }
 69:         }
 70:         setAnswers(newAnswers)
 71:         if (nextId && nextId !== 'done') {
 72:             setHistory([...history, currentStep])
 73:             setCurrentStep(nextId)
 74:             // Reset inputs cho bước sau
 75:             setInput1('')
 76:             setInput2('')
 77:         } else {
 78:             setIsSubmitting(true)
 79:             const res = await saveSurveyResultAction(newAnswers)
 80:             if (res.success) {
 81:                 setShowSuccess(true)
 82:                 if (onComplete) setTimeout(onComplete, 3000)
 83:             } else {
 84:                 alert(res.error)
 85:                 setIsSubmitting(false)
 86:             }
 87:         }
 88:     }
 89:     if (showSuccess) return (
 90:         <div className="bg-zinc-950 rounded-[2.5rem] p-10 text-center text-white border border-white/10 shadow-2xl animate-in zoom-in-95">
 91:             <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/20">
 92:                 <CheckCircle2 className="w-10 h-10" />
 93:             </div>
 94:             <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Lộ trình đã sẵn sàng!</h2>
 95:             <p className="text-gray-400 text-sm mb-8">AI đã thiết kế xong Bức tranh hiện thực của riêng bạn.</p>
 96:             <Loader2 className="w-6 h-6 animate-spin text-yellow-400 mx-auto" />
 97:         </div>
 98:     )
 99:     return (
100:         <div className="bg-zinc-950 rounded-[3rem] p-6 md:p-10 text-white border border-white/10 shadow-2xl relative overflow-hidden">
101:             <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px]"></div>
102:             <div className="relative z-10">
103:                 {/* Header Survey */}
104:                 <div className="flex items-center justify-between mb-8">
105:                     <div className="flex items-center gap-3">
106:                         <div className="w-10 h-10 rounded-2xl bg-yellow-400 flex items-center justify-center text-black shadow-lg shadow-yellow-400/20">
107:                             <Target className="w-5 h-5" />
108:                         </div>
109:                         <div>
110:                             <h2 className="text-lg font-black uppercase tracking-tight">Zero 2 Hero</h2>
111:                             <div className="flex gap-1 mt-1">
112:                                 {Array.from({ length: 4 }).map((_, i) => (
113:                                     <div key={i} className={`h-1 w-4 rounded-full ${i <= history.length ? 'bg-yellow-400' : 'bg-white/10'}`}></div>
114:                                 ))}
115:                             </div>
116:                         </div>
117:                     </div>
118:                     {history.length > 0 && (
119:                         <button onClick={handleBack} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400"><ArrowLeft className="w-5 h-5" /></button>
120:                     )}
121:                 </div>
122:                 <div className="animate-in slide-in-from-right-4 fade-in duration-300">
123:                     <h3 className="text-2xl font-black leading-tight mb-2 uppercase tracking-tight">{question.question}</h3>
124:                     <p className="text-gray-400 text-sm mb-8 font-medium">{question.subtitle || 'Hãy cung cấp thông tin chính xác để AI thiết kế lộ trình.'}</p>
125:                     {/* CHOICE TYPE */}
126:                     {question.type === 'CHOICE' && (
127:                         <div className="grid grid-cols-1 gap-3">
128:                             {question.options?.map(opt => (
129:                                 <button
130:                                     key={opt.id}
131:                                     onClick={() => handleNext(opt.id, opt.nextQuestionId, opt.isAdvice)}
132:                                     className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl transition-all flex items-center justify-between group active:scale-[0.98]"
133:                                 >
134:                                     <span className="font-bold text-gray-200 group-hover:text-white">{opt.label}</span>
135:                                     <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-yellow-400" />
136:                                 </button>
137:                             ))}
138:                         </div>
139:                     )}
140:                     {/* INPUT ACCOUNT TYPE */}
141:                     {question.type === 'INPUT_ACCOUNT' && (
142:                         <div className="space-y-6">
143:                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
144:                                 <div className="space-y-1.5">
145:                                     <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Tên Shop / Kênh / Lĩnh vực</label>
146:                                     <input type="text" value={input1} onChange={e => setInput1(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500" placeholder="Nhập tên..." />
147:                                 </div>
148:                                 <div className="space-y-1.5">
149:                                     <label className="text-[10px] font-black uppercase text-gray-500 ml-1">ID TikTok / Link Kênh</label>
150:                                     <input type="text" value={input2} onChange={e => setInput2(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500" placeholder="@id_cua_ban" />
151:                                 </div>
152:                             </div>
153:                             <div className="flex gap-3">
154:                                 {question.options?.map(opt => (
155:                                     <button
156:                                         key={opt.id}
157:                                         onClick={() => handleNext(opt.id, opt.nextQuestionId)}
158:                                         className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${opt.id === 'yes' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/10' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}
159:                                     >
160:                                         {opt.label}
161:                                     </button>
162:                                 ))}
163:                             </div>
164:                         </div>
165:                     )}
166:                     {/* INPUT GOAL TYPE */}
167:                     {question.type === 'INPUT_GOAL' && (
168:                         <div className="space-y-6">
169:                             <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-6">
170:                                 <div className="flex flex-wrap items-center gap-3 text-sm font-bold leading-relaxed">
171:                                     <span>Tôi sẽ làm</span>
172:                                     <input type="number" value={videoPerDay} onChange={e => setVideoPerDay(e.target.value)} className="w-16 bg-white/10 border-none rounded-lg px-2 py-1 text-center text-yellow-400 outline-none" />
173:                                     <span>video/ngày đều đặn trong</span>
174:                                     <input type="number" value={days} onChange={e => setDays(e.target.value)} className="w-16 bg-white/10 border-none rounded-lg px-2 py-1 text-center text-yellow-400 outline-none" />
175:                                     <span>ngày để đạt</span>
176:                                     <input type="number" value={targetVal} onChange={e => setTargetVal(e.target.value)} className="w-24 bg-white/10 border-none rounded-lg px-2 py-1 text-center text-yellow-400 outline-none" />
177:                                     <span className="text-gray-400 font-medium">Follow / Đơn hàng</span>
178:                                 </div>
179:                             </div>
180:                             <button
181:                                 onClick={() => handleNext('yes', 'done')}
182:                                 className="w-full bg-black text-yellow-400 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-zinc-800 transition-all active:scale-95"
183:                             >
184:                                 <Send className="w-4 h-4" /> Xác nhận lộ trình & Cam kết
185:                             </button>
186:                         </div>
187:                     )}
188:                 </div>
189:             </div>
190:             {/* Advice Modal */}
191:             {showAdvice && <AdviceModal type={currentStep} onClose={() => setShowAdvice(false)} />}
192:         </div>
193:     )
194: }
````

## File: components/ImageViewer.tsx
````typescript
  1: "use client"
  2: import { useEffect, useRef, useState } from "react"
  3: export default function ImageViewer() {
  4:   const [src, setSrc] = useState<string | null>(null)
  5:   const [scale, setScale] = useState(1)
  6:   const [position, setPosition] = useState({ x: 0, y: 0 })
  7:   const dragging = useRef(false)
  8:   const lastPos = useRef({ x: 0, y: 0 })
  9:   const imgRef = useRef<HTMLImageElement | null>(null)
 10:   // Click ảnh trong prose
 11:   useEffect(() => {
 12:     const handleClick = (e: any) => {
 13:       const img = e.target.closest(".prose img")
 14:       if (!img) return
 15:       setSrc(img.src)
 16:       setScale(1)
 17:       setPosition({ x: 0, y: 0 })
 18:     }
 19:     document.addEventListener("click", handleClick)
 20:     return () => document.removeEventListener("click", handleClick)
 21:   }, [])
 22:   // ESC đóng
 23:   useEffect(() => {
 24:     const handleKey = (e: KeyboardEvent) => {
 25:       if (e.key === "Escape") setSrc(null)
 26:     }
 27:     if (src) document.addEventListener("keydown", handleKey)
 28:     return () => document.removeEventListener("keydown", handleKey)
 29:   }, [src])
 30:   if (!src) return null
 31:   const handleWheel = (e: React.WheelEvent) => {
 32:     e.preventDefault()
 33:     setScale((prev) =>
 34:       e.deltaY < 0 ? Math.min(prev + 0.15, 6) : Math.max(prev - 0.15, 1)
 35:     )
 36:   }
 37:   const handleMouseDown = (e: React.MouseEvent) => {
 38:     if (scale <= 1) return
 39:     dragging.current = true
 40:     lastPos.current = { x: e.clientX, y: e.clientY }
 41:   }
 42:   const handleMouseMove = (e: React.MouseEvent) => {
 43:     if (!dragging.current) return
 44:     const dx = e.clientX - lastPos.current.x
 45:     const dy = e.clientY - lastPos.current.y
 46:     setPosition((prev) => ({
 47:       x: prev.x + dx,
 48:       y: prev.y + dy,
 49:     }))
 50:     lastPos.current = { x: e.clientX, y: e.clientY }
 51:   }
 52:   const handleMouseUp = () => {
 53:     dragging.current = false
 54:   }
 55:   const handleDoubleClick = () => {
 56:     if (scale === 1) {
 57:       setScale(2)
 58:     } else {
 59:       setScale(1)
 60:       setPosition({ x: 0, y: 0 })
 61:     }
 62:   }
 63:   return (
 64:     <div
 65:       className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center"
 66:       onClick={() => setSrc(null)}
 67:     >
 68:       <div
 69:         className="relative w-full h-full flex items-center justify-center overflow-hidden"
 70:         onClick={(e) => e.stopPropagation()}
 71:         onWheel={handleWheel}
 72:         onMouseMove={handleMouseMove}
 73:         onMouseUp={handleMouseUp}
 74:         onMouseLeave={handleMouseUp}
 75:       >
 76:         <img
 77:           ref={imgRef}
 78:           src={src}
 79:           alt=""
 80:           draggable={false}
 81:           className="select-none max-w-[90vw] max-h-[90vh] object-contain"
 82:           style={{
 83:             transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
 84:             transition: dragging.current ? "none" : "transform 0.2s ease",
 85:             cursor: scale > 1 ? "grab" : "zoom-in",
 86:           }}
 87:           onMouseDown={handleMouseDown}
 88:           onDoubleClick={handleDoubleClick}
 89:         />
 90:         <div className="absolute top-5 right-5 flex gap-2">
 91:           <button
 92:             onClick={() => setScale((s) => Math.min(s + 0.3, 6))}
 93:             className="bg-white text-black px-3 py-1 rounded shadow"
 94:           >
 95:             +
 96:           </button>
 97:           <button
 98:             onClick={() => {
 99:               setScale(1)
100:               setPosition({ x: 0, y: 0 })
101:             }}
102:             className="bg-white text-black px-3 py-1 rounded shadow"
103:           >
104:             Reset
105:           </button>
106:           <button
107:             onClick={() => setSrc(null)}
108:             className="bg-white text-black px-3 py-1 rounded shadow"
109:           >
110:             ✕
111:           </button>
112:         </div>
113:       </div>
114:     </div>
115:   )
116: }
````

## File: components/payment/UploadProofModal.tsx
````typescript
 1: 'use client'
 2: import { useState, useRef } from 'react'
 3: import { updatePaymentProof } from '@/app/actions/payment-actions'
 4: interface UploadProofModalProps {
 5:     enrollmentId: number
 6:     onClose: () => void
 7:     onSuccess: () => void
 8: }
 9: export default function UploadProofModal({ enrollmentId, onClose, onSuccess }: UploadProofModalProps) {
10:     const [uploading, setUploading] = useState(false)
11:     const [preview, setPreview] = useState<string | null>(null)
12:     const fileInputRef = useRef<HTMLInputElement>(null)
13:     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
14:         const file = e.target.files?.[0]
15:         if (file) {
16:             const reader = new FileReader()
17:             reader.onload = () => setPreview(reader.result as string)
18:             reader.readAsDataURL(file)
19:         }
20:     }
21:     const handleUpload = async () => {
22:         const file = fileInputRef.current?.files?.[0]
23:         if (!file) return
24:         setUploading(true)
25:         try {
26:             const formData = new FormData()
27:             formData.append('file', file)
28:             const response = await fetch('/api/upload/payment', {
29:                 method: 'POST',
30:                 body: formData
31:             })
32:             if (!response.ok) {
33:                 throw new Error('Upload failed')
34:             }
35:             const { url } = await response.json()
36:             const result = await updatePaymentProof(enrollmentId, url)
37:             if (result.success) {
38:                 onSuccess()
39:                 onClose()
40:             } else {
41:                 alert('Cập nhật thất bại: ' + result.error)
42:             }
43:         } catch (error) {
44:             console.error('Upload error:', error)
45:             alert('Upload thất bại. Vui lòng thử lại.')
46:         } finally {
47:             setUploading(false)
48:         }
49:     }
50:     return (
51:         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
52:             <div className="bg-white rounded-2xl p-6 w-full max-w-md">
53:                 <h3 className="text-xl font-bold mb-4">Upload biên lai chuyển khoản</h3>
54:                 <div className="mb-4">
55:                     <label className="block text-sm font-medium text-gray-700 mb-2">
56:                         Chọn ảnh biên lai
57:                     </label>
58:                     <input
59:                         ref={fileInputRef}
60:                         type="file"
61:                         accept="image/*"
62:                         onChange={handleFileChange}
63:                         className="w-full border rounded-lg p-2"
64:                     />
65:                 </div>
66:                 {preview && (
67:                     <div className="mb-4">
68:                         <p className="text-sm text-gray-600 mb-2">Preview:</p>
69:                         <div className="relative w-full h-48 border rounded-lg overflow-hidden">
70:                             <img src={preview} alt="Preview" className="object-contain w-full h-full" />
71:                         </div>
72:                     </div>
73:                 )}
74:                 <div className="flex gap-3">
75:                     <button
76:                         onClick={onClose}
77:                         className="flex-1 px-4 py-2 border rounded-lg font-medium hover:bg-gray-50"
78:                     >
79:                         Hủy
80:                     </button>
81:                     <button
82:                         onClick={handleUpload}
83:                         disabled={!preview || uploading}
84:                         className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
85:                     >
86:                         {uploading ? 'Đang tải...' : 'Xác nhận'}
87:                     </button>
88:                 </div>
89:             </div>
90:         </div>
91:     )
92: }
````

## File: components/ui/button.tsx
````typescript
 1: import * as React from "react"
 2: import { cn } from "@/lib/utils"
 3: export interface ButtonProps
 4:     extends React.ButtonHTMLAttributes<HTMLButtonElement> {
 5:     variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
 6:     size?: 'default' | 'sm' | 'lg' | 'icon'
 7: }
 8: const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 9:     ({ className, variant = 'default', size = 'default', ...props }, ref) => {
10:         const variants = {
11:             default: "bg-primary text-primary-foreground hover:bg-primary/90",
12:             destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
13:             outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
14:             secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
15:             ghost: "hover:bg-accent hover:text-accent-foreground",
16:             link: "text-primary underline-offset-4 hover:underline",
17:         }
18:         const sizes = {
19:             default: "h-10 px-4 py-2",
20:             sm: "h-9 rounded-md px-3",
21:             lg: "h-11 rounded-md px-8",
22:             icon: "h-10 w-10",
23:         }
24:         return (
25:             <button
26:                 className={cn(
27:                     "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
28:                     variants[variant],
29:                     sizes[size],
30:                     className
31:                 )}
32:                 ref={ref}
33:                 {...props}
34:             />
35:         )
36:     }
37: )
38: Button.displayName = "Button"
39: export { Button }
````

## File: components/ui/checkbox.tsx
````typescript
 1: import * as React from "react"
 2: import { cn } from "@/lib/utils"
 3: export interface CheckboxProps
 4:     extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
 5:     onCheckedChange?: (checked: boolean) => void
 6: }
 7: const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
 8:     ({ className, onCheckedChange, checked, ...props }, ref) => {
 9:         return (
10:             <input
11:                 type="checkbox"
12:                 checked={checked}
13:                 onChange={(e) => onCheckedChange?.(e.target.checked)}
14:                 className={cn(
15:                     "h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer",
16:                     className
17:                 )}
18:                 ref={ref}
19:                 {...props}
20:             />
21:         )
22:     }
23: )
24: Checkbox.displayName = "Checkbox"
25: export { Checkbox }
````

## File: components/ui/dialog.tsx
````typescript
 1: 'use client'
 2: import * as React from "react"
 3: import { cn } from "@/lib/utils"
 4: import { X } from "lucide-react"
 5: interface DialogProps {
 6:     open?: boolean
 7:     children: React.ReactNode
 8: }
 9: export function Dialog({ open, children }: DialogProps) {
10:     if (!open) return null
11:     return (
12:         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
13:             {children}
14:         </div>
15:     )
16: }
17: export function DialogContent({ className, children }: { className?: string, children: React.ReactNode }) {
18:     return (
19:         <div className={cn("bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 relative shadow-2xl animate-in zoom-in-95 duration-200", className)}>
20:             {children}
21:         </div>
22:     )
23: }
24: export function DialogHeader({ className, children }: { className?: string, children: React.ReactNode }) {
25:     return <div className={cn("space-y-1.5 text-center sm:text-left", className)}>{children}</div>
26: }
27: export function DialogTitle({ className, children }: { className?: string, children: React.ReactNode }) {
28:     return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>{children}</h2>
29: }
30: export function DialogDescription({ className, children }: { className?: string, children: React.ReactNode }) {
31:     return <p className={cn("text-sm text-zinc-400", className)}>{children}</p>
32: }
33: export function DialogFooter({ className, children }: { className?: string, children: React.ReactNode }) {
34:     return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>{children}</div>
35: }
````

## File: components/ui/input.tsx
````typescript
 1: import * as React from "react"
 2: import { cn } from "@/lib/utils"
 3: export interface InputProps
 4:     extends React.InputHTMLAttributes<HTMLInputElement> { }
 5: const Input = React.forwardRef<HTMLInputElement, InputProps>(
 6:     ({ className, type, ...props }, ref) => {
 7:         return (
 8:             <input
 9:                 type={type}
10:                 className={cn(
11:                     "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
12:                     className
13:                 )}
14:                 ref={ref}
15:                 {...props}
16:             />
17:         )
18:     }
19: )
20: Input.displayName = "Input"
21: export { Input }
````

## File: components/ui/label.tsx
````typescript
 1: import * as React from "react"
 2: import { cn } from "@/lib/utils"
 3: const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
 4:     ({ className, ...props }, ref) => (
 5:         <label
 6:             ref={ref}
 7:             className={cn(
 8:                 "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
 9:                 className
10:             )}
11:             {...props}
12:         />
13:     )
14: )
15: Label.displayName = "Label"
16: export { Label }
````

## File: components/ui/textarea.tsx
````typescript
 1: import * as React from "react"
 2: import { cn } from "@/lib/utils"
 3: export interface TextareaProps
 4:     extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }
 5: const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
 6:     ({ className, ...props }, ref) => {
 7:         return (
 8:             <textarea
 9:                 className={cn(
10:                     "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
11:                     className
12:                 )}
13:                 ref={ref}
14:                 {...props}
15:             />
16:         )
17:     }
18: )
19: Textarea.displayName = "Textarea"
20: export { Textarea }
````

## File: lib/constants.ts
````typescript
1: export const RESERVED_IDS = [8668, 3773];
````

## File: lib/normalizeGoogleDocsHtml.ts
````typescript
 1: import DOMPurify from "dompurify"
 2: export function normalizeGoogleDocsHtml(rawHtml: string) {
 3:   if (!rawHtml) return ""
 4:   // 1️⃣ Sanitize trước
 5:   let clean = DOMPurify.sanitize(rawHtml)
 6:   // 2️⃣ Xoá <p><br></p>
 7:   clean = clean.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, "")
 8:   // 3️⃣ Xoá &nbsp; thừa
 9:   clean = clean.replace(/&nbsp;/gi, " ")
10:   // 4️⃣ Xoá div rỗng
11:   clean = clean.replace(/<div>\s*<\/div>/gi, "")
12:   // 5️⃣ Xoá page-break Google Docs
13:   clean = clean.replace(/page-break-after:\s*always;?/gi, "")
14:   // 6️⃣ Xoá margin inline lớn
15:   clean = clean.replace(/margin-[^:]+:\s*\d+px;?/gi, "")
16:   // 7️⃣ Xoá style width cố định
17:   clean = clean.replace(/width="\d+"/gi, "")
18:   clean = clean.replace(/style="[^"]*width:[^;"]*;?[^"]*"/gi, "")
19:   // 8️⃣ Gắn attribute để image viewer dễ xử lý (tùy chọn)
20:   clean = clean.replace(
21:     /<img([^>]+?)src="([^"]+)"([^>]*)>/gi,
22:     `<img $1 src="$2" $3 loading="lazy" />`
23:   )
24:   return clean
25: }
````

## File: lib/survey-data.ts
````typescript
  1: export type SurveyOption = {
  2:     id: string;
  3:     label: string;
  4:     nextQuestionId?: string;
  5:     recommendedCourseIds?: number[];
  6:     isAdvice?: boolean; // Nếu true sẽ mở Popup tư vấn
  7: };
  8: export type SurveyQuestion = {
  9:     id: string;
 10:     question: string;
 11:     subtitle?: string;
 12:     type: 'CHOICE' | 'INPUT_ACCOUNT' | 'INPUT_GOAL';
 13:     options?: SurveyOption[];
 14: };
 15: export const surveyQuestions: Record<string, SurveyQuestion> = {
 16:     // TẦNG 1
 17:     q1: {
 18:         id: 'q1',
 19:         question: 'Bạn muốn học để làm gì?',
 20:         subtitle: 'Xác định hướng đi chính của bạn tại Học viện BRK.',
 21:         type: 'CHOICE',
 22:         options: [
 23:             { id: 'selling', label: 'Bán hàng', nextQuestionId: 'q2_selling' },
 24:             { id: 'branding', label: 'Xây dựng nhân hiệu', nextQuestionId: 'q2_branding' },
 25:             { id: 'spreading', label: 'Lan tỏa giá trị TLGDTG', nextQuestionId: 'q2_spreading' },
 26:             { id: 'unknown', label: 'Chưa biết - cần tư vấn thêm', isAdvice: true }
 27:         ]
 28:     },
 29:     // TẦNG 2: Nhánh Bán hàng
 30:     q2_selling: {
 31:         id: 'q2_selling',
 32:         question: 'Hình thức bán hàng bạn chọn?',
 33:         type: 'CHOICE',
 34:         options: [
 35:             { id: 'own_product', label: 'Bán sản phẩm của bạn', nextQuestionId: 'q3_account_shop' },
 36:             { id: 'affiliate', label: 'Bán tiếp thị liên kết', nextQuestionId: 'q3_account_1k' },
 37:             { id: 'service', label: 'Bán dịch vụ', nextQuestionId: 'q3_account_basic' },
 38:             { id: 'selling_advice', label: 'Chưa rõ, cần tư vấn thêm', isAdvice: true }
 39:         ]
 40:     },
 41:     // TẦNG 2: Nhánh Nhân hiệu
 42:     q2_branding: {
 43:         id: 'q2_branding',
 44:         question: 'Vị thế hiện tại của bạn?',
 45:         type: 'CHOICE',
 46:         options: [
 47:             { id: 'expert', label: 'Đã là chuyên gia trong lĩnh vực', nextQuestionId: 'q3_account_basic' },
 48:             { id: 'learning_expert', label: 'Đang học trở thành chuyên gia', nextQuestionId: 'q3_account_basic' },
 49:             { id: 'branding_advice', label: 'Chưa rõ, cần tư vấn thêm', isAdvice: true }
 50:         ]
 51:     },
 52:     // TẦNG 2: Nhánh Lan tỏa
 53:     q2_spreading: {
 54:         id: 'q2_spreading',
 55:         question: 'Nền tảng nội tâm của bạn?',
 56:         type: 'CHOICE',
 57:         options: [
 58:             { id: 'mentor_wit', label: 'Đã tốt nghiệp Mentor WiT trở lên', nextQuestionId: 'q3_account_basic' },
 59:             { id: 'wit_7', label: 'Đang học Mentor WiT 7', nextQuestionId: 'q3_account_basic' }
 60:         ]
 61:     },
 62:     // TẦNG 3: Kiểm tra tài khoản
 63:     q3_account_shop: {
 64:         id: 'q3_account_shop',
 65:         question: 'Bạn đã có TikTok Shop chưa?',
 66:         type: 'INPUT_ACCOUNT',
 67:         options: [
 68:             { id: 'no', label: 'Chưa có (Cần tạo shop)', nextQuestionId: 'q4_goal' },
 69:             { id: 'yes', label: 'Đã có (Nhập thông tin)', nextQuestionId: 'q4_goal' }
 70:         ]
 71:     },
 72:     q3_account_1k: {
 73:         id: 'q3_account_1k',
 74:         question: 'Tài khoản có trên 1000 follow chưa?',
 75:         type: 'INPUT_ACCOUNT',
 76:         options: [
 77:             { id: 'no', label: 'Chưa có (Cần chinh phục 1k follow)', nextQuestionId: 'q4_goal' },
 78:             { id: 'yes', label: 'Đã có (Nhập thông tin)', nextQuestionId: 'q4_goal' }
 79:         ]
 80:     },
 81:     q3_account_basic: {
 82:         id: 'q3_account_basic',
 83:         question: 'Bạn đã có kênh TikTok/FB/Youtube chưa?',
 84:         type: 'INPUT_ACCOUNT',
 85:         options: [
 86:             { id: 'no', label: 'Chưa có (Cần xây nền tảng)', nextQuestionId: 'q4_goal' },
 87:             { id: 'yes', label: 'Đã có (Nhập thông tin)', nextQuestionId: 'q4_goal' }
 88:         ]
 89:     },
 90:     // TẦNG 4: Mục tiêu
 91:     q4_goal: {
 92:         id: 'q4_goal',
 93:         question: 'Thiết lập mục tiêu hành động',
 94:         type: 'INPUT_GOAL',
 95:         options: [
 96:             { id: 'no', label: 'Chưa có mục tiêu cụ thể', nextQuestionId: 'done' },
 97:             { id: 'yes', label: 'Đã sẵn sàng mục tiêu', nextQuestionId: 'done' }
 98:         ]
 99:     }
100: };
101: /**
102:  * Lộ trình chuẩn của Học viện BRK
103:  * ID: 15(MXH), 18(Video CB), 3(1k Follow), 4(Live CB), 19(Video NC), 19(Live NC), 2(Nhân hiệu), 20(Đào tạo), 21(Cộng đồng), 22(Hệ thống)
104:  */
105: export function generatePathFromAnswers(answers: Record<string, any>): number[] {
106:     const commonPath = [15, 18, 4, 19, 2, 20, 21, 22]; // Lộ trình gốc
107:     let finalPath = [...commonPath];
108:     // Nhánh Affiliate chưa có 1k follow -> Chèn thêm khóa ID 3
109:     if (answers['q2_selling'] === 'affiliate' && answers['q3_account_1k_status'] === 'no') {
110:         if (!finalPath.includes(3)) {
111:             finalPath.splice(2, 0, 3); // Chèn vào vị trí số 3 trong lộ trình
112:         }
113:     }
114:     return finalPath;
115: }
````

## File: lib/utils.ts
````typescript
1: import { clsx, type ClassValue } from "clsx"
2: import { twMerge } from "tailwind-merge"
3: export function cn(...inputs: ClassValue[]) {
4:     return twMerge(clsx(inputs))
5: }
````

## File: lib/utils/id-generator.ts
````typescript
 1: import { RESERVED_IDS } from '../constants';
 2: import prisma from '@/lib/prisma';
 3: export async function generateStudentId(): Promise<number> {
 4:     // Find the highest ID currently in use
 5:     // We exclude reserved IDs from the max calculation to avoid skipping large gaps if a reserved ID is manually inserted.
 6:     // Actually, standard max logic is fine, but we must check if nextId hits a reserved one.
 7:     const aggregation = await prisma.user.aggregate({
 8:         _max: {
 9:             id: true,
10:         },
11:     });
12:     let nextId = (aggregation._max.id ?? 0) + 1;
13:     // Check if nextId is in reserved list
14:     while (RESERVED_IDS.includes(nextId)) {
15:         nextId++;
16:     }
17:     // Also check if this specific ID already exists (in case of race conditions or manual inserts)
18:     // Though with standard max+1 logic, collision is unlikely unless manual insert of arbitrary ID happened.
19:     // Ideally we'd use a transaction or lock, but for MVP this loop is acceptable.
20:     let exists = await prisma.user.findUnique({
21:         where: { id: nextId },
22:     });
23:     while (exists || RESERVED_IDS.includes(nextId)) {
24:         if (RESERVED_IDS.includes(nextId)) {
25:             nextId++;
26:             continue;
27:         }
28:         // If it exists but not reserved (e.g. race condition), try next
29:         nextId++;
30:         exists = await prisma.user.findUnique({
31:             where: { id: nextId },
32:         });
33:     }
34:     return nextId;
35: }
````

## File: middleware.ts
````typescript
1: import NextAuth from "next-auth"
2: import { authConfig } from "./auth.config"
3: const { auth } = NextAuth(authConfig)
4: export default auth((req) => {
5:     // req.auth
6: })
7: export const config = {
8:     matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
9: }
````

## File: prisma/cleanup-duplicates.js
````javascript
 1: const { PrismaClient } = require('@prisma/client')
 2: const prisma = new PrismaClient()
 3: async function main() {
 4:     console.log('Bắt đầu xóa bản ghi trùng lặp trong bảng LessonProgress...')
 5:     // Tìm tất cả các nhóm (enrollmentId, lessonId) bị trùng
 6:     const duplicates = await prisma.lessonProgress.groupBy({
 7:         by: ['enrollmentId', 'lessonId'],
 8:         _count: {
 9:             id: true
10:         },
11:         having: {
12:             id: {
13:                 _count: {
14:                     gt: 1
15:                 }
16:             }
17:         }
18:     })
19:     console.log(`Tìm thấy ${duplicates.length} nhóm trùng lặp. Đang xử lý...`)
20:     let deletedCount = 0
21:     // Xử lý từng nhóm bị trùng
22:     for (const group of duplicates) {
23:         // Lấy tất cả các bản ghi của nhóm này, sắp xếp ID để tìm bản nháp (rác) giữ lại bản mới nhất
24:         const records = await prisma.lessonProgress.findMany({
25:             where: {
26:                 enrollmentId: group.enrollmentId,
27:                 lessonId: group.lessonId
28:             },
29:             orderBy: [
30:                 { status: 'asc' }, // Ưu tiên 'COMPLETED' (C) hoặc 'IN_PROGRESS' (I) lên trước 'RESET' (R)
31:                 { updatedAt: 'desc' }, // Trong cùng status, ưu tiên cái mới cập nhật nhất
32:             ]
33:         })
34:         // Bản ghi đầu tiên là bản ghi cần giữ lại
35:         const [keepRecord, ...deleteRecords] = records
36:         if (deleteRecords.length > 0) {
37:             const deleteIds = deleteRecords.map(r => r.id)
38:             await prisma.lessonProgress.deleteMany({
39:                 where: {
40:                     id: { in: deleteIds }
41:                 }
42:             })
43:             deletedCount += deleteIds.length
44:             console.log(`- Đã giữ lại ID ${keepRecord.id}, xóa ${deleteIds.length} bản ghi rác [${deleteIds.join(', ')}] cho Enrollment ${group.enrollmentId}, Lesson ${group.lessonId}`)
45:         }
46:     }
47:     console.log(`✅ Hoàn tất! Đã xóa tổng cộng ${deletedCount} bản ghi thừa.`)
48: }
49: main()
50:     .catch((e) => {
51:         console.error(e)
52:         process.exit(1)
53:     })
54:     .finally(async () => {
55:         await prisma.$disconnect()
56:     })
````

## File: prisma/migrations/20260217131807_add_autoincrement/migration.sql
````sql
 1: -- CreateEnum
 2: CREATE TYPE "Role" AS ENUM ('ADMIN', 'STUDENT', 'INSTRUCTOR', 'AFFILIATE');
 3: -- CreateTable
 4: CREATE TABLE "User" (
 5:     "id" SERIAL NOT NULL,
 6:     "name" TEXT,
 7:     "email" TEXT NOT NULL,
 8:     "emailVerified" TIMESTAMP(3),
 9:     "image" TEXT,
10:     "password" TEXT,
11:     "phone" TEXT,
12:     "role" "Role" NOT NULL DEFAULT 'STUDENT',
13:     "referrerId" INTEGER DEFAULT 0,
14:     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
15:     "updatedAt" TIMESTAMP(3) NOT NULL,
16:     CONSTRAINT "User_pkey" PRIMARY KEY ("id")
17: );
18: -- CreateTable
19: CREATE TABLE "Account" (
20:     "userId" INTEGER NOT NULL,
21:     "type" TEXT NOT NULL,
22:     "provider" TEXT NOT NULL,
23:     "providerAccountId" TEXT NOT NULL,
24:     "refresh_token" TEXT,
25:     "access_token" TEXT,
26:     "expires_at" INTEGER,
27:     "token_type" TEXT,
28:     "scope" TEXT,
29:     "id_token" TEXT,
30:     "session_state" TEXT,
31:     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
32:     "updatedAt" TIMESTAMP(3) NOT NULL,
33:     CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
34: );
35: -- CreateTable
36: CREATE TABLE "Session" (
37:     "sessionToken" TEXT NOT NULL,
38:     "userId" INTEGER NOT NULL,
39:     "expires" TIMESTAMP(3) NOT NULL,
40:     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
41:     "updatedAt" TIMESTAMP(3) NOT NULL
42: );
43: -- CreateTable
44: CREATE TABLE "VerificationToken" (
45:     "identifier" TEXT NOT NULL,
46:     "token" TEXT NOT NULL,
47:     "expires" TIMESTAMP(3) NOT NULL,
48:     CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
49: );
50: -- CreateTable
51: CREATE TABLE "SystemConfig" (
52:     "key" TEXT NOT NULL,
53:     "value" JSONB NOT NULL,
54:     CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
55: );
56: -- CreateIndex
57: CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
58: -- CreateIndex
59: CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
60: -- CreateIndex
61: CREATE INDEX "User_email_idx" ON "User"("email");
62: -- CreateIndex
63: CREATE INDEX "User_phone_idx" ON "User"("phone");
64: -- CreateIndex
65: CREATE INDEX "User_referrerId_idx" ON "User"("referrerId");
66: -- CreateIndex
67: CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
68: -- AddForeignKey
69: ALTER TABLE "User" ADD CONSTRAINT "User_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
70: -- AddForeignKey
71: ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
72: -- AddForeignKey
73: ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
````

## File: prisma/migrations/migration_lock.toml
````toml
1: # Please do not edit this file manually
2: # It should be added in your version-control system (e.g., Git)
3: provider = "postgresql"
````

## File: prisma/seed.ts
````typescript
 1: import { PrismaClient, Role } from '@prisma/client'
 2: import * as dotenv from 'dotenv'
 3: dotenv.config({ path: '.env.local' })
 4: dotenv.config()
 5: const options: any = {
 6:     datasourceUrl: process.env.DATABASE_URL
 7: }
 8: const prisma = new PrismaClient(options)
 9: async function main() {
10:     console.log('Starting seed...')
11:     try {
12:         const admin = await prisma.user.upsert({
13:             where: { id: 0 },
14:             update: {},
15:             create: {
16:                 id: 0,
17:                 email: 'admin@brk.com',
18:                 name: 'BRK Admin',
19:                 role: Role.ADMIN,
20:                 phone: '0909000000', // Example phone
21:                 // password: admin123
22:                 password: '$2b$10$EpRnTzVlqHNP0.fMdQbL.e/KA/1h.q9s525aw.z8M.CI6k.v1Giv2',
23:             },
24:         })
25:         console.log('Seed successful:', { admin })
26:     } catch (error) {
27:         console.error('Seed failed:', error)
28:         throw error
29:     }
30: }
31: main()
32:     .then(async () => {
33:         await prisma.$disconnect()
34:     })
35:     .catch(async (e) => {
36:         console.error(e)
37:         await prisma.$disconnect()
38:         process.exit(1)
39:     })
````

## File: README.md
````markdown
 1: This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
 2: 
 3: ## Getting Started
 4: 
 5: First, run the development server:
 6: 
 7: ```bash
 8: npm run dev
 9: # or
10: yarn dev
11: # or
12: pnpm dev
13: # or
14: bun dev
15: ```
16: 
17: Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
18: 
19: You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
20: 
21: This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
22: 
23: ## Learn More
24: 
25: To learn more about Next.js, take a look at the following resources:
26: 
27: - [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
28: - [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
29: 
30: You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
31: 
32: ## Deploy on Vercel
33: 
34: The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
35: 
36: Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
````

## File: scripts/add-reserved-id.ts
````typescript
 1: import { PrismaClient } from '@prisma/client'
 2: const prisma = new PrismaClient()
 3: async function main() {
 4:     const args = process.argv.slice(2)
 5:     if (args.length < 1) {
 6:         console.error('Usage: npm run add-reserved <id> [note]')
 7:         process.exit(1)
 8:     }
 9:     const id = parseInt(args[0])
10:     const note = args[1] || 'Reserved by Admin'
11:     if (isNaN(id)) {
12:         console.error('Error: ID must be a number')
13:         process.exit(1)
14:     }
15:     try {
16:         const existing = await prisma.reservedId.findUnique({ where: { id } })
17:         if (existing) {
18:             console.log(`⚠️  ID ${id} is already reserved: "${existing.note}"`)
19:             return
20:         }
21:         await prisma.reservedId.create({
22:             data: {
23:                 id,
24:                 note
25:             }
26:         })
27:         console.log(`✅ Successfully reserved ID ${id} (${note}). New users will skip this ID.`)
28:     } catch (error) {
29:         console.error('❌ Error:', error)
30:     } finally {
31:         await prisma.$disconnect()
32:     }
33: }
34: main()
````

## File: scripts/auto-commit-push.ps1
````powershell
 1: # ================================================================================
 2: # Script: auto-commit-push.ps1
 3: # Mục đích: Backup code hiện tại, đẩy code mới lên GitHub và cập nhật CODE_HISTORY.md
 4: # Cách chạy: powershell -ExecutionPolicy Bypass -File .\scripts\auto-commit-push.ps1
 5: # ================================================================================
 6: 
 7: $ErrorActionPreference = "Stop"
 8: 
 9: # Màu sắc cho output
10: function Write-Green { param($msg) Write-Host $msg -ForegroundColor Green }
11: function Write-Yellow { param($msg) Write-Host $msg -ForegroundColor Yellow }
12: function Write-Red { param($msg) Write-Host $msg -ForegroundColor Red }
13: 
14: Write-Yellow "=== Bat dau auto commit va push ==="
15: 
16: # Buoc 1: Kiem tra co thay doi khong
17: Write-Yellow "Kiem tra thay doi..."
18: $status = git status --porcelain
19: if (-not $status) {
20:     Write-Red "Khong co thay doi nao. Thoat."
21:     exit 0
22: }
23: 
24: # Buoc 2: Hien thi cac file thay doi
25: Write-Yellow "Cac file thay doi:"
26: git status --porcelain
27: 
28: # Buoc 3: Tao mo ta commit
29: $changedFiles = git diff --name-only
30: Write-Green "Cac file thay doi:"
31: $changedFiles | ForEach-Object { Write-Host "  - $_" }
32: 
33: # Kiem tra neu co cap nhat CODE_HISTORY.md
34: if ($changedFiles -contains "CODE_HISTORY.md") {
35:     $commitMsg = "cap nhat CODE_HISTORY.md"
36: } else {
37:     # Tao commit message tu ten file
38:     $fileNames = ($changedFiles | ForEach-Object { [System.IO.Path]::GetFileName($_) }) -join ", "
39:     if ($fileNames.Length -gt 100) {
40:         $commitMsg = $fileNames.Substring(0, 97) + "..."
41:     } else {
42:         $commitMsg = "cap nhat: $fileNames"
43:     }
44: }
45: 
46: Write-Green "Commit message: $commitMsg"
47: 
48: # Buoc 4: Git add
49: Write-Yellow "Git add..."
50: git add -A
51: 
52: # Buoc 5: Git commit
53: Write-Yellow "Git commit..."
54: git commit -m $commitMsg
55: 
56: # Buoc 6: Git push
57: Write-Yellow "Git push..."
58: git push origin master
59: 
60: Write-Green "=== Hoan thanh! ==="
61: Write-Green "Da day code len GitHub"
````

## File: scripts/auto-commit-push.sh
````bash
 1: #!/bin/bash
 2: # ================================================================================
 3: # Script: auto-commit-push.sh
 4: # Mục đích: Backup code hiện tại, đẩy code mới lên GitHub và cập nhật CODE_HISTORY.md
 5: # Cách chạy: bash scripts/auto-commit-push.sh
 6: # ================================================================================
 7: set -e
 8: # Màu sắc cho output
 9: GREEN='\033[0;32m'
10: YELLOW='\033[1;33m'
11: RED='\033[0;31m'
12: NC='\033[0m' # No Color
13: echo -e "${YELLOW}=== Bắt đầu auto commit và push ===${NC}"
14: # Bước 1: Kiểm tra có thay đổi không
15: echo -e "${YELLOW}Kiểm tra thay đổi...${NC}"
16: if [ -z "$(git status --porcelain)" ]; then
17:     echo -e "${RED}Không có thay đổi nào. Thoát.${NC}"
18:     exit 0
19: fi
20: # Bước 2: Tạo mô tả thay đổi từ git diff
21: echo -e "${YELLOW}Tạo mô tả thay đổi...${NC}"
22: CHANGES=$(git status --porcelain | head -20)
23: echo "$CHANGES"
24: # Bước 3: Đọc danh sách file thay đổi
25: CHANGED_FILES=$(git diff --name-only)
26: echo -e "${GREEN}Các file thay đổi:${NC}"
27: echo "$CHANGED_FILES"
28: # Bước 4: Tạo mô tả commit tự động
29: if [ -n "$(echo "$CHANGED_FILES" | grep -E "CODE_HISTORY.md")" ]; then
30:     COMMIT_MSG="cap nhat CODE_HISTORY.md"
31: else
32:     # Lấy tên các file thay đổi (không có đường dẫn)
33:     FILE_NAMES=$(echo "$CHANGED_FILES" | xargs -I {} basename {} | tr '\n' ', ')
34:     # Cắt bỏ dấu , cuối cùng
35:     FILE_NAMES=${FILE_NAMES%,}
36:     COMMIT_MSG="cap nhat: $FILE_NAMES"
37: fi
38: # Giới hạn độ dài commit message
39: if [ ${#COMMIT_MSG} -gt 100 ]; then
40:     COMMIT_MSG="${COMMIT_MSG:0:97}..."
41: fi
42: echo -e "${GREEN}Commit message: $COMMIT_MSG${NC}"
43: # Bước 5: Git add
44: echo -e "${YELLOW}Git add...${NC}"
45: git add -A
46: # Bước 6: Git commit
47: echo -e "${YELLOW}Git commit...${NC}"
48: git commit -m "$COMMIT_MSG"
49: # Bước 7: Git push
50: echo -e "${YELLOW}Git push...${NC}"
51: git push origin master
52: echo -e "${GREEN}=== Hoàn thành! ===${NC}"
53: echo -e "${GREEN}Đã đẩy code lên GitHub${NC}"
````

## File: scripts/auto-verify-payment.js
````javascript
  1: require('dotenv').config()
  2: const { google } = require('googleapis')
  3: const { PrismaClient } = require('@prisma/client')
  4: const prisma = new PrismaClient()
  5: function extractTextFromHtml(html) {
  6:   return html
  7:     .replace(/<[^>]+>/g, ' ')
  8:     .replace(/&nbsp;/g, ' ')
  9:     .replace(/&amp;/g, '&')
 10:     .replace(/&lt;/g, '<')
 11:     .replace(/&gt;/g, '>')
 12:     .replace(/&quot;/g, '"')
 13:     .replace(/\s+/g, ' ')
 14:     .trim()
 15: }
 16: function parseSacombankEmail(htmlContent) {
 17:   const text = extractTextFromHtml(htmlContent)
 18:   // Tìm nội dung chuyển khoản
 19:   const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i)
 20:   const description = contentMatch ? contentMatch[1].trim() : ''
 21:   // Format: SDT 123456 HV 8286 COC LS03
 22:   const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i)
 23:   const userIdMatch = description.match(/HV[\s\._]*(\d+)/i)
 24:   const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i)
 25:   // Tìm số tiền - format: 386,868 VND
 26:   const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i)
 27:   let amount = 0
 28:   if (amountMatch) {
 29:     const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '')
 30:     amount = parseInt(amountStr) || 0
 31:   }
 32:   return {
 33:     phone: phoneMatch ? phoneMatch[1] : null,
 34:     userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
 35:     courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
 36:     amount: amount,
 37:     content: description,
 38:     rawText: text
 39:   }
 40: }
 41: async function getGmailClient() {
 42:   const oAuth2Client = new google.auth.OAuth2(
 43:     process.env.GMAIL_CLIENT_ID,
 44:     process.env.GMAIL_CLIENT_SECRET,
 45:     'http://localhost'
 46:   )
 47:   oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
 48:   return google.gmail({ version: 'v1', auth: oAuth2Client })
 49: }
 50: async function processBankEmails() {
 51:   const gmail = await getGmailClient()
 52:   // Tìm email Sacombank TRƯA ĐỌC trong 7 ngày gần nhất
 53:   const response = await gmail.users.messages.list({
 54:     userId: 'me',
 55:     q: 'sacombank thong bao giao dich is:unread',
 56:     maxResults: 20
 57:   })
 58:   const messages = response.data.messages || []
 59:   if (messages.length === 0) return;
 60:   console.log(`📧 Phát hiện ${messages.length} email Sacombank mới chưa đọc...`)
 61:   // Lấy enrollment PENDING
 62:   const pendingEnrollments = await prisma.enrollment.findMany({
 63:     where: { status: 'PENDING' },
 64:     include: {
 65:       course: { select: { id_khoa: true, phi_coc: true } },
 66:       user: { select: { name: true, phone: true } }
 67:     }
 68:   })
 69:   if (pendingEnrollments.length === 0) {
 70:       console.log('📝 Không có đăng ký nào đang chờ thanh toán.')
 71:       return;
 72:   }
 73:   for (const msg of messages) {
 74:     const message = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' })
 75:     let body = ''
 76:     if (message.data.payload?.body?.data) {
 77:       body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8')
 78:     } else if (message.data.payload?.parts) {
 79:       for (const part of message.data.payload.parts) {
 80:         if (part.mimeType === 'text/html' && part.body?.data) {
 81:           body = Buffer.from(part.body.data, 'base64').toString('utf-8')
 82:           break
 83:         }
 84:       }
 85:     }
 86:     const parsed = parseSacombankEmail(body)
 87:     for (const enrollment of pendingEnrollments) {
 88:       const userPhone = enrollment.user.phone?.replace(/\D/g, '') || ''
 89:       const emailPhone = parsed.phone || ''
 90:       const userIdMatch = parsed.userId && parsed.userId === enrollment.userId
 91:       const phoneMatch = userPhone && emailPhone && userPhone.includes(emailPhone)
 92:       const courseCodeMatch = parsed.courseCode && enrollment.course.id_khoa.toUpperCase().includes(parsed.courseCode)
 93:       const amountMatch = parsed.amount >= enrollment.course.phi_coc
 94:       if (((parsed.userId ? userIdMatch : phoneMatch) && courseCodeMatch && amountMatch)) {
 95:         console.log(`✅ Khớp! Đang kích hoạt HV: ${enrollment.user.name} - Khóa: ${enrollment.course.id_khoa}`)
 96:         await prisma.payment.update({
 97:           where: { enrollmentId: enrollment.id },
 98:           data: {
 99:             amount: parsed.amount, phone: parsed.phone, content: parsed.content,
100:             bankName: 'Sacombank', status: 'VERIFIED', verifiedAt: new Date(), verifyMethod: 'AUTO_EMAIL'
101:           }
102:         })
103:         await prisma.enrollment.update({
104:           where: { id: enrollment.id },
105:           data: { status: 'ACTIVE' }
106:         })
107:         // Đánh dấu đã đọc
108:         await gmail.users.messages.modify({
109:           userId: 'me', id: msg.id,
110:           requestBody: { removeLabelIds: ['UNREAD'] }
111:         })
112:       }
113:     }
114:   }
115: }
116: processBankEmails()
117:   .catch(console.error)
118:   .finally(async () => await prisma.$disconnect())
````

## File: scripts/auto-verify-payment.ts
````typescript
  1: require('dotenv').config()
  2: const { google } = require('googleapis')
  3: const { PrismaClient } = require('@prisma/client')
  4: const prisma = new PrismaClient()
  5: function extractTextFromHtml(html: string): string {
  6:   return html
  7:     .replace(/<[^>]+>/g, ' ')
  8:     .replace(/&nbsp;/g, ' ')
  9:     .replace(/&amp;/g, '&')
 10:     .replace(/&lt;/g, '<')
 11:     .replace(/&gt;/g, '>')
 12:     .replace(/&quot;/g, '"')
 13:     .replace(/\s+/g, ' ')
 14:     .trim()
 15: }
 16: function parseSacombankEmail(htmlContent: string) {
 17:   const text = extractTextFromHtml(htmlContent)
 18:   // Tìm nội dung chuyển khoản
 19:   const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i)
 20:   const description = contentMatch ? contentMatch[1].trim() : ''
 21:   // Format mới: SDT 123456 HV 8286 COC LS03
 22:   // Tìm 6 số điện thoại cuối sau "SDT" (linh hoạt khoảng trống/kí tự đặc biệt)
 23:   const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i)
 24:   // Tìm mã học viên sau "HV" 
 25:   const userIdMatch = description.match(/HV[\s\._]*(\d+)/i)
 26:   // Tìm mã khóa học sau "COC"
 27:   const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i)
 28:   // Tìm số tiền - format: 386,868 VND
 29:   const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i)
 30:   let amount = 0
 31:   if (amountMatch) {
 32:     const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '')
 33:     amount = parseInt(amountStr) || 0
 34:   }
 35:   return {
 36:     phone: phoneMatch ? phoneMatch[1] : null,
 37:     userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
 38:     courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
 39:     amount: amount,
 40:     content: description,
 41:     rawText: text
 42:   }
 43: }
 44: async function getGmailClient() {
 45:   const oAuth2Client = new google.auth.OAuth2(
 46:     process.env.GMAIL_CLIENT_ID,
 47:     process.env.GMAIL_CLIENT_SECRET,
 48:     'http://localhost'
 49:   )
 50:   oAuth2Client.setCredentials({
 51:     refresh_token: process.env.GMAIL_REFRESH_TOKEN
 52:   })
 53:   return google.gmail({ version: 'v1', auth: oAuth2Client })
 54: }
 55: async function processBankEmails() {
 56:   console.log('🚀 Bắt đầu kiểm tra email ngân hàng...')
 57:   const gmail = await getGmailClient()
 58:   // Tìm email Sacombank trong 7 ngày gần nhất
 59:   const response = await gmail.users.messages.list({
 60:     userId: 'me',
 61:     q: 'sacombank thong bao giao dich',
 62:     maxResults: 10
 63:   })
 64:   const messages = response.data.messages || []
 65:   console.log(`📧 Tìm thấy ${messages.length} email Sacombank`)
 66:   if (messages.length === 0) {
 67:     console.log('✅ Không có email mới')
 68:     return
 69:   }
 70:   // Lấy enrollment PENDING
 71:   const pendingEnrollments = await prisma.enrollment.findMany({
 72:     where: { status: 'PENDING' },
 73:     include: {
 74:       course: {
 75:         select: { id_khoa: true, phi_coc: true, noidung_stk: true, name_lop: true }
 76:       },
 77:       user: {
 78:         select: { id: true, phone: true, name: true, email: true }
 79:       }
 80:     }
 81:   })
 82:   console.log(`📝 Có ${pendingEnrollments.length} enrollment chờ xác nhận`)
 83:   for (const msg of messages) {
 84:     const message = await gmail.users.messages.get({
 85:       userId: 'me',
 86:       id: msg.id,
 87:       format: 'full'
 88:     })
 89:     // Lấy body
 90:     let body = ''
 91:     if (message.data.payload?.body?.data) {
 92:       body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8')
 93:     } else if (message.data.payload?.parts) {
 94:       for (const part of message.data.payload.parts) {
 95:         if (part.mimeType === 'text/html' && part.body?.data) {
 96:           body = Buffer.from(part.body.data, 'base64').toString('utf-8')
 97:           break
 98:         }
 99:       }
100:     }
101:     const parsed = parseSacombankEmail(body)
102:     console.log(`\n📱 Parsed: SĐT=${parsed.phone}, Tiền=${parsed.amount}, ND=${parsed.content}`)
103:     // Tìm enrollment khớp với userId hoặc phone + courseCode
104:     for (const enrollment of pendingEnrollments) {
105:       const userPhone = enrollment.user.phone?.replace(/\D/g, '') || ''
106:       const emailPhone = parsed.phone || ''
107:       // Khớp theo: userId + phone + courseCode
108:       const userIdMatch = parsed.userId && parsed.userId === enrollment.userId
109:       const phoneMatch = userPhone && emailPhone && userPhone.includes(emailPhone)
110:       const courseCodeMatch = parsed.courseCode && enrollment.course.id_khoa.toUpperCase().includes(parsed.courseCode)
111:       const amountMatch = parsed.amount >= enrollment.course.phi_coc
112:       // Cần khớp: (userId HOẶC phone) VÀ courseCode VÀ amount
113:       const matched = ((parsed.userId ? userIdMatch : phoneMatch) && courseCodeMatch && amountMatch)
114:       if (matched) {
115:         console.log(`✅ Tìm thấy khớp! Enrollment #${enrollment.id}`)
116:         console.log(`   User: ${enrollment.user.name}, Phone: ${enrollment.user.phone}, UserID: ${enrollment.userId}`)
117:         console.log(`   Course: ${enrollment.course.id_khoa}, Phi: ${enrollment.course.phi_coc}`)
118:         console.log(`   Parsed: phone=${parsed.phone}, userId=${parsed.userId}, courseCode=${parsed.courseCode}, amount=${parsed.amount}`)
119:         // Cập nhật payment và enrollment
120:         await prisma.payment.update({
121:           where: { enrollmentId: enrollment.id },
122:           data: {
123:             amount: parsed.amount,
124:             phone: parsed.phone,
125:             content: parsed.content,
126:             bankName: 'Sacombank',
127:             status: 'VERIFIED',
128:             verifiedAt: new Date(),
129:             verifyMethod: 'AUTO_EMAIL'
130:           }
131:         })
132:         await prisma.enrollment.update({
133:           where: { id: enrollment.id },
134:           data: { status: 'ACTIVE' }
135:         })
136:         console.log(`   ✅ Đã kích hoạt khóa học!`)
137:         // Đánh dấu đã đọc
138:         await gmail.users.messages.modify({
139:           userId: 'me',
140:           id: msg.id,
141:           requestBody: { removeLabelIds: ['UNREAD'] }
142:         })
143:       }
144:     }
145:   }
146:   await prisma.$disconnect()
147: }
148: processBankEmails().catch(console.error)
````

## File: scripts/backup.ps1
````powershell
  1: # ============================================================
  2: #  backup.ps1 - HocVien-BRK Project Backup Script
  3: #  Usage: .\scripts\backup.ps1
  4: #  Creates a timestamped ZIP of all important source files.
  5: # ============================================================
  6: 
  7: $ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path # Ensure $ProjectRoot is a string
  8: $Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
  9: $BackupDir = "$ProjectRoot\backups"
 10: $ZipName = "backup_$Timestamp.zip"
 11: $ZipPath = "$BackupDir\$ZipName"
 12: $TempBackupDir = Join-Path ([System.IO.Path]::GetTempPath()) "BRK_Backup_Temp_$Timestamp"
 13: 
 14: # --- Files & folders to include (relative to project root) ---
 15: $IncludePaths = @(
 16:     # App source
 17:     "app",
 18:     "components",
 19:     "lib",
 20:     "types",
 21:     "public",
 22: 
 23:     # Auth & config
 24:     "auth.ts",
 25:     "auth.config.ts",
 26:     "middleware.ts",
 27:     ".env",
 28:     ".env.local",
 29: 
 30:     # DB / Prisma
 31:     "prisma",
 32: 
 33:     # Scripts
 34:     "scripts",
 35: 
 36:     # Project config
 37:     "package.json",
 38:     "next.config.ts",
 39:     "tsconfig.json",
 40:     "tsconfig.seed.json",
 41:     "postcss.config.mjs",
 42:     "eslint.config.mjs",
 43:     "docker-compose.yml",
 44: 
 45:     # Docs
 46:     "README.md",
 47:     "DESIGN_SYSTEM.md"
 48: )
 49: 
 50: # --- Paths/patterns to EXCLUDE even if inside an included folder ---
 51: $ExcludePatterns = @(
 52:     "*.log",
 53:     "*.tsbuildinfo",
 54:     ".next",
 55:     "node_modules",
 56:     ".git",
 57:     "backups"
 58: )
 59: 
 60: Write-Host ""
 61: Write-Host "======================================" -ForegroundColor Cyan
 62: Write-Host "  BRK Project Backup" -ForegroundColor Cyan
 63: Write-Host "  Time   : $Timestamp" -ForegroundColor Cyan
 64: Write-Host "  Output : $ZipPath" -ForegroundColor Cyan
 65: Write-Host "======================================" -ForegroundColor Cyan
 66: Write-Host ""
 67: 
 68: # Create backups directory if it doesn't exist
 69: if (-not (Test-Path $BackupDir)) {
 70:     New-Item -ItemType Directory -Path $BackupDir | Out-Null
 71:     Write-Host "[+] Created backups/ folder" -ForegroundColor Green
 72: }
 73: 
 74: # Create temporary directory for staging files
 75: if (Test-Path $TempBackupDir) {
 76:     Remove-Item -Path $TempBackupDir -Recurse -Force | Out-Null
 77: }
 78: New-Item -ItemType Directory -Path $TempBackupDir | Out-Null
 79: Write-Host "[+] Created temporary staging folder: $TempBackupDir" -ForegroundColor Green
 80: 
 81: # Collect all files to backup
 82: $FilesToBackup = @()
 83: 
 84: foreach ($rel in $IncludePaths) {
 85:     $full = Join-Path $ProjectRoot $rel
 86: 
 87:     if (Test-Path $full -PathType Leaf) {
 88:         # It's a single file
 89:         $FilesToBackup += $full
 90:     }
 91:     elseif (Test-Path $full -PathType Container) {
 92:         # It's a folder — collect all files recursively, applying exclusions
 93:         $all = Get-ChildItem -Path $full -File -Recurse
 94: 
 95:         foreach ($file in $all) {
 96:             $skip = $false
 97:             foreach ($pattern in $ExcludePatterns) {
 98:                 # Check if any part of the full path matches the pattern
 99:                 if ($file.FullName -like "*\$pattern\*" -or $file.Name -like $pattern) {
100:                     $skip = $true; break
101:                 }
102:             }
103:             if (-not $skip) { $FilesToBackup += $file.FullName }
104:         }
105:     }
106:     else {
107:         Write-Host "[!] Not found, skipping: $rel" -ForegroundColor Yellow
108:     }
109: }
110: 
111: if ($FilesToBackup.Count -eq 0) {
112:     Write-Host "[ERROR] No files found to backup." -ForegroundColor Red
113:     # Clean up temp directory before exiting
114:     if (Test-Path $TempBackupDir) {
115:         Remove-Item -Path $TempBackupDir -Recurse -Force | Out-Null
116:     }
117:     exit 1
118: }
119: 
120: Write-Host "[*] Collecting $($FilesToBackup.Count) files..." -ForegroundColor Gray
121: 
122: # Copy files to the temporary directory, maintaining relative structure
123: foreach ($filePath in $FilesToBackup) {
124:     # Get relative path from ProjectRoot
125:     $relativePath = $filePath.Substring($ProjectRoot.Length).TrimStart('\', '/')
126:     $destinationPath = Join-Path $TempBackupDir $relativePath
127: 
128:     # Ensure the destination directory exists in the temp structure
129:     $destinationDir = Split-Path -Parent $destinationPath
130:     if (-not (Test-Path $destinationDir)) {
131:         New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
132:     }
133: 
134:     # Copy the file
135:     Copy-Item -Path $filePath -Destination $destinationPath -Force
136: }
137: 
138: Write-Host "[*] Staged files to temporary directory. Creating ZIP archive..." -ForegroundColor Gray
139: 
140: # Create ZIP using Compress-Archive
141: try {
142:     Compress-Archive -Path "$TempBackupDir\*" -DestinationPath $ZipPath -Force
143: }
144: catch {
145:     Write-Host "[ERROR] Failed to create ZIP archive: $($_.Exception.Message)" -ForegroundColor Red
146:     # Clean up temp directory before exiting
147:     if (Test-Path $TempBackupDir) {
148:         Remove-Item -Path $TempBackupDir -Recurse -Force | Out-Null
149:     }
150:     exit 1
151: }
152: 
153: # Clean up the temporary directory
154: if (Test-Path $TempBackupDir) {
155:     Remove-Item -Path $TempBackupDir -Recurse -Force | Out-Null
156:     Write-Host "[+] Cleaned up temporary staging folder." -ForegroundColor Green
157: }
158: 
159: $sizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
160: 
161: Write-Host ""
162: Write-Host "======================================" -ForegroundColor Green
163: Write-Host "  Backup complete!" -ForegroundColor Green
164: Write-Host "  File : $ZipName" -ForegroundColor Green
165: Write-Host "  Size : ${sizeMB} MB" -ForegroundColor Green
166: Write-Host "  Files: $($FilesToBackup.Count)" -ForegroundColor Green
167: Write-Host "======================================" -ForegroundColor Green
168: Write-Host ""
169: 
170: # Keep only the 5 most recent backups to save disk space
171: $OldBackups = Get-ChildItem -Path $BackupDir -Filter "backup_*.zip" |
172: Sort-Object LastWriteTime -Descending |
173: Select-Object -Skip 5
174: 
175: if ($OldBackups.Count -gt 0) {
176:     Write-Host "[*] Removing $($OldBackups.Count) old backup(s)..." -ForegroundColor Gray
177:     $OldBackups | Remove-Item -Force
178: }
````

## File: scripts/change-id.ts
````typescript
 1: import { PrismaClient } from '@prisma/client'
 2: const prisma = new PrismaClient()
 3: async function main() {
 4:     const args = process.argv.slice(2)
 5:     if (args.length !== 2) {
 6:         console.error('Usage: npm run change-id <current_id> <new_id>')
 7:         process.exit(1)
 8:     }
 9:     const currentId = parseInt(args[0])
10:     const newId = parseInt(args[1])
11:     if (isNaN(currentId) || isNaN(newId)) {
12:         console.error('Error: IDs must be numbers')
13:         process.exit(1)
14:     }
15:     console.log(`🔄 Attempting to change User ID from ${currentId} to ${newId}...`)
16:     try {
17:         // 1. Kiểm tra User cũ có tồn tại không
18:         const user = await prisma.user.findUnique({ where: { id: currentId } })
19:         if (!user) {
20:             console.error(`❌ User with ID ${currentId} not found.`)
21:             process.exit(1)
22:         }
23:         // 2. Kiểm tra User mới có bị trùng không
24:         const existingNewUser = await prisma.user.findUnique({ where: { id: newId } })
25:         if (existingNewUser) {
26:             console.error(`❌ Target ID ${newId} is already taken by user: ${existingNewUser.name} (${existingNewUser.email})`)
27:             process.exit(1)
28:         }
29:         // 3. Kiểm tra xem ID mới có phải Reserved ID không (Để thông báo thôi, Admin thì quyền lực tối cao)
30:         const reserved = await prisma.reservedId.findUnique({ where: { id: newId } })
31:         if (reserved) {
32:             console.log(`💎 Target ID ${newId} is a RESERVED ID ("${reserved.note}"). allowing change because you are Admin.`)
33:         }
34:         // 4. Thực hiện đổi ID
35:         // Vì ta đã set ON UPDATE CASCADE trong Schema, nên chỉ cần update User là xong.
36:         // Tuy nhiên, Prisma Client không cho update Primary Key trực tiếp trong phương thức update().
37:         // Ta phải dùng executeRaw hoặc delete/create (rủi ro mất data).
38:         // Tốt nhất là dùng executeRaw để tận dụng tính năng CASCADE của SQL.
39:         console.log('⚡ Updating ID in database...')
40:         // Cập nhật bảng User (Các bảng con Account, Session, User(referrer) sẽ tự động nhảy theo đv Postgres Cascade)
41:         const result = await prisma.$executeRawUnsafe(`UPDATE "User" SET id = ${newId} WHERE id = ${currentId}`)
42:         if (result > 0) {
43:             console.log(`✅ Success! User ${user.email} now has ID: ${newId}`)
44:         } else {
45:             console.error('❌ Failed to update ID. No rows affected.')
46:         }
47:         // 5. Reset Sequence (Quan trọng để các user sau không bị lỗi)
48:         console.log('🔄 Resetting Sequence...')
49:         await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id)+1, 1), false) FROM "User";`)
50:     } catch (error) {
51:         console.error('❌ Error:', error)
52:     } finally {
53:         await prisma.$disconnect()
54:     }
55: }
56: main()
````

## File: scripts/check-duplicates.ts
````typescript
 1: import fs from 'fs'
 2: import csv from 'csv-parser'
 3: const results: any[] = []
 4: const emailCount: Record<string, number> = {}
 5: fs.createReadStream('processed-users.preview.csv')
 6:     .pipe(csv())
 7:     .on('data', (data) => {
 8:         results.push(data)
 9:         const email = data.email
10:         emailCount[email] = (emailCount[email] || 0) + 1
11:     })
12:     .on('end', () => {
13:         console.log('Duplicate Emails Found:')
14:         for (const [email, count] of Object.entries(emailCount)) {
15:             if (count > 1) {
16:                 console.log(`- ${email}: ${count} times`)
17:                 // Tìm các ID trùng
18:                 const ids = results.filter(r => r.email === email).map(r => r.id)
19:                 console.log(`  IDs: ${ids.join(', ')}`)
20:             }
21:         }
22:     })
````

## File: scripts/check-gmail-info.js
````javascript
 1: require('dotenv').config()
 2: const { google } = require('googleapis')
 3: async function checkProfile() {
 4:   const oAuth2Client = new google.auth.OAuth2(
 5:     process.env.GMAIL_CLIENT_ID,
 6:     process.env.GMAIL_CLIENT_SECRET,
 7:     'http://localhost'
 8:   )
 9:   oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
10:   const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })
11:   try {
12:     // 1. Kiểm tra profile (Địa chỉ email)
13:     const profile = await gmail.users.getProfile({ userId: 'me' })
14:     console.log('\n--- THÔNG TIN HỆ THỐNG ---')
15:     console.log(`📧 Đang kết nối Gmail: ${profile.data.emailAddress}`)
16:     console.log(`📦 Tổng số tin nhắn: ${profile.data.messagesTotal}`)
17:     // 2. Tìm kiếm email Sacombank chưa đọc
18:     const response = await gmail.users.messages.list({
19:       userId: 'me',
20:       q: 'sacombank thong bao giao dich is:unread',
21:       maxResults: 10
22:     })
23:     const messages = response.data.messages || []
24:     console.log(`✉️ Số email Sacombank chưa đọc (unread): ${messages.length}`)
25:     if (messages.length > 0) {
26:         console.log('\n--- DANH SÁCH EMAIL CHỜ XỬ LÝ ---')
27:         for (const msg of messages) {
28:             const message = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata' })
29:             const subject = message.data.payload.headers.find(h => h.name === 'Subject')?.value
30:             const date = message.data.payload.headers.find(h => h.name === 'Date')?.value
31:             console.log(`- ID: ${msg.id} | Ngày: ${date} | Tiêu đề: ${subject}`)
32:         }
33:     } else {
34:         console.log('\n✅ Hiện tại không có email Sacombank nào chưa đọc.')
35:     }
36:     console.log('--------------------------')
37:   } catch (error) {
38:     console.error('❌ Lỗi kiểm tra:', error.message)
39:   }
40: }
41: checkProfile()
````

## File: scripts/check-latest-sacombank.js
````javascript
 1: require('dotenv').config()
 2: const { google } = require('googleapis')
 3: function extractTextFromHtml(html) {
 4:   return html
 5:     .replace(/<[^>]+>/g, ' ')
 6:     .replace(/&nbsp;/g, ' ')
 7:     .replace(/&amp;/g, '&')
 8:     .replace(/&lt;/g, '<')
 9:     .replace(/&gt;/g, '>')
10:     .replace(/&quot;/g, '"')
11:     .replace(/\s+/g, ' ')
12:     .trim()
13: }
14: function parseSacombankEmail(htmlContent) {
15:   const text = extractTextFromHtml(htmlContent)
16:   // Tìm nội dung chuyển khoản
17:   const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i)
18:   const description = contentMatch ? contentMatch[1].trim() : ''
19:   // Format mới: SDT 123456 HV 8286 COC LS03
20:   const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i)
21:   const userIdMatch = description.match(/HV[\s\._]*(\d+)/i)
22:   const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i)
23:   // Tìm số tiền - format: 386,868 VND
24:   const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i)
25:   let amount = 0
26:   if (amountMatch) {
27:     const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '')
28:     amount = parseInt(amountStr) || 0
29:   }
30:   return {
31:     phone: phoneMatch ? phoneMatch[1] : null,
32:     userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
33:     courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
34:     amount: amount,
35:     content: description,
36:     rawText: text
37:   }
38: }
39: async function getGmailClient() {
40:   const oAuth2Client = new google.auth.OAuth2(
41:     process.env.GMAIL_CLIENT_ID,
42:     process.env.GMAIL_CLIENT_SECRET,
43:     'http://localhost'
44:   )
45:   oAuth2Client.setCredentials({
46:     refresh_token: process.env.GMAIL_REFRESH_TOKEN
47:   })
48:   return google.gmail({ version: 'v1', auth: oAuth2Client })
49: }
50: async function checkLatestEmail() {
51:   console.log('🔍 Đang kiểm tra email Sacombank mới nhất...')
52:   const gmail = await getGmailClient()
53:   const response = await gmail.users.messages.list({
54:     userId: 'me',
55:     q: 'sacombank thong bao giao dịch',
56:     maxResults: 1
57:   })
58:   const messages = response.data.messages || []
59:   if (messages.length === 0) {
60:     console.log('❌ Không tìm thấy email Sacombank nào.')
61:     return
62:   }
63:   const msgId = messages[0].id
64:   const message = await gmail.users.messages.get({
65:     userId: 'me',
66:     id: msgId,
67:     format: 'full'
68:   })
69:   let body = ''
70:   if (message.data.payload?.body?.data) {
71:     body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8')
72:   } else if (message.data.payload?.parts) {
73:     for (const part of message.data.payload.parts) {
74:       if (part.mimeType === 'text/html' && part.body?.data) {
75:         body = Buffer.from(part.body.data, 'base64').toString('utf-8')
76:         break
77:       }
78:     }
79:   }
80:   const parsed = parseSacombankEmail(body)
81:   console.log('\n--- KẾT QUẢ TRÍCH XUẤT ---')
82:   console.log(`Email ID: ${msgId}`)
83:   console.log(`Nội dung chuyển khoản (Gốc): ${parsed.content}`)
84:   console.log(`SĐT (6 số cuối): ${parsed.phone || 'Không tìm thấy'}`)
85:   console.log(`Mã học viên (HV): ${parsed.userId || 'Không tìm thấy'}`)
86:   console.log(`Mã khóa học (COC): ${parsed.courseCode || 'Không tìm thấy'}`)
87:   console.log(`Số tiền: ${parsed.amount.toLocaleString()} VND`)
88:   console.log('--------------------------')
89: }
90: checkLatestEmail().catch(console.error)
````

## File: scripts/check-latest-sacombank.ts
````typescript
 1: require('dotenv').config()
 2: const { google } = require('googleapis')
 3: function extractTextFromHtml(html: string): string {
 4:   return html
 5:     .replace(/<[^>]+>/g, ' ')
 6:     .replace(/&nbsp;/g, ' ')
 7:     .replace(/&amp;/g, '&')
 8:     .replace(/&lt;/g, '<')
 9:     .replace(/&gt;/g, '>')
10:     .replace(/&quot;/g, '"')
11:     .replace(/\s+/g, ' ')
12:     .trim()
13: }
14: function parseSacombankEmail(htmlContent: string) {
15:   const text = extractTextFromHtml(htmlContent)
16:   // Tìm nội dung chuyển khoản
17:   const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i)
18:   const description = contentMatch ? contentMatch[1].trim() : ''
19:   // Format mới: SDT 123456 HV 8286 COC LS03
20:   const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i)
21:   const userIdMatch = description.match(/HV[\s\._]*(\d+)/i)
22:   const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i)
23:   // Tìm số tiền - format: 386,868 VND
24:   const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i)
25:   let amount = 0
26:   if (amountMatch) {
27:     const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '')
28:     amount = parseInt(amountStr) || 0
29:   }
30:   return {
31:     phone: phoneMatch ? phoneMatch[1] : null,
32:     userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
33:     courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
34:     amount: amount,
35:     content: description,
36:     rawText: text
37:   }
38: }
39: async function getGmailClient() {
40:   const oAuth2Client = new google.auth.OAuth2(
41:     process.env.GMAIL_CLIENT_ID,
42:     process.env.GMAIL_CLIENT_SECRET,
43:     'http://localhost'
44:   )
45:   oAuth2Client.setCredentials({
46:     refresh_token: process.env.GMAIL_REFRESH_TOKEN
47:   })
48:   return google.gmail({ version: 'v1', auth: oAuth2Client })
49: }
50: async function checkLatestEmail() {
51:   console.log('🔍 Đang kiểm tra email Sacombank mới nhất...')
52:   const gmail = await getGmailClient()
53:   const response = await gmail.users.messages.list({
54:     userId: 'me',
55:     q: 'sacombank thong bao giao dich',
56:     maxResults: 1
57:   })
58:   const messages = response.data.messages || []
59:   if (messages.length === 0) {
60:     console.log('❌ Không tìm thấy email Sacombank nào.')
61:     return
62:   }
63:   const msgId = messages[0].id
64:   const message = await gmail.users.messages.get({
65:     userId: 'me',
66:     id: msgId,
67:     format: 'full'
68:   })
69:   let body = ''
70:   if (message.data.payload?.body?.data) {
71:     body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8')
72:   } else if (message.data.payload?.parts) {
73:     for (const part of message.data.payload.parts) {
74:       if (part.mimeType === 'text/html' && part.body?.data) {
75:         body = Buffer.from(part.body.data, 'base64').toString('utf-8')
76:         break
77:       }
78:     }
79:   }
80:   const parsed = parseSacombankEmail(body)
81:   console.log('\n--- KẾT QUẢ TRÍCH XUẤT ---')
82:   console.log(`Email ID: ${msgId}`)
83:   console.log(`Nội dung chuyển khoản (Gốc): ${parsed.content}`)
84:   console.log(`SĐT (6 số cuối): ${parsed.phone || 'Không tìm thấy'}`)
85:   console.log(`Mã học viên (HV): ${parsed.userId || 'Không tìm thấy'}`)
86:   console.log(`Mã khóa học (COC): ${parsed.courseCode || 'Không tìm thấy'}`)
87:   console.log(`Số tiền: ${parsed.amount.toLocaleString()} VND`)
88:   console.log('--------------------------')
89: }
90: checkLatestEmail().catch(console.error)
````

## File: scripts/check-missing-ids.ts
````typescript
 1: import fs from 'fs'
 2: import csv from 'csv-parser'
 3: async function checkMissingIds() {
 4:     const ids = new Set<number>()
 5:     const csvFilePath = 'processed-users.preview.csv'
 6:     if (!fs.existsSync(csvFilePath)) {
 7:         console.error(`File not found: ${csvFilePath}`)
 8:         return
 9:     }
10:     console.log(`Checking IDs in ${csvFilePath}...`)
11:     fs.createReadStream(csvFilePath)
12:         .pipe(csv())
13:         .on('data', (row) => {
14:             if (row.id) {
15:                 ids.add(parseInt(row.id))
16:             }
17:         })
18:         .on('end', () => {
19:             console.log(`Found ${ids.size} unique IDs.`)
20:             const missingIds: number[] = []
21:             // Check range 0 to 838 (inclusive)
22:             for (let i = 0; i <= 838; i++) {
23:                 if (!ids.has(i)) {
24:                     missingIds.push(i)
25:                 }
26:             }
27:             if (missingIds.length > 0) {
28:                 console.log(`❌ Missing IDs found (${missingIds.length}):`)
29:                 console.log(missingIds.join(', '))
30:             } else {
31:                 console.log('✅ No missing IDs in range 0-838.')
32:             }
33:         })
34: }
35: checkMissingIds()
````

## File: scripts/cleanup-v3-data.js
````javascript
 1: const fs = require('fs');
 2: const csv = require('csv-parser');
 3: const { createObjectCsvWriter } = require('csv-writer');
 4: async function readCsv(filePath) {
 5:     const results = [];
 6:     return new Promise((resolve) => {
 7:         fs.createReadStream(filePath)
 8:             .pipe(csv())
 9:             .on('data', (data) => results.push(data))
10:             .on('end', () => resolve(results));
11:     });
12: }
13: async function cleanup() {
14:     console.log("=== BẮT ĐẦU DỌN DẸP DỮ LIỆU CHUẨN HÓA ===");
15:     // 1. CLEAN USERS
16:     const users = await readCsv('User.csv');
17:     const emailMap = {}; // email -> first_id
18:     const cleanedUsers = users.map(u => {
19:         const email = u.email.toLowerCase().trim();
20:         if (emailMap[email]) {
21:             const firstId = parseInt(emailMap[email]);
22:             const currentId = parseInt(u.id);
23:             if (currentId > firstId) {
24:                 const parts = u.email.split('@');
25:                 u.email = `${parts[0]}_${u.id}@${parts[1]}`;
26:                 console.log(`Fix duplicate email: ${email} -> ${u.email} (ID: ${u.id})`);
27:             }
28:         } else {
29:             emailMap[email] = u.id;
30:         }
31:         return u;
32:     });
33:     // 1.2 CLEAN COURSES (Ensure id_khoa is unique)
34:     const courses = await readCsv('Course.csv');
35:     const courseKhoaMap = {};
36:     const cleanedCourses = courses.map(c => {
37:         const khoa = c.id_khoa.trim();
38:         if (courseKhoaMap[khoa]) {
39:             c.id_khoa = `${khoa}_${c.id}`;
40:             console.log(`Fix duplicate id_khoa: ${khoa} -> ${c.id_khoa}`);
41:         } else {
42:             courseKhoaMap[khoa] = true;
43:         }
44:         return c;
45:     });
46:     const userWriter = createObjectCsvWriter({
47:         path: 'User.csv',
48:         header: Object.keys(cleanedUsers[0]).map(k => ({ id: k, title: k }))
49:     });
50:     await userWriter.writeRecords(cleanedUsers);
51:     const courseWriter = createObjectCsvWriter({
52:         path: 'Course.csv',
53:         header: Object.keys(cleanedCourses[0]).map(k => ({ id: k, title: k }))
54:     });
55:     await courseWriter.writeRecords(cleanedCourses);
56:     console.log("✅ Đã cập nhật User.csv và Course.csv");
57:     // 2. CLEAN ENROLLMENTS
58:     const enrollments = await readCsv('Enrollment.csv');
59:     const seenPairs = new Set();
60:     const cleanedEnrollments = [];
61:     let dupCount = 0;
62:     enrollments.forEach(e => {
63:         const key = `${e.userId}-${e.courseId}`;
64:         if (!seenPairs.has(key)) {
65:             seenPairs.add(key);
66:             cleanedEnrollments.push(e);
67:         } else {
68:             dupCount++;
69:         }
70:     });
71:     const enrollWriter = createObjectCsvWriter({
72:         path: 'Enrollment.csv',
73:         header: Object.keys(cleanedEnrollments[0]).map(k => ({ id: k, title: k }))
74:     });
75:     await enrollWriter.writeRecords(cleanedEnrollments);
76:     console.log(`✅ Đã cập nhật Enrollment.csv (Loại bỏ ${dupCount} dòng trùng lặp)`);
77: }
78: cleanup();
````

## File: scripts/debug-data.ts
````typescript
 1: import fs from 'fs'
 2: import csv from 'csv-parser'
 3: async function main() {
 4:     const courses: any[] = []
 5:     const registrations: any[] = []
 6:     // 1. Phân tích KhoaHoc.csv
 7:     await new Promise((resolve) => {
 8:         fs.createReadStream('KhoaHoc.csv')
 9:             .pipe(csv())
10:             .on('data', (data) => courses.push(data))
11:             .on('end', resolve)
12:     })
13:     console.log('--- PHÂN TÍCH KHOAHOC.CSV ---')
14:     console.log(`Tổng số khóa học: ${courses.length}`)
15:     const courseIds = courses.map(c => c.id_khoa).filter(Boolean)
16:     const courseLops = courses.map(c => c.id_lop).filter(Boolean)
17:     console.log('Unique id_khoa in KhoaHoc:', Array.from(new Set(courseIds)))
18:     console.log('Unique id_lop in KhoaHoc:', Array.from(new Set(courseLops)))
19:     const aiCourse = courses.find(c =>
20:         (c.name_lop && c.name_lop.includes('AI')) ||
21:         (c.mo_ta_ngan && c.mo_ta_ngan.includes('AI')) ||
22:         (c.mo_ta_dai && c.mo_ta_dai.includes('AI'))
23:     )
24:     console.log('Tìm kiếm khóa học AI:', aiCourse ? `Tìm thấy: ${aiCourse.name_lop} (ID: ${aiCourse.id_khoa})` : 'Không thấy')
25:     // 2. Phân tích LS_DangKy.csv
26:     await new Promise((resolve) => {
27:         fs.createReadStream('LS_DangKy.csv')
28:             .pipe(csv())
29:             .on('data', (data) => registrations.push(data))
30:             .on('end', resolve)
31:     })
32:     console.log('\n--- PHÂN TÍCH LS_DANGKY.CSV ---')
33:     console.log(`Tổng số bản ghi: ${registrations.length}`)
34:     const regKhoas = registrations.map(r => r.id_khoa).filter(Boolean)
35:     const regLops = registrations.map(r => r.id_lop).filter(Boolean)
36:     const uniqueRegKhoas = Array.from(new Set(regKhoas))
37:     console.log('Unique id_khoa in LS_DangKy:', uniqueRegKhoas)
38:     const missingKhoas = uniqueRegKhoas.filter(id => !courseIds.includes(id))
39:     console.log('\nCác id_khoa trong LS_DangKy KHÔNG có trong KhoaHoc:', missingKhoas)
40:     // Kiểm tra xem các id_khoa bị thiếu có nằm trong id_lop không?
41:     const foundInLop = missingKhoas.filter(id => courseLops.includes(id))
42:     console.log('Các id_khoa bị thiếu NHƯNG tìm thấy trong cột id_lop của KhoaHoc:', foundInLop)
43: }
44: main()
````

## File: scripts/debug-enrollment.js
````javascript
 1: const { PrismaClient } = require('@prisma/client')
 2: const prisma = new PrismaClient()
 3: async function debugEnrollment() {
 4:   const userId = 1;
 5:   const courseCode = 'CB';
 6:   console.log(`🔍 Đang kiểm tra Enrollment cho User ID: ${userId}, Course Code: ${courseCode}...`)
 7:   const enrollments = await prisma.enrollment.findMany({
 8:     where: { 
 9:       userId: userId,
10:       course: {
11:         id_khoa: courseCode
12:       }
13:     },
14:     include: {
15:       course: true,
16:       user: true,
17:       payment: true
18:     }
19:   })
20:   if (enrollments.length === 0) {
21:     console.log('❌ Không tìm thấy Enrollment nào khớp.')
22:     return
23:   }
24:   enrollments.forEach(e => {
25:     console.log('\n--- THÔNG TIN ENROLLMENT ---')
26:     console.log(`ID: ${e.id}`)
27:     console.log(`Trạng thái: ${e.status}`)
28:     console.log(`Học viên: ${e.user.name} (Phone: ${e.user.phone})`)
29:     console.log(`Khóa học: ${e.course.name_lop} (${e.course.id_khoa})`)
30:     console.log(`Phí cọc yêu cầu: ${e.course.phi_coc.toLocaleString()} VND`)
31:     console.log(`Thanh toán đi kèm: ${e.payment ? e.payment.status : 'Chưa có payment'}`)
32:     if (e.payment) {
33:         console.log(`   Số tiền đã nhận: ${e.payment.amount.toLocaleString()} VND`)
34:     }
35:     console.log('----------------------------')
36:   })
37: }
38: debugEnrollment()
39:   .catch(e => console.error(e))
40:   .finally(async () => await prisma.$disconnect())
````

## File: scripts/fill-missing-ids.ts
````typescript
 1: import { PrismaClient, Role } from '@prisma/client'
 2: import bcrypt from 'bcryptjs'
 3: const prisma = new PrismaClient()
 4: async function main() {
 5:     const missingIds = [208, 228, 304, 641]
 6:     const defaultHash = await bcrypt.hash('Brk@3773', 10)
 7:     console.log('Filling missing IDs...')
 8:     for (const id of missingIds) {
 9:         try {
10:             const idSuffix = id.toString().padStart(3, '0')
11:             await prisma.user.create({
12:                 data: {
13:                     id: id,
14:                     name: `Học viên ${id}`, // Tên placeholder
15:                     email: `noemail${id}@gmail.com`,
16:                     phone: `3773986${idSuffix}`,
17:                     password: defaultHash,
18:                     role: Role.STUDENT,
19:                     referrerId: null,
20:                     createdAt: new Date(), // Thời gian hiện tại
21:                 }
22:             })
23:             console.log(`✅ Created placeholder user for ID: ${id}`)
24:         } catch (error) {
25:             console.error(`❌ Failed to create ID ${id}:`, error)
26:         }
27:     }
28:     // Reset sequence lần nữa cho chắc
29:     await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id)+1, 1), false) FROM "User";`)
30:     console.log('Done.')
31: }
32: main()
33:     .catch(e => {
34:         console.error(e)
35:         process.exit(1)
36:     })
37:     .finally(async () => {
38:         await prisma.$disconnect()
39:     })
````

## File: scripts/generate-code-history.ts
````typescript
  1: import * as fs from 'fs';
  2: import * as path from 'path';
  3: import * as child_process from 'child_process';
  4: const PROJECT_ROOT = process.cwd();
  5: const OUTPUT_DIR = path.join(PROJECT_ROOT);
  6: function getTimestamp(): string {
  7:   const now = new Date();
  8:   const year = now.getFullYear();
  9:   const month = String(now.getMonth() + 1).padStart(2, '0');
 10:   const day = String(now.getDate()).padStart(2, '0');
 11:   const hours = String(now.getHours()).padStart(2, '0');
 12:   const minutes = String(now.getMinutes()).padStart(2, '0');
 13:   const seconds = String(now.getSeconds()).padStart(2, '0');
 14:   return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
 15: }
 16: function getProjectStructure(): string {
 17:   const ignoreDirs = ['node_modules', '.next', '.git', '.agent', 'test-github-run', '__pycache__'];
 18:   const structure: string[] = [];
 19:   function walkDir(dir: string, prefix: string = '') {
 20:     const items = fs.readdirSync(dir, { withFileTypes: true });
 21:     const dirs: string[] = [];
 22:     const files: string[] = [];
 23:     for (const item of items) {
 24:       const relativePath = path.relative(PROJECT_ROOT, path.join(dir, item.name));
 25:       if (ignoreDirs.includes(item.name)) continue;
 26:       if (item.isDirectory()) {
 27:         dirs.push(item.name);
 28:       } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx') || item.name.endsWith('.json') || item.name.endsWith('.prisma') || item.name.endsWith('.css') || item.name.endsWith('.md') || item.name.match(/^(next\.config|tsconfig|postcss|tailwind)/i))) {
 29:         files.push(item.name);
 30:       }
 31:     }
 32:     for (const d of dirs) {
 33:       structure.push(`${prefix}├── ${d}/`);
 34:       walkDir(path.join(dir, d), prefix + '│   ');
 35:     }
 36:     for (let i = 0; i < files.length; i++) {
 37:       const isLast = i === files.length - 1 && dirs.length === 0;
 38:       structure.push(`${prefix}${isLast ? '└── ' : '├── '}${files[i]}`);
 39:     }
 40:   }
 41:   structure.push('HocVien-BRK/');
 42:   walkDir(PROJECT_ROOT);
 43:   return structure.join('\n');
 44: }
 45: function getAllSourceFiles(): { filePath: string; relativePath: string; category: string }[] {
 46:   const files: { filePath: string; relativePath: string; category: string }[] = [];
 47:   const seen = new Set<string>();
 48:   const extensions = ['.ts', '.tsx', '.json', '.prisma'];
 49:   function walkDir(dir: string) {
 50:     try {
 51:       const items = fs.readdirSync(dir, { withFileTypes: true });
 52:       for (const item of items) {
 53:         const fullPath = path.join(dir, item.name);
 54:         const relativePath = path.relative(PROJECT_ROOT, fullPath).replace(/\\/g, '/');
 55:         if (relativePath.includes('node_modules') || 
 56:             relativePath.includes('.next') || 
 57:             relativePath.includes('test-github-run') ||
 58:             relativePath.includes('generate-code-history') ||
 59:             relativePath.includes('.agent') ||
 60:             relativePath.startsWith('.')) continue;
 61:         if (seen.has(relativePath)) continue;
 62:         if (item.isDirectory()) {
 63:           walkDir(fullPath);
 64:         } else if (item.isFile()) {
 65:           const ext = path.extname(item.name);
 66:           if (!extensions.includes(ext) && !item.name.match(/^(next\.config|tsconfig|postcss|tailwind)/i)) continue;
 67:           seen.add(relativePath);
 68:           let category = 'other';
 69:           if (relativePath.startsWith('app/actions/')) category = 'actions';
 70:           else if (relativePath.startsWith('app/api/')) category = 'api';
 71:           else if (relativePath.startsWith('app/admin/')) category = 'admin';
 72:           else if (relativePath.startsWith('app/courses/')) category = 'courses';
 73:           else if (relativePath.startsWith('components/')) category = 'components';
 74:           else if (relativePath.startsWith('lib/')) category = 'lib';
 75:           else if (relativePath.startsWith('prisma/')) category = 'prisma';
 76:           else if (relativePath.startsWith('scripts/')) category = 'scripts';
 77:           else if (relativePath.startsWith('types/')) category = 'types';
 78:           else if (relativePath === 'auth.ts' || relativePath === 'auth.config.ts' || relativePath === 'middleware.ts') category = 'auth';
 79:           else if (relativePath.includes('package.json') || relativePath.includes('tsconfig') || relativePath.includes('next.config')) category = 'config';
 80:           files.push({
 81:             filePath: fullPath,
 82:             relativePath,
 83:             category
 84:           });
 85:         }
 86:       }
 87:     } catch (e) {
 88:       // Ignore permission errors
 89:     }
 90:   }
 91:   walkDir(PROJECT_ROOT);
 92:   return files;
 93: }
 94: function readFileContent(filePath: string): string {
 95:   try {
 96:     return fs.readFileSync(filePath, 'utf-8');
 97:   } catch {
 98:     return '';
 99:   }
100: }
101: function generateMarkdown(): string {
102:   const timestamp = getTimestamp();
103:   const now = new Date().toISOString().slice(0, 10);
104:   let md = `# CODE_HISTORY_${timestamp}.md
105: ================================================================================
106: PHIÊN BẢN: ${timestamp}
107: NGÀY TẠO: ${now}
108: MÔ TẢ: Tự động generate toàn bộ code dự án BRK Academy
109: ================================================================================
110: `;
111:   md += `## CẤU TRÚC DỰ ÁN
112: \`\`\`
113: ${getProjectStructure()}
114: \`\`\`
115: `;
116:   const files = getAllSourceFiles();
117:   const categoryOrder = ['auth', 'config', 'prisma', 'lib', 'actions', 'api', 'components', 'admin', 'courses', 'scripts', 'types', 'other'];
118:   for (const category of categoryOrder) {
119:     const categoryFiles = files.filter(f => f.category === category);
120:     if (categoryFiles.length === 0) continue;
121:     md += `## ${category.toUpperCase()} FILES\n\n`;
122:     for (const file of categoryFiles) {
123:       const content = readFileContent(file.filePath);
124:       if (!content) continue;
125:       const ext = path.extname(file.relativePath);
126:       const lang = ext === '.tsx' ? 'tsx' : ext === '.prisma' ? 'prisma' : 'ts';
127:       md += `### ${file.relativePath}\n\n`;
128:       md += `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
129:     }
130:   }
131:   return md;
132: }
133: function main() {
134:   console.log('🔄 Đang generate CODE_HISTORY...');
135:   const timestamp = getTimestamp();
136:   const outputFile = path.join(OUTPUT_DIR, `CODE_HISTORY_${timestamp}.md`);
137:   const content = generateMarkdown();
138:   fs.writeFileSync(outputFile, content, 'utf-8');
139:   const stats = fs.statSync(outputFile);
140:   const sizeKB = (stats.size / 1024).toFixed(2);
141:   console.log(`✅ Đã tạo file: ${outputFile}`);
142:   console.log(`📊 Kích thước: ${sizeKB} KB`);
143: }
144: main();
````

## File: scripts/hash.js
````javascript
1: const bcrypt = require('bcryptjs');
2: bcrypt.hash('Cuong#3773', 10).then(console.log);
````

## File: scripts/import-csv.ts
````typescript
  1: import fs from 'fs'
  2: import csv from 'csv-parser'
  3: import { PrismaClient, Role } from '@prisma/client'
  4: import bcrypt from 'bcryptjs'
  5: const prisma = new PrismaClient()
  6: interface UserRow {
  7:     id: string
  8:     name: string
  9:     email: string
 10:     phone: string
 11:     password?: string
 12:     role: string
 13:     referrerId?: string
 14:     createdAt?: string
 15: }
 16: async function main() {
 17:     const results: UserRow[] = []
 18:     const csvFilePath = 'processed-users.preview.csv'
 19:     if (!fs.existsSync(csvFilePath)) {
 20:         console.error(`Error: File '${csvFilePath}' not found. Please run 'npm run process-legacy' first.`)
 21:         process.exit(1)
 22:     }
 23:     // Đọc toàn bộ file vào bộ nhớ
 24:     console.log('Reading processed CSV file...')
 25:     await new Promise((resolve, reject) => {
 26:         fs.createReadStream(csvFilePath)
 27:             .pipe(csv())
 28:             .on('data', (data) => results.push(data))
 29:             .on('end', resolve)
 30:             .on('error', reject)
 31:     })
 32:     console.log(`Loaded ${results.length} users.`)
 33:     try {
 34:         // 1. XÓA SẠCH DỮ LIỆU CŨ (Để tránh conflict ID)
 35:         console.log('🗑️  Cleaning existing database...')
 36:         // Xóa theo thứ tự để tránh lỗi ràng buộc khóa ngoại
 37:         await prisma.account.deleteMany()
 38:         await prisma.session.deleteMany()
 39:         await prisma.user.deleteMany()
 40:         console.log('✅ Database cleaned.')
 41:         // 2. PHASE 1: INSERT USER (Chưa có Referrer)
 42:         console.log('🚀 Phase 1: Inserting Users (Ignoring Referrer)...')
 43:         // Hash password mặc định 1 lần dùng chung cho nhanh (nếu ko có pass riêng)
 44:         const defaultHash = await bcrypt.hash('Brk@3773', 10)
 45:         // Map để theo dõi email đã sử dụng (để tránh lỗi Unique Email)
 46:         const usedEmails = new Set<string>()
 47:         let successCount = 0
 48:         for (const row of results) {
 49:             let email = row.email
 50:             // XỬ LÝ TRÙNG EMAIL: Nếu email đã có trong batch này
 51:             if (usedEmails.has(email)) {
 52:                 const originalEmail = email
 53:                 email = `duplicate_${row.id}_${email}`
 54:                 console.warn(`⚠️  Email conflict for ID ${row.id}: '${originalEmail}' -> Renamed to '${email}'`)
 55:             }
 56:             usedEmails.add(email)
 57:             let passwordHash = defaultHash
 58:             if (row.password && row.password !== 'Brk@3773') {
 59:                 passwordHash = await bcrypt.hash(row.password, 10)
 60:             }
 61:             await prisma.user.create({
 62:                 data: {
 63:                     id: parseInt(row.id), // GIỮ NGUYÊN ID CŨ
 64:                     name: row.name,
 65:                     email: email, // Email đã xử lý trùng
 66:                     phone: row.phone,
 67:                     password: passwordHash,
 68:                     role: row.role as Role,
 69:                     referrerId: null, // Để null trước, update sau
 70:                     createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
 71:                 }
 72:             })
 73:             process.stdout.write('.')
 74:             successCount++
 75:         }
 76:         console.log(`\n✅ Phase 1 Finished: Inserted ${successCount} users.`)
 77:         // 3. PHASE 2: UPDATE REFERRER
 78:         console.log('🔗 Phase 2: Linking Referrers...')
 79:         let linkCount = 0
 80:         // Tạo Map để tra cứu nhanh ID tồn tại (tránh lỗi key nếu referrerId ko có trong list)
 81:         const allIds = new Set(results.map(r => parseInt(r.id)))
 82:         for (const row of results) {
 83:             const referrerId = row.referrerId ? parseInt(row.referrerId) : null
 84:             if (referrerId && referrerId > 0) {
 85:                 // Chỉ update nếu referrerId CÓ TỒN TẠI trong danh sách import
 86:                 if (allIds.has(referrerId)) {
 87:                     await prisma.user.update({
 88:                         where: { id: parseInt(row.id) },
 89:                         data: { referrerId: referrerId }
 90:                     })
 91:                     linkCount++
 92:                 } else {
 93:                     // console.warn(`\n⚠️  Warning: User ${row.id} has referrerId ${referrerId} but that ID does not exist. Skipped link.`)
 94:                 }
 95:             }
 96:         }
 97:         console.log(`\n✅ Phase 2 Finished: Linked ${linkCount} referrals.`)
 98:         // 4. RESET SEQUENCE
 99:         console.log('🔄 Resetting Database Sequence...')
100:         await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id)+1, 1), false) FROM "User";`)
101:         console.log('✅ Sequence reset successful.')
102:     } catch (error) {
103:         console.error('\n❌ Import Failed:', error)
104:     } finally {
105:         await prisma.$disconnect()
106:     }
107: }
108: main()
````

## File: scripts/import-lessons-from-csv.ts
````typescript
 1: import { PrismaClient } from '@prisma/client'
 2: import fs from 'fs'
 3: import csv from 'csv-parser'
 4: const prisma = new PrismaClient()
 5: const COURSE_ID = 16
 6: interface CSVRow {
 7:   STT: string
 8:   'Tên File': string
 9:   'Link Chia Sẻ': string
10: }
11: async function main() {
12:   console.log('🚀 Bắt đầu import lessons từ CSV...')
13:   const results: CSVRow[] = []
14:   fs.createReadStream('Danh sach bai hoc Mentor 7.csv')
15:     .pipe(csv())
16:     .on('data', (data) => results.push(data))
17:     .on('end', async () => {
18:       console.log(`📊 Đọc được ${results.length} dòng từ CSV`)
19:       let successCount = 0
20:       let errorCount = 0
21:       for (const row of results) {
22:         try {
23:           const order = parseInt(row.STT)
24:           const fileName = row['Tên File']
25:           const rawUrl = row['Link Chia Sẻ']
26:           if (isNaN(order)) {
27:             console.log(`⚠️ STT không hợp lệ: ${row.STT}`)
28:             errorCount++
29:             continue
30:           }
31:           // Chuyển đổi link: /edit -> /preview (để embed)
32:           let embedUrl = rawUrl
33:           if (embedUrl.includes('/edit')) {
34:             embedUrl = embedUrl.replace('/edit', '/preview')
35:           }
36:           // Tạo title từ tên file (lấy phần sau số ngày)
37:           const title = fileName.replace(/^Ngay\d+-P💎\s*/, '').trim()
38:           // Upsert lesson
39:           await prisma.lesson.upsert({
40:             where: {
41:               courseId_order: {
42:                 courseId: COURSE_ID,
43:                 order: order
44:               }
45:             },
46:             update: {
47:               title: title,
48:               videoUrl: embedUrl,
49:               content: embedUrl
50:             },
51:             create: {
52:               courseId: COURSE_ID,
53:               order: order,
54:               title: title,
55:               videoUrl: embedUrl,
56:               content: embedUrl
57:             }
58:           })
59:           successCount++
60:           console.log(`✅ Lesson ${order}: ${title.substring(0, 50)}...`)
61:         } catch (error) {
62:           errorCount++
63:           console.error(`❌ Lỗi khi xử lý dòng:`, error)
64:         }
65:       }
66:       console.log(`\n🎉 Hoàn thành!`)
67:       console.log(`   - Thành công: ${successCount}`)
68:       console.log(`   - Lỗi: ${errorCount}`)
69:       await prisma.$disconnect()
70:       process.exit(0)
71:     })
72: }
73: main().catch(async (e) => {
74:   console.error('❌ Lỗi nghiêm trọng:', e)
75:   await prisma.$disconnect()
76:   process.exit(1)
77: })
````

## File: scripts/import-reserved-list.ts
````typescript
 1: import { PrismaClient } from '@prisma/client'
 2: const prisma = new PrismaClient()
 3: const reservedList = [
 4:     8286,
 5:     8386,
 6:     8668,
 7:     8686,
 8:     3773,
 9:     2689,
10:     9139,
11:     1102,
12:     1568,
13:     9319
14: ]
15: async function main() {
16:     console.log(`Start importing ${reservedList.length} reserved IDs...`)
17:     let count = 0
18:     for (const id of reservedList) {
19:         try {
20:             const existing = await prisma.reservedId.findUnique({ where: { id } })
21:             if (existing) {
22:                 console.log(`- ID ${id}: Already reserved`)
23:             } else {
24:                 await prisma.reservedId.create({
25:                     data: {
26:                         id,
27:                         note: 'VIP List (Batch Import)'
28:                     }
29:                 })
30:                 console.log(`+ ID ${id}: Success`)
31:                 count++
32:             }
33:         } catch (error) {
34:             console.error(`x ID ${id}: Failed`, error)
35:         }
36:     }
37:     console.log(`\nImport completed! Added ${count} new reserved IDs.`)
38: }
39: main()
40:     .catch(e => console.error(e))
41:     .finally(async () => await prisma.$disconnect())
````

## File: scripts/import-students.ts
````typescript
 1: import { PrismaClient, Role } from '@prisma/client'
 2: import bcrypt from 'bcryptjs'
 3: const prisma = new PrismaClient()
 4: // Giả lập danh sách học viên cũ (Bạn có thể đọc từ file Excel/CSV ở đây)
 5: const oldStudents = [
 6:     { name: 'Nguyễn Văn A', email: 'a@gmail.com', phone: '0901234567' },
 7:     { name: 'Trần Thị B', email: 'b@gmail.com', phone: '0901234568' },
 8:     // ... thêm 100 học viên khác
 9: ]
10: async function main() {
11:     console.log('Start importing...')
12:     // Mật khẩu mặc định cho học viên cũ (ví dụ: 123456)
13:     const defaultPassword = await bcrypt.hash('123456', 10)
14:     for (const student of oldStudents) {
15:         const user = await prisma.user.create({
16:             data: {
17:                 name: student.name,
18:                 email: student.email,
19:                 phone: student.phone,
20:                 password: defaultPassword,
21:                 role: Role.STUDENT,
22:                 // ID sẽ tự động tăng (3 -> 4 -> 5...) do Database Sequence quản lý
23:                 // Không sợ xung đột với dữ liệu hiện tại
24:             },
25:         })
26:         console.log(`Created user with id: ${user.id}`)
27:     }
28:     console.log('Import finished.')
29: }
30: main()
31:     .catch((e) => console.error(e))
32:     .finally(async () => await prisma.$disconnect())
````

## File: scripts/import-v3-data.ts
````typescript
  1: import fs from 'fs'
  2: import csv from 'csv-parser'
  3: import { PrismaClient } from '@prisma/client'
  4: import bcrypt from 'bcryptjs'
  5: const prisma = new PrismaClient()
  6: async function readCsv(filePath: string): Promise<any[]> {
  7:     const results: any[] = []
  8:     return new Promise((resolve, reject) => {
  9:         fs.createReadStream(filePath)
 10:             .pipe(csv())
 11:             .on('data', (data) => results.push(data))
 12:             .on('end', () => resolve(results))
 13:             .on('error', reject)
 14:     })
 15: }
 16: async function main() {
 17:     console.log('🚀 Bắt đầu quy trình nạp dữ liệu chuẩn hóa (V3 - Nâng cấp)...')
 18:     try {
 19:         const users = await readCsv('User.csv')
 20:         const courses = await readCsv('Course.csv')
 21:         const enrollments = await readCsv('Enrollment.csv')
 22:         // 1. DỌN DẸP DATABASE
 23:         console.log('🗑️  Đang làm sạch Database...')
 24:         await (prisma as any).enrollment.deleteMany()
 25:         await (prisma as any).account.deleteMany()
 26:         await (prisma as any).session.deleteMany()
 27:         await (prisma as any).course.deleteMany()
 28:         await (prisma as any).user.deleteMany()
 29:         console.log('✅ Đã làm sạch dữ liệu cũ.')
 30:         // 2. NẠP KHÓA HỌC
 31:         console.log('📚 Đang nạp danh sách Khóa học...')
 32:         for (const row of courses) {
 33:             await (prisma as any).course.create({
 34:                 data: {
 35:                     id: parseInt(row.id),
 36:                     id_khoa: row.id_khoa,
 37:                     name_lop: row.name_lop,
 38:                     name_khoa: row.name_khoa,
 39:                     date_join: row.date_join,
 40:                     status: row.status.toUpperCase() === 'TRUE',
 41:                     mo_ta_ngan: row.mo_ta_ngan,
 42:                     mo_ta_dai: row.mo_ta_dai,
 43:                     link_anh_bia: row.link_anh_bia_khoa,
 44:                     link_zalo: row.link_zalo,
 45:                     phi_coc: parseInt(row.phi_coc) || 0,
 46:                     stk: row.stk,
 47:                     name_stk: row.name_stk,
 48:                     bank_stk: row.bank_stk,
 49:                     noidung_stk: row.noidung_stk,
 50:                     link_qrcode: row.link_qrcode,
 51:                     file_email: row.file_email,
 52:                     noidung_email: row.noidung_email,
 53:                 }
 54:             })
 55:         }
 56:         console.log(`✅ Đã nạp ${courses.length} khóa học.`)
 57:         // 3. NẠP NGƯỜI DÙNG (Phase 1: Không có Referrer)
 58:         console.log('👤 Đang nạp danh sách Học viên (Kèm mã hóa mật khẩu)...')
 59:         const userCount = users.length;
 60:         for (let i = 0; i < users.length; i++) {
 61:             const u = users[i];
 62:             try {
 63:                 // Mã hóa mật khẩu nếu có
 64:                 let passwordHash = null;
 65:                 if (u.password && u.password.trim() !== '') {
 66:                     passwordHash = await bcrypt.hash(u.password.trim(), 10);
 67:                 }
 68:                 // Chuẩn hóa dữ liệu trước khi nạp
 69:                 const data: any = {
 70:                     id: parseInt(u.id),
 71:                     name: u.name || null,
 72:                     email: u.email.trim(),
 73:                     phone: u.phone && u.phone.trim() !== '' ? u.phone.trim() : null,
 74:                     role: u.role || 'STUDENT',
 75:                     password: passwordHash,
 76:                 };
 77:                 // Xử lý ngày tháng
 78:                 if (u.createdAt) {
 79:                     const parts = u.createdAt.split(' ');
 80:                     const dateParts = parts[0].split('/');
 81:                     if (dateParts.length === 3) {
 82:                         const d = parseInt(dateParts[0]);
 83:                         const m = parseInt(dateParts[1]) - 1;
 84:                         const y = parseInt(dateParts[2]);
 85:                         if (parts[1]) {
 86:                             const t = parts[1].split(':');
 87:                             data.createdAt = new Date(y, m, d,
 88:                                 parseInt(t[0] || '0'),
 89:                                 parseInt(t[1] || '0'),
 90:                                 parseInt(t[2] || '0'));
 91:                         } else {
 92:                             data.createdAt = new Date(y, m, d);
 93:                         }
 94:                     } else {
 95:                         data.createdAt = new Date(u.createdAt);
 96:                     }
 97:                 }
 98:                 await (prisma as any).user.create({ data });
 99:                 if ((i + 1) % 100 === 0) console.log(`... Đã nạp ${i + 1}/${userCount} học viên.`);
100:             } catch (err: any) {
101:                 console.error(`❌ Lỗi tại User ID ${u.id} (${u.email}):`, err);
102:                 throw err;
103:             }
104:         }
105:         // 4. CẬP NHẬT REFERRER (Phase 2)
106:         console.log('🔗 Đang nối quan hệ Người giới thiệu...')
107:         for (const u of users) {
108:             // Sửa logic: Cho phép id 0 làm người giới thiệu
109:             if (u.referrerId && u.referrerId.trim() !== '') {
110:                 await (prisma as any).user.update({
111:                     where: { id: parseInt(u.id) },
112:                     data: { referrerId: parseInt(u.referrerId) }
113:                 }).catch(() => { });
114:             }
115:         }
116:         // 5. NẠP ĐĂNG KÍ KHÓA HỌC
117:         console.log('📋 Đang nạp danh sách Đăng ký (Enrollments)...')
118:         const enrCount = enrollments.length;
119:         for (let i = 0; i < enrollments.length; i++) {
120:             const e = enrollments[i];
121:             try {
122:                 const data: any = {
123:                     userId: parseInt(e.userId),
124:                     courseId: parseInt(e.courseId),
125:                     status: e.status || 'ACTIVE',
126:                     phi_coc: parseInt(e.phi_coc) || 0,
127:                     link_anh_coc: e.link_anh_coc || null,
128:                 };
129:                 // Xử lý ngày bắt đầu (startedAt) nếu có
130:                 if (e.startedAt && e.startedAt.trim() !== '') {
131:                     data.startedAt = new Date(e.startedAt);
132:                 }
133:                 if (e.createdAt) {
134:                     const parts = e.createdAt.split(' ');
135:                     const dateParts = parts[0].split('/');
136:                     if (dateParts.length === 3) {
137:                         const d = parseInt(dateParts[0]);
138:                         const m = parseInt(dateParts[1]) - 1;
139:                         const y = parseInt(dateParts[2]);
140:                         if (parts[1]) {
141:                             const t = parts[1].split(':');
142:                             data.createdAt = new Date(y, m, d, parseInt(t[0] || '0'), parseInt(t[1] || '0'), parseInt(t[2] || '0'));
143:                         } else {
144:                             data.createdAt = new Date(y, m, d);
145:                         }
146:                     } else {
147:                         data.createdAt = new Date(e.createdAt);
148:                     }
149:                 }
150:                 await (prisma as any).enrollment.create({ data });
151:                 if ((i + 1) % 100 === 0) console.log(`... Đã nạp ${i + 1}/${enrCount} lượt đăng ký.`);
152:             } catch (err: any) {
153:                 console.error(`❌ Lỗi tại Enrollment dòng ${i + 2} (User: ${e.userId}, Course: ${e.courseId}):`, err.message);
154:                 // Nếu là lỗi trùng lặp (P2002), ta có thể bỏ qua
155:                 if (!err.message.includes('P2002')) throw err;
156:             }
157:         }
158:         console.log(`✅ Đã hoàn tất nạp lượt đăng ký.`)
159:         // 6. RESET SEQUENCES (PostgreSQL)
160:         console.log('🔄 Đang đồng bộ lại bộ đếm ID (Sequence)...')
161:         await (prisma as any).$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), (SELECT MAX(id) FROM "User"));`)
162:         await (prisma as any).$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Course"', 'id'), (SELECT MAX(id) FROM "Course"));`)
163:         await (prisma as any).$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Enrollment"', 'id'), (SELECT MAX(id) FROM "Enrollment"));`)
164:         console.log('🎯 HOÀN TẤT NẠP DỮ LIỆU CHUẨN HÓA V3!')
165:     } catch (error) {
166:         console.error('❌ LỖI TRONG QUÁ TRÌNH NẠP:', error)
167:     } finally {
168:         await prisma.$disconnect()
169:     }
170: }
171: main()
````

## File: scripts/inspect_csv.py
````python
 1: import csv
 2: def inspect_khoa_hoc():
 3:     print("=== INSPECTING KHOAHOC.CSV ===")
 4:     courses = []
 5:     with open('KhoaHoc.csv', mode='r', encoding='utf-8-sig') as f:
 6:         reader = csv.DictReader(f)
 7:         for row in reader:
 8:             courses.append(row)
 9:     print(f"Total courses parsed: {len(courses)}")
10:     for i, c in enumerate(courses):
11:         print(f"{i+1}. id_khoa: [{c.get('id_khoa')}] | id_lop: [{c.get('id_lop')}] | name: {c.get('name_lop')}")
12:         if 'AI' in (c.get('name_lop') or ''):
13:             print(f"   >>> FOUND AI COURSE: {c.get('name_lop')}")
14:     return courses
15: def inspect_ls_dang_ky(courses):
16:     print("\n=== INSPECTING LS_DANGKY.CSV ===")
17:     course_ids_in_db = {c.get('id_khoa') for c in courses if c.get('id_khoa')}
18:     course_lops_in_db = {c.get('id_lop') for c in courses if c.get('id_lop')}
19:     reg_counts = {}
20:     total_reg = 0
21:     with open('LS_DangKy.csv', mode='r', encoding='utf-8-sig') as f:
22:         reader = csv.DictReader(f)
23:         for row in reader:
24:             total_reg += 1
25:             kid = row.get('id_khoa')
26:             lid = row.get('id_lop')
27:             key = kid if kid else lid
28:             reg_counts[key] = reg_counts.get(key, 0) + 1
29:     print(f"Total registrations in CSV: {total_reg}")
30:     print("Registration breakdown by id_khoa (or id_lop if empty):")
31:     for key, count in sorted(reg_counts.items(), key=lambda x: x[1], reverse=True):
32:         status = "MATCHED (id_khoa)" if key in course_ids_in_db else ("MATCHED (id_lop)" if key in course_lops_in_db else "MISSING")
33:         print(f"- {key}: {count} regs | {status}")
34: if __name__ == "__main__":
35:     courses = inspect_khoa_hoc()
36:     inspect_ls_dang_ky(courses)
````

## File: scripts/inspect-csv.js
````javascript
 1: const fs = require('fs');
 2: const csv = require('csv-parser');
 3: async function inspect() {
 4:     console.log("=== COMPREHENSIVE DATA INSPECTION ===");
 5:     // 1. Parse KhoaHoc.csv
 6:     const courses = [];
 7:     await new Promise((resolve) => {
 8:         fs.createReadStream('KhoaHoc.csv')
 9:             .pipe(csv({
10:                 mapHeaders: ({ header }) => header.trim(),
11:                 mapValues: ({ value }) => value.trim()
12:             }))
13:             .on('data', (data) => courses.push(data))
14:             .on('end', resolve);
15:     });
16:     console.log(`\n--- KHOA HOC SUMMARY (${courses.length} entries) ---`);
17:     courses.forEach((c, i) => {
18:         console.log(`${i + 1}. id_khoa: [${c.id_khoa}] | id_lop: [${c.id_lop}] | name: ${c.name_lop}`);
19:     });
20:     // 2. Parse LS_DangKy.csv
21:     const registrations = [];
22:     await new Promise((resolve) => {
23:         fs.createReadStream('LS_DangKy.csv')
24:             .pipe(csv({
25:                 mapHeaders: ({ header }) => header.trim(),
26:                 mapValues: ({ value }) => value.trim()
27:             }))
28:             .on('data', (data) => registrations.push(data))
29:             .on('end', resolve);
30:     });
31:     console.log(`\n--- LS DANG KY SUMMARY (${registrations.length} entries) ---`);
32:     const regCounts = {};
33:     registrations.forEach(r => {
34:         // Kiểm tra mối liên hệ: LS_DangKy.id_khoa -> KhoaHoc.id_khoa
35:         const key = r.id_khoa || r.id_lop || 'UNKNOWN';
36:         if (!regCounts[key]) regCounts[key] = { count: 0, sample_lop: r.id_lop };
37:         regCounts[key].count++;
38:     });
39:     const courseIds = new Set(courses.map(c => c.id_khoa));
40:     const courseLops = new Set(courses.map(c => c.id_lop));
41:     console.log("\nBreakdown of registrations and matching status:");
42:     Object.entries(regCounts)
43:         .sort((a, b) => b[1].count - a[1].count)
44:         .forEach(([key, info]) => {
45:             let match = "MISSING";
46:             if (courseIds.has(key)) match = "MATCHED (id_khoa)";
47:             else if (courseLops.has(key)) match = "MATCHED (id_lop)";
48:             else {
49:                 // Thử tìm xem có khóa học nào có id_khoa bắt đầu bằng key không (ví dụ AF386 vs AF)
50:                 const fuzzy = courses.find(c => c.id_khoa.startsWith(key) || key.startsWith(c.id_khoa));
51:                 if (fuzzy) match = `FUZZY MATCH with ${fuzzy.id_khoa}`;
52:             }
53:             console.log(`- ${key} (Lop: ${info.sample_lop}): ${info.count} regs | ${match}`);
54:         });
55: }
56: inspect();
````

## File: scripts/make-admin.ts
````typescript
 1: import { PrismaClient, Role } from '@prisma/client'
 2: const prisma = new PrismaClient()
 3: async function main() {
 4:     const args = process.argv.slice(2)
 5:     const email = args[0] || 'cuongchupanh001@gmail.com' // Email mặc định hoặc lấy từ tham số dòng lệnh
 6:     console.log(`Checking email: ${email}...`)
 7:     try {
 8:         const user = await prisma.user.findUnique({ where: { email } })
 9:         if (!user) {
10:             console.error(`❌ User with email '${email}' not found.`)
11:             return
12:         }
13:         const updatedUser = await prisma.user.update({
14:             where: { email },
15:             data: { role: Role.ADMIN },
16:         })
17:         console.log(`✅ Success! Updated user ${updatedUser.email} (ID: ${updatedUser.id}) to ADMIN role.`)
18:     } catch (e) {
19:         console.error('Error updating user:', e)
20:     } finally {
21:         await prisma.$disconnect()
22:     }
23: }
24: main()
````

## File: scripts/payment-watcher.js
````javascript
 1: require('dotenv').config()
 2: const { exec } = require('child_process');
 3: // Cấu hình thời gian quét (ví dụ: 3 phút = 180000ms)
 4: const CHECK_INTERVAL = 3 * 60 * 1000; 
 5: function runVerification() {
 6:     const now = new Date().toLocaleString();
 7:     console.log(`[${now}] 🔍 Đang quét email giao dịch mới...`);
 8:     // Chạy file auto-verify-payment.js (Tôi sẽ tạo bản JS để tránh lỗi thực thi TS-node)
 9:     exec('node scripts/auto-verify-payment.js', (error, stdout, stderr) => {
10:         if (error) {
11:             console.error(`[${now}] ❌ Lỗi khi chạy xác thực: ${error.message}`);
12:             return;
13:         }
14:         if (stderr) {
15:             console.log(`[${now}] ⚠️ Cảnh báo: ${stderr}`);
16:         }
17:         console.log(`[${now}] ✅ Kết quả: \n${stdout}`);
18:     });
19: }
20: // Chạy lần đầu tiên ngay khi khởi động
21: runVerification();
22: // Thiết lập vòng lặp chạy định kỳ
23: setInterval(runVerification, CHECK_INTERVAL);
24: console.log('🚀 Payment Watcher đã khởi động!');
25: console.log(`Hệ thống sẽ tự động quét Gmail mỗi ${CHECK_INTERVAL / 60000} phút.`);
26: console.log('Nhấn Ctrl+C để dừng.');
````

## File: scripts/process-legacy-users.ts
````typescript
  1: import fs from 'fs'
  2: import csv from 'csv-parser'
  3: import { createObjectCsvWriter } from 'csv-writer'
  4: import path from 'path'
  5: // Format ngày tháng từ DD/MM/YYYY H:mm:ss sang ISO
  6: function parseDate(dateStr: string): string {
  7:     if (!dateStr) return new Date().toISOString()
  8:     try {
  9:         // Giả sử định dạng DD/MM/YYYY H:mm:ss (ví dụ: 06/08/2023 6:08:37)
 10:         // Hoặc DD/MM/YYYY (ví dụ: 27/01/2025)
 11:         const [datePart, timePart] = dateStr.trim().split(' ')
 12:         const [day, month, year] = datePart.split('/').map(Number)
 13:         // Validate date
 14:         if (!day || !month || !year) return new Date().toISOString()
 15:         let hour = 0, minute = 0, second = 0
 16:         if (timePart) {
 17:             [hour, minute, second] = timePart.split(':').map(Number)
 18:         }
 19:         // Lưu ý: Month trong JS bắt đầu từ 0
 20:         return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0).toISOString()
 21:     } catch (e) {
 22:         console.warn(`Invalid date: ${dateStr}. Using current time.`)
 23:         return new Date().toISOString()
 24:     }
 25: }
 26: async function main() {
 27:     const inputFilePath = 'User old - User.csv'
 28:     const outputFilePath = 'processed-users.preview.csv'
 29:     if (!fs.existsSync(inputFilePath)) {
 30:         console.error(`File not found: ${inputFilePath}`)
 31:         process.exit(1)
 32:     }
 33:     const rawRows: any[] = []
 34:     // Map: NameNormalized -> UserID[]
 35:     // Dùng để tra cứu referrer nếu referrerId là tên
 36:     const nameMap = new Map<string, string[]>()
 37:     console.log('📖 Reading CSV data...')
 38:     await new Promise((resolve, reject) => {
 39:         fs.createReadStream(inputFilePath)
 40:             .pipe(csv())
 41:             .on('data', (data) => {
 42:                 rawRows.push(data)
 43:                 // Build Name Map
 44:                 const name = data.name ? data.name.trim() : ''
 45:                 if (name) {
 46:                     const normalized = name.toLowerCase()
 47:                     if (!nameMap.has(normalized)) {
 48:                         nameMap.set(normalized, [])
 49:                     }
 50:                     nameMap.get(normalized)?.push(data.id)
 51:                 }
 52:             })
 53:             .on('end', resolve)
 54:             .on('error', reject)
 55:     })
 56:     console.log(`📊 Loaded ${rawRows.length} rows. Processing...`)
 57:     const processedData: any[] = []
 58:     let resolvedCount = 0
 59:     let ambiguousCount = 0
 60:     let notFoundCount = 0
 61:     for (const row of rawRows) {
 62:         const id = row.id
 63:         // 1. Xử lý Email
 64:         let email = row.email ? row.email.trim() : ''
 65:         if (!email) {
 66:             email = `noemail${id}@gmail.com`
 67:         }
 68:         // 2. Xử lý Phone
 69:         let phone = row.phone ? row.phone.trim() : ''
 70:         if (!phone) {
 71:             const idSuffix = id.toString().padStart(3, '0')
 72:             phone = `000000${idSuffix}` // Fake phone logic
 73:         }
 74:         // 3. Xử lý Password
 75:         let password = row.password ? row.password.trim() : ''
 76:         if (!password) {
 77:             password = 'Brk@3773'
 78:         }
 79:         // 4. Xử lý Role
 80:         let role = row.role ? row.role.trim() : ''
 81:         if (!role) {
 82:             role = 'STUDENT'
 83:         }
 84:         // 5. Xử lý Referrer
 85:         let referrerId = row.referrerId ? row.referrerId.trim() : null
 86:         // Nếu referrerId là tên (không phải số)
 87:         if (referrerId && isNaN(parseInt(referrerId))) {
 88:             const referrerNameNormalized = referrerId.toLowerCase()
 89:             const foundIds = nameMap.get(referrerNameNormalized)
 90:             if (foundIds && foundIds.length === 1) {
 91:                 // Tìm thấy chính xác 1 người -> RESOLVED
 92:                 referrerId = foundIds[0]
 93:                 resolvedCount++
 94:                 // console.log(`   ✅ Resolved referrer "${row.referrerId}" -> ID: ${referrerId}`)
 95:             } else if (foundIds && foundIds.length > 1) {
 96:                 // Tìm thấy nhiều người trùng tên -> AMBIGUOUS
 97:                 // console.warn(`   ⚠️  Ambiguous referrer "${row.referrerId}" for User ${id}. Matches IDs: ${foundIds.join(', ')}. Leaving NULL.`)
 98:                 ambiguousCount++
 99:                 referrerId = null
100:             } else {
101:                 // Không tìm thấy -> NOT FOUND
102:                 // console.warn(`   ❌ Referrer "${row.referrerId}" not found for User ${id}. Leaving NULL.`)
103:                 notFoundCount++
104:                 referrerId = null
105:             }
106:         } else if (referrerId && !isNaN(parseInt(referrerId))) {
107:             // Là số -> Giữ nguyên (Check tồn tại sẽ ở bước import)
108:         } else {
109:             referrerId = null
110:         }
111:         // 6. Xử lý CreatedAt
112:         const createdAt = parseDate(row.createdAt)
113:         processedData.push({
114:             id: id,
115:             name: row.name,
116:             email: email,
117:             phone: phone,
118:             password: password,
119:             role: role,
120:             referrerId: referrerId,
121:             createdAt: createdAt
122:         })
123:     }
124:     console.log(`\n--- Summary ---`)
125:     console.log(`Toal Users: ${processedData.length}`)
126:     console.log(`Referrers Resolved (Name->ID): ${resolvedCount}`)
127:     console.log(`Referrers Ambiguous (Skipped):   ${ambiguousCount}`)
128:     console.log(`Referrers Not Found (Skipped):   ${notFoundCount}`)
129:     // Ghi ra file CSV mới
130:     const csvWriter = createObjectCsvWriter({
131:         path: outputFilePath,
132:         header: [
133:             { id: 'id', title: 'id' },
134:             { id: 'name', title: 'name' },
135:             { id: 'email', title: 'email' },
136:             { id: 'phone', title: 'phone' },
137:             { id: 'password', title: 'password' },
138:             { id: 'role', title: 'role' },
139:             { id: 'referrerId', title: 'referrerId' },
140:             { id: 'createdAt', title: 'createdAt' },
141:         ]
142:     })
143:     await csvWriter.writeRecords(processedData)
144:     console.log(`\n✅ Saved to: ${outputFilePath}`)
145: }
146: main()
````

## File: scripts/seed-courses.ts
````typescript
  1: import fs from 'fs'
  2: import csv from 'csv-parser'
  3: import { PrismaClient } from '@prisma/client'
  4: const prisma = new PrismaClient()
  5: interface CourseRow {
  6:     id_lop: string
  7:     name_lop: string
  8:     id_khoa: string
  9:     name_khoa: string
 10:     date_join: string
 11:     status: string
 12:     mo_ta_dai: string
 13:     link_zalo: string
 14:     phi_coc: string
 15:     stk: string
 16:     name_stk: string
 17:     bank_stk: string
 18:     noidung_stk: string
 19:     link_qrcode: string
 20:     file_email: string
 21:     noidung_email: string
 22:     link_anh_bia_khoa: string
 23:     mo_ta_ngan: string
 24: }
 25: async function main() {
 26:     const results: CourseRow[] = []
 27:     const csvFilePath = 'KhoaHoc.csv'
 28:     if (!fs.existsSync(csvFilePath)) {
 29:         console.error(`Error: File '${csvFilePath}' not found.`)
 30:         process.exit(1)
 31:     }
 32:     console.log('Reading KhoaHoc.csv...')
 33:     await new Promise((resolve, reject) => {
 34:         fs.createReadStream(csvFilePath)
 35:             .pipe(csv())
 36:             .on('data', (data: CourseRow) => results.push(data))
 37:             .on('end', resolve)
 38:             .on('error', reject)
 39:     })
 40:     console.log(`Loaded ${results.length} course entries.`)
 41:     let successCount = 0
 42:     for (const row of results) {
 43:         if (!row.id_khoa) continue;
 44:         // Xử lý trùng id_khoa bằng cách tạo unique ID kết hợp tên lớp nếu cần
 45:         // Đặc biệt cho trường hợp AI
 46:         const uniqueKey = row.id_khoa === 'AI' ? `${row.id_khoa}_${row.name_lop.substring(0, 10)}` : row.id_khoa;
 47:         try {
 48:             await (prisma as any).course.upsert({
 49:                 where: { id_khoa: uniqueKey },
 50:                 update: {
 51:                     name_lop: row.name_lop,
 52:                     name_khoa: row.name_khoa,
 53:                     date_join: row.date_join,
 54:                     status: row.status.toUpperCase() === 'TRUE',
 55:                     mo_ta_ngan: row.mo_ta_ngan,
 56:                     mo_ta_dai: row.mo_ta_dai,
 57:                     link_anh_bia: row.link_anh_bia_khoa,
 58:                     link_zalo: row.link_zalo,
 59:                     phi_coc: parseInt(row.phi_coc) || 0,
 60:                     stk: row.stk,
 61:                     name_stk: row.name_stk,
 62:                     bank_stk: row.bank_stk,
 63:                     noidung_stk: row.noidung_stk,
 64:                     link_qrcode: row.link_qrcode,
 65:                     file_email: row.file_email,
 66:                     noidung_email: row.noidung_email,
 67:                 },
 68:                 create: {
 69:                     id_khoa: uniqueKey,
 70:                     name_lop: row.name_lop,
 71:                     name_khoa: row.name_khoa,
 72:                     date_join: row.date_join,
 73:                     status: row.status.toUpperCase() === 'TRUE',
 74:                     mo_ta_ngan: row.mo_ta_ngan,
 75:                     mo_ta_dai: row.mo_ta_dai,
 76:                     link_anh_bia: row.link_anh_bia_khoa,
 77:                     link_zalo: row.link_zalo,
 78:                     phi_coc: parseInt(row.phi_coc) || 0,
 79:                     stk: row.stk,
 80:                     name_stk: row.name_stk,
 81:                     bank_stk: row.bank_stk,
 82:                     noidung_stk: row.noidung_stk,
 83:                     link_qrcode: row.link_qrcode,
 84:                     file_email: row.file_email,
 85:                     noidung_email: row.noidung_email,
 86:                 }
 87:             })
 88:             successCount++
 89:         } catch (error) {
 90:             console.error(`❌ Failed to seed course ${row.id_khoa}:`, error)
 91:         }
 92:     }
 93:     console.log(`✅ Seeded ${successCount} courses successfully.`)
 94: }
 95: main()
 96:     .catch(e => {
 97:         console.error(e)
 98:         process.exit(1)
 99:     })
100:     .finally(async () => {
101:         await prisma.$disconnect()
102:     })
````

## File: scripts/seed-enrollments.ts
````typescript
  1: import fs from 'fs'
  2: import csv from 'csv-parser'
  3: import { PrismaClient } from '@prisma/client'
  4: const prisma = new PrismaClient()
  5: interface RegRow {
  6:     time_stamp: string
  7:     id_hocvien: string
  8:     name_hocvien: string
  9:     id_lop: string
 10:     id_khoa: string
 11:     phi_coc: string
 12:     trang_thai: string
 13: }
 14: async function main() {
 15:     const results: RegRow[] = []
 16:     const csvFilePath = 'LS_DangKy.csv'
 17:     if (!fs.existsSync(csvFilePath)) {
 18:         console.error(`Error: File '${csvFilePath}' not found.`)
 19:         process.exit(1)
 20:     }
 21:     console.log('Reading LS_DangKy.csv...')
 22:     await new Promise((resolve, reject) => {
 23:         fs.createReadStream(csvFilePath)
 24:             .pipe(csv())
 25:             .on('data', (data: RegRow) => results.push(data))
 26:             .on('end', resolve)
 27:             .on('error', reject)
 28:     })
 29:     console.log(`Loaded ${results.length} registration history entries.`)
 30:     // Lấy mapping Course để tránh query nhiều
 31:     const allCourses = await (prisma as any).course.findMany();
 32:     let successCount = 0
 33:     let skipCount = 0
 34:     let errorCount = 0
 35:     for (const row of results) {
 36:         const studentId = parseInt(row.id_hocvien)
 37:         if (isNaN(studentId)) {
 38:             skipCount++
 39:             continue
 40:         }
 41:         // SMART MAPPING FOR LEGACY CODES
 42:         let targetIdKhoa = row.id_khoa;
 43:         if (targetIdKhoa === '1kF') targetIdKhoa = 'LS03';
 44:         if (targetIdKhoa === 'AF386') targetIdKhoa = 'AF01';
 45:         if (targetIdKhoa === 'VRD') targetIdKhoa = 'AF01'; // Giả định theo id_lop=AF, sẽ kiểm tra lại với bác
 46:         // Tìm khóa học phù hợp theo id_khoa mới
 47:         let course = allCourses.find((c: any) => c.id_khoa === targetIdKhoa);
 48:         // Trường hợp AI trùng lặp, cần tìm khớp chính xác
 49:         if (targetIdKhoa === 'AI') {
 50:             // Thử tìm theo name chứa trong row (nếu có logic bổ sung)
 51:             // Ở đây lấy bản ghi đầu tiên khớp AI
 52:             course = allCourses.find((c: any) => c.id_khoa.startsWith('AI'));
 53:         }
 54:         if (!course && row.id_lop) {
 55:             // Thử tìm theo id_lop trong CSV khớp với id_khoa trong DB
 56:             course = allCourses.find((c: any) => c.id_khoa === row.id_lop);
 57:         }
 58:         if (!course) {
 59:             // console.log(`⚠️ Không tìm thấy khóa học cho: Lop=${row.id_lop}, Khoa=${row.id_khoa}`)
 60:             skipCount++
 61:             continue
 62:         }
 63:         try {
 64:             // Kiểm tra User có tồn tại không
 65:             const user = await prisma.user.findUnique({ where: { id: studentId } })
 66:             if (!user) {
 67:                 skipCount++
 68:                 continue
 69:             }
 70:             await (prisma as any).enrollment.upsert({
 71:                 where: {
 72:                     userId_courseId: {
 73:                         userId: studentId,
 74:                         courseId: course.id
 75:                     }
 76:                 },
 77:                 update: {
 78:                     status: 'ACTIVE' // Mặc định là đã kích hoạt theo yêu cầu
 79:                 },
 80:                 create: {
 81:                     userId: studentId,
 82:                     courseId: course.id,
 83:                     status: 'ACTIVE'
 84:                 }
 85:             })
 86:             successCount++
 87:         } catch (error) {
 88:             errorCount++
 89:             // console.error(`❌ Lỗi khi nạp Enrollment cho User ${studentId}:`, error)
 90:         }
 91:     }
 92:     console.log(`--- KẾT QUẢ ĐỒNG BỘ ---`)
 93:     console.log(`✅ Thành công: ${successCount}`)
 94:     console.log(`⏭️ Bỏ qua (không khớp/lỗi): ${skipCount}`)
 95:     console.log(`❌ Lỗi hệ thống: ${errorCount}`)
 96: }
 97: main()
 98:     .catch(e => {
 99:         console.error(e)
100:         process.exit(1)
101:     })
102:     .finally(async () => {
103:         await prisma.$disconnect()
104:     })
````

## File: scripts/seed-lessons.ts
````typescript
 1: import { PrismaClient } from '@prisma/client'
 2: const prisma = new PrismaClient()
 3: async function main() {
 4:     console.log('--- SEEDING LESSONS ---')
 5:     // 1. Khóa Tiếp thị liên kết (AF06) - 21 ngày
 6:     const af06 = await (prisma as any).course.findUnique({ where: { id_khoa: 'AF06' } })
 7:     if (af06) {
 8:         console.log(`Found AF06 with ID: ${af06.id}`)
 9:         for (let i = 1; i <= 21; i++) {
10:             await (prisma as any).lesson.upsert({
11:                 where: { courseId_order: { courseId: af06.id, order: i } },
12:                 update: {},
13:                 create: {
14:                     id: `AF06_L${i}`,
15:                     courseId: af06.id,
16:                     order: i,
17:                     title: `Bài ${i}: Nội dung thực chiến ngày ${i}`,
18:                     videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder
19:                     content: `Nội dung hướng dẫn chi tiết cho ngày thứ ${i} của lộ trình Affiliate.`
20:                 }
21:             })
22:         }
23:     }
24:     // 2. Khóa Nhân hiệu từ gốc (NH06) - 21 ngày
25:     const nh06 = await (prisma as any).course.findUnique({ where: { id_khoa: 'NH06' } })
26:     if (nh06) {
27:         for (let i = 1; i <= 21; i++) {
28:             await (prisma as any).lesson.upsert({
29:                 where: { courseId_order: { courseId: nh06.id, order: i } },
30:                 update: {},
31:                 create: {
32:                     id: `NH06_L${i}`,
33:                     courseId: nh06.id,
34:                     order: i,
35:                     title: `Bài ${i}: Xây dựng nhân hiệu ngày ${i}`,
36:                     videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
37:                     content: `Bước thứ ${i} trong hành trình xây dựng nhân hiệu từ gốc.`
38:                 }
39:             })
40:         }
41:     }
42:     // 3. Khóa Thử thách độc lập
43:     let challengeCourse = await (prisma as any).course.findUnique({ where: { id_khoa: 'CHALLENGE_DAILY' } })
44:     if (!challengeCourse) {
45:         console.log('Creating CHALLENGE_DAILY course...')
46:         challengeCourse = await (prisma as any).course.create({
47:             data: {
48:                 id_khoa: 'CHALLENGE_DAILY',
49:                 name_lop: 'Thử thách rèn luyện hàng ngày',
50:                 name_khoa: 'BRK Discipline',
51:                 type: 'CHALLENGE',
52:                 phi_coc: 0,
53:                 status: true,
54:                 mo_ta_ngan: 'Chương trình rèn luyện kỷ luật 7-90 ngày tùy chọn.',
55:                 mo_ta_dai: 'Tham gia thử thách để rèn luyện thói quen nộp bài tâm đắc ngộ và thực hành mỗi ngày.'
56:             }
57:         })
58:     } else {
59:         await (prisma as any).course.update({
60:             where: { id: challengeCourse.id },
61:             data: { type: 'CHALLENGE' }
62:         })
63:     }
64:     // Seed cho Challenge Course (Giả sử tối đa 90 ngày)
65:     for (let i = 1; i <= 90; i++) {
66:         await (prisma as any).lesson.upsert({
67:             where: { courseId_order: { courseId: challengeCourse.id, order: i } },
68:             update: { isDailyChallenge: true },
69:             create: {
70:                 id: `CHALLENGE_D${i}`,
71:                 courseId: challengeCourse.id,
72:                 order: i,
73:                 title: `Ngày ${i}: Rèn luyện kỷ luật`,
74:                 isDailyChallenge: true,
75:                 content: `Ngày thứ ${i} trong chuỗi thử thách rèn luyện. Tập trung vào Tâm đắc ngộ và Thực hành mới.`
76:             }
77:         })
78:     }
79:     console.log('✅ Seeding completed.')
80: }
81: main()
82:     .catch((e) => {
83:         console.error(e)
84:         process.exit(1)
85:     })
86:     .finally(async () => {
87:         await prisma.$disconnect()
88:     })
````

## File: scripts/seed-messages.ts
````typescript
 1: import { PrismaClient } from '@prisma/client'
 2: const prisma = new PrismaClient()
 3: const IMAGE_URLS = [
 4:     'https://i.postimg.cc/hQjxMRz0/1.jpg',
 5:     'https://i.postimg.cc/hzMT9tjp/10.jpg',
 6:     'https://i.postimg.cc/FkRcGXdV/2.jpg',
 7:     'https://i.postimg.cc/K3zLQhkn/3.jpg',
 8:     'https://i.postimg.cc/8f5WwgJL/4.jpg',
 9:     'https://i.postimg.cc/m1DMVWzY/5.jpg',
10:     'https://i.postimg.cc/DJ5LqwZj/6.jpg',
11:     'https://i.postimg.cc/BLNHxn6p/7.jpg',
12:     'https://i.postimg.cc/k6wKxg4c/8.jpg',
13:     'https://i.postimg.cc/phkzDLTk/9.jpg',
14: ]
15: const messages = [
16:     {
17:         content: "Tri thức là sức mạnh - Học hôm nay, thành công ngày mai",
18:         detail: "Học viện BRK mang đến những tri thức thực chiến giúp bạn phát triển bản thân và sự nghiệp. Mỗi ngày học tập là một bước tiến trên con đường thành công.\n\n💡 Tri thức không chỉ là kiến thức, mà là khả năng áp dụng để tạo ra giá trị thực tế.",
19:         imageUrl: IMAGE_URLS[0]
20:     },
21:     {
22:         content: "Kiến tạo giá trị từ gốc - Nền tảng vững chắc cho tương lai",
23:         detail: "Mỗi chúng ta đều có tiềm năng để trở thành phiên bản tốt hơn của chính mình. Điều quan trọng là bắt đầu từ hôm nay và kiên trì theo đuổi mục tiêu.\n\n🌟 Học viện BRK đồng hành cùng bạn trên hành trình phát triển bản thân và sự nghiệp.",
24:         imageUrl: IMAGE_URLS[1]
25:     },
26:     {
27:         content: "Thành công không phải đích đến, mà là hành trình không ngừng học hỏi",
28:         detail: "Trong cuộc sống, việc học tập không bao giờ kết thúc. Mỗi ngày mới là cơ hội để tiếp thu kiến thức mới, kỹ năng mới và trở thành người tốt hơn.\n\n📚 Hãy biến việc học thành thói quen hàng ngày.",
29:         imageUrl: IMAGE_URLS[2]
30:     },
31:     {
32:         content: "Lan tỏa giá trị - Kiến tạo thịnh vượng bền vững",
33:         detail: "Thành công thực sự không chỉ đo bằng vật chất, mà còn bằng giá trị mà bạn mang đến cho người khác. Hãy lan tỏa những điều tốt đẹp xung quanh bạn.\n\n🤝 Cùng BRK kiến tạo cộng đồng phát triển.",
34:         imageUrl: IMAGE_URLS[3]
35:     },
36:     {
37:         content: "Từ gốc đến ngọn - Xây dựng nền tảng vững chắc",
38:         detail: "Mọi thành công lớn đều bắt đầu từ những bước nhỏ. Hãy kiên nhẫn xây dựng nền tảng từ hôm nay, và bạn sẽ thấy được kết quả trong tương lai.\n\n🏗️ Nền tảng vững = Thành công bền vững.",
39:         imageUrl: IMAGE_URLS[4]
40:     },
41:     {
42:         content: "Học để thay đổi - Thay đổi để thành công",
43:         detail: "Tri thức là chìa khóa mở mọi cánh cửa. Hãy không ngừng học hỏi, không ngừng phát triển để nắm bắt cơ hội và tạo ra những thay đổi tích cực trong cuộc sống.\n\n🔑 Học là chìa khóa của mọi thành công.",
44:         imageUrl: IMAGE_URLS[5]
45:     },
46:     {
47:         content: "Mỗi ngày là một cơ hội để trở nên tốt hơn",
48:         detail: "Đừng chờ đợi ngày mai để bắt đầu. Hôm nay chính là ngày quan trọng nhất trong cuộc đời bạn. Hãy trân trọng từng khoảnh khắc và không ngừng tiến bộ.\n\n⏰ Hành động ngay hôm nay - Thành công ngày mai.",
49:         imageUrl: IMAGE_URLS[6]
50:     },
51:     {
52:         content: "Tri thức + Hành động = Thành công",
53:         detail: "Biết là một chuyện, làm là chuyện khác. Tri thức chỉ có giá trị khi được áp dụng vào thực tế. Hãy kết hợp học với hành để đạt được kết quả mong muốn.\n\n⚡ Học + Hành = Thành công thực sự.",
54:         imageUrl: IMAGE_URLS[7]
55:     },
56:     {
57:         content: "Học viện BRK - Nơi tri thức được lan tỏa",
58:         detail: "Học viện BRK là nơi tập hợp những tri thức thực chiến về kinh doanh online, nhân hiệu và AI. Chúng tôi ở đây để đồng hành cùng bạn trên hành trình lan tỏa giá trị.\n\n🌟 Kiến tạo sự thịnh vượng bền vững từ gốc.",
59:         imageUrl: IMAGE_URLS[8]
60:     },
61:     {
62:         content: "Khởi đầu hôm nay - Thành công tương lai",
63:         detail: "Không bao giờ là quá muộn để bắt đầu học điều mới. Mỗi bước tiến dù nhỏ cũng là tiến bộ. Hãy bắt đầu hôm nay và theo đuổi ước mơ của bạn.\n\n🚀 Hành trình nghìn dặm bắt đầu từ một bước chân.",
64:         imageUrl: IMAGE_URLS[9]
65:     }
66: ]
67: async function main() {
68:     console.log('🚀 Bắt đầu seed messages...')
69:     for (let i = 0; i < messages.length; i++) {
70:         const msg = messages[i]
71:         await prisma.message.upsert({
72:             where: { id: i + 1 },
73:             update: msg,
74:             create: { ...msg, isActive: true }
75:         })
76:         console.log(`✅ Đã thêm: ${msg.content.substring(0, 30)}...`)
77:     }
78:     console.log('🎉 Hoàn thành seed messages!')
79: }
80: main()
81:     .catch(async (e) => {
82:         console.error('❌ Lỗi:', e)
83:         await prisma.$disconnect()
84:         process.exit(1)
85:     })
86:     .finally(async () => {
87:         await prisma.$disconnect()
88:     })
````

## File: scripts/seed-sample-lessons.ts
````typescript
 1: /**
 2:  * Script: seed-sample-lessons.ts
 3:  * Chèn 7 bài học mẫu cho các khóa học chưa có bài nào
 4:  * Chạy: npx ts-node -r tsconfig-paths/register scripts/seed-sample-lessons.ts
 5:  */
 6: import { PrismaClient } from '@prisma/client'
 7: const prisma = new PrismaClient()
 8: const DEFAULT_VIDEO_URL = 'https://www.youtube.com/watch?v=ASlj2zjgatc'
 9: const LESSON_TITLES = [
10:     'Bài 1: Giới thiệu khóa học & Tổng quan',
11:     'Bài 2: Nền tảng tư duy cốt lõi',
12:     'Bài 3: Kỹ năng thiết yếu – Phần 1',
13:     'Bài 4: Kỹ năng thiết yếu – Phần 2',
14:     'Bài 5: Thực chiến & Ứng dụng thực tế',
15:     'Bài 6: Nâng cao & Bứt phá giới hạn',
16:     'Bài 7: Tổng kết & Bước tiếp theo',
17: ]
18: async function main() {
19:     // Lấy tất cả khóa học (trừ CHALLENGE_DAILY)
20:     const courses = await (prisma as any).course.findMany({
21:         where: { id_khoa: { not: 'CHALLENGE_DAILY' } },
22:         include: { lessons: { select: { id: true } } }
23:     })
24:     let seededCount = 0
25:     for (const course of courses) {
26:         if (course.lessons.length > 0) {
27:             console.log(`⏭  ${course.id_khoa} – đã có ${course.lessons.length} bài, bỏ qua.`)
28:             continue
29:         }
30:         console.log(`✅ ${course.id_khoa} – đang tạo 7 bài học mẫu...`)
31:         await (prisma as any).lesson.createMany({
32:             data: LESSON_TITLES.map((title, index) => ({
33:                 courseId: course.id,
34:                 title,
35:                 order: index + 1,
36:                 videoUrl: DEFAULT_VIDEO_URL,
37:                 content: `Nội dung bài ${index + 1} – ${course.name_lop}. Hãy xem video hướng dẫn và hoàn thành bài tập thực hành.`,
38:             }))
39:         })
40:         seededCount++
41:     }
42:     console.log(`\n🎉 Hoàn thành! Đã thêm 7 bài vào ${seededCount} khóa học.`)
43: }
44: main()
45:     .catch(console.error)
46:     .finally(() => prisma.$disconnect())
````

## File: scripts/setup-gmail-watch.js
````javascript
 1: require('dotenv').config()
 2: const { google } = require('googleapis')
 3: async function setupWatch() {
 4:   const oAuth2Client = new google.auth.OAuth2(
 5:     process.env.GMAIL_CLIENT_ID,
 6:     process.env.GMAIL_CLIENT_SECRET,
 7:     'http://localhost'
 8:   )
 9:   oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
10:   const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })
11:   try {
12:     const response = await gmail.users.watch({
13:       userId: 'me',
14:       requestBody: {
15:         // Thay 'projects/YOUR_PROJECT_ID/topics/gmail-notifications' 
16:         // bằng đúng Project ID và Topic Name của bạn trên Google Console
17:         topicName: `projects/${process.env.GCP_PROJECT_ID}/topics/gmail-notifications`,
18:         labelIds: ['INBOX'], // Chỉ theo dõi hộp thư đến
19:       },
20:     })
21:     console.log('✅ Chế độ Gmail Watch đã được kích hoạt thành công!')
22:     console.log('Thông tin phản hồi:', response.data)
23:   } catch (error) {
24:     console.error('❌ Lỗi khi thiết lập Watch:', error)
25:   }
26: }
27: setupWatch()
````

## File: scripts/test-gmail.ts
````typescript
 1: require('dotenv').config()
 2: const { google } = require('googleapis')
 3: const { PrismaClient } = require('@prisma/client')
 4: const prisma = new PrismaClient()
 5: async function getGmailClient() {
 6:   const oAuth2Client = new google.auth.OAuth2(
 7:     process.env.GMAIL_CLIENT_ID,
 8:     process.env.GMAIL_CLIENT_SECRET,
 9:     'http://localhost'
10:   )
11:   oAuth2Client.setCredentials({
12:     refresh_token: process.env.GMAIL_REFRESH_TOKEN
13:   })
14:   return google.gmail({ version: 'v1', auth: oAuth2Client })
15: }
16: async function testGmail() {
17:   console.log('🔍 Debug: Kiểm tra kết nối Gmail...')
18:   console.log('Email:', process.env.GMAIL_EMAIL)
19:   if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
20:     console.log('⚠️  Chưa cấu hình Gmail credentials')
21:     return
22:   }
23:   try {
24:     const gmail = await getGmailClient()
25:     // Lấy 20 email gần nhất
26:     const response = await gmail.users.messages.list({
27:       userId: 'me',
28:       maxResults: 20
29:     })
30:     const messages = response.data.messages || []
31:     console.log(`📧 Tổng số email: ${messages.length}`)
32:     if (messages.length === 0) {
33:       console.log('Không có email nào')
34:       return
35:     }
36:     // Lấy chi tiết từng email
37:     for (const msg of messages.slice(0, 10)) {
38:       const message = await gmail.users.messages.get({
39:         userId: 'me',
40:         id: msg.id
41:       })
42:       const headers = message.data.payload?.headers || []
43:       const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
44:       const from = headers.find((h: any) => h.name === 'From')?.value || ''
45:       const date = headers.find((h: any) => h.name === 'Date')?.value || ''
46:       const snippet = message.data.snippet || ''
47:       console.log(`\n--- Email #${msg.id} ---`)
48:       console.log(`From: ${from}`)
49:       console.log(`Subject: ${subject}`)
50:       console.log(`Date: ${date}`)
51:       console.log(`Snippet: ${snippet.substring(0, 100)}...`)
52:     }
53:   } catch (error: any) {
54:     console.error('❌ Lỗi:', error.message)
55:   }
56: }
57: testGmail()
````

## File: scripts/test-new-format.ts
````typescript
 1: import { parseFullTransferEmail } from '../lib/email-parser';
 2: const mockEmailContent = `
 3: Sacombank thông báo giao dịch:
 4: Tài khoản: 0123456789
 5: Phát sinh: +386,868 VND
 6: Thời gian: 05/03/2026 14:30
 7: Nội dung: SDT 123456 HV 8286 COC LS03
 8: Số dư cuối: 10,000,000 VND
 9: `;
10: console.log('🚀 Đang test logic bóc tách email với format mới...');
11: console.log('--- Nội dung giả lập ---');
12: console.log(mockEmailContent);
13: const result = parseFullTransferEmail(mockEmailContent);
14: console.log('\n--- Kết quả bóc tách ---');
15: console.log(`Số điện thoại (6 số cuối): ${result.phone}`);
16: console.log(`Mã học viên (UserID): ${result.userId}`);
17: console.log(`Mã khóa học: ${result.courseCode}`);
18: console.log(`Số tiền: ${result.amount.toLocaleString()} VND`);
19: if (result.userId === 8286 && result.courseCode === 'LS03' && result.amount === 386868) {
20:     console.log('\n✅ TEST THÀNH CÔNG: Logic nhận diện hoàn hảo!');
21: } else {
22:     console.log('\n❌ TEST THẤT BẠI: Cần kiểm tra lại Regex.');
23: }
````

## File: scripts/test-pure-js.js
````javascript
 1: // Mock email content
 2: const mockEmailContent = `
 3: Sacombank thông báo giao dịch:
 4: Tài khoản: 0123456789
 5: Phát sinh: +386,868 VND
 6: Thời gian: 05/03/2026 14:30
 7: Nội dung: SDT 123456 HV 8286 COC LS03
 8: Số dư cuối: 10,000,000 VND
 9: `;
10: // Logic bóc tách rút gọn từ lib/email-parser.ts
11: function testParser(description, text) {
12:     const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i);
13:     const userIdMatch = description.match(/HV[\s\._]*(\d+)/i);
14:     const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i);
15:     const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i);
16:     let amount = 0;
17:     if (amountMatch) {
18:         amount = parseInt(amountMatch[1].replace(/\./g, '').replace(/,/g, '')) || 0;
19:     }
20:     return {
21:         phone: phoneMatch ? phoneMatch[1] : null,
22:         userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
23:         courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
24:         amount: amount
25:     };
26: }
27: console.log('🚀 Đang test logic bóc tách email (JS thuần)...');
28: const result = testParser("SDT 123456 HV 8286 COC LS03", mockEmailContent);
29: console.log('\n--- Kết quả bóc tách ---');
30: console.log(`Số điện thoại (6 số cuối): ${result.phone}`);
31: console.log(`Mã học viên (UserID): ${result.userId}`);
32: console.log(`Mã khóa học: ${result.courseCode}`);
33: console.log(`Số tiền: ${result.amount.toLocaleString()} VND`);
34: if (result.userId === 8286 && result.courseCode === 'LS03' && result.amount === 386868) {
35:     console.log('\n✅ TEST THÀNH CÔNG: Logic nhận diện hoàn hảo!');
36: } else {
37:     console.log('\n❌ TEST THẤT BẠI: Cần kiểm tra lại Regex.');
38: }
````

## File: scripts/test-sacombank.ts
````typescript
 1: require('dotenv').config()
 2: const { google } = require('googleapis')
 3: async function getGmailClient() {
 4:   const oAuth2Client = new google.auth.OAuth2(
 5:     process.env.GMAIL_CLIENT_ID,
 6:     process.env.GMAIL_CLIENT_SECRET,
 7:     'http://localhost'
 8:   )
 9:   oAuth2Client.setCredentials({
10:     refresh_token: process.env.GMAIL_REFRESH_TOKEN
11:   })
12:   return google.gmail({ version: 'v1', auth: oAuth2Client })
13: }
14: async function getSacombankEmails() {
15:   console.log('🔍 Tìm email Sacombank...')
16:   const gmail = await getGmailClient()
17:   // Tìm email Sacombank - dùng search rộng hơn
18:   const response = await gmail.users.messages.list({
19:     userId: 'me',
20:     q: 'sacombank thong bao',
21:     maxResults: 10
22:   })
23:   const messages = response.data.messages || []
24:   console.log(`📧 Tìm thấy ${messages.length} email Sacombank`)
25:   for (const msg of messages) {
26:     const message = await gmail.users.messages.get({
27:       userId: 'me',
28:       id: msg.id,
29:       format: 'full'
30:     })
31:     const headers = message.data.payload?.headers || []
32:     const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
33:     const from = headers.find((h: any) => h.name === 'From')?.value || ''
34:     const date = headers.find((h: any) => h.name === 'Date')?.value || ''
35:     // Lấy body
36:     let body = ''
37:     if (message.data.payload?.body?.data) {
38:       body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8')
39:     } else if (message.data.payload?.parts) {
40:       for (const part of message.data.payload.parts) {
41:         if (part.mimeType === 'text/plain' && part.body?.data) {
42:           body = Buffer.from(part.body.data, 'base64').toString('utf-8')
43:           break
44:         }
45:       }
46:     }
47:     console.log(`\n=== Email: ${subject} ===`)
48:     console.log(`From: ${from}`)
49:     console.log(`Date: ${date}`)
50:     console.log(`\n--- Nội dung email (text) ---`)
51:     console.log(body.substring(0, 2000))
52:   }
53: }
54: getSacombankEmails().catch(console.error)
````

## File: scripts/test-vietqr.ts
````typescript
 1: require('dotenv').config()
 2: async function testVietQR() {
 3:   console.log('🧪 Test VietQR API...')
 4:   const requestBody = {
 5:     accountNo: "1039789789",
 6:     accountName: "NGUYEN VAN A",
 7:     acqId: "970403",
 8:     amount: 500000,
 9:     addInfo: "SDT0389758138MHV123COCNH",
10:     template: "compact",
11:     format: "text"
12:   }
13:   console.log('Request:', JSON.stringify(requestBody, null, 2))
14:   try {
15:     const response = await fetch('https://api.vietqr.io/v2/generate', {
16:       method: 'POST',
17:       headers: {
18:         'x-client-id': process.env.VIETQR_CLIENT_ID || '',
19:         'x-api-key': process.env.VIETQR_API_KEY || '',
20:         'Content-Type': 'application/json'
21:       } as any,
22:       body: JSON.stringify(requestBody)
23:     })
24:     const data = await response.json()
25:     console.log('Response:', JSON.stringify(data, null, 2))
26:     if (data.code === '00') {
27:       console.log('✅ QR Generated successfully!')
28:       console.log('QR Data URL:', data.data?.qrDataURL?.substring(0, 100) + '...')
29:     } else {
30:       console.log('❌ Error:', data.desc)
31:     }
32:   } catch (error: any) {
33:     console.error('❌ Request failed:', error.message)
34:   }
35: }
36: testVietQR()
````

## File: scripts/validate-v3-data.js
````javascript
 1: const fs = require('fs');
 2: const csv = require('csv-parser');
 3: async function readCsv(filePath) {
 4:     const results = [];
 5:     return new Promise((resolve, reject) => {
 6:         fs.createReadStream(filePath)
 7:             .pipe(csv())
 8:             .on('data', (data) => results.push(data))
 9:             .on('end', () => resolve(results))
10:             .on('error', reject);
11:     });
12: }
13: async function validate() {
14:     console.log("=== BẮT ĐẦU KIỂM TRA DỮ LIỆU CHUẨN HÓA ===");
15:     try {
16:         const users = await readCsv('User.csv');
17:         const courses = await readCsv('Course.csv');
18:         const enrollments = await readCsv('Enrollment.csv');
19:         console.log(`\n1. Kiểm tra số lượng:\n- Users: ${users.length}\n- Courses: ${courses.length}\n- Enrollments: ${enrollments.length}`);
20:         const errors = [];
21:         const warnings = [];
22:         // HASH MAPS FOR LOOKUP
23:         const userIds = new Set(users.map(u => u.id));
24:         const userEmails = new Set();
25:         const courseIds = new Set(courses.map(c => c.id));
26:         const courseKhoas = new Set(courses.map(c => c.id_khoa));
27:         const enrollmentPairs = new Set();
28:         // VALIDATE USERS
29:         users.forEach(u => {
30:             if (!u.id) errors.push(`User thiếu ID: ${JSON.stringify(u)}`);
31:             if (userEmails.has(u.email)) errors.push(`User trùng Email: ${u.email}`);
32:             userEmails.add(u.email);
33:         });
34:         // VALIDATE COURSES
35:         courses.forEach(c => {
36:             if (!c.id) errors.push(`Course thiếu ID: ${c.id_khoa}`);
37:             if (courseKhoas.has(c.id_khoa) && courses.filter(x => x.id_khoa === c.id_khoa).length > 1) {
38:                 // Check for real duplicates manually if Set isn't enough
39:             }
40:         });
41:         // VALIDATE ENROLLMENTS (INTEGRITY)
42:         enrollments.forEach((e, index) => {
43:             const rowNum = index + 2;
44:             if (!userIds.has(e.userId)) {
45:                 errors.push(`[Dòng ${rowNum}] Enrollment có userId (${e.userId}) không tồn tại trong User.csv`);
46:             }
47:             if (!courseIds.has(e.courseId)) {
48:                 errors.push(`[Dòng ${rowNum}] Enrollment có courseId (${e.courseId}) không tồn tại trong Course.csv`);
49:             }
50:             const pair = `${e.userId}-${e.courseId}`;
51:             if (enrollmentPairs.has(pair)) {
52:                 warnings.push(`[Dòng ${rowNum}] Trùng lặp Enrollment cho User ${e.userId} và Course ${e.courseId} (Sẽ bị bỏ qua khi nạp)`);
53:             }
54:             enrollmentPairs.add(pair);
55:             if (!['ACTIVE', 'PENDING'].includes(e.status)) {
56:                 warnings.push(`[Dòng ${rowNum}] Trạng thái status '${e.status}' không chuẩn (Nên là ACTIVE hoặc PENDING)`);
57:             }
58:         });
59:         console.log("\n2. Kết quả kiểm tra lỗi:");
60:         if (errors.length === 0) {
61:             console.log("✅ KHÔNG có lỗi nghiêm trọng (Ràng buộc dữ liệu tốt)");
62:         } else {
63:             console.log(`❌ Có ${errors.length} lỗi cần xử lý:`);
64:             errors.slice(0, 10).forEach(err => console.log(` - ${err}`));
65:             if (errors.length > 10) console.log("   ... và nhiều lỗi khác");
66:         }
67:         console.log("\n3. Cảnh báo (Nên lưu ý):");
68:         if (warnings.length === 0) {
69:             console.log("✅ Không có cảnh báo.");
70:         } else {
71:             console.log(`⚠️ Có ${warnings.length} cảnh báo:`);
72:             warnings.slice(0, 5).forEach(w => console.log(` - ${w}`));
73:         }
74:     } catch (err) {
75:         console.error("❌ Lỗi khi đọc file:", err.message);
76:     }
77: }
78: validate();
````

## File: tsconfig.seed.json
````json
 1: {
 2:     "extends": "./tsconfig.json",
 3:     "compilerOptions": {
 4:         "module": "CommonJS"
 5:     },
 6:     "ts-node": {
 7:         "compilerOptions": {
 8:             "module": "CommonJS"
 9:         }
10:     }
11: }
````

## File: types/next-auth.d.ts
````typescript
 1: import NextAuth, { DefaultSession } from "next-auth"
 2: import { Role } from "@prisma/client"
 3: import { AdapterUser } from "next-auth/adapters"
 4: declare module "next-auth" {
 5:     /**
 6:      * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
 7:      */
 8:     interface Session {
 9:         user: {
10:             id: string
11:             role: Role
12:         } & DefaultSession["user"]
13:     }
14:     interface User {
15:         id?: string
16:         role: Role
17:     }
18: }
19: declare module "next-auth/adapters" {
20:     interface AdapterUser {
21:         role: Role
22:     }
23: }
24: declare module "next-auth/jwt" {
25:     interface JWT {
26:         id: string
27:         role: Role
28:     }
29: }
````

## File: app/account-settings/page.tsx
````typescript
  1: 'use client'
  2: import { useState, useEffect } from 'react'
  3: import { getUserWithAccounts, updateUserProfile, changePassword } from '@/app/actions/account-actions'
  4: import { Camera, User, Phone, Mail, Key, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
  5: import Link from 'next/link'
  6: interface UserData {
  7:     id: number
  8:     name: string | null
  9:     email: string | null
 10:     image: string | null
 11:     phone: string | null
 12:     accounts: { provider: string; providerAccountId: string }[]
 13: }
 14: export default function AccountSettingsPage() {
 15:     const [loading, setLoading] = useState(true)
 16:     const [saving, setSaving] = useState(false)
 17:     const [user, setUser] = useState<UserData | null>(null)
 18:     const [accounts, setAccounts] = useState<UserData['accounts']>([])
 19:     const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
 20:     // Form states
 21:     const [name, setName] = useState('')
 22:     const [phone, setPhone] = useState('')
 23:     const [avatarUrl, setAvatarUrl] = useState('')
 24:     // Password states
 25:     const [showPasswordForm, setShowPasswordForm] = useState(false)
 26:     const [currentPassword, setCurrentPassword] = useState('')
 27:     const [newPassword, setNewPassword] = useState('')
 28:     const [confirmPassword, setConfirmPassword] = useState('')
 29:     useEffect(() => {
 30:         async function fetchUser() {
 31:             setLoading(true)
 32:             const userData = await getUserWithAccounts()
 33:             if (userData) {
 34:                 setUser(userData as UserData)
 35:                 setAccounts(userData.accounts || [])
 36:                 setName(userData.name || '')
 37:                 setPhone(userData.phone || '')
 38:                 setAvatarUrl(userData.image || '')
 39:             }
 40:             setLoading(false)
 41:         }
 42:         fetchUser()
 43:     }, [])
 44:     async function handleUpdateProfile(e: React.FormEvent) {
 45:         e.preventDefault()
 46:         setSaving(true)
 47:         setMessage(null)
 48:         const result = await updateUserProfile({
 49:             name,
 50:             phone,
 51:             image: avatarUrl
 52:         })
 53:         setMessage({
 54:             type: result.success ? 'success' : 'error',
 55:             text: result.message
 56:         })
 57:         setSaving(false)
 58:     }
 59:     // Hàm nén ảnh về kích thước 50x50px
 60:     function resizeImage(base64: string, maxWidth = 50, maxHeight = 50): Promise<string> {
 61:         return new Promise((resolve, reject) => {
 62:             const img = new Image()
 63:             img.onload = () => {
 64:                 const canvas = document.createElement('canvas')
 65:                 canvas.width = maxWidth
 66:                 canvas.height = maxHeight
 67:                 const ctx = canvas.getContext('2d')
 68:                 if (!ctx) {
 69:                     reject(new Error('Cannot get canvas context'))
 70:                     return
 71:                 }
 72:                 // Vẽ ảnh thu nhỏ
 73:                 ctx.drawImage(img, 0, 0, maxWidth, maxHeight)
 74:                 // Chuyển thành base64 với chất lượng 70%
 75:                 const resized = canvas.toDataURL('image/jpeg', 0.7)
 76:                 resolve(resized)
 77:             }
 78:             img.onerror = () => {
 79:                 reject(new Error('Cannot load image'))
 80:             }
 81:             img.src = base64
 82:         })
 83:     }
 84:     async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
 85:         const file = e.target.files?.[0]
 86:         if (!file) return
 87:         // Kiểm tra kích thước file (max 5MB)
 88:         if (file.size > 5 * 1024 * 1024) {
 89:             setMessage({ type: 'error', text: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB' })
 90:             return
 91:         }
 92:         // Kiểm tra loại file
 93:         if (!file.type.startsWith('image/')) {
 94:             setMessage({ type: 'error', text: 'Vui lòng chọn file ảnh' })
 95:             return
 96:         }
 97:         // Đọc file và convert thành base64
 98:         const reader = new FileReader()
 99:         reader.onload = async (event) => {
100:             try {
101:                 const result = event.target?.result as string
102:                 // Nén ảnh về 50x50px
103:                 const resized = await resizeImage(result, 50, 50)
104:                 setAvatarUrl(resized)
105:                 setMessage(null)
106:             } catch (error) {
107:                 setMessage({ type: 'error', text: 'Lỗi khi xử lý ảnh' })
108:             }
109:         }
110:         reader.onerror = () => {
111:             setMessage({ type: 'error', text: 'Lỗi khi đọc file' })
112:         }
113:         reader.readAsDataURL(file)
114:     }
115:     // Tải và nén ảnh từ URL (khi user dán link)
116:     async function handleUrlAvatarChange(e: React.FocusEvent<HTMLInputElement>) {
117:         const url = e.target.value.trim()
118:         if (!url) return
119:         // Nếu đã là base64 thì không cần tải lại
120:         if (url.startsWith('data:')) return
121:         setMessage({ type: 'success', text: 'Đang tải ảnh...' })
122:         try {
123:             // Tải ảnh từ URL
124:             const response = await fetch(url)
125:             if (!response.ok) throw new Error('Cannot download image')
126:             const blob = await response.blob()
127:             // Kiểm tra loại file
128:             if (!blob.type.startsWith('image/')) {
129:                 setMessage({ type: 'error', text: 'URL không phải là ảnh hợp lệ' })
130:                 return
131:             }
132:             // Convert blob to base64
133:             const reader = new FileReader()
134:             reader.onload = async (event) => {
135:                 try {
136:                     const result = event.target?.result as string
137:                     // Nén ảnh về 50x50px
138:                     const resized = await resizeImage(result, 50, 50)
139:                     setAvatarUrl(resized)
140:                     setMessage({ type: 'success', text: 'Ảnh đã được tải và nén!' })
141:                 } catch (error) {
142:                     setMessage({ type: 'error', text: 'Lỗi khi xử lý ảnh' })
143:                 }
144:             }
145:             reader.onerror = () => {
146:                 setMessage({ type: 'error', text: 'Lỗi khi đọc ảnh' })
147:             }
148:             reader.readAsDataURL(blob)
149:         } catch (error) {
150:             setMessage({ type: 'error', text: 'Không thể tải ảnh từ URL này' })
151:         }
152:     }
153:     async function handleChangePassword(e: React.FormEvent) {
154:         e.preventDefault()
155:         if (newPassword !== confirmPassword) {
156:             setMessage({ type: 'error', text: 'Mật khẩu mới không khớp' })
157:             return
158:         }
159:         if (newPassword.length < 6) {
160:             setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
161:             return
162:         }
163:         setSaving(true)
164:         setMessage(null)
165:         const result = await changePassword(currentPassword, newPassword)
166:         setMessage({
167:             type: result.success ? 'success' : 'error',
168:             text: result.message
169:         })
170:         if (result.success) {
171:             setCurrentPassword('')
172:             setNewPassword('')
173:             setConfirmPassword('')
174:             setShowPasswordForm(false)
175:         }
176:         setSaving(false)
177:     }
178:     const hasPassword = accounts.some(a => a.provider === 'credentials')
179:     const hasGoogle = accounts.some(a => a.provider === 'google')
180:     const userInitials = user?.name 
181:         ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
182:         : '?'
183:     if (loading) {
184:         return (
185:             <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
186:                 <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
187:             </div>
188:         )
189:     }
190:     if (!user) {
191:         return (
192:             <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
193:                 <div className="text-center">
194:                     <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
195:                     <p className="text-white">Vui lòng đăng nhập để truy cập</p>
196:                 </div>
197:             </div>
198:         )
199:     }
200:     return (
201:         <div className="min-h-screen bg-zinc-950 py-12 px-4">
202:             <div className="max-w-2xl mx-auto">
203:                 <div className="flex items-center gap-4 mb-8">
204:                     <Link href="/" className="shrink-0 p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
205:                         <ArrowLeft className="h-5 w-5" />
206:                     </Link>
207:                     <h1 className="text-2xl font-bold text-white">Cài đặt tài khoản</h1>
208:                 </div>
209:                 {message && (
210:                     <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
211:                         message.type === 'success' 
212:                             ? 'bg-emerald-900/30 border border-emerald-700 text-emerald-400' 
213:                             : 'bg-red-900/30 border border-red-700 text-red-400'
214:                     }`}>
215:                         {message.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
216:                         {message.text}
217:                     </div>
218:                 )}
219:                 {/* Avatar Section */}
220:                 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
221:                     <h2 className="text-lg font-semibold text-white mb-4">Ảnh đại diện</h2>
222:                     <div className="flex items-center gap-6">
223:                         <div className="relative">
224:                             {avatarUrl ? (
225:                                 <img 
226:                                     src={avatarUrl} 
227:                                     alt="Avatar" 
228:                                     className="w-24 h-24 rounded-full object-cover border-4 border-zinc-700"
229:                                 />
230:                             ) : (
231:                                 <div className="w-24 h-24 rounded-full bg-yellow-400 flex items-center justify-center text-3xl font-black text-black border-4 border-zinc-700">
232:                                     {userInitials}
233:                                 </div>
234:                             )}
235:                             <label className="absolute bottom-0 right-0 bg-yellow-400 p-2 rounded-full cursor-pointer hover:bg-yellow-300 transition-colors">
236:                                 <Camera className="h-4 w-4 text-black" />
237:                                 <input 
238:                                     type="file" 
239:                                     accept="image/*"
240:                                     onChange={handleAvatarChange}
241:                                     className="absolute inset-0 opacity-0 cursor-pointer"
242:                                 />
243:                             </label>
244:                         </div>
245:                         <div className="flex-1">
246:                             <p className="text-sm text-zinc-400 mb-2">Dán link ảnh (Drive, PostImg, ...):</p>
247:                             <input
248:                                 type="text"
249:                                 value={avatarUrl}
250:                                 onChange={(e) => setAvatarUrl(e.target.value)}
251:                                 onBlur={handleUrlAvatarChange}
252:                                 placeholder="https://drive.google.com/... hoặc https://postimg.cc/..."
253:                                 className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
254:                             />
255:                             <p className="text-xs text-zinc-500 mt-2">Hệ thống sẽ tự động tải và nén ảnh về 50x50px</p>
256:                         </div>
257:                     </div>
258:                 </div>
259:                 {/* Profile Info */}
260:                 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
261:                     <h2 className="text-lg font-semibold text-white mb-4">Thông tin tài khoản</h2>
262:                     <form onSubmit={handleUpdateProfile} className="space-y-4">
263:                         <div>
264:                             <label className="block text-sm text-zinc-400 mb-2">
265:                                 <User className="inline h-4 w-4 mr-2" />
266:                                 Họ và tên
267:                             </label>
268:                             <input
269:                                 type="text"
270:                                 value={name}
271:                                 onChange={(e) => setName(e.target.value)}
272:                                 className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
273:                             />
274:                         </div>
275:                         <div>
276:                             <label className="block text-sm text-zinc-400 mb-2">
277:                                 <Mail className="inline h-4 w-4 mr-2" />
278:                                 Email
279:                             </label>
280:                             <input
281:                                 type="email"
282:                                 value={user.email || ''}
283:                                 disabled
284:                                 className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-500 cursor-not-allowed"
285:                             />
286:                             <p className="text-xs text-zinc-500 mt-1">Email không thể thay đổi</p>
287:                         </div>
288:                         <div>
289:                             <label className="block text-sm text-zinc-400 mb-2">
290:                                 <Phone className="inline h-4 w-4 mr-2" />
291:                                 Số điện thoại
292:                             </label>
293:                             <input
294:                                 type="tel"
295:                                 value={phone}
296:                                 onChange={(e) => setPhone(e.target.value)}
297:                                 placeholder="Nhập số điện thoại"
298:                                 className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
299:                             />
300:                         </div>
301:                         <button
302:                             type="submit"
303:                             disabled={saving}
304:                             className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
305:                         >
306:                             {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
307:                             Lưu thay đổi
308:                         </button>
309:                     </form>
310:                 </div>
311:                 {/* Connected Accounts */}
312:                 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
313:                     <h2 className="text-lg font-semibold text-white mb-4">Tài khoản liên kết</h2>
314:                     <div className="space-y-3">
315:                         <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
316:                             <div className="flex items-center gap-3">
317:                                 <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
318:                                     <span className="text-white font-bold text-sm">G</span>
319:                                 </div>
320:                                 <div>
321:                                     <p className="text-white font-medium">Google</p>
322:                                     <p className="text-xs text-zinc-500">{hasGoogle ? 'Đã liên kết' : 'Chưa liên kết'}</p>
323:                                 </div>
324:                             </div>
325:                             {hasGoogle && (
326:                                 <span className="text-emerald-400 text-sm">✓</span>
327:                             )}
328:                         </div>
329:                         <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
330:                             <div className="flex items-center gap-3">
331:                                 <div className="w-10 h-10 bg-blue-800 rounded-full flex items-center justify-center">
332:                                     <span className="text-white font-bold text-sm">f</span>
333:                                 </div>
334:                                 <div>
335:                                     <p className="text-white font-medium">Facebook</p>
336:                                     <p className="text-xs text-zinc-500">Chưa liên kết</p>
337:                                 </div>
338:                             </div>
339:                         </div>
340:                     </div>
341:                 </div>
342:                 {/* Change Password */}
343:                 {hasPassword && (
344:                     <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
345:                         <h2 className="text-lg font-semibold text-white mb-4">Đổi mật khẩu</h2>
346:                         {!showPasswordForm ? (
347:                             <button
348:                                 onClick={() => setShowPasswordForm(true)}
349:                                 className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors"
350:                             >
351:                                 <Key className="h-4 w-4" />
352:                                 Đổi mật khẩu
353:                             </button>
354:                         ) : (
355:                             <form onSubmit={handleChangePassword} className="space-y-4">
356:                                 <div>
357:                                     <label className="block text-sm text-zinc-400 mb-2">Mật khẩu hiện tại</label>
358:                                     <input
359:                                         type="password"
360:                                         value={currentPassword}
361:                                         onChange={(e) => setCurrentPassword(e.target.value)}
362:                                         required
363:                                         className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
364:                                     />
365:                                 </div>
366:                                 <div>
367:                                     <label className="block text-sm text-zinc-400 mb-2">Mật khẩu mới</label>
368:                                     <input
369:                                         type="password"
370:                                         value={newPassword}
371:                                         onChange={(e) => setNewPassword(e.target.value)}
372:                                         required
373:                                         className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
374:                                     />
375:                                 </div>
376:                                 <div>
377:                                     <label className="block text-sm text-zinc-400 mb-2">Xác nhận mật khẩu mới</label>
378:                                     <input
379:                                         type="password"
380:                                         value={confirmPassword}
381:                                         onChange={(e) => setConfirmPassword(e.target.value)}
382:                                         required
383:                                         className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
384:                                     />
385:                                 </div>
386:                                 <div className="flex gap-3">
387:                                     <button
388:                                         type="button"
389:                                         onClick={() => {
390:                                             setShowPasswordForm(false)
391:                                             setCurrentPassword('')
392:                                             setNewPassword('')
393:                                             setConfirmPassword('')
394:                                             setMessage(null)
395:                                         }}
396:                                         className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-3 rounded-xl transition-colors"
397:                                     >
398:                                         Hủy
399:                                     </button>
400:                                     <button
401:                                         type="submit"
402:                                         disabled={saving}
403:                                         className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
404:                                     >
405:                                         {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Xác nhận'}
406:                                     </button>
407:                                 </div>
408:                             </form>
409:                         )}
410:                     </div>
411:                 )}
412:             </div>
413:         </div>
414:     )
415: }
````

## File: app/actions/comment-actions.ts
````typescript
  1: 'use server'
  2: import { auth } from "@/auth"
  3: import prisma from "@/lib/prisma"
  4: import { revalidatePath } from "next/cache"
  5: export async function getCommentsByLesson(lessonId: string) {
  6:     const comments = await prisma.lessonComment.findMany({
  7:         where: { lessonId },
  8:         include: {
  9:             user: {
 10:                 select: {
 11:                     id: true,
 12:                     name: true,
 13:                     image: true,
 14:                     accounts: {
 15:                         select: {
 16:                             provider: true,
 17:                             providerAccountId: true,
 18:                         }
 19:                     }
 20:                 }
 21:             }
 22:         },
 23:         orderBy: {
 24:             createdAt: 'asc'
 25:         }
 26:     })
 27:     return comments.map((comment: any) => {
 28:         // Get avatar priority: user.image > Google image > Facebook image > null
 29:         let avatar = comment.user.image
 30:         if (!avatar) {
 31:             const googleAccount = comment.user.accounts.find((a: any) => a.provider === 'google')
 32:             if (googleAccount) {
 33:                 avatar = `https://www.googleapis.com/plus/v1/people/${googleAccount.providerAccountId}?picture`
 34:             }
 35:         }
 36:         if (!avatar) {
 37:             const facebookAccount = comment.user.accounts.find((a: any) => a.provider === 'facebook')
 38:             if (facebookAccount) {
 39:                 avatar = `https://graph.facebook.com/${facebookAccount.providerAccountId}/picture`
 40:             }
 41:         }
 42:         return {
 43:             id: comment.id,
 44:             content: comment.content,
 45:             createdAt: comment.createdAt,
 46:             userId: comment.userId,
 47:             userName: comment.user.name,
 48:             userAvatar: avatar
 49:         }
 50:     })
 51: }
 52: export async function createComment(lessonId: string, content: string) {
 53:     const session = await auth()
 54:     if (!session?.user?.id) {
 55:         return { success: false, message: "Vui lòng đăng nhập để bình luận" }
 56:     }
 57:     const userId = parseInt(session.user.id as string)
 58:     try {
 59:         const comment = await prisma.lessonComment.create({
 60:             data: {
 61:                 lessonId,
 62:                 userId,
 63:                 content: content.trim()
 64:             },
 65:             include: {
 66:                 user: {
 67:                     select: {
 68:                         id: true,
 69:                         name: true,
 70:                         image: true,
 71:                         accounts: {
 72:                             select: {
 73:                                 provider: true,
 74:                                 providerAccountId: true,
 75:                             }
 76:                         }
 77:                     }
 78:                 }
 79:             }
 80:         })
 81:         // Get avatar with same priority logic
 82:         let avatar = comment.user.image
 83:         if (!avatar) {
 84:             const googleAccount = comment.user.accounts.find((a: any) => a.provider === 'google')
 85:             if (googleAccount) {
 86:                 avatar = `https://www.googleapis.com/plus/v1/people/${googleAccount.providerAccountId}?picture`
 87:             }
 88:         }
 89:         revalidatePath('/')
 90:         return {
 91:             success: true,
 92:             comment: {
 93:                 id: comment.id,
 94:                 content: comment.content,
 95:                 createdAt: comment.createdAt,
 96:                 userId: comment.userId,
 97:                 userName: comment.user.name,
 98:                 userAvatar: avatar
 99:             }
100:         }
101:     } catch (error) {
102:         console.error("Create comment error:", error)
103:         return { success: false, message: "Gửi bình luận thất bại" }
104:     }
105: }
````

## File: app/admin/reserved-ids/page.tsx
````typescript
 1: import { deleteReservedIdAction, getReservedIds } from "@/app/actions/admin-actions"
 2: import { AddReservedIdForm } from "./add-form"
 3: import { ChangeUserIdForm } from "./change-id-form"
 4: export default async function ReservedIdsPage() {
 5:     const reservedIds = await getReservedIds()
 6:     return (
 7:         <div className="space-y-8">
 8:             <div>
 9:                 <h2 className="text-2xl font-bold mb-4 text-gray-800">💎 Cấp số đẹp cho Học viên</h2>
10:                 <ChangeUserIdForm />
11:             </div>
12:             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
13:                 {/* Cột Trái: Danh sách */}
14:                 <div>
15:                     <h3 className="text-xl font-bold mb-4 text-gray-800">Danh sách ID Đã giữ ({reservedIds.length})</h3>
16:                     <div className="bg-white border rounded-lg overflow-hidden shadow-sm max-h-[500px] overflow-y-auto">
17:                         <table className="min-w-full divide-y divide-gray-200">
18:                             <thead className="bg-gray-50">
19:                                 <tr>
20:                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
21:                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
22:                                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
23:                                 </tr>
24:                             </thead>
25:                             <tbody className="bg-white divide-y divide-gray-200">
26:                                 {reservedIds.map((item: any) => (
27:                                     <tr key={item.id} className="hover:bg-gray-50">
28:                                         <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">{item.id}</td>
29:                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.note}</td>
30:                                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
31:                                             <form action={async () => {
32:                                                 'use server'
33:                                                 await deleteReservedIdAction(item.id)
34:                                             }}>
35:                                                 <button className="text-red-600 hover:text-red-900 border px-2 py-1 rounded hover:bg-red-50">Xóa</button>
36:                                             </form>
37:                                         </td>
38:                                     </tr>
39:                                 ))}
40:                                 {reservedIds.length === 0 && (
41:                                     <tr>
42:                                         <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Chưa có ID nào được giữ.</td>
43:                                     </tr>
44:                                 )}
45:                             </tbody>
46:                         </table>
47:                     </div>
48:                 </div>
49:                 {/* Cột Phải: Thêm mới */}
50:                 <div>
51:                     <h3 className="text-xl font-bold mb-4 text-gray-800">Giữ thêm số mới</h3>
52:                     <AddReservedIdForm />
53:                 </div>
54:             </div>
55:         </div>
56:     )
57: }
````

## File: app/api/webhooks/gmail/route.ts
````typescript
 1: import { NextRequest, NextResponse } from 'next/server';
 2: import { processPaymentEmails } from '@/lib/auto-verify';
 3: export async function POST(req: NextRequest) {
 4:   try {
 5:     // Nhận thông báo từ Google Pub/Sub
 6:     console.log('📩 Nhận được thông báo Push từ Gmail!');
 7:     // Gọi trực tiếp logic xử lý thanh toán
 8:     const result = await processPaymentEmails();
 9:     console.log(`✅ Kết quả Webhook: Đã quét ${result?.processed} email, khớp ${result?.matched} giao dịch.`);
10:     return NextResponse.json({ status: 'ok', ...result }, { status: 200 });
11:   } catch (error: any) {
12:     console.error('⚠️ Webhook Error:', error);
13:     return NextResponse.json({ error: error.message }, { status: 500 });
14:   }
15: }
````

## File: app/register/page.tsx
````typescript
  1: 'use client'
  2: import { useForm } from "react-hook-form"
  3: import { useState } from "react"
  4: import Link from "next/link"
  5: import { useRouter } from "next/navigation"
  6: import { Loader2, Eye, EyeOff } from "lucide-react"
  7: import { registerUser } from "../actions/auth-actions"
  8: export default function RegisterPage() {
  9:     const [isLoading, setIsLoading] = useState(false)
 10:     const [error, setError] = useState<string | null>(null)
 11:     const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)
 12:     const [showPassword, setShowPassword] = useState(false)
 13:     const router = useRouter()
 14:     const { register, handleSubmit, formState: { errors } } = useForm({
 15:         defaultValues: {
 16:             name: "",
 17:             email: "",
 18:             phone: "",
 19:             password: ""
 20:         }
 21:     })
 22:     async function onSubmit(data: any) {
 23:         setIsLoading(true)
 24:         setError(null)
 25:         setFieldErrors(null)
 26:         try {
 27:             const formData = new FormData()
 28:             formData.append("name", data.name)
 29:             formData.append("email", data.email)
 30:             formData.append("phone", data.phone)
 31:             formData.append("password", data.password)
 32:             // We call the server action directly here, but managing state manually 
 33:             // since we aren't using useFormState (React 19 feature, but next-auth guidelines often use client side wrappers)
 34:             // Actually, since this is a client component, we can just await the action.
 35:             // But `registerUser` redirects on success, so we might need to catch that?
 36:             // Wait, `registerUser` calls `redirect`. Next.js redirects throw an error in try/catch blocks unless handled specificially.
 37:             // But typically server actions with redirect are safe to call if we don't catch the redirect error.
 38:             // However, since we are in a client event handler, we need to be careful.
 39:             // Let's wrapping it.
 40:             const result = await registerUser(null, formData)
 41:             if (result?.message || result?.errors) {
 42:                 if (result.errors) {
 43:                     setFieldErrors(result.errors)
 44:                 }
 45:                 if (result.message) {
 46:                     setError(result.message)
 47:                 }
 48:             }
 49:             // If it redirects, the code below won't execute effectively (or at least the page changes)
 50:         } catch (err: any) {
 51:             // Next.js NEXT_REDIRECT error check
 52:             //   if (err.message === "NEXT_REDIRECT") throw err
 53:             // Actually for client components calling server actions, the redirect happens automatically. 
 54:             // But if we use `try/catch`, we might catch the redirect error.
 55:             // Best practice: Check if error is digest NEXT_REDIRECT
 56:             // but usually server actions are robust.
 57:         } finally {
 58:             setIsLoading(false)
 59:         }
 60:     }
 61:     return (
 62:         <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
 63:             <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
 64:                 <div className="text-center">
 65:                     <h2 className="text-3xl font-bold tracking-tight text-gray-900">Create an account</h2>
 66:                     <p className="mt-2 text-sm text-gray-600">
 67:                         Join BRK Academy today
 68:                     </p>
 69:                 </div>
 70:                 <div className="space-y-4">
 71:                     <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 72:                         {error && (
 73:                             <div className="rounded-md bg-red-50 p-3 text-sm text-red-500">
 74:                                 {error}
 75:                             </div>
 76:                         )}
 77:                         <div>
 78:                             <label className="block text-sm font-medium text-gray-700">
 79:                                 Full Name
 80:                             </label>
 81:                             <input
 82:                                 {...register("name", { required: "Name is required" })}
 83:                                 type="text"
 84:                                 className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
 85:                             />
 86:                             {errors.name && (
 87:                                 <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
 88:                             )}
 89:                             {fieldErrors?.name && (
 90:                                 <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>
 91:                             )}
 92:                         </div>
 93:                         <div>
 94:                             <label className="block text-sm font-medium text-gray-700">
 95:                                 Email
 96:                             </label>
 97:                             <input
 98:                                 {...register("email", {
 99:                                     required: "Email is required",
100:                                     pattern: { value: /^\S+@\S+$/i, message: "Invalid email" }
101:                                 })}
102:                                 type="email"
103:                                 className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
104:                             />
105:                             {errors.email && (
106:                                 <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
107:                             )}
108:                             {fieldErrors?.email && (
109:                                 <p className="mt-1 text-xs text-red-500">{fieldErrors.email[0]}</p>
110:                             )}
111:                         </div>
112:                         <div>
113:                             <label className="block text-sm font-medium text-gray-700">
114:                                 Phone Number
115:                             </label>
116:                             <input
117:                                 {...register("phone", { required: "Phone is required" })}
118:                                 type="tel"
119:                                 className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
120:                             />
121:                             {errors.phone && (
122:                                 <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
123:                             )}
124:                             {fieldErrors?.phone && (
125:                                 <p className="mt-1 text-xs text-red-500">{fieldErrors.phone[0]}</p>
126:                             )}
127:                         </div>
128:                         <div>
129:                             <label className="block text-sm font-medium text-gray-700">
130:                                 Password
131:                             </label>
132:                             <div className="relative">
133:                                 <input
134:                                     {...register("password", {
135:                                         required: "Password is required",
136:                                         minLength: { value: 6, message: "Min 6 characters" }
137:                                     })}
138:                                     type={showPassword ? "text" : "password"}
139:                                     className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
140:                                 />
141:                                 <button
142:                                     type="button"
143:                                     onClick={() => setShowPassword(!showPassword)}
144:                                     className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
145:                                 >
146:                                     {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
147:                                 </button>
148:                             </div>
149:                             {errors.password && (
150:                                 <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
151:                             )}
152:                             {fieldErrors?.password && (
153:                                 <p className="mt-1 text-xs text-red-500">{fieldErrors.password[0]}</p>
154:                             )}
155:                         </div>
156:                         <button
157:                             type="submit"
158:                             disabled={isLoading}
159:                             className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
160:                         >
161:                             {isLoading ? <Loader2 className="animate-spin" /> : "Sign up"}
162:                         </button>
163:                     </form>
164:                     <p className="text-center text-sm text-gray-600">
165:                         Already have an account?{" "}
166:                         <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
167:                             Sign in
168:                         </Link>
169:                     </p>
170:                 </div>
171:             </div>
172:         </div>
173:     )
174: }
````

## File: components/course/PaymentModal.tsx
````typescript
  1: 'use client'
  2: import React, { useState } from 'react'
  3: import Image from 'next/image'
  4: import UploadProofModal from '@/components/payment/UploadProofModal'
  5: interface PaymentModalProps {
  6:     course: any
  7:     enrollment?: {
  8:         id?: number
  9:         status: string
 10:         payment?: {
 11:             id?: number
 12:             status: string
 13:             proofImage?: string | null
 14:             verifyMethod?: string | null
 15:             verifiedAt?: string | null
 16:             qrCodeUrl?: string | null
 17:             transferContent?: string | null
 18:             amount?: number | null
 19:             bankName?: string | null
 20:             accountNumber?: string | null
 21:         }
 22:     } | null
 23:     isCourseOneActive?: boolean
 24:     userPhone?: string | null
 25:     userId?: number | null
 26:     onClose: () => void
 27:     onUploadProof?: (enrollmentId: number) => void
 28: }
 29: export default function PaymentModal({ course, enrollment, isCourseOneActive = false, userPhone = null, userId = null, onClose, onUploadProof }: PaymentModalProps) {
 30:     const [showUploadModal, setShowUploadModal] = useState(false)
 31:     const [showFullQR, setShowFullQR] = useState(false)
 32:     const [uploading, setUploading] = useState(false)
 33:     const [uploaded, setUploaded] = useState(!!enrollment?.payment?.proofImage)
 34:     const payment = enrollment?.payment
 35:     const paymentStatus = payment?.status
 36:     const isVerified = paymentStatus === 'VERIFIED'
 37:     const isPending = paymentStatus === 'PENDING' || paymentStatus === undefined
 38:     // QR từ VietQR API hoặc fallback
 39:     const effectiveAmount = isCourseOneActive ? 0 : (payment?.amount || course.phi_coc || 0)
 40:     // Format nội dung thống nhất với lib/vietqr: SDT [6_cuối] HV [userId] COC [courseCode]
 41:     const cleanPhone = userPhone ? userPhone.replace(/\D/g, '').slice(-6) : ''
 42:     const effectiveContent = payment?.transferContent || `SDT ${cleanPhone} HV ${userId} COC ${course.id_khoa}`.toUpperCase().slice(0, 50)
 43:     // Mã BIN ngân hàng (Sacombank mặc định)
 44:     const bankMap: Record<string, string> = { 'SACOMBANK': '970403', 'VCB': '970436', 'ACB': '970416', 'MB': '970422', 'TCB': '970407' }
 45:     const bankId = bankMap[course.bank_stk?.toUpperCase()] || '970403'
 46:     const qrCodeUrl = payment?.qrCodeUrl || course.link_qrcode || `https://img.vietqr.io/image/${bankId}-${course.stk}-qr_only.png?amount=${effectiveAmount}&addInfo=${encodeURIComponent(effectiveContent)}&accountName=${encodeURIComponent(course.name_stk || '')}`
 47:     const handleUploadSuccess = () => {
 48:         setUploaded(true)
 49:         window.location.reload()
 50:     }
 51:     const handleUploadClick = () => {
 52:         setShowUploadModal(true)
 53:     }
 54:     return (
 55:         <>
 56:             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
 57:             <div className="relative w-full max-w-2xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl">
 58:                 {/* Header Tím - Cố định */}
 59:                 <div className="bg-[#7c3aed] px-4 py-3 sm:px-6 sm:py-3 text-white shrink-0">
 60:                     <div className="flex items-center justify-between">
 61:                         <div className="flex-1 min-w-0 pr-4">
 62:                             <h2 className="text-base sm:text-lg font-bold leading-tight truncate">Kích hoạt khóa học</h2>
 63:                             <p className="text-[10px] sm:text-xs text-purple-100 italic opacity-90 truncate">{course.name_lop}</p>
 64:                         </div>
 65:                         <div className="flex items-center gap-2">
 66:                             {enrollment?.payment && (
 67:                                 <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
 68:                                     isVerified 
 69:                                         ? 'bg-green-500 text-white' 
 70:                                         : 'bg-yellow-500 text-white'
 71:                                 }`}>
 72:                                     {isVerified ? '✓ Xong' : '⏳ Chờ'}
 73:                                 </div>
 74:                             )}
 75:                             <button
 76:                                 onClick={onClose}
 77:                                 className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors border border-white/30"
 78:                             >
 79:                                 Để sau
 80:                             </button>
 81:                         </div>
 82:                     </div>
 83:                 </div>
 84:                 {/* Nội dung có thể cuộn */}
 85:                 <div className="overflow-y-auto flex-1 custom-scrollbar">
 86:                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
 87:                         {/* Cột trái: QR Code */}
 88:                         <div className="flex flex-col items-center justify-center text-center">
 89:                             <div 
 90:                                 onClick={() => setShowFullQR(true)}
 91:                                 className="group relative cursor-zoom-in"
 92:                                 title="Nhấn để phóng to mã QR"
 93:                             >
 94:                                 <div className="relative mb-2 h-40 w-40 sm:h-48 sm:w-48 overflow-hidden rounded-xl border-2 border-purple-100 p-1 shadow-inner bg-white group-hover:border-purple-300 transition-colors">
 95:                                     <Image
 96:                                         src={qrCodeUrl}
 97:                                         alt="QR Code Thanh toán"
 98:                                         fill
 99:                                         className="object-contain"
100:                                     />
101:                                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center transition-all">
102:                                         <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-[#7c3aed] text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
103:                                             🔍 Phóng to
104:                                         </span>
105:                                     </div>
106:                                 </div>
107:                             </div>
108:                             <p className="text-[9px] sm:text-[10px] font-medium text-gray-400 uppercase tracking-wider">
109:                                 Nhấn vào mã QR để phóng to/tải về
110:                             </p>
111:                         </div>
112:                         {/* Cột phải: Thông tin STK */}
113:                         <div className="flex flex-col justify-center space-y-2 sm:space-y-2.5">
114:                             <div className="rounded-xl bg-gray-50 px-3 py-1.5 border border-gray-100">
115:                                 <p className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase">Tiền cọc cam kết:</p>
116:                                 <p className="text-lg sm:text-xl font-black text-[#7c3aed]">
117:                                     {effectiveAmount?.toLocaleString()}đ
118:                                 </p>
119:                                 {isCourseOneActive && (
120:                                     <p className="text-[9px] font-bold text-green-600 italic">
121:                                         * Miễn phí (Đã có khóa 86 ngày)
122:                                     </p>
123:                                 )}
124:                             </div>
125:                             <div className="space-y-1.5 sm:space-y-2 px-1">
126:                                 <div className="grid grid-cols-2 gap-2">
127:                                     <div className="flex flex-col">
128:                                         <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">Ngân hàng</span>
129:                                         <span className="text-xs sm:text-sm font-bold text-gray-800 truncate">{payment?.bankName || course.bank_stk || 'N/A'}</span>
130:                                     </div>
131:                                     <div className="flex flex-col">
132:                                         <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">Số tài khoản</span>
133:                                         <span className="text-xs sm:text-sm font-bold text-gray-800 select-all">{payment?.accountNumber || course.stk || 'N/A'}</span>
134:                                     </div>
135:                                 </div>
136:                                 <div className="flex flex-col">
137:                                     <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">Chủ tài khoản</span>
138:                                     <span className="text-xs sm:text-sm font-bold text-gray-800">{course.name_stk || 'N/A'}</span>
139:                                 </div>
140:                                 <div className="flex items-center gap-2">
141:                                     <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase leading-none shrink-0">Nội dung:</span>
142:                                     <span className="inline-block rounded bg-purple-50 px-2 py-0.5 text-xs sm:text-sm font-mono font-bold text-[#7c3aed] select-all border border-purple-100">
143:                                         {effectiveContent}
144:                                     </span>
145:                                 </div>
146:                             </div>
147:                         </div>
148:                     </div>
149:                     {/* Trạng thái thanh toán */}
150:                     {enrollment?.payment && (
151:                         <div className="px-4 sm:px-6 pb-2">
152:                             <div className={`rounded-xl p-3 ${
153:                                 isVerified ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
154:                             }`}>
155:                                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
156:                                     <div>
157:                                         <p className={`text-xs sm:text-sm font-bold ${isVerified ? 'text-green-700' : 'text-yellow-700'}`}>
158:                                             {isVerified ? '✓ Đã xác nhận' : '⏳ Chờ xác nhận'}
159:                                         </p>
160:                                         {!isVerified && (
161:                                             <p className="text-[10px] sm:text-xs text-yellow-600 mt-0.5">
162:                                                 Chuyển khoản đúng nội dung hoặc upload biên lai
163:                                             </p>
164:                                         )}
165:                                     </div>
166:                                     {!isVerified && (
167:                                         <button
168:                                             onClick={handleUploadClick}
169:                                             disabled={uploading}
170:                                             className="w-full sm:w-auto px-3 py-1.5 bg-[#7c3aed] text-white rounded-lg text-xs font-bold hover:bg-[#6d28d9] transition-colors disabled:opacity-50"
171:                                         >
172:                                             {uploading ? '...' : '📤 Upload biên lai'}
173:                                         </button>
174:                                     )}
175:                                 </div>
176:                             </div>
177:                         </div>
178:                     )}
179:                     {/* Footer Tips - Đẩy lên cao hơn */}
180:                     <div className="bg-orange-50 px-4 py-2 sm:px-6 sm:py-2 text-center shrink-0">
181:                         <p className="text-[10px] sm:text-xs font-medium text-orange-700 leading-tight">
182:                             🚀 Hệ thống sẽ tự động kích hoạt sau 10-15 phút khi nhận được chuyển khoản đúng nội dung.
183:                         </p>
184:                     </div>
185:                 </div>
186:             </div>
187:         </div>
188:         {showUploadModal && enrollment && enrollment.id && (
189:             <UploadProofModal
190:                 enrollmentId={enrollment.id}
191:                 onClose={() => setShowUploadModal(false)}
192:                 onSuccess={handleUploadSuccess}
193:             />
194:         )}
195:         {/* Modal Phóng to QR */}
196:         {showFullQR && (
197:             <div 
198:                 className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
199:                 onClick={() => setShowFullQR(false)}
200:             >
201:                 <div className="relative w-full max-w-sm flex flex-col items-center" onClick={e => e.stopPropagation()}>
202:                     <div className="relative aspect-square w-full bg-white rounded-2xl p-4 shadow-2xl">
203:                         <Image
204:                             src={qrCodeUrl}
205:                             alt="QR Code Large"
206:                             fill
207:                             className="object-contain p-2"
208:                         />
209:                     </div>
210:                     <div className="mt-6 flex gap-4 w-full px-2">
211:                         <a 
212:                             href={qrCodeUrl}
213:                             download={`QR_Payment_${course.id_khoa}.png`}
214:                             className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm text-center shadow-lg active:scale-95 transition-transform"
215:                         >
216:                             📥 Tải ảnh
217:                         </a>
218:                         <button 
219:                             onClick={() => setShowFullQR(false)}
220:                             className="flex-1 bg-white/20 text-white py-3 rounded-xl font-bold text-sm border border-white/30 backdrop-blur-md active:scale-95 transition-transform"
221:                         >
222:                             ✕ Đóng lại
223:                         </button>
224:                     </div>
225:                     <p className="mt-4 text-white/60 text-[10px] text-center px-4">
226:                         Sau khi tải ảnh, hãy mở ứng dụng Ngân hàng và quét mã QR từ thư viện ảnh của bạn.
227:                     </p>
228:                 </div>
229:             </div>
230:         )}
231:         </>
232:     )
233: }
````

## File: DESIGN_SYSTEM.md
````markdown
 1: # HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM) - HỌC VIỆN BRK
 2: 
 3: Tài liệu này lưu trữ các thông số kỹ thuật về giao diện (UI) của dự án. Mọi thay đổi trong code sẽ được cập nhật đồng bộ vào đây.
 4: 
 5: ## 1. THÔNG SỐ CHUNG (GLOBAL)
 6: 
 7: | Đối tượng | Thông số | Chi tiết |
 8: | :--- | :--- | :--- |
 9: | **Phông chữ (Font)** | `Be Vietnam Pro` | Phông chữ chính toàn trang, hỗ trợ tiếng Việt hoàn hảo. |
10: | **Màu nền (Background)** | `bg-black` / `bg-zinc-950` | Tone màu đen chủ đạo cho toàn bộ hệ thống Elite. |
11: | **Màu chữ chính** | `text-white` | Màu trắng tinh khôi cho độ tương phản cao trên nền đen. |
12: 
13: ## 2. THANH ĐIỀU HƯỚNG (HEADER)
14: 
15: | Thành phần | Font & Kích thước | Màu sắc | Nội dung & Vị trí |
16: | :--- | :--- | :--- | :--- |
17: | **Brand Logo** | `Image` (h-12, w-auto) | `logobrk-50px.png` | Logo hình ảnh - Góc trái. |
18: | **Menu Desktop** | `text-[13px]`, `font-black`, `tracking-widest` | `white`, Hover: `yellow-400` | TRANG CHỦ, KHÓA HỌC... - Căn giữa. |
19: | **Thông tin Học viên**| `text-[10px]/[13px]`, `font-black` | `yellow-300` | "CHÀO, [Tên] (ID: [Mã])" - Góc phải. |
20: | **Nút Đăng xuất** | `text-xs`, `font-black` | Nền `white`, Chữ `black` | "ĐĂNG XUẤT" - Bo tròn full. |
21: | **Mobile Menu** | `text-sm`, `font-black` | Nền `black`, Chữ `white` | Hiện khi bấm biểu tượng Ba gạch (Hamburger). |
22: 
23: ## 3. KHU VỰC TRUNG TÂM (HERO SECTION)
24: 
25: | Thành phần | Font & Kích thước | Màu sắc | Hiệu ứng & Vị trí |
26: | :--- | :--- | :--- | :--- |
27: | **Tiêu đề chính** | `text-3xl/5xl/6xl`, `font-black` | `white` (Opacity 90%) | "HỌC VIỆN BRK" - Dòng trên, VIẾT HOA. |
28: | **Tiêu đề phụ** | `text-2xl/4xl/5xl`, `font-black` | `yellow-400` (Glow) | "NGÂN HÀNG PHƯỚC BÁU" - Dòng dưới, VIẾT HOA. |
29: | **Hiệu ứng Glow** | N/A | Vàng Lóe Sáng | Hiệu ứng 3D huyền bí, lóe sáng liên tục. |
30: | **Khoảng cách** | `gap-6` | N/A | Khoảng cách giữa 2 dòng tiêu đề. |
31: 
32: ## 4. THẺ KHÓA HỌC (COURSE CARD)
33: 
34: | Thành phần | Font & Kích thước | Màu sắc | Quy cách hiển thị |
35: | :--- | :--- | :--- | :--- |
36: | **Ảnh minh họa** | `aspect-[16/9]`, `object-cover` | `full-width` | Tỉ lệ chuẩn 16:9 (tương đương 1280x720). |
37: | **Biểu tượng (Icon)** | `text-2xl` (📘) | Blue | Căn giữa hoàn hảo với dòng tiêu đề. |
38: | **Tên khóa học** | `text-base/lg`, `font-black`, `Normal Case`, `Inter` | `black` | Hiển thị TRÊN 1 DÒNG duy nhất (Truncate). |
39: | **Nhãn Phí cam kết**| `text-[10px]/[11px]`, `font-black` | Nền `Red`, Chữ `White` | Bo tròn full, bóng đổ nhẹ. |
40: | **Nhãn Miễn phí** | `text-[10px]/[11px]`, `font-black` | Nền `Yellow`, Chữ `Black`| Bo tròn full, nổi bật. |
41: | **Nhãn Kích hoạt** | `text-[10px]/[11px]`, `font-black` | Nền `Sky-500`, Chữ `White`| "ĐÃ KÍCH HOẠT" - Đồng bộ màu nút. |
42: | **Mô tả ngắn** | `text-[14px]`, `medium` | `gray-500` | HIỆN ĐẦY ĐỦ nôi dung, không dùng line-clamp. |
43: | **Nút Kích hoạt ngay**| `text-sm/base`, `font-black` | Nền `Sky-500`, Chữ `White`| "Kích hoạt miễn phí/ngay" - Bo tròn full. |
44: | **Nút Vào học ngay** | `text-sm/base`, `font-black` | Nền `Green-600`, Chữ `White`| "VÀO HỌC NGAY" - Bo tròn full. |
45: 
46: ---
47: *Lưu ý: Tài liệu này được cập nhật tự động bởi Antigravity Agent.*
````

## File: lib/email-parser.ts
````typescript
  1: export interface ParsedTransfer {
  2:   phone: string | null;
  3:   userId: number | null; // Thêm userId
  4:   amount: number;
  5:   courseCode: string | null;
  6:   bankName: string | null;
  7:   accountNumber: string | null;
  8:   transferTime: Date | null;
  9:   rawContent: string;
 10: }
 11: interface BankParser {
 12:   pattern: RegExp;
 13:   extract: (matches: RegExpMatchArray) => ParsedTransfer;
 14: }
 15: const bankParsers: BankParser[] = [
 16:   // Mới: SDT 123456 HV 8286 COC LS03 (linh hoạt khoảng trống, dấu chấm, gạch dưới)
 17:   {
 18:     pattern: /SDT[\s\._]*(\d{6})[\s\._]*HV[\s\._]*(\d+)[\s\._]*COC[\s\._]*(\w+)/i,
 19:     extract: (matches) => ({
 20:       phone: matches[1],
 21:       userId: parseInt(matches[2]),
 22:       courseCode: matches[3].toUpperCase(), // Chuyển sang chữ hoa ngay lập tức
 23:       amount: 0,
 24:       bankName: null,
 25:       accountNumber: null,
 26:       transferTime: null,
 27:       rawContent: matches[0]
 28:     })
 29:   },
 30:   {
 31:     pattern: /(\d{10,11})\s*c[oó]\s*(\w+)|(\w+)\s*c[oó]\s*(\d{10,11})/i,
 32:     extract: (matches) => ({
 33:       phone: matches[1] || matches[4] || null,
 34:       userId: null,
 35:       amount: 0,
 36:       courseCode: matches[2] || matches[3] || null,
 37:       bankName: null,
 38:       accountNumber: null,
 39:       transferTime: null,
 40:       rawContent: matches[0]
 41:     })
 42:   },
 43:   {
 44:     pattern: /ND:\s*(\d{10,11})\s+(\w+)|(\w+)\s+(\d{10,11})/i,
 45:     extract: (matches) => ({
 46:       phone: matches[1] || matches[4] || null,
 47:       userId: null,
 48:       amount: 0,
 49:       courseCode: matches[2] || matches[3] || null,
 50:       bankName: null,
 51:       accountNumber: null,
 52:       transferTime: null,
 53:       rawContent: matches[0]
 54:     })
 55:   },
 56:   {
 57:     pattern: /(\d{10,11}).*?(c[oó]?|nạp).*?(\w{2,10})/i,
 58:     extract: (matches) => ({
 59:       phone: matches[1] || null,
 60:       userId: null,
 61:       amount: 0,
 62:       courseCode: matches[3] || null,
 63:       bankName: null,
 64:       accountNumber: null,
 65:       transferTime: null,
 66:       rawContent: matches[0]
 67:     })
 68:   }
 69: ];
 70: export function parseBankEmail(content: string): ParsedTransfer | null {
 71:   const normalizedContent = content.replace(/\s+/g, ' ').trim();
 72:   for (const parser of bankParsers) {
 73:     const matches = normalizedContent.match(parser.pattern);
 74:     if (matches) {
 75:       return parser.extract(matches);
 76:     }
 77:   }
 78:   const phoneMatch = normalizedContent.match(/(\d{10,11})/);
 79:   const courseMatch = normalizedContent.match(/c[oó]\s*(\w{2,10})|(\w{2,10})\s*c[oó]/i);
 80:   if (phoneMatch || courseMatch) {
 81:     return {
 82:       phone: phoneMatch?.[1] || null,
 83:       userId: null,
 84:       amount: 0,
 85:       courseCode: courseMatch?.[1] || courseMatch?.[2] || null,
 86:       bankName: null,
 87:       accountNumber: null,
 88:       transferTime: null,
 89:       rawContent: normalizedContent.substring(0, 200)
 90:     };
 91:   }
 92:   return null;
 93: }
 94: export function extractAmount(content: string): number {
 95:   const amountPatterns = [
 96:     /(\d{1,3}(?:\.\d{3})*)\s*đ/gi,
 97:     /SMT:\s*(\d{1,3}(?:\.\d{3})*)/gi,
 98:     /(\d{6,12})/g
 99:   ];
100:   for (const pattern of amountPatterns) {
101:     const matches = content.match(pattern);
102:     if (matches) {
103:       const amountStr = matches[0]
104:         .replace(/\D/g, '')
105:         .replace(/^0+/, '');
106:       const amount = parseInt(amountStr, 10);
107:       if (amount >= 10000 && amount <= 1000000000) {
108:         return amount;
109:       }
110:     }
111:   }
112:   return 0;
113: }
114: export function extractBankName(content: string): string | null {
115:   const bankNames = [
116:     'Vietcombank', 'VCB',
117:     'Techcombank', 'TCB',
118:     'MB Bank', 'MBBank', 'MB',
119:     'BIDV',
120:     'Agribank', 'AGRIBANK',
121:     'ACB',
122:     'Vietinbank', 'VTB',
123:     'TPBank', 'TPB',
124:     'Sacombank', 'SCB',
125:     'SHB',
126:     'SeABank',
127:     'Eximbank', 'EIB',
128:     'HD Bank',
129:     'Bac A Bank', 'BAB',
130:     'Oceanbank',
131:     'GPBank',
132:     'Kiên Long', 'KLB',
133:     'Nam A Bank', 'NAB',
134:     'PGBank',
135:     'Public Bank', 'PB',
136:     'Saigonbank', 'SGB'
137:   ];
138:   const upperContent = content.toUpperCase();
139:   for (const bank of bankNames) {
140:     if (upperContent.includes(bank.toUpperCase())) {
141:       return bank;
142:     }
143:   }
144:   return null;
145: }
146: export function extractAccountNumber(content: string): string | null {
147:   const patterns = [
148:     /STK[:\s]*(\d{6,20})/i,
149:     /TK[:\s]*(\d{6,20})/i,
150:     /(\d{6,20})/g
151:   ];
152:   for (const pattern of patterns) {
153:     const matches = content.match(pattern);
154:     if (matches && matches[1]) {
155:       return matches[1];
156:     }
157:   }
158:   return null;
159: }
160: export function extractTransferTime(content: string): Date | null {
161:   const patterns = [
162:     /(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/,
163:     /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,
164:     /(\d{1,2}):(\d{2})\s+(\d{2})[\/\-](\d{2})[\/\-](\d{4})/
165:   ];
166:   for (const pattern of patterns) {
167:     const matches = content.match(pattern);
168:     if (matches) {
169:       try {
170:         if (matches.length >= 6) {
171:           const [_, d1, d2, y, h, min] = matches;
172:           return new Date(`${y}-${d2}-${d1}T${h || '00'}:${min || '00'}:00`);
173:         }
174:       } catch {
175:         continue;
176:       }
177:     }
178:   }
179:   return null;
180: }
181: export interface FullParsedTransfer {
182:   phone: string | null;
183:   userId: number | null; // Thêm userId
184:   amount: number;
185:   courseCode: string | null;
186:   bankName: string | null;
187:   accountNumber: string | null;
188:   transferTime: Date | null;
189:   rawContent: string;
190: }
191: export function parseFullTransferEmail(content: string): FullParsedTransfer {
192:   const parsed = parseBankEmail(content);
193:   const amount = extractAmount(content);
194:   const bankName = extractBankName(content);
195:   const accountNumber = extractAccountNumber(content);
196:   const transferTime = extractTransferTime(content);
197:   return {
198:     phone: parsed?.phone || null,
199:     userId: parsed?.userId || null,
200:     amount,
201:     courseCode: parsed?.courseCode || null,
202:     bankName,
203:     accountNumber,
204:     transferTime,
205:     rawContent: content.substring(0, 500)
206:   };
207: }
208: export function matchWithEnrollment(
209:   transfer: FullParsedTransfer,
210:   enrollments: Array<{
211:     id: number;
212:     userId: number; // Thêm userId vào input
213:     courseId: number;
214:     course: {
215:       id_khoa: string;
216:       phi_coc: number;
217:       noidung_stk: string | null;
218:     };
219:     user: {
220:       phone: string | null;
221:     };
222:     status: string;
223:   }>
224: ): { matched: boolean; enrollmentId: number | null; reason: string } {
225:   for (const enrollment of enrollments) {
226:     if (enrollment.status !== 'PENDING') continue;
227:     const courseCode = enrollment.course.id_khoa.toUpperCase();
228:     const transferCourseCode = transfer.courseCode?.toUpperCase();
229:     // Khớp mã khóa học
230:     const courseCodeMatch = transferCourseCode && 
231:       (courseCode.includes(transferCourseCode) || transferCourseCode.includes(courseCode));
232:     // Khớp số tiền
233:     const amountMatch = transfer.amount >= enrollment.course.phi_coc;
234:     // Ưu tiên 1: Khớp theo userId
235:     const userIdMatch = transfer.userId && transfer.userId === enrollment.userId;
236:     if (userIdMatch && courseCodeMatch && amountMatch) {
237:       return {
238:         matched: true,
239:         enrollmentId: enrollment.id,
240:         reason: `Khớp tuyệt đối: Mã HV ${transfer.userId} + Mã KH ${transfer.courseCode} + Số tiền ${transfer.amount}`
241:       };
242:     }
243:     // Ưu tiên 2: Khớp theo SĐT (6 số cuối hoặc full)
244:     const userPhone = enrollment.user.phone?.replace(/\D/g, '') || '';
245:     const transferPhone = transfer.phone?.replace(/\D/g, '') || '';
246:     const phoneMatch = transferPhone && userPhone && userPhone.includes(transferPhone);
247:     if (phoneMatch && courseCodeMatch && amountMatch) {
248:       return {
249:         matched: true,
250:         enrollmentId: enrollment.id,
251:         reason: `Khớp: SĐT ${transfer.phone} + Mã KH ${transfer.courseCode} + Số tiền ${transfer.amount}`
252:       };
253:     }
254:     // Ưu tiên 3: Chỉ khớp SĐT + Số tiền
255:     if (phoneMatch && amountMatch && !transfer.courseCode) {
256:       return {
257:         matched: true,
258:         enrollmentId: enrollment.id,
259:         reason: `Khớp: SĐT ${transfer.phone} + Số tiền ${transfer.amount}`
260:       };
261:     }
262:     // Ưu tiên 4: Chỉ khớp Mã KH + Số tiền
263:     if (courseCodeMatch && amountMatch && !transfer.phone && !transfer.userId) {
264:       return {
265:         matched: true,
266:         enrollmentId: enrollment.id,
267:         reason: `Khớp: Mã KH ${transfer.courseCode} + Số tiền ${transfer.amount}`
268:       };
269:     }
270:   }
271:   return {
272:     matched: false,
273:     enrollmentId: null,
274:     reason: 'Không tìm thấy enrollment phù hợp'
275:   };
276: }
````

## File: lib/vietqr.ts
````typescript
  1: export interface VietQRRequest {
  2:   accountNo: string
  3:   accountName: string
  4:   acqId: string
  5:   amount: number
  6:   addInfo: string
  7:   template?: string
  8:   format?: string
  9: }
 10: export interface VietQRResponse {
 11:   code: string
 12:   desc: string
 13:   data: {
 14:     qrCode: string
 15:     qrDataURL: string
 16:   }
 17: }
 18: export function generateTransferContent(options: {
 19:   phone: string
 20:   userId: number
 21:   courseCode: string
 22: }): string {
 23:   // Format: SDT [phone_cuoi] HV [id] COC [code]
 24:   const { phone, userId, courseCode } = options
 25:   const cleanPhone = phone.replace(/\D/g, '').slice(-6)
 26:   const content = `SDT ${cleanPhone} HV ${userId} COC ${courseCode}`.toUpperCase()
 27:   return content.slice(0, 50) // Tăng giới hạn ký tự lên 50 vì có khoảng cách
 28: }
 29: export async function generateVietQR(options: {
 30:   accountNo: string
 31:   accountName: string
 32:   acqId: string // Nhận bank_stk từ Course
 33:   amount: number
 34:   addInfo: string
 35: }): Promise<{ qrCode: string; qrDataURL: string }> {
 36:   // Map tên ngân hàng sang mã BIN
 37:   const bankMap: Record<string, string> = {
 38:     'SACOMBANK': '970403',
 39:     'VIETCOMBANK': '970436',
 40:     'VCB': '970436',
 41:     'ACB': '970416',
 42:     'MBBANK': '970422',
 43:     'MB': '970422',
 44:     'TECHCOMBANK': '970407',
 45:     'TCB': '970407',
 46:     'VIETINBANK': '970415',
 47:     'CTG': '970415',
 48:     'BIDV': '970418',
 49:     'AGRIBANK': '970405',
 50:     'TPBANK': '970423',
 51:     'VPBANK': '970432'
 52:   }
 53:   const bankId = bankMap[options.acqId?.toUpperCase()] || options.acqId || '970403'
 54:   const requestBody: VietQRRequest = {
 55:     accountNo: options.accountNo,
 56:     accountName: options.accountName.toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, ' '),
 57:     acqId: bankId,
 58:     amount: options.amount,
 59:     addInfo: options.addInfo,
 60:     template: 'qr_only',
 61:     format: 'text'
 62:   }
 63:   const response = await fetch('https://api.vietqr.io/v2/generate', {
 64:     method: 'POST',
 65:     headers: {
 66:       'x-client-id': process.env.VIETQR_CLIENT_ID || '',
 67:       'x-api-key': process.env.VIETQR_API_KEY || '',
 68:       'Content-Type': 'application/json'
 69:     },
 70:     body: JSON.stringify(requestBody)
 71:   })
 72:   if (!response.ok) {
 73:     const errorText = await response.text()
 74:     throw new Error(`VietQR API error: ${response.status} - ${errorText}`)
 75:   }
 76:   const data: VietQRResponse = await response.json()
 77:   if (data.code !== '00') {
 78:     throw new Error(`VietQR error: ${data.desc}`)
 79:   }
 80:   return {
 81:     qrCode: data.data.qrCode,
 82:     qrDataURL: data.data.qrDataURL
 83:   }
 84: }
 85: export async function createPaymentQR(options: {
 86:   phone: string
 87:   userId: number
 88:   courseId: number
 89:   courseCode: string
 90:   accountNo: string
 91:   accountName: string
 92:   acqId: string // Thêm acqId
 93:   amount: number
 94: }): Promise<{
 95:   transferContent: string
 96:   qrCodeUrl: string
 97: }> {
 98:   const transferContent = generateTransferContent({
 99:     phone: options.phone,
100:     userId: options.userId,
101:     courseCode: options.courseCode
102:   })
103:   const qrResult = await generateVietQR({
104:     accountNo: options.accountNo,
105:     accountName: options.accountName,
106:     acqId: options.acqId, // Truyền acqId vào
107:     amount: options.amount,
108:     addInfo: transferContent
109:   })
110:   return {
111:     transferContent,
112:     qrCodeUrl: qrResult.qrDataURL
113:   }
114: }
````

## File: scripts/push.ps1
````powershell
  1: # ============================================================
  2: #  push.ps1 - Backup + Push len GitHub
  3: #  Usage: .\scripts\push.ps1 "Noi dung ghi chu"
  4: # ============================================================
  5: 
  6: param (
  7:     [string]$Message = "Cap nhat he thong BRK Academy"
  8: )
  9: 
 10: $ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
 11: 
 12: # ── BUOC 1: BACKUP ──────────────────────────────────────────
 13: $Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
 14: $BackupDir = "$ProjectRoot\backups"
 15: $ZipName = "backup_$Timestamp.zip"
 16: $ZipPath = "$BackupDir\$ZipName"
 17: $TempDir = Join-Path ([System.IO.Path]::GetTempPath()) "BRK_Backup_$Timestamp"
 18: 
 19: Write-Host ""
 20: Write-Host "======================================" -ForegroundColor Cyan
 21: Write-Host "  [1/2] BACKUP DU AN" -ForegroundColor Cyan
 22: Write-Host "  Time   : $Timestamp" -ForegroundColor Cyan
 23: Write-Host "  Output : $ZipPath" -ForegroundColor Cyan
 24: Write-Host "======================================" -ForegroundColor Cyan
 25: 
 26: $IncludePaths = @(
 27:     "app", "components", "lib", "types", "public",
 28:     "auth.ts", "auth.config.ts", "middleware.ts", ".env", ".env.local",
 29:     "prisma", "scripts",
 30:     "package.json", "next.config.ts", "tsconfig.json", "tsconfig.seed.json",
 31:     "postcss.config.mjs", "eslint.config.mjs", "docker-compose.yml",
 32:     "README.md", "DESIGN_SYSTEM.md"
 33: )
 34: $ExcludePatterns = @("*.log", "*.tsbuildinfo", ".next", "node_modules", ".git", "backups")
 35: 
 36: if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }
 37: if (Test-Path $TempDir) { Remove-Item -Path $TempDir -Recurse -Force | Out-Null }
 38: New-Item -ItemType Directory -Path $TempDir | Out-Null
 39: 
 40: $FilesToBackup = @()
 41: foreach ($rel in $IncludePaths) {
 42:     $full = Join-Path $ProjectRoot $rel
 43:     if (Test-Path $full -PathType Leaf) {
 44:         $FilesToBackup += $full
 45:     }
 46:     elseif (Test-Path $full -PathType Container) {
 47:         foreach ($file in (Get-ChildItem -Path $full -File -Recurse)) {
 48:             $skip = $false
 49:             foreach ($p in $ExcludePatterns) {
 50:                 if ($file.FullName -like "*\$p\*" -or $file.Name -like $p) { $skip = $true; break }
 51:             }
 52:             if (-not $skip) { $FilesToBackup += $file.FullName }
 53:         }
 54:     }
 55: }
 56: 
 57: foreach ($filePath in $FilesToBackup) {
 58:     $rel = $filePath.Substring($ProjectRoot.Length).TrimStart('\', '/')
 59:     $dest = Join-Path $TempDir $rel
 60:     $dir = Split-Path -Parent $dest
 61:     if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
 62:     Copy-Item -Path $filePath -Destination $dest -Force
 63: }
 64: 
 65: try {
 66:     Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipPath -Force
 67:     $sizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
 68:     Write-Host "[OK] Backup xong: $ZipName ($sizeMB MB, $($FilesToBackup.Count) files)" -ForegroundColor Green
 69: }
 70: catch {
 71:     Write-Host "[LOI] Khong the tao ZIP: $($_.Exception.Message)" -ForegroundColor Red
 72: }
 73: 
 74: # Xoa temp va giu toi da 5 ban backup gan nhat
 75: if (Test-Path $TempDir) { Remove-Item -Path $TempDir -Recurse -Force | Out-Null }
 76: $old = Get-ChildItem -Path $BackupDir -Filter "backup_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 5
 77: if ($old.Count -gt 0) {
 78:     Write-Host "[*] Xoa $($old.Count) backup cu..." -ForegroundColor Gray
 79:     $old | Remove-Item -Force
 80: }
 81: 
 82: # ── BUOC 2: PUSH LEN GITHUB ─────────────────────────────────
 83: Write-Host ""
 84: Write-Host "======================================" -ForegroundColor Cyan
 85: Write-Host "  [2/2] DAY CODE LEN GITHUB" -ForegroundColor Cyan
 86: Write-Host "======================================" -ForegroundColor Cyan
 87: 
 88: Write-Host "> Dang gom cac thay doi..." -ForegroundColor Yellow
 89: git add .
 90: 
 91: $status = git status --porcelain
 92: if ($status) {
 93:     Write-Host "> Commit: '$Message'" -ForegroundColor Yellow
 94:     git commit -m $Message
 95: }
 96: else {
 97:     Write-Host "> Khong co thay doi moi de commit." -ForegroundColor Gray
 98: }
 99: 
100: Write-Host "> Dang day len nhanh master..." -ForegroundColor Yellow
101: git push origin master
102: 
103: if ($LASTEXITCODE -eq 0) {
104:     Write-Host ""
105:     Write-Host "======================================" -ForegroundColor Green
106:     Write-Host "  HOAN THANH! Backup + Push thanh cong" -ForegroundColor Green
107:     Write-Host "======================================" -ForegroundColor Green
108: }
109: else {
110:     Write-Host "[LOI] Push that bai! Kiem tra ket noi hoac xung dot code." -ForegroundColor Red
111: }
````

## File: tsconfig.json
````json
 1: {
 2:   "compilerOptions": {
 3:     "target": "ES2017",
 4:     "lib": ["dom", "dom.iterable", "esnext"],
 5:     "allowJs": true,
 6:     "skipLibCheck": true,
 7:     "strict": true,
 8:     "noEmit": true,
 9:     "esModuleInterop": true,
10:     "module": "esnext",
11:     "moduleResolution": "bundler",
12:     "resolveJsonModule": true,
13:     "isolatedModules": true,
14:     "jsx": "react-jsx",
15:     "incremental": true,
16:     "plugins": [
17:       {
18:         "name": "next"
19:       }
20:     ],
21:     "paths": {
22:       "@/*": ["./*"]
23:     }
24:   },
25:   "include": [
26:     "next-env.d.ts",
27:     "**/*.ts",
28:     "**/*.tsx",
29:     ".next/types/**/*.ts",
30:     ".next/dev/types/**/*.ts",
31:     "**/*.mts"
32:   ],
33:   "exclude": ["node_modules", "scripts"]
34: }
````

## File: vercel.json
````json
1: {
2:   "crons": [
3:     {
4:       "path": "/api/cron/gmail-watch",
5:       "schedule": "0 0 * * 1"
6:     }
7:   ]
8: }
````

## File: app/actions/admin-actions.ts
````typescript
  1: 'use server'
  2: import { auth } from "@/auth"
  3: import prisma from "@/lib/prisma"
  4: import { Role } from "@prisma/client"
  5: import { revalidatePath } from "next/cache"
  6: // Helper to check admin permission
  7: async function checkAdmin() {
  8:     const session = await auth()
  9:     if (session?.user?.role !== Role.ADMIN) {
 10:         throw new Error("Unauthorized: You must be an Admin.")
 11:     }
 12: }
 13: export async function addReservedIdAction(prevState: any, formData: FormData) {
 14:     await checkAdmin()
 15:     const id = parseInt(formData.get("id") as string)
 16:     const note = formData.get("note") as string || "Admin Added"
 17:     if (isNaN(id)) return { message: "Error: ID phải là số." }
 18:     try {
 19:         const existing = await prisma.reservedId.findUnique({ where: { id } })
 20:         if (existing) return { message: `Error: ID ${id} đã có trong danh sách.` }
 21:         await prisma.reservedId.create({
 22:             data: { id, note }
 23:         })
 24:         revalidatePath("/admin/reserved-ids")
 25:         return { message: `Success: Đã thêm ID ${id} vào danh sách dự trữ.` }
 26:     } catch (_e) {
 27:         console.error(_e)
 28:         return { message: "Error: Lỗi Server khi thêm ID." }
 29:     }
 30: }
 31: export async function deleteReservedIdAction(id: number) {
 32:     await checkAdmin()
 33:     try {
 34:         await prisma.reservedId.delete({ where: { id } })
 35:         revalidatePath("/admin/reserved-ids")
 36:         return { message: `Success: Đã xóa ID ${id}.` }
 37:     } catch (_e) {
 38:         return { message: "Error: Lỗi khi xóa ID." }
 39:     }
 40: }
 41: export async function changeUserIdAction(prevState: any, formData: FormData) {
 42:     await checkAdmin()
 43:     const currentId = parseInt(formData.get("currentId") as string)
 44:     const newId = parseInt(formData.get("newId") as string)
 45:     if (isNaN(currentId) || isNaN(newId)) {
 46:         return { message: "Error: Vui lòng nhập đúng định dạng số ID." }
 47:     }
 48:     try {
 49:         // 1. Check user cũ
 50:         const user = await prisma.user.findUnique({ where: { id: currentId } })
 51:         if (!user) return { message: `Error: Không tìm thấy User với ID ${currentId}` }
 52:         // 2. Check user mới (target)
 53:         const targetUser = await prisma.user.findUnique({ where: { id: newId } })
 54:         if (targetUser) return { message: `Error: ID ${newId} đã có người sử dụng: ${targetUser.email}` }
 55:         // 3. Thực hiện đổi
 56:         // Tận dụng ON UPDATE CASCADE của PostgreSQL
 57:         await prisma.$executeRawUnsafe(`UPDATE "User" SET id = ${newId} WHERE id = ${currentId}`)
 58:         // 4. Reset Sequence
 59:         await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id)+1, 1), false) FROM "User";`)
 60:         revalidatePath("/admin/reserved-ids")
 61:         return { message: `Success: Thành công! Đã đổi ${user.email} (ID: ${currentId}) -> ID Mới: ${newId}` }
 62:     } catch (e) {
 63:         console.error(e)
 64:         return { message: "Error: Lỗi hệ thống khi đổi ID." }
 65:     }
 66: }
 67: export async function getReservedIds() {
 68:     await checkAdmin()
 69:     return await prisma.reservedId.findMany({
 70:         orderBy: { id: 'asc' }
 71:     })
 72: }
 73: export async function getStudentsAction(query?: string, role?: Role | 'ALL' | 'COURSE_86_DAYS') {
 74:     await checkAdmin()
 75:     try {
 76:         let where: any = {};
 77:         if (role === 'COURSE_86_DAYS') {
 78:             where.enrollments = {
 79:                 some: { courseId: 1 }
 80:             };
 81:         } else if (role && role !== 'ALL') {
 82:             where.role = role;
 83:         }
 84:         if (query) {
 85:             const trimmedQuery = query.trim();
 86:             // 1. Nếu bắt đầu bằng # -> Tìm ID chính xác
 87:             if (trimmedQuery.startsWith('#')) {
 88:                 const id = parseInt(trimmedQuery.substring(1));
 89:                 if (!isNaN(id)) {
 90:                     where.id = id;
 91:                 } else {
 92:                     return { success: true, students: [] };
 93:                 }
 94:             } 
 95:             // 2. Nếu là số thuần túy
 96:             else if (/^\d+$/.test(trimmedQuery)) {
 97:                 const id = parseInt(trimmedQuery);
 98:                 const searchFields = [
 99:                     { id: id },
100:                     { name: { contains: trimmedQuery, mode: 'insensitive' } },
101:                     { email: { contains: trimmedQuery, mode: 'insensitive' } },
102:                 ];
103:                 if (trimmedQuery.length >= 6) {
104:                     searchFields.push({ phone: { contains: trimmedQuery, mode: 'insensitive' } } as any);
105:                 }
106:                 if (where.role) {
107:                     where = {
108:                         AND: [
109:                             { role: where.role },
110:                             { OR: searchFields }
111:                         ]
112:                     };
113:                 } else {
114:                     where.OR = searchFields;
115:                 }
116:             }
117:             // 3. Tìm kiếm chuỗi bình thường
118:             else {
119:                 const searchFields = [
120:                     { name: { contains: trimmedQuery, mode: 'insensitive' } },
121:                     { email: { contains: trimmedQuery, mode: 'insensitive' } },
122:                     { phone: { contains: trimmedQuery, mode: 'insensitive' } },
123:                 ];
124:                 if (where.role) {
125:                     where = {
126:                         AND: [
127:                             { role: where.role },
128:                             { OR: searchFields }
129:                         ]
130:                     };
131:                 } else {
132:                     where.OR = searchFields;
133:                 }
134:             }
135:         }
136:         const students = await prisma.user.findMany({
137:             where,
138:             include: {
139:                 enrollments: {
140:                     include: {
141:                         course: { select: { name_lop: true } },
142:                         _count: {
143:                             select: { lessonProgress: { where: { status: 'COMPLETED' } } }
144:                         }
145:                     }
146:                 }
147:             },
148:             orderBy: { createdAt: 'desc' }
149:         })
150:         return { success: true, students }
151:     } catch (error: any) {
152:         console.error("Get Students Error:", error)
153:         return { success: false, error: error.message }
154:     }
155: }
156: export async function getStudentDetailsAction(userId: number) {
157:     await checkAdmin()
158:     try {
159:         const student = await prisma.user.findUnique({
160:             where: { id: userId },
161:             include: {
162:                 enrollments: {
163:                     include: {
164:                         course: {
165:                             include: {
166:                                 lessons: {
167:                                     orderBy: { order: 'asc' }
168:                                 }
169:                             }
170:                         },
171:                         lessonProgress: {
172:                             include: {
173:                                 lesson: { select: { title: true, order: true } }
174:                             }
175:                         }
176:                     },
177:                     orderBy: { createdAt: 'desc' }
178:                 }
179:             }
180:         })
181:         if (!student) return { success: false, error: "Không tìm thấy học viên." }
182:         return { success: true, student }
183:     } catch (error: any) {
184:         console.error("Get Student Details Error:", error)
185:         return { success: false, error: error.message }
186:     }
187: }
188: export async function getAdminCoursesAction() {
189:     await checkAdmin()
190:     try {
191:         const courses = await prisma.course.findMany({
192:             include: {
193:                 _count: {
194:                     select: { 
195:                         lessons: true,
196:                         enrollments: true
197:                     }
198:                 }
199:             },
200:             orderBy: { id: 'asc' }
201:         })
202:         return { success: true, courses }
203:     } catch (error: any) {
204:         console.error("Get Admin Courses Error:", error)
205:         return { success: false, error: error.message }
206:     }
207: }
208: export async function updateCourseAction(courseId: number, data: {
209:     name_lop?: string,
210:     phi_coc?: number,
211:     id_khoa?: string,
212:     noidung_email?: string | null,
213:     stk?: string | null,
214:     name_stk?: string | null,
215:     bank_stk?: string | null
216: }) {
217:     await checkAdmin()
218:     try {
219:         const updatedCourse = await prisma.course.update({
220:             where: { id: courseId },
221:             data
222:         })
223:         revalidatePath('/admin/courses')
224:         revalidatePath('/') // Revalidate trang chủ nếu có đổi tên/giá
225:         return { success: true, course: updatedCourse }
226:     } catch (error: any) {
227:         console.error("Update Course Error:", error)
228:         return { success: false, error: error.message }
229:     }
230: }
231: export async function updateLessonAction(lessonId: string, data: {
232:     title?: string,
233:     content?: string | null,
234:     videoUrl?: string | null,
235:     order?: number
236: }) {
237:     await checkAdmin()
238:     try {
239:         const updatedLesson = await prisma.lesson.update({
240:             where: { id: lessonId },
241:             data
242:         })
243:         // Revalidate các trang liên quan
244:         const lesson = await prisma.lesson.findUnique({
245:             where: { id: lessonId },
246:             select: { course: { select: { id_khoa: true } } }
247:         })
248:         if (lesson?.course?.id_khoa) {
249:             revalidatePath(`/courses/${lesson.course.id_khoa}/learn`)
250:         }
251:         return { success: true, lesson: updatedLesson }
252:     } catch (error: any) {
253:         console.error("Update Lesson Error:", error)
254:         return { success: false, error: error.message }
255:     }
256: }
````

## File: app/actions/auth-actions.ts
````typescript
 1: 'use server'
 2: import { z } from "zod"
 3: import prisma from "@/lib/prisma"
 4: import { Role } from "@prisma/client"
 5: import bcrypt from "bcryptjs"
 6: import { redirect } from "next/navigation"
 7: const registerSchema = z.object({
 8:     name: z.string().min(2, "Name must be at least 2 characters"),
 9:     email: z.string().email("Invalid email address"),
10:     phone: z.string().min(10, "Phone number must be at least 10 characters"),
11:     password: z.string().min(6, "Password must be at least 6 characters"),
12: })
13: export async function registerUser(prevState: any, formData: FormData) {
14:     const data = Object.fromEntries(formData.entries())
15:     const validatedFields = registerSchema.safeParse(data)
16:     if (!validatedFields.success) {
17:         return {
18:             message: "Invalid fields",
19:             errors: validatedFields.error.flatten().fieldErrors,
20:         }
21:     }
22:     const { name, email, phone, password } = validatedFields.data
23:     // Check if user exists
24:     const existingUser = await prisma.user.findFirst({
25:         where: {
26:             OR: [
27:                 { email },
28:                 { phone }
29:             ]
30:         }
31:     })
32:     if (existingUser) {
33:         return {
34:             message: "User already exists with this email or phone number",
35:         }
36:     }
37:     const hashedPassword = await bcrypt.hash(password, 10)
38:     try {
39:         const { getNextAvailableId } = await import("@/lib/id-helper")
40:         const { sendTelegram, sendWelcomeEmail } = await import("@/lib/notifications")
41:         const newId = await getNextAvailableId()
42:         const user = await prisma.user.create({
43:             data: {
44:                 id: newId, // Sử dụng ID đã tính toán (tránh số đẹp)
45:                 name,
46:                 email,
47:                 phone,
48:                 password: hashedPassword,
49:                 role: Role.STUDENT,
50:             },
51:         })
52:         // 1. Gửi Email chào mừng cho học viên
53:         await sendWelcomeEmail(email, name, user.id)
54:         // 2. Gửi thông báo Telegram cho Admin (Group REGISTER)
55:         const msgAdmin = `🆕 <b>HỌC VIÊN MỚI ĐĂNG KÝ</b>\n\n` +
56:                          `🆔 Mã số: <b>#${user.id}</b>\n` +
57:                          `👤 Họ tên: <b>${user.name}</b>\n` +
58:                          `📧 Email: ${user.email}\n` +
59:                          `📞 SĐT: ${user.phone}\n` +
60:                          `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
61:         await sendTelegram(msgAdmin, 'REGISTER');
62:     } catch (error) {
63:         console.error("Failed to create user:", error)
64:         return {
65:             message: "Database Error: Failed to create user. Please try again.",
66:         }
67:     }
68:     redirect('/login')
69: }
````

## File: app/actions/message-actions.ts
````typescript
 1: 'use server'
 2: import prisma from "@/lib/prisma"
 3: export async function getRandomMessage() {
 4:     const count = await prisma.message.count({ 
 5:         where: { isActive: true } 
 6:     })
 7:     if (count === 0) return null
 8:     const random = Math.floor(Math.random() * count)
 9:     return await prisma.message.findFirst({
10:         where: { isActive: true },
11:         skip: random
12:     })
13: }
14: export async function getAllMessages() {
15:     return await prisma.message.findMany({
16:         where: { isActive: true },
17:         orderBy: { createdAt: 'desc' }
18:     })
19: }
````

## File: app/login/page.tsx
````typescript
  1: 'use client'
  2: import { signIn } from "next-auth/react"
  3: import { useForm } from "react-hook-form"
  4: import { useState } from "react"
  5: import Link from "next/link"
  6: import { useRouter } from "next/navigation"
  7: import { Loader2, Eye, EyeOff } from "lucide-react"
  8: export default function LoginPage() {
  9:     const [isLoading, setIsLoading] = useState(false)
 10:     const [error, setError] = useState<string | null>(null)
 11:     const [showPassword, setShowPassword] = useState(false)
 12:     const router = useRouter()
 13:     const { register, handleSubmit, formState: { errors } } = useForm({
 14:         defaultValues: {
 15:             identifier: "",
 16:             password: ""
 17:         }
 18:     })
 19:     async function onSubmit(data: any) {
 20:         setIsLoading(true)
 21:         setError(null)
 22:         try {
 23:             const result = await signIn("credentials", {
 24:                 identifier: data.identifier,
 25:                 password: data.password,
 26:                 redirect: false,
 27:             })
 28:             if (result?.error) {
 29:                 setError("Invalid credentials. Please try again.")
 30:             } else {
 31:                 router.push("/")
 32:                 router.refresh()
 33:             }
 34:         } catch (err) {
 35:             setError("An unexpected error occurred.")
 36:         } finally {
 37:             setIsLoading(false)
 38:         }
 39:     }
 40:     const handleGoogleSignIn = () => {
 41:         setIsLoading(true)
 42:         signIn("google", { callbackUrl: "/" })
 43:     }
 44:     return (
 45:         <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4">
 46:             <div className="w-full max-w-sm">
 47:                 {/* Logo */}
 48:                 <div className="text-center mb-8">
 49:                     <h1 className="text-2xl font-black text-white tracking-tight">HỌC VIỆN BRK</h1>
 50:                     <p className="text-zinc-400 text-sm mt-1">Đăng nhập để tiếp tục hành trình</p>
 51:                 </div>
 52:                 <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
 53:                     {/* Google */}
 54:                     <button
 55:                         onClick={handleGoogleSignIn}
 56:                         disabled={isLoading}
 57:                         className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-600 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
 58:                     >
 59:                         <svg className="h-4 w-4 shrink-0" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" /></svg>
 60:                         Đăng nhập bằng Google
 61:                     </button>
 62:                     <div className="relative">
 63:                         <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700" /></div>
 64:                         <div className="relative flex justify-center text-xs"><span className="bg-transparent px-2 text-zinc-500">hoặc dùng tài khoản</span></div>
 65:                     </div>
 66:                     <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 67:                         {error && (
 68:                             <div className="rounded-lg bg-red-900/30 border border-red-700/50 p-3 text-sm text-red-400">{error}</div>
 69:                         )}
 70:                         <div>
 71:                             <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email / SĐT / Mã học viên</label>
 72:                             <input
 73:                                 {...register("identifier", { required: "Vui lòng nhập thông tin" })}
 74:                                 type="text"
 75:                                 autoComplete="username"
 76:                                 className="w-full rounded-xl border border-zinc-700 bg-white/5 px-4 py-3 text-white text-sm placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
 77:                                 placeholder="Nhập email hoặc mã học viên"
 78:                             />
 79:                             {errors.identifier && <p className="mt-1 text-xs text-red-400">{errors.identifier.message}</p>}
 80:                         </div>
 81:                         <div>
 82:                             <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mật khẩu</label>
 83:                             <div className="relative">
 84:                                 <input
 85:                                     {...register("password", { required: "Vui lòng nhập mật khẩu" })}
 86:                                     type={showPassword ? "text" : "password"}
 87:                                     autoComplete="current-password"
 88:                                     className="w-full rounded-xl border border-zinc-700 bg-white/5 px-4 py-3 pr-10 text-white text-sm placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
 89:                                     placeholder="••••••••"
 90:                                 />
 91:                                 <button
 92:                                     type="button"
 93:                                     onClick={() => setShowPassword(!showPassword)}
 94:                                     className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
 95:                                 >
 96:                                     {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
 97:                                 </button>
 98:                             </div>
 99:                             {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
100:                         </div>
101:                         <button
102:                             type="submit"
103:                             disabled={isLoading}
104:                             className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
105:                         >
106:                             {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Đăng nhập'}
107:                         </button>
108:                     </form>
109:                     <p className="text-center text-sm text-zinc-500">
110:                         Chưa có tài khoản?{' '}
111:                         <Link href="/register" className="font-semibold text-orange-400 hover:text-orange-300">Đăng ký ngay</Link>
112:                     </p>
113:                 </div>
114:             </div>
115:         </div>
116:     )
117: }
````

## File: components/course/ChatSection.tsx
````typescript
  1: 'use client'
  2: import { useState, useEffect, useRef, useMemo, useOptimistic, useTransition } from 'react'
  3: import { getCommentsByLesson, createComment } from '@/app/actions/comment-actions'
  4: import { Send, LogIn, Loader2, MessageCircle } from 'lucide-react'
  5: import Link from 'next/link'
  6: interface Comment {
  7:     id: number | string
  8:     content: string
  9:     createdAt: Date
 10:     userId: number
 11:     userName: string | null
 12:     userAvatar: string | null
 13:     sending?: boolean
 14: }
 15: interface ChatSectionProps {
 16:     lessonId: string
 17:     session: any
 18: }
 19: // Tách component nhỏ để tối ưu re-render
 20: const CommentItem = ({ comment }: { comment: Comment }) => {
 21:     const getInitials = (name: string | null) => {
 22:         if (!name) return '?'
 23:         return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
 24:     }
 25:     const formatTime = (date: Date) => {
 26:         return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
 27:     }
 28:     return (
 29:         <div className={`mb-3 group transition-opacity ${comment.sending ? 'opacity-50' : 'opacity-100'}`}>
 30:             <div className="flex gap-3">
 31:                 <div className="shrink-0">
 32:                     {comment.userAvatar ? (
 33:                         <img
 34:                             src={comment.userAvatar}
 35:                             alt={comment.userName || 'User'}
 36:                             className="w-8 h-8 rounded-full object-cover border border-zinc-800"
 37:                         />
 38:                     ) : (
 39:                         <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-black">
 40:                             {getInitials(comment.userName)}
 41:                         </div>
 42:                     )}
 43:                 </div>
 44:                 <div className="flex-1 min-w-0">
 45:                     <div className="flex items-baseline gap-2">
 46:                         <span className="text-sm font-semibold text-white">
 47:                             {comment.userName || 'Người dùng'}
 48:                         </span>
 49:                         <span className="text-[10px] text-zinc-500">
 50:                             {formatTime(comment.createdAt)}
 51:                         </span>
 52:                         {comment.sending && <span className="text-[9px] text-yellow-500 italic">Đang gửi...</span>}
 53:                     </div>
 54:                     <p className="text-[13px] italic text-zinc-300 mt-0.5 break-words leading-relaxed">
 55:                         {comment.content}
 56:                     </p>
 57:                 </div>
 58:             </div>
 59:         </div>
 60:     )
 61: }
 62: export default function ChatSection({ lessonId, session }: ChatSectionProps) {
 63:     const [comments, setComments] = useState<Comment[]>([])
 64:     const [loading, setLoading] = useState(true)
 65:     const [isPending, startTransition] = useTransition()
 66:     const [newComment, setNewComment] = useState('')
 67:     const [error, setError] = useState('')
 68:     const commentsEndRef = useRef<HTMLDivElement>(null)
 69:     // Optimistic UI: Hiển thị ngay lập tức khi nhấn gửi
 70:     const [optimisticComments, addOptimisticComment] = useOptimistic(
 71:         comments,
 72:         (state: Comment[], newItem: Comment) => [...state, newItem]
 73:     )
 74:     // Cache comments theo lessonId
 75:     const commentCache = useRef<Map<string, Comment[]>>(new Map())
 76:     useEffect(() => {
 77:         if (commentCache.current.has(lessonId)) {
 78:             setComments(commentCache.current.get(lessonId)!)
 79:             setLoading(false)
 80:             return
 81:         }
 82:         setLoading(true)
 83:         getCommentsByLesson(lessonId).then(data => {
 84:             const mapped = data.map((c: any) => ({
 85:                 ...c,
 86:                 createdAt: new Date(c.createdAt)
 87:             })) as Comment[]
 88:             commentCache.current.set(lessonId, mapped)
 89:             setComments(mapped)
 90:             setLoading(false)
 91:         })
 92:     }, [lessonId])
 93:     useEffect(() => {
 94:         commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
 95:     }, [optimisticComments])
 96:     async function handleSendComment(e: React.FormEvent) {
 97:         e.preventDefault()
 98:         const content = newComment.trim()
 99:         if (!content || !session?.user) return
100:         setNewComment('')
101:         setError('')
102:         // 1. Tạo bản tin nhắn tạm thời (Optimistic)
103:         const tempId = Date.now().toString()
104:         const tempComment: Comment = {
105:             id: tempId,
106:             content: content,
107:             createdAt: new Date(),
108:             userId: parseInt(session.user.id),
109:             userName: session.user.name || session.user.studentId || 'Bạn',
110:             userAvatar: session.user.image || null,
111:             sending: true
112:         }
113:         // 2. Cập nhật UI ngay lập tức
114:         startTransition(async () => {
115:             addOptimisticComment(tempComment)
116:             // 3. Gọi server action
117:             const result = await createComment(lessonId, content)
118:             if (result.success && result.comment) {
119:                 const newEntry = {
120:                     ...result.comment,
121:                     createdAt: new Date(result.comment.createdAt)
122:                 } as Comment
123:                 // 4. Cập nhật state chính thức sau khi server trả về
124:                 setComments(prev => {
125:                     const updated = [...prev, newEntry]
126:                     commentCache.current.set(lessonId, updated)
127:                     return updated
128:                 })
129:             } else {
130:                 setError(result.message || 'Gửi thất bại. Vui lòng thử lại.')
131:             }
132:         })
133:     }
134:     const groupedComments = useMemo(() => {
135:         const map: Record<string, Comment[]> = {}
136:         optimisticComments.forEach(comment => {
137:             const dateKey = new Date(comment.createdAt).toDateString()
138:             if (!map[dateKey]) map[dateKey] = []
139:             map[dateKey].push(comment)
140:         })
141:         return map
142:     }, [optimisticComments])
143:     const formatDate = (dateKey: string) => {
144:         const date = new Date(dateKey)
145:         const today = new Date()
146:         if (date.toDateString() === today.toDateString()) return 'Hôm nay'
147:         const yesterday = new Date(today)
148:         yesterday.setDate(yesterday.getDate() - 1)
149:         if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua'
150:         return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
151:     }
152:     return (
153:         <div className="flex flex-col h-full bg-zinc-950">
154:             <div className="shrink-0 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
155:                 <h3 className="text-sm font-semibold text-white flex items-center gap-2">
156:                     <MessageCircle className="h-4 w-4 text-yellow-400" />
157:                     Tương tác
158:                     <span className="text-zinc-500 font-normal text-xs">({optimisticComments.length})</span>
159:                 </h3>
160:             </div>
161:             <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
162:                 {loading ? (
163:                     <div className="flex flex-col items-center justify-center py-12 gap-3">
164:                         <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
165:                         <span className="text-xs text-zinc-500">Đang tải nội dung...</span>
166:                     </div>
167:                 ) : optimisticComments.length === 0 ? (
168:                     <div className="flex flex-col items-center justify-center py-12 text-center">
169:                         <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
170:                             <MessageCircle className="h-6 w-6 text-zinc-700" />
171:                         </div>
172:                         <p className="text-zinc-500 text-sm font-medium">Chưa có bình luận nào</p>
173:                         <p className="text-zinc-600 text-xs mt-1">Hãy là người đầu tiên bắt đầu cuộc trò chuyện!</p>
174:                     </div>
175:                 ) : (
176:                     Object.entries(groupedComments).map(([dateKey, dateComments]) => (
177:                         <div key={dateKey} className="mb-6">
178:                             <div className="flex items-center gap-4 mb-4">
179:                                 <div className="h-px flex-1 bg-zinc-800/50"></div>
180:                                 <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
181:                                     {formatDate(dateKey)}
182:                                 </span>
183:                                 <div className="h-px flex-1 bg-zinc-800/50"></div>
184:                             </div>
185:                             {dateComments.map(comment => (
186:                                 <CommentItem key={comment.id} comment={comment} />
187:                             ))}
188:                         </div>
189:                     ))
190:                 )}
191:                 <div ref={commentsEndRef} className="h-4" />
192:             </div>
193:             <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/80 p-3 backdrop-blur-md">
194:                 {session?.user ? (
195:                     <form onSubmit={handleSendComment} className="relative flex items-center">
196:                         <input
197:                             type="text"
198:                             value={newComment}
199:                             onChange={(e) => setNewComment(e.target.value)}
200:                             placeholder="Nhập nội dung tương tác..."
201:                             className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl pl-4 pr-12 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
202:                             disabled={isPending}
203:                         />
204:                         <button
205:                             type="submit"
206:                             disabled={!newComment.trim() || isPending}
207:                             className="absolute right-1.5 w-8 h-8 rounded-xl bg-yellow-400 text-black flex items-center justify-center disabled:opacity-30 disabled:grayscale hover:bg-yellow-300 transition-all active:scale-90"
208:                         >
209:                             {isPending ? (
210:                                 <Loader2 className="h-4 w-4 animate-spin" />
211:                             ) : (
212:                                 <Send className="h-4 w-4" />
213:                             )}
214:                         </button>
215:                     </form>
216:                 ) : (
217:                     <div className="bg-zinc-800/50 rounded-xl py-3 px-4 border border-zinc-700/50 text-center">
218:                         <Link
219:                             href="/login"
220:                             className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
221:                         >
222:                             <LogIn className="h-4 w-4" />
223:                             Đăng nhập để tham gia tương tác
224:                         </Link>
225:                     </div>
226:                 )}
227:                 {error && (
228:                     <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mt-2">
229:                         <p className="text-red-400 text-[10px] text-center font-medium">{error}</p>
230:                     </div>
231:                 )}
232:             </div>
233:         </div>
234:     )
235: }
````

## File: components/course/LessonSidebar.tsx
````typescript
  1: 'use client'
  2: import { useState } from 'react'
  3: import { cn } from "@/lib/utils"
  4: import { CheckCircle2, PlayCircle, Lock, CalendarDays, RefreshCw } from "lucide-react"
  5: interface Lesson {
  6:     id: string
  7:     title: string
  8:     order: number
  9: }
 10: interface LessonSidebarProps {
 11:     lessons: Lesson[]
 12:     currentLessonId: string
 13:     onLessonSelect: (lessonId: string) => void
 14:     progress: Record<string, any>
 15:     startedAt: Date | null
 16:     resetAt: Date | null
 17:     onResetStartDate: (date: Date) => Promise<void>
 18: }
 19: function formatDateVN(date: Date | null) {
 20:     if (!date) return ''
 21:     return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
 22: }
 23: // Chuyển Date → string cho input (yyyy-MM-dd)
 24: function toInputValue(date: Date | null): string {
 25:     if (!date) return ''
 26:     const d = new Date(date)
 27:     return d.toISOString().slice(0, 10)
 28: }
 29: function isLessonUnlocked(lesson: Lesson, lessons: Lesson[], progress: Record<string, any>) {
 30:     if (lesson.order === 1) return true
 31:     const prev = lessons.find(l => l.order === lesson.order - 1)
 32:     if (!prev) return true
 33:     const p = progress[prev.id]
 34:     return p?.status === 'COMPLETED' && (p?.totalScore ?? 0) >= 5
 35: }
 36: export default function LessonSidebar({
 37:     lessons, currentLessonId, onLessonSelect, progress, startedAt, resetAt, onResetStartDate
 38: }: LessonSidebarProps) {
 39:     const [showDatePicker, setShowDatePicker] = useState(false)
 40:     const [dateInput, setDateInput] = useState(toInputValue(startedAt))
 41:     const [saving, setSaving] = useState(false)
 42:     // Lọc progress chỉ hiển thị các bài học không bị reset (lộ trình hiện tại)
 43:     const filteredProgress = Object.entries(progress).reduce((acc, [lessonId, p]: [string, any]) => {
 44:         // Chỉ hiển thị progress không có status RESET
 45:         if (p.status !== 'RESET') {
 46:             acc[lessonId] = p
 47:         }
 48:         return acc
 49:     }, {} as Record<string, any>)
 50:     const handleReset = async () => {
 51:         if (!dateInput) return
 52:         // Hiển thị cảnh báo trước khi reset
 53:         const confirmReset = window.confirm(
 54:             "⚠️ Cảnh báo: Dữ liệu học tập cũ sẽ không được tính vào lộ trình mới.\n\n" +
 55:             "Bạn sẽ bắt đầu lại từ bài 1. Tiến trình cũ vẫn lưu trong hệ thống để admin xem lại.\n\n" +
 56:             "Nhấn OK để xác nhận đổi ngày bắt đầu mới."
 57:         )
 58:         if (!confirmReset) return
 59:         setSaving(true)
 60:         try {
 61:             await onResetStartDate(new Date(dateInput))
 62:             setShowDatePicker(false)
 63:         } finally {
 64:             setSaving(false)
 65:         }
 66:     }
 67:     return (
 68:         <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-80 shrink-0">
 69:             {/* ── Ngày bắt đầu block ── */}
 70:             <div className="p-4 border-b border-zinc-800 space-y-2">
 71:                 <div className="flex items-center justify-between">
 72:                     <div className="flex items-center gap-2 text-zinc-300">
 73:                         <CalendarDays className="w-4 h-4 text-orange-400 shrink-0" />
 74:                         <div>
 75:                             <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Ngày bắt đầu lộ trình</p>
 76:                             <p className="text-sm font-semibold text-white leading-tight">
 77:                                 {startedAt ? formatDateVN(startedAt) : '-- / -- / ----'}
 78:                             </p>
 79:                         </div>
 80:                     </div>
 81:                     <button
 82:                         onClick={() => setShowDatePicker(!showDatePicker)}
 83:                         className="flex items-center gap-1 text-[11px] text-orange-400 border border-orange-500/40 hover:border-orange-400 rounded-lg px-2 py-1 transition-colors"
 84:                     >
 85:                         <RefreshCw className="w-3 h-3" />
 86:                         Đặt lại
 87:                     </button>
 88:                 </div>
 89:                 {showDatePicker && (
 90:                     <div className="bg-zinc-800 rounded-lg p-3 space-y-2 border border-zinc-700">
 91:                         <p className="text-[10px] text-zinc-400">Chọn ngày mới (dd/mm/yyyy):</p>
 92:                         <input
 93:                             type="date"
 94:                             value={dateInput}
 95:                             onChange={e => setDateInput(e.target.value)}
 96:                             className="w-full bg-zinc-700 text-white text-sm rounded-lg px-3 py-2 border border-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
 97:                         />
 98:                         <div className="flex gap-2">
 99:                             <button
100:                                 onClick={handleReset}
101:                                 disabled={!dateInput || saving}
102:                                 className="flex-1 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 disabled:opacity-50 transition-colors"
103:                             >
104:                                 {saving ? 'Đang lưu...' : 'Xác nhận'}
105:                             </button>
106:                             <button
107:                                 onClick={() => setShowDatePicker(false)}
108:                                 className="flex-1 text-xs text-zinc-400 hover:text-white border border-zinc-600 rounded-lg py-1.5 transition-colors"
109:                             >
110:                                 Hủy
111:                             </button>
112:                         </div>
113:                     </div>
114:                 )}
115:             </div>
116:             {/* ── Tiêu đề danh sách ── */}
117:             <div className="px-4 py-2 border-b border-zinc-800">
118:                 <h2 className="font-bold text-sm text-zinc-400 uppercase tracking-wide">Nội dung khóa học</h2>
119:             </div>
120:             {/* ── Danh sách bài ── */}
121:             <div className="flex-1 overflow-y-auto">
122:                 {lessons.map((lesson) => {
123:                     const prog = filteredProgress[lesson.id]
124:                     const isCompleted = prog?.status === 'COMPLETED'
125:                     const isActive = currentLessonId === lesson.id
126:                     const unlocked = isLessonUnlocked(lesson, lessons, filteredProgress)
127:                     return (
128:                         <button
129:                             key={lesson.id}
130:                             onClick={() => unlocked && onLessonSelect(lesson.id)}
131:                             disabled={!unlocked}
132:                             title={!unlocked ? 'Hoàn thành bài trước ≥5đ để mở khóa' : undefined}
133:                             className={cn(
134:                                 "w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-zinc-800/50",
135:                                 isActive && "bg-zinc-800 border-l-2 border-l-orange-500",
136:                                 unlocked && !isActive && "hover:bg-zinc-800/50",
137:                                 !unlocked && "opacity-40 cursor-not-allowed"
138:                             )}
139:                         >
140:                             <div className="shrink-0">
141:                                 {isCompleted ? (
142:                                     <CheckCircle2 className="w-5 h-5 text-emerald-500" />
143:                                 ) : isActive ? (
144:                                     <PlayCircle className="w-5 h-5 text-orange-400" />
145:                                 ) : !unlocked ? (
146:                                     <Lock className="w-4 h-4 text-zinc-600" />
147:                                 ) : (
148:                                     <div className="w-5 h-5 rounded-full border-2 border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500">
149:                                         {lesson.order}
150:                                     </div>
151:                                 )}
152:                             </div>
153:                             <div className="flex-1 min-w-0">
154:                                 <p className={cn("text-sm font-medium line-clamp-2", isActive ? "text-white" : "text-zinc-400")}>
155:                                     {lesson.title}
156:                                 </p>
157:                                 {prog?.totalScore !== undefined && (
158:                                     <span className={cn("text-[10px] font-bold", prog.totalScore >= 5 ? "text-emerald-500" : "text-orange-400")}>
159:                                         {prog.totalScore >= 5 ? '✓' : '✗'} {prog.totalScore}/10đ
160:                                     </span>
161:                                 )}
162:                             </div>
163:                         </button>
164:                     )
165:                 })}
166:             </div>
167:         </div>
168:     )
169: }
````

## File: lib/id-helper.ts
````typescript
 1: import prisma from './prisma'
 2: /**
 3:  * Lấy ID tiếp theo khả dụng cho User mới.
 4:  * Logic:
 5:  * 1. Lấy Max ID hiện tại.
 6:  * 2. Tăng dần (+1).
 7:  * 3. Kiểm tra xem ID đó có nằm trong bảng ReservedId không.
 8:  * 4. Nếu có -> +1 tiếp. Nếu không -> Trả về.
 9:  */
10: export async function getNextAvailableId(): Promise<number> {
11:     // 1. Lấy danh sách ID đặc biệt
12:     const reservedIds = await prisma.reservedId.findMany({
13:         select: { id: true }
14:     })
15:     const reservedIdList = reservedIds.map((r: any) => r.id)
16:     // 2. Lấy User có ID lớn nhất mà KHÔNG nằm trong danh sách đặc biệt
17:     const maxNormalUser = await prisma.user.findFirst({
18:         where: {
19:             id: {
20:                 notIn: reservedIdList
21:             }
22:         },
23:         orderBy: { id: 'desc' },
24:         select: { id: true }
25:     })
26:     let nextId = (maxNormalUser?.id || 0) + 1
27:     while (true) {
28:         // Kiểm tra xem nextId có bị reserve không
29:         const isReserved = await prisma.reservedId.findUnique({
30:             where: { id: nextId }
31:         })
32:         if (!isReserved) {
33:             // Nếu không bị reserve -> Kiểm tra lại trong bảng User cho chắc chắn (Double check)
34:             const existingUser = await prisma.user.findUnique({ where: { id: nextId } })
35:             if (!existingUser) {
36:                 return nextId
37:             }
38:         }
39:         // Nếu bị reserve hoặc đã tồn tại -> Thử số tiếp theo
40:         nextId++
41:     }
42: }
````

## File: app/api/cron/gmail-watch/route.ts
````typescript
 1: import { NextRequest, NextResponse } from 'next/server';
 2: import { google } from 'googleapis';
 3: import { processPaymentEmails } from '@/lib/auto-verify';
 4: export const runtime = "nodejs";
 5: export async function GET(req: NextRequest) {
 6:   console.log('🚀 Bắt đầu chạy Cron Job quét email...');
 7:   // 1. Kiểm tra Header bảo mật
 8:   const authHeader = req.headers.get('authorization');
 9:   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
10:     console.error('❌ Lỗi: Unauthorized - Sai CRON_SECRET');
11:     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
12:   }
13:   // 2. Kiểm tra các biến môi trường thiết yếu
14:   const requiredEnv = [
15:     'GMAIL_CLIENT_ID', 
16:     'GMAIL_CLIENT_SECRET', 
17:     'GMAIL_REFRESH_TOKEN', 
18:     'GCP_PROJECT_ID'
19:   ];
20:   const missingEnv = requiredEnv.filter(key => !process.env[key]);
21:   if (missingEnv.length > 0) {
22:     const errorMsg = `Thiếu biến môi trường: ${missingEnv.join(', ')}`;
23:     console.error(`❌ ${errorMsg}`);
24:     return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
25:   }
26:   try {
27:     const oAuth2Client = new google.auth.OAuth2(
28:       process.env.GMAIL_CLIENT_ID,
29:       process.env.GMAIL_CLIENT_SECRET,
30:       'http://localhost'
31:     );
32:     oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
33:     const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
34:     console.log(`📡 Đang gọi Gmail Watch cho dự án: ${process.env.GCP_PROJECT_ID}`);
35:     // 3. Gia hạn Watch
36:     const watchResponse = await gmail.users.watch({
37:       userId: 'me',
38:       requestBody: {
39:         topicName: `projects/${process.env.GCP_PROJECT_ID}/topics/gmail-notifications`,
40:         labelIds: ['INBOX'],
41:       },
42:     });
43:     console.log('📧 Đang tiến hành quét email giao dịch...');
44:     // 4. Quét mail mới
45:     const scanResult = await processPaymentEmails();
46:     console.log('✅ Cron Job hoàn thành thành công!');
47:     return NextResponse.json({ 
48:       success: true, 
49:       watch: watchResponse.data,
50:       scan: scanResult 
51:     });
52:   } catch (error: any) {
53:     // IN LỖI CHI TIẾT RA CONSOLE ĐỂ KIỂM TRA TRÊN VERCEL LOGS
54:     console.error('❌ LỖI CRON JOB CHI TIẾT:', {
55:       message: error.message,
56:       stack: error.stack,
57:       response: error.response?.data || 'No response data'
58:     });
59:     return NextResponse.json({ 
60:       success: false, 
61:       error: error.message,
62:       details: error.response?.data || undefined
63:     }, { status: 500 });
64:   }
65: }
````

## File: app/globals.css
````css
 1: @import "tailwindcss";
 2: :root {
 3:   --background: #ffffff;
 4:   --foreground: #171717;
 5: }
 6: @keyframes glow {
 7:   0%,
 8:   100% {
 9:     text-shadow: 0 0 10px #facc15, 0 0 20px #facc15, 2px 2px 0px #854d0e;
10:   }
11:   50% {
12:     text-shadow: 0 0 20px #fde047, 0 0 35px #fde047, 2px 2px 0px #854d0e;
13:   }
14: }
15: .text-glow-3d {
16:   animation: glow 3s ease-in-out infinite;
17:   color: #facc15;
18:   letter-spacing: 0.1em;
19: }
20: @media (prefers-color-scheme: dark) {
21:   :root {
22:     --background: #0a0a0a;
23:     --foreground: #ededed;
24:   }
25: }
26: body {
27:   background: var(--background);
28:   color: var(--foreground);
29:   font-family: var(--font-be-vietnam-pro), ui-sans-serif, system-ui, sans-serif;
30: }
31: /* ============================= */
32: /* GOOGLE DOCS CONTENT FIX */
33: /* ============================= */
34: /* Ảnh responsive + zoom UX */
35: .prose img {
36:   width: 100% !important;
37:   max-width: 100% !important;
38:   height: auto !important;
39:   display: block;
40:   margin: 1em auto;
41:   cursor: zoom-in;
42:   transition: transform 0.2s ease;
43:   user-select: none;
44: }
45: .prose img:hover {
46:   transform: scale(1.02);
47: }
48: /* Table không tràn ngang */
49: .prose table {
50:   width: 100% !important;
51:   display: block;
52:   overflow-x: auto;
53: }
54: /* Reset container Google Docs nhưng KHÔNG phá layout */
55: .prose div {
56:   max-width: 100% !important;
57: }
58: /* Chuẩn hóa khoảng cách văn bản */
59: .prose p {
60:   margin-top: 0.6em !important;
61:   margin-bottom: 0.6em !important;
62: }
63: .prose h1,
64: .prose h2,
65: .prose h3 {
66:   margin-top: 1.4em !important;
67:   margin-bottom: 0.7em !important;
68: }
````

## File: lib/auto-verify.ts
````typescript
  1: import { google } from 'googleapis';
  2: import prisma from '@/lib/prisma';
  3: import { sendTelegramAdmin, sendSuccessEmail } from './notifications';
  4: function extractTextFromHtml(html: string): string {
  5: // ... (giữ nguyên hàm này)
  6:   return html
  7:     .replace(/<[^>]+>/g, ' ')
  8:     .replace(/&nbsp;/g, ' ')
  9:     .replace(/&amp;/g, '&')
 10:     .replace(/&lt;/g, '<')
 11:     .replace(/&gt;/g, '>')
 12:     .replace(/&quot;/g, '"')
 13:     .replace(/\s+/g, ' ')
 14:     .trim();
 15: }
 16: function parseSacombankEmail(htmlContent: string) {
 17: // ... (giữ nguyên hàm này)
 18:   const text = extractTextFromHtml(htmlContent);
 19:   const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i);
 20:   const description = contentMatch ? contentMatch[1].trim() : '';
 21:   const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i);
 22:   const userIdMatch = description.match(/HV[\s\._]*(\d+)/i);
 23:   const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i);
 24:   const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i);
 25:   let amount = 0;
 26:   if (amountMatch) {
 27:     const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '');
 28:     amount = parseInt(amountStr) || 0;
 29:   }
 30:   return {
 31:     phone: phoneMatch ? phoneMatch[1] : null,
 32:     userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
 33:     courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
 34:     amount: amount,
 35:     content: description,
 36:   };
 37: }
 38: export async function processPaymentEmails() {
 39:   const oAuth2Client = new google.auth.OAuth2(
 40:     process.env.GMAIL_CLIENT_ID,
 41:     process.env.GMAIL_CLIENT_SECRET,
 42:     'http://localhost'
 43:   );
 44:   oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
 45:   const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
 46:   const response = await gmail.users.messages.list({
 47:     userId: 'me',
 48:     q: 'from:info@sacombank.com.vn "thong bao giao dich" is:unread',
 49:     maxResults: 10
 50:   });
 51:   const messages = response.data.messages || [];
 52:   if (messages.length === 0) return { processed: 0, matched: 0 };
 53:   let matchedCount = 0;
 54:   const pendingEnrollments = await prisma.enrollment.findMany({
 55:     where: { status: 'PENDING' },
 56:     include: {
 57:       course: { select: { id_khoa: true, phi_coc: true, name_lop: true } },
 58:       user: { select: { id: true, name: true, phone: true, email: true } }
 59:     }
 60:   });
 61:   for (const msg of messages) {
 62:     const message = await gmail.users.messages.get({ userId: 'me', id: msg.id || '', format: 'full' });
 63:     let body = '';
 64:     const payload = message.data.payload;
 65:     if (payload?.body?.data) {
 66:       body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
 67:     } else if (payload?.parts) {
 68:       for (const part of payload.parts) {
 69:         if (part.mimeType === 'text/html' && part.body?.data) {
 70:           body = Buffer.from(part.body.data, 'base64').toString('utf-8');
 71:           break;
 72:         }
 73:       }
 74:     }
 75:     const parsed = parseSacombankEmail(body);
 76:     for (const enrollment of pendingEnrollments) {
 77:       const userPhone = enrollment.user.phone?.replace(/\D/g, '') || '';
 78:       const emailPhone = parsed.phone || '';
 79:       const userIdMatch = parsed.userId && parsed.userId === enrollment.userId;
 80:       const phoneMatch = userPhone && emailPhone && userPhone.includes(emailPhone);
 81:       const courseCodeMatch = parsed.courseCode && enrollment.course.id_khoa.toUpperCase().includes(parsed.courseCode);
 82:       const amountMatch = parsed.amount >= enrollment.course.phi_coc;
 83:       if (((parsed.userId ? userIdMatch : phoneMatch) && courseCodeMatch && amountMatch)) {
 84:         await prisma.payment.update({
 85:           where: { enrollmentId: enrollment.id },
 86:           data: {
 87:             amount: parsed.amount, phone: parsed.phone, content: parsed.content,
 88:             bankName: 'Sacombank', status: 'VERIFIED', verifiedAt: new Date(), verifyMethod: 'AUTO_EMAIL'
 89:           }
 90:         });
 91:         await prisma.enrollment.update({
 92:           where: { id: enrollment.id },
 93:           data: { status: 'ACTIVE' }
 94:         });
 95:         await gmail.users.messages.modify({
 96:           userId: 'me', id: msg.id || '',
 97:           requestBody: { removeLabelIds: ['UNREAD'] }
 98:         });
 99:         // Gửi thông báo Telegram cho Admin
100:         const msgAdmin = `✅ <b>KÍCH HOẠT TỰ ĐỘNG THÀNH CÔNG</b>\n\n` +
101:                          `👤 Học viên: <b>${enrollment.user.name}</b>\n` +
102:                          `📞 SĐT: ${enrollment.user.phone}\n` +
103:                          `🎓 Khóa học: <b>${enrollment.course.name_lop} (${enrollment.course.id_khoa})</b>\n` +
104:                          `💰 Số tiền: ${parsed.amount.toLocaleString()}đ\n` +
105:                          `🏦 Ngân hàng: Sacombank\n` +
106:                          `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
107:         await sendTelegramAdmin(msgAdmin);
108:         // Gửi email cho học viên
109:         if (enrollment.user.email) {
110:           const { sendActivationEmail } = await import("./notifications");
111:           await sendActivationEmail(
112:             enrollment.user.email,
113:             enrollment.user.name || 'Bạn',
114:             enrollment.user.id,
115:             enrollment.course.name_lop || enrollment.course.id_khoa,
116:             null
117:           );
118:         }
119:         matchedCount++;
120:       }
121:     }
122:   }
123:   return { processed: messages.length, matched: matchedCount };
124: }
````

## File: lib/prisma.ts
````typescript
 1: import { PrismaClient } from "@prisma/client";
 2: const globalForPrisma = globalThis as unknown as {
 3:   prisma: PrismaClient | undefined;
 4: };
 5: const prisma =
 6:   globalForPrisma.prisma ??
 7:   new PrismaClient({
 8:     log: ["error"],
 9:   });
10: if (process.env.NODE_ENV !== "production") {
11:   globalForPrisma.prisma = prisma;
12: }
13: export default prisma;
````

## File: app/admin/layout.tsx
````typescript
 1: import { auth } from "@/auth"
 2: import { Role } from "@prisma/client"
 3: import { redirect } from "next/navigation"
 4: import Link from 'next/link'
 5: export default async function AdminLayout({
 6:     children,
 7: }: {
 8:     children: React.ReactNode
 9: }) {
10:     const session = await auth()
11:     if (!session?.user) redirect("/login")
12:     if (session.user.role !== Role.ADMIN) {
13:         return <div className="p-10 text-center text-red-600 font-bold">403 - KHÔNG CÓ QUYỀN TRUY CẬP</div>
14:     }
15:     const menuItems = [
16:         { label: 'Thanh toán', href: '/admin/payments', icon: '💰' },
17:         { label: 'Thành viên', href: '/admin/students', icon: '👥' },
18:         { label: 'Khóa học', href: '/admin/courses', icon: '📘' },
19:         { label: 'Bảng tin', href: '/admin/posts', icon: '📰' },
20:         { label: 'Số đẹp', href: '/admin/reserved-ids', icon: '💎' },
21:     ]
22:     return (
23:         <div className="min-h-screen flex flex-col bg-gray-50">
24:             {/* Header Cố định trên cùng */}
25:             <header className="sticky top-0 z-[100] bg-black text-white p-4 shadow-xl">
26:                 <div className="flex justify-between items-center max-w-5xl mx-auto">
27:                     <h1 className="text-sm font-black tracking-widest text-yellow-400 uppercase">Admin BRK</h1>
28:                     <Link href="/" className="text-[10px] font-black bg-white/10 px-3 py-1.5 rounded-lg uppercase">Thoát</Link>
29:                 </div>
30:             </header>
31:             {/* Menu Di động - Hiển thị trên cùng dưới Header, dạng nút bấm rõ ràng */}
32:             <nav className="sticky top-[52px] z-[90] bg-white border-b border-gray-200 p-2 overflow-x-auto no-scrollbar flex gap-2 md:hidden shadow-sm">
33:                 {menuItems.map((item) => (
34:                     <a 
35:                         key={item.href} 
36:                         href={item.href}
37:                         className="flex-none flex items-center gap-1.5 px-4 py-2 bg-gray-100 rounded-xl text-[10px] font-black uppercase text-gray-600 active:bg-black active:text-yellow-400 transition-all"
38:                     >
39:                         <span>{item.icon}</span>
40:                         {item.label}
41:                     </a>
42:                 ))}
43:             </nav>
44:             <div className="flex flex-1 max-w-5xl mx-auto w-full">
45:                 {/* Sidebar Máy tính */}
46:                 <aside className="hidden md:block w-64 p-6 border-r border-gray-200 bg-white">
47:                     <nav className="space-y-2 sticky top-24">
48:                         {menuItems.map((item) => (
49:                             <a 
50:                                 key={item.href}
51:                                 href={item.href}
52:                                 className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-100 font-bold text-gray-600 text-sm transition-all"
53:                             >
54:                                 <span className="text-xl">{item.icon}</span>
55:                                 {item.label}
56:                             </a>
57:                         ))}
58:                     </nav>
59:                 </aside>
60:                 {/* Nội dung chính */}
61:                 <main className="flex-1 p-4 md:p-8">
62:                     {children}
63:                 </main>
64:             </div>
65:         </div>
66:     )
67: }
````

## File: app/layout.tsx
````typescript
 1: import type { Metadata } from "next";
 2: import { Be_Vietnam_Pro, Inter } from "next/font/google";
 3: import "./globals.css";
 4: const beVietnamPro = Be_Vietnam_Pro({
 5:   weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
 6:   subsets: ["vietnamese", "latin"],
 7:   variable: "--font-be-vietnam-pro",
 8: });
 9: const inter = Inter({
10:   subsets: ["vietnamese", "latin"],
11:   variable: "--font-inter",
12: });
13: export const metadata: Metadata = {
14:   title: "Học Viện BRK - Nâng Tầm Năng Lực",
15:   description: "Học viện đào tạo thực chiến về AI, Nhân hiệu và Affiliate",
16: };
17: export default function RootLayout({
18:   children,
19: }: Readonly<{
20:   children: React.ReactNode;
21: }>) {
22:   return (
23:     <html lang="vi" suppressHydrationWarning>
24:       <body
25:         className={`${beVietnamPro.variable} ${inter.variable} antialiased`}
26:         suppressHydrationWarning
27:       >
28:         {children}
29:       </body>
30:     </html>
31:   );
32: }
````

## File: auth.ts
````typescript
  1: import NextAuth from "next-auth"
  2: import Credentials from "next-auth/providers/credentials"
  3: import Google from "next-auth/providers/google"
  4: import { z } from "zod"
  5: import prisma from "@/lib/prisma"
  6: import { PrismaAdapter } from "@auth/prisma-adapter"
  7: import { Role } from "@prisma/client"
  8: import bcrypt from "bcryptjs"
  9: import { authConfig } from "./auth.config"
 10: export const { handlers, signIn, signOut, auth } = NextAuth({
 11:     ...authConfig,
 12:     // Sử dụng 'as any' để giải quyết xung đột Type hệ thống
 13:     adapter: PrismaAdapter(prisma) as any, 
 14:     session: { strategy: "jwt" },
 15:     providers: [
 16:         Google({
 17:             clientId: process.env.GOOGLE_CLIENT_ID,
 18:             clientSecret: process.env.GOOGLE_CLIENT_SECRET,
 19:             allowDangerousEmailAccountLinking: true,
 20:         }),
 21:         Credentials({
 22:             credentials: {
 23:                 identifier: { label: "Student ID / Email / Phone", type: "text" },
 24:                 password: { label: "Password", type: "password" },
 25:             },
 26:             authorize: async (credentials) => {
 27:                 const parsedCredentials = z
 28:                     .object({ identifier: z.string(), password: z.string() })
 29:                     .safeParse(credentials)
 30:                 if (!parsedCredentials.success) return null;
 31:                 const { identifier, password } = parsedCredentials.data
 32:                 const isNumeric = /^\d+$/.test(identifier);
 33:                 const isEmail = identifier.includes("@");
 34:                 // Tìm kiếm người dùng 1 lần duy nhất
 35:                 const user = await prisma.user.findFirst({
 36:                     where: {
 37:                         OR: [
 38:                             ...(isNumeric ? [{ id: parseInt(identifier) }, { phone: identifier }] : []),
 39:                             ...(isEmail ? [{ email: identifier }] : []),
 40:                             ...(!isNumeric && !isEmail ? [{ phone: identifier }] : [])
 41:                         ]
 42:                     }
 43:                 });
 44:                 if (!user || !user.password) return null;
 45:                 const passwordsMatch = await bcrypt.compare(password, user.password);
 46:                 if (passwordsMatch) {
 47:                     return {
 48:                         id: user.id.toString(),
 49:                         name: user.name,
 50:                         email: user.email,
 51:                         role: user.role,
 52:                         image: user.image,
 53:                     };
 54:                 }
 55:                 return null;
 56:             },
 57:         }),
 58:     ],
 59:     callbacks: {
 60:         async jwt({ token, user, trigger, session }) {
 61:             // Sử dụng trường 'sub' làm định danh chuẩn của JWT
 62:             if (user) {
 63:                 token.sub = user.id;
 64:                 token.role = (user as any).role;
 65:             }
 66:             // Cập nhật khi có tín hiệu update chủ động
 67:             if (trigger === "update" && session?.role) {
 68:                 token.role = session.role;
 69:             }
 70:             return token;
 71:         },
 72:         async session({ session, token }) {
 73:             // Map từ 'sub' của token ngược lại 'id' của session cho đồng bộ UI
 74:             if (token.sub && session.user) {
 75:                 session.user.id = token.sub;
 76:                 session.user.role = token.role as Role;
 77:             }
 78:             return session;
 79:         }
 80:     },
 81:     pages: {
 82:         signIn: '/login',
 83:     },
 84:     events: {
 85:         async signIn({ user, account }) {
 86:             console.log(`🔐 Sự kiện signIn kích hoạt cho user: ${user.email}, Provider: ${account?.provider}`);
 87:             if (user && (account?.provider === 'credentials' || account?.provider === 'google')) {
 88:                 try {
 89:                     const { headers } = await import("next/headers");
 90:                     const headerList = await headers();
 91:                     const ip = headerList.get('x-forwarded-for')?.split(',')[0] || 
 92:                                headerList.get('x-real-ip') || 
 93:                                '127.0.0.1';
 94:                     const userAgent = headerList.get('user-agent') || 'Unknown';
 95:                     console.log(`📡 Đang gửi thông báo đăng nhập cho #${user.id} từ IP: ${ip}`);
 96:                     const { sendLoginNotification } = await import("@/lib/notifications");
 97:                     // BẮT BUỘC dùng await trên Vercel để tránh function bị đóng sớm
 98:                     await sendLoginNotification(user, ip, userAgent);
 99:                     console.log(`✅ Đã xử lý xong thông báo đăng nhập.`);
100:                 } catch (error: any) {
101:                     console.error("❌ Lỗi trong sự kiện signIn:", error.message);
102:                 }
103:             }
104:         }
105:     }
106: })
````

## File: components/course/StartDateModal.tsx
````typescript
  1: 'use client'
  2: import { useState, useMemo } from 'react'
  3: import {
  4:   format,
  5:   isBefore,
  6:   isAfter,
  7:   startOfDay,
  8:   addDays,
  9:   differenceInDays
 10: } from 'date-fns'
 11: import { vi } from 'date-fns/locale'
 12: import { DayPicker } from 'react-day-picker'
 13: import 'react-day-picker/dist/style.css'
 14: import {
 15:   Dialog,
 16:   DialogContent,
 17:   DialogHeader,
 18:   DialogTitle,
 19:   DialogFooter
 20: } from "@/components/ui/dialog"
 21: import { Button } from "@/components/ui/button"
 22: import { CalendarDays, Loader2 } from "lucide-react"
 23: interface StartDateModalProps {
 24:   isOpen: boolean
 25:   onConfirm: (date: Date) => Promise<void>
 26: }
 27: export default function StartDateModal({
 28:   isOpen,
 29:   onConfirm
 30: }: StartDateModalProps) {
 31:   const today = startOfDay(new Date())
 32:   const maxSelectableDate = addDays(today, 90)
 33:   const courseDuration = 60
 34:   const [selectedDate, setSelectedDate] = useState<Date>(today)
 35:   const [loading, setLoading] = useState(false)
 36:   const deadline = useMemo(() => {
 37:     return addDays(selectedDate, courseDuration)
 38:   }, [selectedDate])
 39:   const daysRemaining = useMemo(() => {
 40:     return differenceInDays(deadline, today)
 41:   }, [deadline, today])
 42:   const handleConfirm = async () => {
 43:     setLoading(true)
 44:     try {
 45:       await onConfirm(selectedDate)
 46:     } catch (error: any) {
 47:       alert(error.message)
 48:     } finally {
 49:       setLoading(false)
 50:     }
 51:   }
 52:   return (
 53:     <Dialog open={isOpen}>
 54:       <DialogContent className="max-w-[92vw] sm:max-w-[380px] w-full bg-zinc-900 border-zinc-800 text-white p-4 gap-4 overflow-hidden rounded-xl">
 55:         <DialogHeader className="space-y-1">
 56:           <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-sky-400">
 57:             <CalendarDays className="w-5 h-5" />
 58:             Xác nhận ngày bắt đầu học
 59:           </DialogTitle>
 60:           <p className="text-xs text-zinc-400 leading-tight">
 61:             Hệ thống sẽ tính Deadline dựa trên ngày này (trong 90 ngày tới).
 62:           </p>
 63:         </DialogHeader>
 64:         <div className="space-y-3">
 65:           {/* Display Current Selection */}
 66:           <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
 67:             <span className="text-xs uppercase font-bold text-zinc-500">Ngày bạn chọn:</span>
 68:             <span className="text-sm font-bold text-sky-400">
 69:               {format(selectedDate, 'dd/MM/yyyy', { locale: vi })}
 70:             </span>
 71:           </div>
 72:           {/* Calendar - Compact but Readable */}
 73:           <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg flex justify-center p-1">
 74:             <DayPicker
 75:               mode="single"
 76:               selected={selectedDate}
 77:               locale={vi}
 78:               onSelect={(date) => {
 79:                 if (date && !isBefore(date, today) && !isAfter(date, maxSelectableDate)) {
 80:                   setSelectedDate(date)
 81:                 }
 82:               }}
 83:               disabled={(date) => isBefore(date, today) || isAfter(date, maxSelectableDate)}
 84:               classNames={{
 85:                 months: "flex flex-col",
 86:                 month: "space-y-1",
 87:                 caption: "flex justify-center pt-1 relative items-center px-6 mb-1",
 88:                 caption_label: "text-xs font-bold text-zinc-200",
 89:                 nav: "flex items-center",
 90:                 nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
 91:                 nav_button_previous: "absolute left-0",
 92:                 nav_button_next: "absolute right-0",
 93:                 table: "w-full border-collapse",
 94:                 head_row: "flex",
 95:                 head_cell: "text-zinc-500 w-7 sm:w-8 font-normal text-[0.65rem] uppercase",
 96:                 row: "flex w-full mt-0.5",
 97:                 cell: "relative p-0 text-center text-xs focus-within:relative focus-within:z-20",
 98:                 day: "h-7 w-7 sm:h-8 sm:w-8 p-0 font-normal hover:bg-zinc-800 rounded transition-colors text-xs",
 99:                 day_selected: "bg-sky-600 text-white hover:bg-sky-500 font-bold !opacity-100",
100:                 day_today: "text-sky-400 font-bold underline underline-offset-4",
101:                 day_outside: "text-zinc-700 opacity-30",
102:                 day_disabled: "text-zinc-800 opacity-10",
103:                 day_hidden: "invisible",
104:               }}
105:             />
106:           </div>
107:           {/* Info Summary - Clearer text */}
108:           <div className="grid grid-cols-2 gap-3 bg-sky-500/5 border border-sky-500/10 rounded-lg p-3 text-xs">
109:             <div className="flex flex-col gap-1">
110:               <span className="text-zinc-500">Deadline dự kiến:</span>
111:               <span className="font-bold text-zinc-100">
112:                 {format(deadline, 'dd/MM/yyyy', { locale: vi })}
113:               </span>
114:             </div>
115:             <div className="flex flex-col items-end gap-1">
116:               <span className="text-zinc-500">Thời lượng:</span>
117:               <span className="font-bold text-sky-500">
118:                 {courseDuration} ngày ({daysRemaining} ngày còn lại)
119:               </span>
120:             </div>
121:           </div>
122:         </div>
123:         <DialogFooter className="mt-2">
124:           <Button
125:             onClick={handleConfirm}
126:             disabled={loading}
127:             className="w-full bg-sky-600 hover:bg-sky-500 text-white h-11 text-sm font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95"
128:           >
129:             {loading ? (
130:               <Loader2 className="w-5 h-5 animate-spin" />
131:             ) : (
132:               "XÁC NHẬN BẮT ĐẦU"
133:             )}
134:           </Button>
135:         </DialogFooter>
136:       </DialogContent>
137:     </Dialog>
138:   )
139: }
````

## File: components/home/MessageCard.tsx
````typescript
  1: 'use client'
  2: import { useState } from 'react'
  3: import Image from 'next/image'
  4: import dynamic from 'next/dynamic'
  5: import { Lightbulb } from 'lucide-react'
  6: // Tối ưu 1: Dynamic Import cho Dialog giúp giảm dung lượng file bundle ban đầu (Initial JS)
  7: // Modal chỉ được tải khi người dùng thực sự click vào card.
  8: const Dialog = dynamic(() => import("@/components/ui/dialog").then(mod => mod.Dialog), { ssr: false })
  9: const DialogContent = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogContent), { ssr: false })
 10: const DialogHeader = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogHeader), { ssr: false })
 11: const DialogTitle = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogTitle), { ssr: false })
 12: interface Message {
 13:     id: number
 14:     content: string
 15:     detail: string
 16:     imageUrl: string | null
 17: }
 18: interface MessageCardProps {
 19:     message: Message | null
 20:     session: any
 21:     userName: string
 22:     userId: string
 23: }
 24: const DEFAULT_MESSAGE: Message = {
 25:     id: 0,
 26:     content: "Tri thức là sức mạnh - Học hôm nay, thành công ngày mai",
 27:     detail: "Học viện BRK mang đến những tri thức thực chiến giúp bạn phát triển bản thân và sự nghiệp. Mỗi ngày học tập là một bước tiến trên con đường thành công.",
 28:     imageUrl: null
 29: }
 30: export default function MessageCard({ message, session, userName, userId }: MessageCardProps) {
 31:     const [isOpen, setIsOpen] = useState(false)
 32:     const displayMessage = message || DEFAULT_MESSAGE
 33:     return (
 34:         <>
 35:             {/* Tỉ lệ 5:3 chuẩn xác bằng Aspect Ratio - Giúp trình duyệt tính toán Layout cực nhanh */}
 36:             <div className="relative w-full aspect-[5/3] sm:overflow-hidden rounded-2xl md:rounded-none shadow-2xl border border-white/5 group cursor-pointer"
 37:                 onClick={() => setIsOpen(true)}>
 38:                 {/* ── Ảnh nền tối ưu ── */}
 39:                 <div className="absolute inset-0">
 40:                     {displayMessage.imageUrl ? (
 41:                         <Image
 42:                             src={displayMessage.imageUrl}
 43:                             alt="Học viện BRK Background"
 44:                             fill
 45:                             priority // Tải trước ảnh này vì nó là thành phần quan trọng nhất trang (LCP)
 46:                             quality={70} // Tối ưu: 70% là điểm ngọt giữa độ nét và dung lượng
 47:                             className="object-cover object-center transition-transform duration-1000 group-hover:scale-105"
 48:                             sizes="(max-width: 768px) 100vw, 1200px"
 49:                         />
 50:                     ) : (
 51:                         <div className="w-full h-full bg-gradient-to-br from-black via-zinc-900 to-indigo-950" />
 52:                     )}
 53:                     {/* Lớp phủ tối nhẹ để nổi bật chữ */}
 54:                     <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] transition-colors duration-500 group-hover:bg-black/33" />
 55:                 </div>
 56:                 {/* ── TOÀN BỘ NỘI DUNG: Flex layout ── */}
 57:                 <div className="absolute inset-0 z-10 flex flex-col px-[5%] pt-[30px] md:pt-[70px] pb-[4%] text-center">
 58:                     {/* ── TOP: Tiêu đề & Lời chào ── */}
 59:                     <div className="flex flex-col items-center shrink-0">
 60:                         <h1 className="flex flex-col items-center font-black tracking-tighter leading-[1.2]">
 61:                             <span
 62:                                 className="uppercase text-white drop-shadow-xl"
 63:                                 style={{ fontSize: 'clamp(0.5rem, 6vw, 4rem)' }}
 64:                             >
 65:                                 HỌC VIỆN BRK
 66:                             </span>
 67:                             <span
 68:                                 className="text-glow-3d uppercase drop-shadow-xl"
 69:                                 style={{ fontSize: 'clamp(0.5rem, 5vw, 3rem)' }}
 70:                             >
 71:                                 NGÂN HÀNG PHƯỚC BÁU
 72:                             </span>
 73:                             <span
 74:                                 className="rounded-full bg-white/10 border border-white/20 backdrop-blur-md"
 75:                                 style={{
 76:                                     padding: 'clamp(3px,0.8%,8px) clamp(8px,4%,20px)',
 77:                                     marginTop: 'clamp(10px, 2%, 16px)'
 78:                                 }}
 79:                             >
 80:                                 <span
 81:                                     className="block font-semibold text-white whitespace-nowrap"
 82:                                     style={{ fontSize: 'clamp(0.7rem, 1.8vw, 1.2rem)' }}
 83:                                 >
 84:                                     {session?.user
 85:                                         ? `Mến chào ${userName || 'Học viên'} - Mã học tập ${userId}`
 86:                                         : 'Mến chào bạn hữu đường xa!'}
 87:                                 </span>
 88:                             </span>
 89:                         </h1>
 90:                     </div>
 91:                     {/* ── BOTTOM: Thông điệp (Chiếm trọn không gian dưới dòng Mến chào) ── */}
 92:                     <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full"
 93:                         style={{
 94:                             gap: 'clamp(4px, 1.2%, 12px)',
 95:                             paddingTop: '3%',
 96:                             paddingBottom: '1%'
 97:                         }}>
 98:                         {/* Container nội dung thông điệp - Tự động điều chỉnh theo nội dung */}
 99:                         <div className="flex items-center justify-center gap-[8px] max-w-[95%] md:max-w-[85%] w-full">
100:                             <p
101:                                 className="text-yellow-400 font-medium italic leading-tight drop-shadow-lg whitespace-pre-line overflow-visible"
102:                                 style={{
103:                                     /* Font size đơn giản: tự động điều chỉnh theo độ dài nội dung */
104:                                     fontSize: `clamp(0.7rem, 2.5vw, 2rem)`,
105:                                 }}
106:                             >
107:                                 &ldquo;{displayMessage.content}&rdquo;
108:                             </p>
109:                             {/* Icon bóng đèn - Thu nhỏ scale khi chữ nhỏ đi để giữ sự cân đối */}
110:                             <div
111:                                 className="shrink-0 rounded-full bg-yellow-400 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity shadow-lg"
112:                                 style={{
113:                                     width: 'clamp(1.4rem, 3.2vw, 2.6rem)',
114:                                     height: 'clamp(1.4rem, 3.2vw, 2.6rem)'
115:                                 }}
116:                             >
117:                                 <Lightbulb
118:                                     className="text-black animate-pulse"
119:                                     style={{ width: '55%', height: '55%' }}
120:                                 />
121:                             </div>
122:                         </div>
123:                         {/* Gợi ý tương tác - Đẩy sát xuống dưới cùng của thông điệp */}
124:                         <p
125:                             className="text-white/40 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-1 group-hover:translate-y-0"
126:                             style={{ fontSize: 'clamp(0.4rem, 0.75vw, 0.65rem)' }}
127:                         >
128:                             Nhấn để xem chi tiết →
129:                         </p>
130:                     </div>
131:                 </div>
132:             </div>
133:             {/* ── Kết thúc card ảnh nền ── */}
134:             {/* ── Modal chi tiết (Lazy Loaded) ── */}
135:             {isOpen && (
136:                 <Dialog open={isOpen}>
137:                     <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-800 text-white overflow-hidden p-0 shadow-2xl">
138:                         <div className="relative w-full h-64">
139:                             {displayMessage.imageUrl ? (
140:                                 <Image
141:                                     src={displayMessage.imageUrl}
142:                                     alt="Detail Background"
143:                                     fill
144:                                     className="object-cover"
145:                                     sizes="(max-width: 768px) 100vw, 500px"
146:                                 />
147:                             ) : (
148:                                 <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-950" />
149:                             )}
150:                             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
151:                                 <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center mb-4 shadow-xl scale-110">
152:                                     <Lightbulb className="w-6 h-6 text-black" />
153:                                 </div>
154:                                 <p className="text-yellow-400 text-xl font-bold italic leading-tight whitespace-pre-line drop-shadow-md">
155:                                     &ldquo;{displayMessage.content}&rdquo;
156:                                 </p>
157:                             </div>
158:                         </div>
159:                         <div className="p-6 space-y-4 bg-zinc-950">
160:                             <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner">
161:                                 {displayMessage.detail}
162:                             </div>
163:                             <p className="text-zinc-600 text-[11px] text-center pt-2 italic tracking-widest">
164:                                 💡 HỌC VIỆN BRK - NGÂN HÀNG PHƯỚC BÁU
165:                             </p>
166:                         </div>
167:                         {/* Nút đóng */}
168:                         <button
169:                             onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
170:                             className="absolute top-4 right-4 text-white/70 hover:text-white transition-all bg-black/20 hover:bg-black/40 rounded-full p-2 z-20"
171:                         >
172:                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
173:                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
174:                             </svg>
175:                         </button>
176:                     </DialogContent>
177:                 </Dialog>
178:             )}
179:         </>
180:     )
181: }
````

## File: app/courses/[id]/learn/page.tsx
````typescript
 1: import { auth } from "@/auth"
 2: import prisma from "@/lib/prisma"
 3: import { redirect } from "next/navigation"
 4: import CoursePlayer from "@/components/course/CoursePlayer"
 5: export const dynamic = "force-dynamic"; //test thử xem lỗi gì - dùng xong xóa
 6: export default async function CourseLearnPage({
 7:   params,
 8: }: {
 9:   params: Promise<{ id: string }>
10: }) {
11:   const { id } = await params
12:   const session = await auth()
13:   if (!session?.user?.id) redirect("/login")
14:   const userId = Number(session.user.id)
15:   // 🔥 BƯỚC 1: lấy course trước
16:   const course = await prisma.course.findUnique({
17:     where: { id_khoa: id },
18:     select: { id: true },
19:   })
20:   if (!course) redirect(`/courses/${id}`)
21:   // 🔥 BƯỚC 2: lấy enrollment bằng courseId
22:   const enrollment = await prisma.enrollment.findUnique({
23:     where: {
24:       userId_courseId: {
25:         userId,
26:         courseId: course.id,
27:       },
28:     },
29:     select: {
30:       id: true,
31:       status: true,
32:       startedAt: true,
33:       resetAt: true,
34:       lastLessonId: true,
35:       course: {
36:         select: {
37:           id: true,
38:           id_khoa: true,
39:           name_lop: true,
40:           lessons: {
41:             select: {
42:               id: true,
43:               title: true,
44:               order: true,
45:               videoUrl: true,
46:               isDailyChallenge: true,
47:             },
48:             orderBy: { order: "asc" },
49:           },
50:         },
51:       },
52:       lessonProgress: {
53:         where: {
54:           status: { not: "RESET" },
55:         },
56:         select: {
57:           lessonId: true,
58:           status: true,
59:           totalScore: true,
60:           maxTime: true,
61:           duration: true,
62:           submittedAt: true,
63:           assignment: true,
64:           scores: true,
65:         },
66:       },
67:     },
68:   })
69:   if (!enrollment || enrollment.status !== "ACTIVE") {
70:     redirect(`/courses/${id}`)
71:   }
72:   return (
73:     <div className="h-screen h-dvh bg-black overflow-hidden flex flex-col">
74:       <CoursePlayer
75:         course={enrollment.course}
76:         enrollment={enrollment}
77:         session={session}
78:       />
79:     </div>
80:   )
81: }
````

## File: components/layout/Header.tsx
````typescript
  1: 'use client'
  2: import React, { useState, useRef, useEffect } from 'react'
  3: import Link from 'next/link'
  4: import Image from 'next/image'
  5: import { signOut } from 'next-auth/react'
  6: import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
  7: export default function Header({ session, userImage }: { session: any, userImage?: string | null }) {
  8:     const [isMenuOpen, setIsMenuOpen] = useState(false)
  9:     const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
 10:     const userMenuRef = useRef<HTMLDivElement>(null)
 11:     useEffect(() => {
 12:         function handleClickOutside(event: MouseEvent) {
 13:             if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
 14:                 setIsUserMenuOpen(false)
 15:             }
 16:         }
 17:         document.addEventListener('mousedown', handleClickOutside)
 18:         return () => document.removeEventListener('mousedown', handleClickOutside)
 19:     }, [])
 20:     const userInitials = session?.user?.name
 21:         ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
 22:         : '?'
 23:     return (
 24:         <header className="fixed top-0 z-50 w-full bg-black text-white shadow-xl border-b border-white/5">
 25:             <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
 26:                 {/* Logo & Brand */}
 27:                 <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
 28:                     <Image
 29:                         src="/logobrk-50px.png"
 30:                         alt="Học Viện BRK Logo"
 31:                         width={150}
 32:                         height={50}
 33:                         priority
 34:                         className="object-contain"
 35:                         style={{ height: '48px', width: 'auto' }}
 36:                     />
 37:                 </Link>
 38:                 {/* Navigation - Desktop */}
 39:                 <nav className="hidden flex-1 items-center justify-center gap-12 text-[13px] font-black md:flex">
 40:                     <Link href="/" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">TRANG CHỦ</Link>
 41:                     <Link href="#khoa-hoc" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">KHÓA HỌC</Link>
 42:                     <Link href="#" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">GIỚI THIỆU</Link>
 43:                 </nav>
 44:                 {/* Actions & Hamburger */}
 45:                 <div className="flex items-center gap-2 sm:gap-6">
 46:                     {session ? (
 47:                         <div className="relative" ref={userMenuRef}>
 48:                             <button
 49:                                 onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
 50:                                 className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-1.5 transition-all hover:bg-zinc-700"
 51:                             >
 52:                                 {userImage || session?.user?.image ? (
 53:                                     <img
 54:                                         src={userImage || session?.user?.image}
 55:                                         alt="Avatar"
 56:                                         className="h-7 w-7 rounded-full object-cover border-2 border-yellow-400"
 57:                                     />
 58:                                 ) : (
 59:                                     <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-xs font-black text-black">
 60:                                         {userInitials}
 61:                                     </div>
 62:                                 )}
 63:                                 <ChevronDown className={`h-3 w-3 text-zinc-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
 64:                             </button>
 65:                             {/* User Dropdown Menu */}
 66:                             {isUserMenuOpen && (
 67:                                 <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-zinc-700 bg-zinc-900 py-2 shadow-xl animate-in fade-in slide-in-from-top-2">
 68:                                     <div className="border-b border-zinc-800 px-4 py-2 mb-1">
 69:                                         <p className="text-xs font-bold text-white truncate">{session.user?.name}</p>
 70:                                         <p className="text-[10px] text-zinc-500 truncate">{session.user?.email}</p>
 71:                                     </div>
 72:                                     {session.user?.role === 'ADMIN' && (
 73:                                         <Link
 74:                                             href="/admin/students"
 75:                                             onClick={() => setIsUserMenuOpen(false)}
 76:                                             className="flex items-center gap-3 px-4 py-2.5 text-sm text-yellow-400 hover:bg-zinc-800 transition-colors font-bold"
 77:                                         >
 78:                                             <Settings className="h-4 w-4" />
 79:                                             Quản trị hệ thống
 80:                                         </Link>
 81:                                     )}
 82:                                     <Link
 83:                                         href="/account-settings"
 84:                                         onClick={() => setIsUserMenuOpen(false)}
 85:                                         className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
 86:                                     >
 87:                                         <Settings className="h-4 w-4" />
 88:                                         Cài đặt tài khoản
 89:                                     </Link>
 90:                                     <button
 91:                                         onClick={() => signOut()}
 92:                                         className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
 93:                                     >
 94:                                         <LogOut className="h-4 w-4" />
 95:                                         Đăng xuất
 96:                                     </button>
 97:                                 </div>
 98:                             )}
 99:                         </div>
100:                     ) : (
101:                         <Link
102:                             href="/login"
103:                             className="hidden sm:inline-block rounded-full bg-white px-6 py-2 text-xs font-black text-black shadow-md transition-all hover:bg-yellow-400 hover:scale-105"
104:                         >
105:                             ĐĂNG NHẬP
106:                         </Link>
107:                     )}
108:                     {/* Hamburger Button */}
109:                     <button
110:                         onClick={() => setIsMenuOpen(!isMenuOpen)}
111:                         className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white transition-all hover:bg-white/10 md:hidden"
112:                     >
113:                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-6 w-6">
114:                             {isMenuOpen ? (
115:                                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
116:                             ) : (
117:                                 <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
118:                             )}
119:                         </svg>
120:                     </button>
121:                 </div>
122:             </div>
123:             {/* Mobile Menu Dropdown */}
124:             {isMenuOpen && (
125:                 <div className="animate-in slide-in-from-top-4 absolute left-0 top-16 w-full border-b border-white/5 bg-black px-4 py-8 shadow-2xl md:hidden">
126:                     <nav className="flex flex-col gap-6 text-center text-sm font-black">
127:                         <Link href="/" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400 hover:scale-105 transition-all">TRANG CHỦ</Link>
128:                         <Link href="#khoa-hoc" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400 hover:scale-105 transition-all">KHÓA HỌC</Link>
129:                         <Link href="#" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400 hover:scale-105 transition-all">GIỚI THIỆU</Link>
130:                         {!session ? (
131:                             <Link href="/login" onClick={() => setIsMenuOpen(false)} className="mt-4 rounded-xl bg-white py-4 text-black shadow-lg">ĐĂNG NHẬP</Link>
132:                         ) : (
133:                             <button
134:                                 onClick={() => signOut()}
135:                                 className="mt-4 rounded-xl bg-red-600 py-4 text-white shadow-lg"
136:                             >
137:                                 ĐĂNG XUẤT
138:                             </button>
139:                         )}
140:                     </nav>
141:                 </div>
142:             )}
143:         </header>
144:     )
145: }
````

## File: lib/notifications.ts
````typescript
  1: import { google } from 'googleapis';
  2: /**
  3:  * Gửi thông báo đến Telegram (Hỗ trợ 3 Group khác nhau)
  4:  */
  5: export async function sendTelegram(message: string, type: 'REGISTER' | 'ACTIVATE' | 'LESSON' = 'ACTIVATE') {
  6:   const token = process.env.TELEGRAM_BOT_TOKEN;
  7:   // Lấy Chat ID tương ứng với từng loại sự kiện
  8:   const chatIdMap = {
  9:     REGISTER: process.env.TELEGRAM_CHAT_ID_REGISTER || process.env.TELEGRAM_CHAT_ID,
 10:     ACTIVATE: process.env.TELEGRAM_CHAT_ID_ACTIVATE || process.env.TELEGRAM_CHAT_ID,
 11:     LESSON: process.env.TELEGRAM_CHAT_ID_LESSON || process.env.TELEGRAM_CHAT_ID,
 12:   };
 13:   const chatId = chatIdMap[type];
 14:   if (!token || !chatId) {
 15:     console.error(`⚠️ Thiếu cấu hình Telegram cho loại: ${type}`);
 16:     return;
 17:   }
 18:   try {
 19:     const url = `https://api.telegram.org/bot${token}/sendMessage`;
 20:     const response = await fetch(url, {
 21:       method: 'POST',
 22:       headers: { 'Content-Type': 'application/json' },
 23:       body: JSON.stringify({
 24:         chat_id: chatId,
 25:         text: message,
 26:         parse_mode: 'HTML',
 27:       }),
 28:     });
 29:     const result = await response.json();
 30:     if (!result.ok) {
 31:         console.error(`❌ Telegram API Error (${type}):`, result.description);
 32:     } else {
 33:         console.log(`✅ Telegram API Success (${type}): Tin nhắn đã được gửi đến ID ${chatId}`);
 34:     }
 35:   } catch (error) {
 36:     console.error(`❌ Lỗi hệ thống khi gửi Telegram (${type}):`, error);
 37:   }
 38: }
 39: /**
 40:  * Cấu hình OAuth2 Client cho Gmail
 41:  */
 42: function getGmailClient() {
 43:   const oAuth2Client = new google.auth.OAuth2(
 44:     process.env.GMAIL_CLIENT_ID,
 45:     process.env.GMAIL_CLIENT_SECRET,
 46:     'http://localhost'
 47:   );
 48:   oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
 49:   return google.gmail({ version: 'v1', auth: oAuth2Client });
 50: }
 51: /**
 52:  * Hàm chung để gửi Email qua Gmail API
 53:  */
 54: async function sendGmail(to: string, subject: string, htmlBody: string, bcc?: string) {
 55:   const gmail = getGmailClient();
 56:   const adminEmail = process.env.GMAIL_USER || 'hocvienbrk@gmail.com';
 57:   const fromName = 'Học Viện BRK';
 58:   const encodedFromName = `=?utf-8?B?${Buffer.from(fromName).toString('base64')}?=`;
 59:   const encodedSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
 60:   const messageParts = [
 61:     `From: ${encodedFromName} <${adminEmail}>`,
 62:     `To: ${to}`,
 63:     bcc ? `Bcc: ${bcc}` : '',
 64:     `Content-Type: text/html; charset=utf-8`,
 65:     `MIME-Version: 1.0`,
 66:     `Subject: ${encodedSubject}`,
 67:     ``,
 68:     htmlBody,
 69:   ].filter(line => line !== '').join('\n');
 70:   const encodedMessage = Buffer.from(messageParts)
 71:     .toString('base64')
 72:     .replace(/\+/g, '-')
 73:     .replace(/\//g, '_')
 74:     .replace(/=+$/, '');
 75:   try {
 76:     await gmail.users.messages.send({
 77:       userId: 'me',
 78:       requestBody: { raw: encodedMessage },
 79:     });
 80:     console.log(`✅ Đã gửi email thành công: ${subject} -> ${to}`);
 81:   } catch (error) {
 82:     console.error(`❌ Lỗi gửi Email (${subject}):`, error);
 83:   }
 84: }
 85: /**
 86:  * Email chào mừng học viên mới
 87:  */
 88: export async function sendWelcomeEmail(to: string, studentName: string, studentId: number) {
 89:   const subject = `[Học Viện BRK] Chào mừng bạn gia nhập học viện - Mã học tập của bạn là #${studentId}`;
 90:   const htmlBody = `
 91:     Chào mừng <b>${studentName}</b> đến với Học Viện BRK,<br><br>
 92:     Tài khoản của bạn đã được khởi tạo thành công.<br>
 93:     <b>Mã số học tập của bạn là: <span style="font-size: 18px; color: #7c3aed;">#${studentId}</span></b><br><br>
 94:     Mã số này rất quan trọng, bạn vui lòng ghi nhớ để sử dụng khi chuyển khoản cam kết hoặc nhận hỗ trợ từ học viện.<br><br>
 95:     Chúc bạn có những trải nghiệm học tập tuyệt vời!<br><br>
 96:     Trân trọng,<br>
 97:     Đội ngũ Học Viện BRK
 98:   `;
 99:   await sendGmail(to, subject, htmlBody);
100: }
101: /**
102:  * Email thông báo kích hoạt khóa học (Dùng nội dung từ bảng Course)
103:  */
104: export async function sendActivationEmail(to: string, studentName: string, studentId: number, courseName: string, customContent: string | null) {
105:   const subject = `[Học Viện BRK] Kích hoạt thành công khóa học: ${courseName}`;
106:   const adminEmail = process.env.GMAIL_USER || 'hocvienbrk@gmail.com';
107:   const htmlBody = `
108:     Chào <b>${studentName}</b> (Mã số học tập: <b>#${studentId}</b>),<br><br>
109:     Chúc mừng bạn! Khóa học <b>${courseName}</b> của bạn đã được <b>kích hoạt thành công</b>.<br><br>
110:     ${customContent ? `---<br><b>Thông tin bổ sung từ giảng viên:</b><br>${customContent}<br>---<br><br>` : ''}
111:     Bây giờ bạn có thể đăng nhập để bắt đầu lộ trình học tập.<br><br>
112:     Trân trọng,<br>
113:     Đội ngũ Học Viện BRK
114:   `;
115:   await sendGmail(to, subject, htmlBody, adminEmail);
116: }
117: /**
118:  * Thông báo khi có người đăng nhập thành công
119:  */
120: export async function sendLoginNotification(user: any, ip: string, userAgent: string) {
121:   try {
122:     // 1. Tra cứu vị trí từ IP (Sử dụng IP-API miễn phí)
123:     let location = 'Không xác định';
124:     let isp = '';
125:     try {
126:       const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp`);
127:       const geoData = await geoRes.json();
128:       if (geoData.status === 'success') {
129:         location = `${geoData.city}, ${geoData.regionName}, ${geoData.country}`;
130:         isp = geoData.isp || '';
131:       }
132:     } catch (e) {
133:       console.error('Lỗi tra cứu GeoIP:', e);
134:     }
135:     // 2. Phân tích User Agent đơn giản (Trình duyệt/Hệ điều hành)
136:     const browser = userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : userAgent.includes('Safari') ? 'Safari' : 'Trình duyệt khác';
137:     const os = userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Android') ? 'Android' : userAgent.includes('iPhone') ? 'iPhone/iOS' : 'Hệ điều hành khác';
138:     const msg = `🔑 <b>THÔNG BÁO ĐĂNG NHẬP</b>\n\n` +
139:                 `👤 Học viên: <b>${user.name}</b> (#${user.id})\n` +
140:                 `📧 Email: ${user.email}\n` +
141:                 `📍 Vị trí: <b>${location}</b>\n` +
142:                 `🌐 IP: ${ip} (${isp})\n` +
143:                 `📱 Thiết bị: ${browser} on ${os}\n` +
144:                 `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
145:     await sendTelegram(msg, 'REGISTER');
146:   } catch (error) {
147:     console.error('Lỗi gửi thông báo đăng nhập:', error);
148:   }
149: }
150: // Giữ lại các hàm cũ để không làm gãy logic hiện tại (nhưng trỏ về hàm mới)
151: export const sendTelegramAdmin = (msg: string) => sendTelegram(msg, 'ACTIVATE');
152: export const sendSuccessEmail = (to: string, name: string, course: string) => sendActivationEmail(to, name, 0, course, null);
````

## File: next.config.ts
````typescript
 1: import type { NextConfig } from "next";
 2: const nextConfig: NextConfig = {
 3:   // Tăng tốc phản hồi HTTP
 4:   compress: true,
 5:   // Tối ưu serverless deploy
 6:   output: "standalone",
 7:   // Strict mode giúp phát hiện bug React
 8:   reactStrictMode: true,
 9:   // Tối ưu import package lớn
10:   experimental: {
11:     optimizePackageImports: ["lucide-react"],
12:   },
13:   images: {
14:     // Tắt tối ưu hóa ảnh để sửa lỗi 400 Bad Request và cảnh báo chất lượng
15:     unoptimized: true,
16:     // Cấu hình các mức chất lượng được phép
17:     qualities: [50, 70, 75, 80, 90],
18:     // Chỉ cho phép domain ảnh thực sự dùng
19:     remotePatterns: [
20:       {
21:         protocol: "https",
22:         hostname: "**.supabase.co",
23:       },
24:       {
25:         protocol: "https",
26:         hostname: "images.unsplash.com",
27:       },
28:       {
29:         protocol: "https",
30:         hostname: "i.imgur.com",
31:       },
32:       {
33:         protocol: "https",
34:         hostname: "postimg.cc",
35:       },
36:       {
37:         protocol: "https",
38:         hostname: "**.postimg.cc",
39:       },
40:       {
41:         protocol: "https",
42:         hostname: "api.vietqr.io",
43:       },
44:       {
45:         protocol: "https",
46:         hostname: "img.vietqr.io",
47:       }
48:     ],
49:     // Format ảnh hiện đại
50:     formats: ["image/avif", "image/webp"],
51:     // Cache ảnh lâu hơn
52:     minimumCacheTTL: 60 * 60 * 24 * 30, // 30 ngày
53:   },
54:   // Tắt source map production để giảm bundle
55:   productionBrowserSourceMaps: false,
56:   // Headers bảo mật cơ bản
57:   async headers() {
58:     return [
59:       {
60:         source: "/(.*)",
61:         headers: [
62:           {
63:             key: "X-Frame-Options",
64:             value: "SAMEORIGIN",
65:           },
66:           {
67:             key: "X-Content-Type-Options",
68:             value: "nosniff",
69:           },
70:           {
71:             key: "Referrer-Policy",
72:             value: "strict-origin-when-cross-origin",
73:           },
74:         ],
75:       },
76:     ];
77:   },
78: };
79: export default nextConfig;
````

## File: components/course/CourseCard.tsx
````typescript
  1: 'use client'
  2: import React, { useState } from 'react'
  3: import Image from 'next/image'
  4: import PaymentModal from './PaymentModal'
  5: import UploadProofModal from '@/components/payment/UploadProofModal'
  6: import { enrollInCourseAction } from '@/app/actions/course-actions'
  7: interface CourseCardProps {
  8:     course: any
  9:     isLoggedIn: boolean
 10:     enrollment?: {
 11:         status: string
 12:         startedAt: Date | null
 13:         completedCount: number
 14:         totalLessons: number
 15:         enrollmentId?: number
 16:         payment?: {
 17:             id: number
 18:             status: string
 19:             proofImage?: string | null
 20:         }
 21:     } | null
 22:     isCourseOneActive?: boolean
 23:     userPhone?: string | null
 24:     userId?: number | null
 25:     priority?: boolean
 26:     darkMode?: boolean
 27: }
 28: export default function CourseCard({ course, isLoggedIn, enrollment, isCourseOneActive = false, userPhone = null, userId = null, priority = false, darkMode = false }: CourseCardProps) {
 29:     const [showPayment, setShowPayment] = useState(false)
 30:     const [loading, setLoading] = useState(false)
 31:     // Override phi_coc nếu đã kích hoạt khóa 1
 32:     const effectivePhiCoc = isCourseOneActive ? 0 : course.phi_coc
 33:     const isActive = enrollment?.status === 'ACTIVE'
 34:     const isPending = enrollment?.status === 'PENDING'
 35:     const handleAction = async (e: React.MouseEvent) => {
 36:         e.preventDefault()
 37:         e.stopPropagation()
 38:         if (!isLoggedIn) {
 39:             alert('Vui lòng Đăng nhập / Đăng ký tài khoản miễn phí để tiếp tục!')
 40:             window.location.href = '/login'
 41:             return
 42:         }
 43:         if (isActive) {
 44:             window.location.href = `/courses/${course.id_khoa}/learn`
 45:             return
 46:         }
 47:         if (effectivePhiCoc === 0) {
 48:             setLoading(true)
 49:             try {
 50:                 const res = await enrollInCourseAction(course.id)
 51:                 if (res.success) {
 52:                     window.location.href = `/courses/${course.id_khoa}/learn`
 53:                 }
 54:             } catch (err: any) {
 55:                 alert(err.message)
 56:             } finally {
 57:                 setLoading(false)
 58:             }
 59:         } else {
 60:             if (isPending) {
 61:                 setShowPayment(true)
 62:             } else {
 63:                 setLoading(true)
 64:                 try {
 65:                     const res = await enrollInCourseAction(course.id)
 66:                     if (res.success) {
 67:                         // Sau khi enroll thành công, component sẽ re-render do revalidatePath.
 68:                         // Chúng ta cần đảm bảo setShowPayment(true) được giữ lại.
 69:                         // Sử dụng timeout nhỏ để chạy sau chu kỳ re-render của Next.js
 70:                         setTimeout(() => setShowPayment(true), 100)
 71:                     }
 72:                 } catch (err: any) {
 73:                     alert(err.message)
 74:                 } finally {
 75:                     setLoading(false)
 76:                 }
 77:             }
 78:         }
 79:     }
 80:     const progressPct = enrollment && enrollment.totalLessons > 0
 81:         ? Math.round((enrollment.completedCount / enrollment.totalLessons) * 100)
 82:         : 0
 83:     return (
 84:         <>
 85:             <div className={`group overflow-hidden rounded-2xl shadow-lg transition-all hover:shadow-2xl flex flex-col h-full ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-gray-100'}`}>
 86:                 {/* Ảnh bìa - Đã tối ưu hóa */}
 87:                 <div className="relative aspect-[16/9] w-full overflow-hidden shrink-0 bg-zinc-800">
 88:                     <Image
 89:                         src={course.link_anh_bia || 'https://i.postimg.cc/PJPkm7vB/1.jpg'}
 90:                         alt={course.name_lop}
 91:                         fill
 92:                         priority={priority} // Ưu tiên load các card đầu tiên
 93:                         sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
 94:                         className="object-cover transition-transform duration-500 group-hover:scale-105"
 95:                     />
 96:                 </div>
 97:                 {/* Nội dung - Giữ nguyên 100% */}
 98:                 <div className="p-5 flex flex-col flex-grow">
 99:                     {/* Title */}
100:                     <div className="mb-3 flex items-center gap-2.5">
101:                         <span className="text-2xl leading-none drop-shadow-sm select-none shrink-0">📘</span>
102:                         <h3 className={`text-base sm:text-lg font-black leading-tight truncate flex-1 ${darkMode ? 'text-white' : 'text-black'}`}
103:                             style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
104:                             {course.name_lop}
105:                         </h3>
106:                     </div>
107:                     {/* Badges + Trạng thái + Ngày bắt đầu */}
108:                     <div className="mb-3 flex flex-wrap items-center gap-2">
109:                         <span className={`inline-block rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-wider shadow-sm ${effectivePhiCoc === 0 ? 'bg-yellow-400 text-gray-900' : 'bg-red-600 text-white'}`}>
110:                             {effectivePhiCoc === 0 ? 'Miễn phí' : 'Phí cam kết'}
111:                         </span>
112:                         {isActive && (
113:                             <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm border border-sky-400">
114:                                 <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
115:                                 Đã kích hoạt
116:                                 {enrollment?.startedAt && (
117:                                     <span className="opacity-80 font-normal" suppressHydrationWarning>
118:                                         · Từ {new Date(enrollment.startedAt).toLocaleDateString('vi-VN')}
119:                                     </span>
120:                                 )}
121:                             </span>
122:                         )}
123:                         {isPending && (
124:                             <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm border border-orange-400">
125:                                 <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
126:                                 Chờ thanh toán
127:                             </span>
128:                         )}
129:                     </div>
130:                     {/* Mô tả */}
131:                     <div
132:                         className={`mb-5 flex-grow text-[14px] font-medium leading-relaxed text-justify break-words ${darkMode ? 'text-gray-300' : 'text-gray-500'
133:                             }`}
134:                         dangerouslySetInnerHTML={{ __html: course.mo_ta_ngan || '' }}
135:                     />
136:                     {/* Button */}
137:                     <button
138:                         onClick={handleAction}
139:                         disabled={loading}
140:                         className={`group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-1.5 text-sm sm:text-base font-black shadow-xl transition-all active:scale-[0.97]
141:                             ${loading ? 'bg-gray-400 text-white cursor-not-allowed' :
142:                                 isActive ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200' :
143:                                 isPending ? 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-orange-200' :
144:                                     'bg-sky-500 text-white hover:bg-sky-600 hover:shadow-sky-200'}`}
145:                     >
146:                         {loading ? (
147:                             <span className="flex items-center gap-2 relative z-10">
148:                                 <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
149:                                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
150:                                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
151:                                 </svg>
152:                                 Đang kết nối...
153:                             </span>
154:                         ) : (
155:                             <>
156:                                 {isActive && enrollment && enrollment.totalLessons > 0 && (
157:                                     <span
158:                                         className="absolute inset-0 transition-all duration-700"
159:                                         style={{ width: `${progressPct}%`, background: 'rgba(255,255,255,0.18)' }}
160:                                         aria-hidden="true"
161:                                     />
162:                                 )}
163:                                 <span className="relative z-10 flex items-center gap-2">
164:                                     <span>{isActive ? '📖' : isPending ? '💰' : '⚡'}</span>
165:                                     <span>
166:                                         {isActive ? 'Vào học tiếp' : isPending ? 'Xem thông tin thanh toán' : effectivePhiCoc === 0 ? 'Kích hoạt miễn phí' : 'Kích hoạt ngay'}
167:                                         {isActive && enrollment && enrollment.totalLessons > 0 && (
168:                                             <span className="ml-1.5 font-normal opacity-90 text-[12px]">
169:                                                 {enrollment.completedCount}/{enrollment.totalLessons} bài · {progressPct}%
170:                                             </span>
171:                                         )}
172:                                     </span>
173:                                     <span>{isActive ? '▶' : '🚀'}</span>
174:                                 </span>
175:                             </>
176:                         )}
177:                     </button>
178:                     {isPending && !loading && (
179:                         <p className="mt-3 text-center text-xs font-bold text-orange-600 animate-pulse italic">
180:                             Đang chờ thanh toán...
181:                         </p>
182:                     )}
183:                 </div>
184:             </div>
185:             {showPayment && (
186:                 <PaymentModal
187:                     course={course}
188:                     enrollment={enrollment}
189:                     isCourseOneActive={isCourseOneActive}
190:                     userPhone={userPhone}
191:                     userId={userId}
192:                     onClose={() => setShowPayment(false)}
193:                 />
194:             )}
195:         </>
196:     )
197: }
````

## File: package.json
````json
 1: {
 2:   "name": "brk-academy",
 3:   "version": "0.1.0",
 4:   "private": true,
 5:   "scripts": {
 6:     "dev": "next dev",
 7:     "build": "next build",
 8:     "postinstall": "prisma generate",
 9:     "start": "next start",
10:     "lint": "eslint",
11:     "import-csv": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/import-csv.ts",
12:     "process-legacy": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/process-legacy-users.ts",
13:     "check-missing": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/check-missing-ids.ts",
14:     "fill-missing": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/fill-missing-ids.ts",
15:     "change-id": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/change-id.ts",
16:     "add-reserved": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/add-reserved-id.ts",
17:     "import-reserved": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/import-reserved-list.ts",
18:     "make-admin": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/make-admin.ts",
19:     "seed-courses": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/seed-courses.ts",
20:     "seed-enrollments": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/seed-enrollments.ts",
21:     "import-v3": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/import-v3-data.ts",
22:     "push": "powershell -ExecutionPolicy Bypass -File ./scripts/push.ps1",
23:     "code-history": "ts-node --compiler-options \"{\\\"module\\\":\\\"CommonJS\\\"}\" scripts/generate-code-history.ts",
24:     "sync-ai": "npx repomix && ts-node --compiler-options \"{\\\"module\\\":\\\"CommonJS\\\"}\" scripts/sync-to-drive.ts"
25:   },
26:   "dependencies": {
27:     "@auth/prisma-adapter": "^2.11.1",
28:     "@hookform/resolvers": "^5.2.2",
29:     "@prisma/client": "5.22.0",
30:     "@supabase/supabase-js": "^2.95.3",
31:     "@types/bcryptjs": "^2.4.6",
32:     "bcryptjs": "^3.0.3",
33:     "clsx": "^2.1.1",
34:     "csv-parser": "^3.2.0",
35:     "csv-writer": "^1.6.0",
36:     "date-fns": "^4.1.0",
37:     "dompurify": "^3.3.1",
38:     "dotenv": "^17.3.1",
39:     
40:     "googleapis": "^171.4.0",
41:     "lucide-react": "^0.570.0",
42:     "next": "16.1.6",
43:     "next-auth": "^5.0.0-beta.30",
44:     
45:     "react": "19.2.3",
46:     "react-day-picker": "^9.14.0",
47:     "react-dom": "19.2.3",
48:     "react-hook-form": "^7.71.1",
49:     "tailwind-merge": "^3.4.1",
50:     "zod": "^4.3.6"
51:   },
52:   "devDependencies": {
53:     "@tailwindcss/postcss": "^4",
54:     "@types/node": "^20",
55:     "@types/react": "^19",
56:     "@types/react-dom": "^19",
57:     "eslint": "^9",
58:     "eslint-config-next": "16.1.6",
59:     "tailwindcss": "^4",
60:     "ts-node": "^10.9.2",
61:     "prisma": "5.22.0",
62:     "typescript": "^5"
63:   },
64:   "prisma": {
65:     "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
66:   }
67: }
````

## File: components/course/AssignmentForm.tsx
````typescript
  1: 'use client'
  2: import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
  3: import { useRouter, usePathname } from 'next/navigation'
  4: import { Loader2, Info, X, Send } from "lucide-react"
  5: import { saveAssignmentDraftAction } from '@/app/actions/course-actions'
  6: interface AssignmentFormProps {
  7:     lessonId: string
  8:     lessonOrder: number
  9:     startedAt: Date | null
 10:     videoPercent: number
 11:     videoUrl: string | null
 12:     onSubmit: (data: any, isUpdate?: boolean) => Promise<{ success: boolean; totalScore: number } | void>
 13:     initialData?: any
 14:     onSaveDraft?: React.MutableRefObject<(() => Promise<void>) | undefined>
 15:     onDraftSaved?: (draftInfo: any) => void
 16:     onFormDataChange?: (data: { reflection: string; links: string[]; supports: boolean[] }) => void
 17: }
 18: function formatDate(date: Date | null) {
 19:     if (!date) return '--/--/----'
 20:     return new Date(date).toLocaleDateString('vi-VN')
 21: }
 22: function calcDeadline(startedAt: Date | null, order: number) {
 23:     if (!startedAt) return null
 24:     const d = new Date(startedAt)
 25:     d.setDate(d.getDate() + (order - 1))
 26:     return d
 27: }
 28: // ─── Popup Quy tắc ─────────────────────────────────────────────────────────
 29: function RulesModal({ onClose }: { onClose: () => void }) {
 30:     return (
 31:         <div className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/50" onClick={onClose}>
 32:             <div
 33:                 className="mt-16 mr-2 w-80 bg-white rounded-xl shadow-2xl border border-orange-200 text-sm text-gray-700 overflow-hidden"
 34:                 onClick={e => e.stopPropagation()}
 35:             >
 36:                 <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between">
 37:                     <span className="font-bold text-base">📋 Quy tắc chấm điểm (Thang 10)</span>
 38:                     <button onClick={onClose}><X className="w-4 h-4" /></button>
 39:                 </div>
 40:                 <div className="p-4 space-y-3">
 41:                     <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
 42:                         <p className="text-orange-700 text-xs font-semibold">✅ Điểm ≥ 5/10: Hoàn thành bài học và mở khóa bài tiếp theo.</p>
 43:                     </div>
 44:                     <div>
 45:                         <p className="font-bold text-orange-600">1. Học theo Video (Max 2đ)</p>
 46:                         <p className="text-gray-600 mt-1">Xem &gt;50% <span className="text-green-600">(+1đ)</span>, Xem hết <span className="text-green-600">(+2đ)</span>.</p>
 47:                     </div>
 48:                     <div>
 49:                         <p className="font-bold text-orange-600">2. Bài học Tâm đắc Ngộ (Max 2đ)</p>
 50:                         <p className="text-gray-600 mt-1">Có chia sẻ <span className="text-green-600">(+1đ)</span>, Sâu sắc (dài hơn 50 ký tự) <span className="text-green-600">(+1đ)</span>.</p>
 51:                     </div>
 52:                     <div>
 53:                         <p className="font-bold text-orange-600">3. Thực hành nộp link video (Max 3đ)</p>
 54:                         <p className="text-gray-600 mt-1">Mỗi link video <span className="text-green-600">(+1đ)</span>.</p>
 55:                     </div>
 56:                     <div>
 57:                         <p className="font-bold text-orange-600">4. Hỗ trợ (Max 2đ)</p>
 58:                         <p className="text-gray-600 mt-1">
 59:                             Giúp người: Nhắc 2 đồng đội mình nhận hỗ trợ <span className="text-green-600">(+1đ)</span>.<br />
 60:                             Giúp người giúp người: Đồng đội mình nhắc 2 người họ nhận hỗ trợ <span className="text-green-600">(+1đ)</span>.<br />
 61:                             <span className="text-gray-400 text-xs">Nếu chưa có người để hỗ trợ: Nhắc ngược lên trên được tích vào ô đầu (+1đ).</span>
 62:                         </p>
 63:                     </div>
 64:                     <div>
 65:                         <p className="font-bold text-orange-600">5. Giữ tín đúng hạn (1đ)</p>
 66:                         <p className="text-gray-600 mt-1">
 67:                             Nộp trước 23:59 <span className="text-green-600">(+1đ)</span>.<br />
 68:                             <span className="text-red-500">Trừ điểm: Nộp muộn sau 23:59 (-1đ).</span>
 69:                         </p>
 70:                     </div>
 71:                 </div>
 72:             </div>
 73:         </div>
 74:     )
 75: }
 76: function SectionHead({ num, label, max, current }: { num: number; label: string; max: number; current: number }) {
 77:     return (
 78:         <div className="flex items-center justify-between mb-1.5">
 79:             <span className="font-semibold text-gray-800 text-sm">{num}. {label}</span>
 80:             <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${current > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
 81:                 {current}/{max}
 82:             </span>
 83:         </div>
 84:     )
 85: }
 86: export default function AssignmentForm({
 87:     lessonId,
 88:     lessonOrder,
 89:     startedAt,
 90:     videoPercent = 0,
 91:     videoUrl = null,
 92:     onSubmit,
 93:     initialData,
 94:     onSaveDraft,
 95:     onDraftSaved,
 96:     onFormDataChange,
 97: }: AssignmentFormProps) {
 98:     const [loading, setLoading] = useState(false)
 99:     const [showRules, setShowRules] = useState(false)
100:     const [reflection, setReflection] = useState<string>(initialData?.assignment?.reflection || "")
101:     const [links, setLinks] = useState<string[]>(
102:         initialData?.assignment?.links?.length > 0
103:             ? [...initialData.assignment.links, "", "", ""].slice(0, 3)
104:             : ["", "", ""]
105:     )
106:     const [supports, setSupports] = useState<boolean[]>(initialData?.assignment?.supports || [false, false])
107:     // Refs
108:     const isDirtyRef = useRef(false)
109:     const initialRenderRef = useRef(true)
110:     const deadline = calcDeadline(startedAt, lessonOrder)
111:     const isCompleted = initialData?.status === 'COMPLETED'
112:     const existingTotalScore = initialData?.totalScore ?? 0
113:     const existingScores = initialData?.scores ?? {}
114:     const saveDraft = useCallback(async () => {
115:         if (isCompleted) return
116:         const hasData = reflection.trim() || links.some(l => l.trim()) || supports.some(s => s)
117:         if (hasData) {
118:             const draftData = { reflection, links, supports }
119:             try {
120:                 await saveAssignmentDraftAction({
121:                     enrollmentId: initialData?.enrollmentId,
122:                     lessonId,
123:                     ...draftData
124:                 })
125:                 if (onDraftSaved) onDraftSaved(draftData)
126:                 isDirtyRef.current = false
127:             } catch (error) {
128:                 console.error('Failed to save draft:', error)
129:             }
130:         }
131:     }, [reflection, links, supports, lessonId, initialData?.enrollmentId, onDraftSaved, isCompleted])
132:     // Track thay đổi để bật flag isDirty
133:     useEffect(() => {
134:         if (initialRenderRef.current) {
135:             initialRenderRef.current = false
136:             return
137:         }
138:         isDirtyRef.current = true
139:         if (onFormDataChange) {
140:             onFormDataChange({ reflection, links, supports })
141:         }
142:     }, [reflection, links, supports, onFormDataChange])
143:     // Đăng ký ref để parent ép lưu draft
144:     useEffect(() => {
145:         if (onSaveDraft) {
146:             onSaveDraft.current = async () => {
147:                 if (isDirtyRef.current) {
148:                     await saveDraft()
149:                     isDirtyRef.current = false
150:                 }
151:             }
152:         }
153:     }, [onSaveDraft, saveDraft])
154:     // Lưu draft khi rời trang
155:     useEffect(() => {
156:         if (isCompleted) return
157:         const handleBeforeUnload = () => {
158:             if (isDirtyRef.current) saveDraft()
159:         }
160:         window.addEventListener('beforeunload', handleBeforeUnload)
161:         window.addEventListener('pagehide', handleBeforeUnload)
162:         return () => {
163:             window.removeEventListener('beforeunload', handleBeforeUnload)
164:             window.removeEventListener('pagehide', handleBeforeUnload)
165:         }
166:     }, [saveDraft, isCompleted])
167:     // Realtime scoring
168:     // Rule: Nếu không có link video YouTube -> mặc định 2đ video
169:     const hasYouTubeVideo = !!videoUrl && /youtu\.be\/|youtube\.com\/|v=/.test(videoUrl)
170:     const displayPercent = hasYouTubeVideo ? videoPercent : 100
171:     const vidScore = useMemo(() => {
172:         if (!hasYouTubeVideo) return 2 // Không có video -> auto 2đ
173:         if (videoPercent >= 95) return 2
174:         if (videoPercent >= 50) return 1
175:         return 0
176:     }, [videoPercent, hasYouTubeVideo])
177:     const refScore = useMemo(() => {
178:         if (reflection.trim().length >= 86) return 2 // Mentor 7 yêu cầu 86 ký tự cho bài học tâm đắc ngộ
179:         if (reflection.trim().length > 0) return 1
180:         return 0
181:     }, [reflection])
182:     const validLinksCount = useMemo(() => links.filter(l => l.trim().length > 0).length, [links])
183:     const pracScore = useMemo(() => Math.min(validLinksCount, 3), [validLinksCount])
184:     const supportScore = useMemo(() => supports.filter(Boolean).length, [supports])
185:     const currentTimingScore = useMemo(() => {
186:         if (!deadline) return 0
187:         const dl = new Date(deadline)
188:         dl.setHours(23, 59, 59, 999)
189:         const isNowOnTime = new Date().getTime() <= dl.getTime()
190:         if (isCompleted) {
191:             // Nếu đã xong: 
192:             // - Nếu bây giờ vẫn trong hạn -> auto +1 (để gỡ điểm trễ)
193:             // - Nếu bây giờ quá hạn -> giữ nguyên điểm cũ (bảo vệ điểm đúng hạn)
194:             if (isNowOnTime) return 1
195:             return existingScores.timing ?? -1
196:         }
197:         return isNowOnTime ? 1 : -1
198:     }, [deadline, isCompleted, existingScores.timing])
199:     const total = Math.max(0, vidScore + refScore + pracScore + supportScore + currentTimingScore)
200:     const isOverdue = currentTimingScore === -1 && !isCompleted // Chỉ coi là trễ nếu chưa xong bài và hết hạn
201:     const handleSubmit = async () => {
202:         if (!startedAt) { alert("Bạn chưa xác nhận ngày bắt đầu lộ trình!"); return }
203:         if (isCompleted && isOverdue) {
204:             alert("Bài học đã nộp trễ hạn. Không thể cập nhật.")
205:             return
206:         }
207:         const isUpdate = isCompleted
208:         setLoading(true)
209:         try {
210:             // Lấy múi giờ hiện tại của thiết bị học viên
211:             const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
212:             const result = await onSubmit({ 
213:                 reflection, 
214:                 links, 
215:                 supports,
216:                 clientTimeZone // Gửi kèm múi giờ về server
217:             }, isUpdate)
218:             if (result?.success) {
219:                 isDirtyRef.current = false
220:                 if (onFormDataChange && !isUpdate) {
221:                     onFormDataChange({ reflection: '', links: ['', '', ''], supports: [false, false] })
222:                 }
223:             }
224:         } finally {
225:             setLoading(false)
226:         }
227:     }
228:     return (
229:         <div className="flex flex-col h-full min-h-0 bg-[#FFFDE7]">
230:             {showRules && <RulesModal onClose={() => setShowRules(false)} />}
231:             <div className="shrink-0 z-10 bg-[#FFFDE7] border-b border-orange-200 px-4 py-2">
232:                 <div className="flex items-center justify-between">
233:                     <p className="text-[11px] text-gray-500 leading-tight" suppressHydrationWarning>
234:                         Hoàn thành trước 23:59 ngày <span className="font-semibold text-gray-700" suppressHydrationWarning>{formatDate(deadline)}</span>
235:                     </p>
236:                     <span className="text-sm font-black text-orange-500">Tổng: {total}/10</span>
237:                 </div>
238:                 <div className="flex gap-1.5 mt-1.5">
239:                     {!(isCompleted && isOverdue) && (
240:                         <button
241:                             onClick={handleSubmit}
242:                             disabled={loading}
243:                             className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black rounded-xl py-2 transition-all shadow-md disabled:opacity-60 text-sm"
244:                         >
245:                             {loading
246:                                 ? <Loader2 className="w-4 h-4 animate-spin" />
247:                                 : <><Send className="w-3.5 h-3.5" /> {isCompleted ? 'CẬP NHẬT' : 'GHI NHẬN KẾT QUẢ'}</>
248:                             }
249:                         </button>
250:                     )}
251:                     {isCompleted && isOverdue && (
252:                         <div className="flex-1 flex items-center justify-center gap-1.5 bg-gray-300 text-gray-500 font-black rounded-xl py-2 text-sm">
253:                             ĐÃ HOÀN THÀNH CẬP NHẬT
254:                         </div>
255:                     )}
256:                     <button
257:                         onClick={() => setShowRules(true)}
258:                         className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-xl border border-orange-300 transition text-xs font-semibold"
259:                         title="Xem quy tắc chấm điểm"
260:                     >
261:                         <Info className="w-3.5 h-3.5" /> Quy tắc
262:                     </button>
263:                 </div>
264:             </div>
265:             <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 p-3">
266:                 <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
267:                     <SectionHead num={1} label={hasYouTubeVideo ? "Mở TRÍ = học theo Video (2đ)" : "Mở TRÍ = Nội dung bài học (2đ)"} max={2} current={vidScore} />
268:                     <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
269:                         <div
270:                             className={`h-full transition-all duration-500 rounded-full ${!hasYouTubeVideo ? 'bg-emerald-500' : 'bg-orange-400'}`}
271:                             style={{ width: `${displayPercent}%` }}
272:                         />
273:                     </div>
274:                     <p className="text-[10px] text-gray-400 mt-0.5">
275:                         {hasYouTubeVideo
276:                             ? `Đang xem: ${videoPercent.toFixed(0)}%`
277:                             : '✓ Không có video - Đã hoàn thành nội dung'}
278:                     </p>
279:                 </div>
280:                 <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
281:                     <SectionHead num={2} label="Bồi NHÂN = Bài học Tâm đắc Ngộ (2đ)" max={2} current={refScore} />
282:                     <textarea
283:                         value={reflection}
284:                         onChange={e => setReflection(e.target.value)}
285:                         placeholder="Điều bạn tâm đắc ngộ được từ bài học hôm nay..."
286:                         rows={3}
287:                         className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-300"
288:                     />
289:                     <p className="text-[10px] text-gray-400 mt-0.5">{reflection.length} ký tự {reflection.length >= 86 ? '✓ Sâu sắc' : '(cần ≥ 86 để đạt max)'}</p>
290:                 </div>
291:                 <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
292:                     <SectionHead num={3} label="Hành LỄ = Link thực hành mỗi ngày (3đ)" max={3} current={pracScore} />
293:                     <div className="flex flex-col gap-1.5">
294:                         {links.map((link, i) => (
295:                             <input
296:                                 key={i}
297:                                 type="url"
298:                                 value={link}
299:                                 onChange={e => {
300:                                     const next = [...links]
301:                                     next[i] = e.target.value
302:                                     setLinks(next)
303:                                 }}
304:                                 placeholder={`link video hoặc link bài tập ${i + 1}`}
305:                                 className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-300"
306:                             />
307:                         ))}
308:                     </div>
309:                 </div>
310:                 <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
311:                     <SectionHead num={4} label="Trọng NGHĨA = hỗ trợ đồng đội (2đ)" max={2} current={supportScore} />
312:                     <div className="flex flex-col gap-1.5">
313:                         {[
314:                             'Giúp người (+1đ)',
315:                             'Giúp người giúp người (+1đ)'
316:                         ].map((label, i) => (
317:                             <label key={i} className="flex items-center gap-2.5 cursor-pointer select-none">
318:                                 <input
319:                                     type="checkbox"
320:                                     checked={supports[i]}
321:                                     onChange={e => {
322:                                         const next = [...supports]
323:                                         next[i] = e.target.checked
324:                                         setSupports(next)
325:                                     }}
326:                                     className="w-4 h-4 accent-orange-500 cursor-pointer"
327:                                 />
328:                                 <span className={`text-sm ${supports[i] ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>
329:                                     {label}
330:                                 </span>
331:                             </label>
332:                         ))}
333:                     </div>
334:                 </div>
335:                 <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
336:                     <SectionHead num={5} label="Giữ TÍN = Làm đúng hạn (1đ)" max={1} current={currentTimingScore === 1 ? 1 : 0} />
337:                     <div className="flex flex-col gap-1 text-sm">
338:                         <div className="flex justify-between">
339:                             <span className="text-gray-500">Đúng hạn (Trước 23:59):</span>
340:                             <span className="text-green-600 font-bold">+1đ</span>
341:                         </div>
342:                         <div className="flex justify-between">
343:                             <span className="text-gray-500">Muộn (Sau 23:59):</span>
344:                             <span className="text-red-500 font-bold">-1đ</span>
345:                         </div>
346:                     </div>
347:                     <p className="text-[10px] text-gray-400 mt-1">* Hệ thống tự động ghi nhận theo thời gian thực.</p>
348:                 </div>
349:                 <div className="h-2" />
350:             </div>
351:         </div>
352:     )
353: }
````

## File: prisma/schema.prisma
````prisma
  1: generator client {
  2:   provider = "prisma-client-js"
  3: }
  4: 
  5: datasource db {
  6:   provider  = "postgresql"
  7:   url       = env("DATABASE_URL")
  8:   directUrl = env("DIRECT_URL")
  9: }
 10: 
 11: model User {
 12:   id            Int          @id @default(autoincrement())
 13:   name          String?
 14:   email         String       @unique
 15:   emailVerified DateTime?
 16:   image         String?
 17:   password      String?
 18:   phone         String?      @unique
 19:   role          Role         @default(STUDENT)
 20:   referrerId    Int?
 21:   createdAt     DateTime     @default(now())
 22:   updatedAt     DateTime     @updatedAt
 23:   accounts      Account[]
 24:   enrollments   Enrollment[]
 25:   sessions      Session[]
 26:   lessonComments LessonComment[] @relation("UserToLessonComment")
 27:   posts         Post[]          @relation("UserToPost")
 28:   postComments  PostComment[]   @relation("UserToPostComment")
 29:   referrer      User?        @relation("ReferrerToReferee", fields: [referrerId], references: [id])
 30:   referrals     User[]       @relation("ReferrerToReferee")
 31:   
 32:   // Zero 2 Hero Data
 33:   goal          String?      // Mục tiêu học tập
 34:   surveyResults Json?        // Kết quả khảo sát đầu vào
 35:   customPath    Json?        // Lộ trình cá nhân hóa (danh sách ID khóa học)
 36: 
 37:   @@index([email])
 38:   @@index([phone])
 39:   @@index([referrerId])
 40: }
 41: 
 42: model Post {
 43:   id        String        @id @default(cuid())
 44:   title     String
 45:   content   String        @db.Text
 46:   image     String?
 47:   published Boolean       @default(true)
 48:   pin       Boolean       @default(false)
 49:   createdAt DateTime      @default(now())
 50:   updatedAt DateTime      @updatedAt
 51:   authorId  Int
 52:   author    User          @relation("UserToPost", fields: [authorId], references: [id], onDelete: Cascade)
 53:   comments  PostComment[]
 54: 
 55:   @@index([authorId])
 56: }
 57: 
 58: model PostComment {
 59:   id        Int      @id @default(autoincrement())
 60:   postId    String
 61:   userId    Int
 62:   content   String   @db.Text
 63:   createdAt DateTime @default(now())
 64:   updatedAt DateTime @updatedAt
 65:   post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
 66:   user      User     @relation("UserToPostComment", fields: [userId], references: [id], onDelete: Cascade)
 67: 
 68:   @@index([postId])
 69:   @@index([userId])
 70: }
 71: 
 72: model Account {
 73:   userId            Int
 74:   type              String
 75:   provider          String
 76:   providerAccountId String
 77:   refresh_token     String?
 78:   access_token      String?
 79:   expires_at        Int?
 80:   token_type        String?
 81:   scope             String?
 82:   id_token          String?
 83:   session_state     String?
 84:   createdAt         DateTime @default(now())
 85:   updatedAt         DateTime @updatedAt
 86:   user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
 87: 
 88:   @@id([provider, providerAccountId])
 89: }
 90: 
 91: model Session {
 92:   sessionToken String   @unique
 93:   userId       Int
 94:   expires      DateTime
 95:   createdAt    DateTime @default(now())
 96:   updatedAt    DateTime @updatedAt
 97:   user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
 98: }
 99: 
100: model VerificationToken {
101:   identifier String
102:   token      String
103:   expires    DateTime
104: 
105:   @@id([identifier, token])
106: }
107: 
108: model SystemConfig {
109:   key   String @id
110:   value Json
111: }
112: 
113: model ReservedId {
114:   id        Int      @id
115:   note      String?
116:   createdAt DateTime @default(now())
117: }
118: 
119: model Course {
120:   id            Int          @id @default(autoincrement())
121:   id_khoa       String       @unique
122:   name_lop      String
123:   name_khoa     String?
124:   date_join     String?
125:   status        Boolean      @default(true)
126:   pin           Int          @default(0)
127:   mo_ta_ngan    String?
128:   mo_ta_dai     String?
129:   link_anh_bia  String?      @map("link_anh_bia_khoa")
130:   link_zalo     String?
131:   phi_coc       Int          @default(0)
132:   stk           String?
133:   name_stk      String?
134:   bank_stk      String?
135:   noidung_stk   String?
136:   link_qrcode   String?
137:   file_email    String?
138:   noidung_email String?
139:   createdAt     DateTime     @default(now())
140:   updatedAt     DateTime     @updatedAt
141:   type          CourseType   @default(NORMAL)
142:   lessons       Lesson[]
143:   enrollments   Enrollment[]
144: }
145: 
146: model Lesson {
147:   id               String           @id @default(cuid())
148:   courseId         Int
149:   title            String
150:   videoUrl         String?
151:   content          String?
152:   order            Int
153:   isDailyChallenge Boolean          @default(false)
154:   course           Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)
155:   progress         LessonProgress[]
156:   comments         LessonComment[]
157: 
158:   @@unique([courseId, order])
159: }
160: 
161: model Enrollment {
162:   id           Int              @id @default(autoincrement())
163:   userId       Int
164:   courseId     Int
165:   status       EnrollmentStatus @default(PENDING)
166:   createdAt    DateTime         @default(now())
167:   updatedAt    DateTime         @updatedAt
168:   link_anh_coc String?
169:   phi_coc      Int              @default(0)
170:   startedAt    DateTime?
171:   resetAt      DateTime?
172:   lastLessonId String?
173:   challengeDays Int?
174:   course       Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)
175:   user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
176:   lessonProgress LessonProgress[]
177:   payment      Payment?
178: 
179:   @@unique([userId, courseId])
180:   @@index([userId])
181:   @@index([courseId])
182: }
183: 
184: model LessonProgress {
185:   id           Int        @id @default(autoincrement())
186:   enrollmentId Int
187:   lessonId     String
188:   scores       Json?
189:   totalScore   Int        @default(0)
190:   assignment   Json?
191:   status       String     @default("IN_PROGRESS")
192:   maxTime      Float      @default(0)
193:   duration     Float      @default(0)
194:   submittedAt  DateTime?
195:   createdAt    DateTime   @default(now())
196:   updatedAt    DateTime   @updatedAt
197:   enrollment   Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
198:   lesson       Lesson     @relation(fields: [lessonId], references: [id], onDelete: Cascade)
199:   
200:   @@unique([enrollmentId, lessonId])
201:   @@index([enrollmentId])
202:   @@index([lessonId])
203:   @@index([status])
204: }
205: 
206: model LessonComment {
207:   id        Int      @id @default(autoincrement())
208:   lessonId  String
209:   userId    Int
210:   content   String
211:   createdAt DateTime @default(now())
212:   user      User     @relation("UserToLessonComment", fields: [userId], references: [id], onDelete: Cascade)
213:   lesson    Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
214: 
215:   @@index([lessonId])
216:   @@index([userId])
217: }
218: 
219: model Message {
220:   id        Int      @id @default(autoincrement())
221:   content   String
222:   detail    String
223:   imageUrl  String?
224:   isActive  Boolean  @default(true)
225:   createdAt DateTime @default(now())
226: }
227: 
228: enum EnrollmentStatus {
229:   PENDING
230:   ACTIVE
231: }
232: 
233: enum Role {
234:   ADMIN
235:   STUDENT
236:   INSTRUCTOR
237:   AFFILIATE
238: }
239: 
240: enum CourseType {
241:   NORMAL
242:   CHALLENGE
243: }
244: 
245: enum PaymentStatus {
246:   PENDING
247:   VERIFIED
248:   REJECTED
249:   CANCELLED
250: }
251: 
252: model Payment {
253:   id              Int            @id @default(autoincrement())
254:   enrollmentId    Int            @unique
255:   amount          Int
256:   bankName        String?
257:   accountNumber   String?
258:   transferTime    DateTime?
259:   content         String?
260:   phone           String?
261:   courseCode      String?
262:   proofImage      String?
263:   status          PaymentStatus  @default(PENDING)
264:   verifiedAt      DateTime?
265:   verifyMethod    String?
266:   note            String?
267:   transferContent String?
268:   qrCodeUrl       String?
269:   createdAt       DateTime       @default(now())
270:   updatedAt       DateTime       @updatedAt
271:   enrollment      Enrollment     @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
272: }
````

## File: app/page.tsx
````typescript
  1: import { auth } from "@/auth";
  2: import Header from "@/components/layout/Header";
  3: import CourseCard from "@/components/course/CourseCard";
  4: import CourseSection from "@/components/home/CourseSection";
  5: import MessageCard from "@/components/home/MessageCard";
  6: import CommunityBoard from "@/components/home/CommunityBoard";
  7: import Zero2HeroSurvey from "@/components/home/Zero2HeroSurvey";
  8: import RealityMap from "@/components/home/RealityMap";
  9: import prisma from "@/lib/prisma";
 10: import { getRandomMessage } from "./actions/message-actions";
 11: import { resetSurveyAction } from "./actions/survey-actions";
 12: export default async function Home() {
 13:   const session = await auth();
 14:   // Parallel: lấy user + courses + message cùng lúc
 15:   const [courses, userRecord, message] = await Promise.all([
 16:     (prisma as any).course.findMany({
 17:       where: { status: true },
 18:       orderBy: [{ pin: 'asc' }, { id: 'asc' }]
 19:     }),
 20:     session?.user?.id
 21:       ? (prisma as any).user.findUnique({
 22:         where: { id: parseInt(session.user.id) },
 23:         select: { name: true, id: true, image: true, phone: true, customPath: true, goal: true }
 24:       })
 25:       : Promise.resolve(null),
 26:     getRandomMessage()
 27:   ]);
 28:   const userName = userRecord?.name ?? null;
 29:   const userId = userRecord?.id ?? null;
 30:   const userImage = userRecord?.image ?? session?.user?.image ?? null;
 31:   const userPhone = userRecord?.phone ?? null;
 32:   const customPath = userRecord?.customPath as number[] | null;
 33:   const userGoal = userRecord?.goal ?? null;
 34:   // 1. Sử dụng Set để lưu ID khóa học đã đăng ký
 35:   let myCourseIds = new Set<number>();
 36: let enrollmentsMap: Record<number, { 
 37:   status: string; 
 38:   startedAt: Date | null; 
 39:   completedCount: number; 
 40:   totalLessons: number;
 41:   enrollmentId?: number;
 42:   payment?: {
 43:     id: number;
 44:     status: string;
 45:     proofImage?: string | null;
 46:   };
 47: }> = {};
 48: if (session?.user?.id) {
 49:   const userId = parseInt(session.user.id);
 50:   const enrollments = await (prisma as any).enrollment.findMany({
 51:     where: { userId },
 52:     select: {
 53:       id: true,
 54:       courseId: true,
 55:       status: true,
 56:       startedAt: true,
 57:       payment: {
 58:         select: {
 59:           id: true,
 60:           status: true,
 61:           proofImage: true
 62:         }
 63:       },
 64:       course: {
 65:         select: {
 66:           _count: {
 67:             select: { lessons: true }
 68:           }
 69:         }
 70:       },
 71:       _count: {
 72:         select: {
 73:           lessonProgress: {
 74:             where: { status: 'COMPLETED' }
 75:           }
 76:         }
 77:       }
 78:     }
 79:   });
 80:   enrollments.forEach((e: any) => {
 81:     myCourseIds.add(e.courseId);
 82:     enrollmentsMap[e.courseId] = {
 83:       status: e.status,
 84:       startedAt: e.startedAt,
 85:       completedCount: e._count?.lessonProgress || 0,
 86:       totalLessons: e.course?._count?.lessons || 0,
 87:       enrollmentId: e.id,
 88:       payment: e.payment
 89:     };
 90:   });
 91: }
 92:   const myCourses = courses.filter((c: any) => myCourseIds.has(c.id));
 93:   const otherCourses = courses.filter((c: any) => !myCourseIds.has(c.id));
 94:   // Kiểm tra user có kích hoạt khóa 1 (86 ngày) không
 95:   const isCourseOneActive = enrollmentsMap[1]?.status === 'ACTIVE';
 96:   return (
 97:     <main className="min-h-screen bg-gray-50">
 98:       {/* Header */}
 99:       <Header session={session} userImage={userImage} />
100:       {/* Hero Section */}
101:       <div className="pt-16">
102:         <MessageCard message={message} session={session} userName={userName || ''} userId={userId ? String(userId) : ''} />
103:       </div>
104:       {/* Lộ trình Zero 2 Hero */}
105:       {session?.user && (
106:         <section className="container mx-auto px-4 py-8">
107:           {!customPath || customPath.length === 0 ? (
108:             <Zero2HeroSurvey />
109:           ) : (
110:             <RealityMap 
111:               customPath={customPath}
112:               enrollmentsMap={enrollmentsMap}
113:               allCourses={courses}
114:               userGoal={userGoal || 'Hoàn thiện kỹ năng'}
115:               onReset={resetSurveyAction}
116:             />
117:           )}
118:         </section>
119:       )}
120:       {/* Community Board Module */}
121:       <section className="container mx-auto px-4 py-8">
122:         <CommunityBoard isAdmin={session?.user?.role === 'ADMIN'} />
123:       </section>
124:       {/* Course List Section */}
125:       <section id="khoa-hoc" className="container mx-auto px-4 pb-24">
126:         {session?.user ? (
127:           <>
128:             {/* Khóa học của tôi */}
129:             {myCourses.length > 0 && (
130:               <CourseSection 
131:                 title="Khóa học của tôi"
132:                 courses={myCourses}
133:                 session={session}
134:                 enrollmentsMap={enrollmentsMap}
135:                 isCourseOneActive={isCourseOneActive}
136:                 userPhone={userPhone}
137:                 userId={userId}
138:                 darkMode={true}
139:                 accentColor="bg-emerald-500"
140:               />
141:             )}
142:             {/* Các khóa học khác */}
143:             {otherCourses.length > 0 && (
144:               <CourseSection 
145:                 title="Tất cả khóa học"
146:                 courses={otherCourses}
147:                 session={session}
148:                 enrollmentsMap={enrollmentsMap}
149:                 isCourseOneActive={isCourseOneActive}
150:                 userPhone={userPhone}
151:                 userId={userId}
152:                 accentColor="bg-blue-600"
153:               />
154:             )}
155:           </>
156:         ) : (
157:           <CourseSection 
158:             title="Danh Sách Khóa Học"
159:             courses={courses}
160:             session={null}
161:             enrollmentsMap={{}}
162:             isCourseOneActive={false}
163:             userPhone={null}
164:             userId={null}
165:             accentColor="bg-blue-600"
166:           />
167:         )}
168:       </section>
169:       {/* Footer (Optional simple) */}
170:       <footer className="bg-gray-100 py-12 text-center text-gray-500 text-sm">
171:         <p>© 2026 Học viện BRK. All rights reserved.</p>
172:       </footer>
173:     </main>
174:   );
175: }
````

## File: components/course/VideoPlayer.tsx
````typescript
  1: 'use client'
  2: import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
  3: import { 
  4:     RotateCcw, CheckCircle, List, ChevronLeft, ChevronRight, 
  5:     Play, CheckCircle2, X, FileText, Clock, Loader2, PlayCircle, SkipBack, SkipForward, Maximize2
  6: } from 'lucide-react'
  7: import { cn } from "@/lib/utils"
  8: import { saveVideoProgressAction } from '@/app/actions/course-actions'
  9: interface VideoPlayerProps {
 10:     enrollmentId: number
 11:     lessonId: string
 12:     videoUrl: string | null
 13:     lessonContent: string | null
 14:     initialMaxTime: number
 15:     onProgress: (maxTime: number, duration: number) => void
 16:     onPercentChange: (percent: number) => void
 17:     playlistData?: any 
 18:     lastVideoIndex?: number 
 19: }
 20: type PlaylistItem = {
 21:     type: 'video' | 'doc'
 22:     title: string
 23:     url: string
 24:     id?: string | null
 25: }
 26: export default function VideoPlayer({
 27:     enrollmentId,
 28:     lessonId,
 29:     videoUrl,
 30:     lessonContent,
 31:     initialMaxTime,
 32:     onProgress,
 33:     onPercentChange,
 34:     playlistData,
 35:     lastVideoIndex = 0
 36: }: VideoPlayerProps) {
 37:     const playlist = useMemo(() => {
 38:         if (!videoUrl) return []
 39:         return videoUrl.split('|').map((item, index) => {
 40:             const videoMatch = item.match(/^\[(.*?)\](.*)$/)
 41:             if (videoMatch) return { type: 'video' as const, title: videoMatch[1], url: videoMatch[2].trim(), id: extractVideoId(videoMatch[2].trim()) }
 42:             const docMatch = item.match(/^\((.*?)\)(.*)$/)
 43:             if (docMatch) return { type: 'doc' as const, title: docMatch[1], url: docMatch[2].trim() }
 44:             return { type: 'video' as const, title: `Phần ${index + 1}`, url: item.trim(), id: extractVideoId(item.trim()) }
 45:         })
 46:     }, [videoUrl])
 47: const [currentIndex, setCurrentVideoIndex] = useState(lastVideoIndex < playlist.length ? lastVideoIndex : 0)
 48: const [showPlaylist, setShowPlaylist] = useState(false)
 49: const [isMounted, setIsMounted] = useState(false)
 50: const [isFullscreen, setIsFullscreen] = useState(false) // State cho lớp phủ toàn màn hình
 51: // Timer cho tài liệu (30s)
 52: const [docTimer, setDocTimer] = useState<number>(0)
 53: const [isReading, setIsReading] = useState(false)
 54: // Tiến độ chi tiết từng mục: { index: { maxTime, duration } }
 55: const [granularProgress, setGranularProgress] = useState<Record<number, {maxTime: number, duration: number}>>(() => {
 56:     return playlistData || {}
 57: })
 58:     const playerRef = useRef<any>(null)
 59:     const containerRef = useRef<HTMLDivElement>(null)
 60: const saveIntervalRef = useRef<any>(null)
 61: const docTimerRef = useRef<any>(null)
 62: const currentItem = playlist[currentIndex]
 63: useEffect(() => { setIsMounted(true) }, [])
 64: // Xử lý phím Esc để thoát full màn hình
 65: useEffect(() => {
 66:     const handleEsc = (e: KeyboardEvent) => {
 67:         if (e.key === 'Escape') setIsFullscreen(false)
 68:     }
 69:     window.addEventListener('keydown', handleEsc)
 70:     return () => window.removeEventListener('keydown', handleEsc)
 71: }, [])
 72: const toggleFullScreen = () => {
 73:     setIsFullscreen(!isFullscreen)
 74: }
 75:     const calculateAggregateProgress = useCallback((updatedGranular: any) => {
 76:         let totalMaxTime = 0
 77:         let totalDuration = 0
 78:         playlist.forEach((item, idx) => {
 79:             const p = updatedGranular[idx] || { maxTime: 0, duration: item.type === 'doc' ? 30 : 0 }
 80:             totalMaxTime += p.maxTime
 81:             totalDuration += p.duration
 82:         })
 83:         if (totalDuration === 0) return { maxTime: initialMaxTime, duration: 0 }
 84:         return { maxTime: totalMaxTime, duration: totalDuration }
 85:     }, [playlist, initialMaxTime])
 86:     const saveProgress = useCallback(async (index: number, maxTime: number, duration: number) => {
 87:         const nextGranular = { ...granularProgress, [index]: { maxTime, duration } }
 88:         setGranularProgress(nextGranular)
 89:         const aggregate = calculateAggregateProgress(nextGranular)
 90:         // [FIX] Sử dụng setTimeout để đẩy các thay đổi state ra khỏi chu kỳ render hiện tại
 91:         setTimeout(() => {
 92:             onProgress(aggregate.maxTime, aggregate.duration)
 93:             if (aggregate.duration > 0) {
 94:                 onPercentChange(Math.min(100, Math.round((aggregate.maxTime / aggregate.duration) * 100)))
 95:             }
 96:             // Gọi Server Action an toàn sau render
 97:             saveVideoProgressAction({ 
 98:                 enrollmentId, 
 99:                 lessonId, 
100:                 maxTime: aggregate.maxTime, 
101:                 duration: aggregate.duration, 
102:                 lastIndex: index, 
103:                 playlistScores: nextGranular 
104:             }).catch(() => {})
105:         }, 0)
106:     }, [enrollmentId, lessonId, granularProgress, calculateAggregateProgress, onProgress, onPercentChange])
107:     const trackVideoProgress = useCallback(() => {
108:         if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return
109:         const currentTime = playerRef.current.getCurrentTime()
110:         const duration = playerRef.current.getDuration()
111:         const currentStored = granularProgress[currentIndex] || { maxTime: 0, duration: 0 }
112:         if (currentTime > currentStored.maxTime) saveProgress(currentIndex, currentTime, duration)
113:     }, [currentIndex, granularProgress, saveProgress])
114:     useEffect(() => {
115:         if (currentItem?.type === 'doc') {
116:             const currentStored = granularProgress[currentIndex] || { maxTime: 0, duration: 30 }
117:             if (currentStored.maxTime < 30) {
118:                 setDocTimer(currentStored.maxTime)
119:                 setIsReading(true)
120:                 docTimerRef.current = setInterval(() => {
121:                     setDocTimer(prev => {
122:                         const next = prev + 1
123:                         if (next >= 30) {
124:                             clearInterval(docTimerRef.current)
125:                             setIsReading(false)
126:                             saveProgress(currentIndex, 30, 30)
127:                             return 30
128:                         }
129:                         if (next % 5 === 0) saveProgress(currentIndex, next, 30)
130:                         return next
131:                     })
132:                 }, 1000)
133:             } else { setDocTimer(30); setIsReading(false); }
134:         }
135:         return () => { if (docTimerRef.current) clearInterval(docTimerRef.current) }
136:     }, [currentIndex, currentItem?.type])
137:     useEffect(() => {
138:         if (!isMounted || currentItem?.type !== 'video' || !currentItem?.id) return
139:         const initPlayer = () => {
140:             if (playerRef.current) playerRef.current.destroy()
141:             const stored = granularProgress[currentIndex] || { maxTime: 0, duration: 0 }
142:             // [FIX] Luôn bắt đầu từ mốc đã lưu (nếu đã xong thì đứng ở cuối)
143:             const startTime = Math.floor(stored.maxTime)
144:             playerRef.current = new (window as any).YT.Player(`multimedia-player`, {
145:                 videoId: currentItem.id,
146:                 playerVars: { 
147:                     autoplay: 1, 
148:                     modestbranding: 1, 
149:                     rel: 0, 
150:                     start: startTime 
151:                 },
152:                 events: {
153:                     onStateChange: (e: any) => {
154:                         const YT = (window as any).YT.PlayerState
155:                         if (e.data === YT.PLAYING) {
156:                             if (!saveIntervalRef.current) saveIntervalRef.current = setInterval(trackVideoProgress, 5000)
157:                         } else {
158:                             if (saveIntervalRef.current) { clearInterval(saveIntervalRef.current); saveIntervalRef.current = null; }
159:                         }
160:                         if (e.data === YT.ENDED) {
161:                             const dur = playerRef.current.getDuration()
162:                             saveProgress(currentIndex, dur, dur)
163:                         }
164:                     }
165:                 }
166:             })
167:         }
168:         if ((window as any).YT?.Player) initPlayer()
169:         else {
170:             const tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(tag)
171:             ;(window as any).onYouTubeIframeAPIReady = initPlayer
172:         }
173:         return () => { if (saveIntervalRef.current) clearInterval(saveIntervalRef.current); if (playerRef.current?.destroy) playerRef.current.destroy() }
174:     }, [currentIndex, isMounted, currentItem?.type, currentItem?.id])
175:     const handleNext = () => setCurrentVideoIndex((prev) => (prev + 1) % playlist.length)
176:     const handlePrev = () => setCurrentVideoIndex((prev) => (prev - 1 + playlist.length) % playlist.length)
177:     const getEmbedUrl = (url: string) => {
178:         if (!url.includes('docs.google.com')) return url
179:         if (url.includes('/pub')) return url
180:         const cleanUrl = url.split('/edit')[0].split('/view')[0].split('/preview')[0].replace(/\/+$/, '')
181:         return `${cleanUrl}/preview`
182:     }
183:     if (!isMounted) return <div className="w-full aspect-video bg-black animate-pulse" />
184:     return (
185:         <div className={cn(
186:             "flex flex-col bg-zinc-950 transition-all duration-300",
187:             isFullscreen ? "fixed inset-0 z-[9999] h-screen w-screen" : "w-full"
188:         )}>
189:             <div className={cn(
190:                 "relative bg-black overflow-hidden shadow-2xl transition-all",
191:                 isFullscreen ? "flex-1" : "w-full aspect-video"
192:             )}>
193:                 {currentItem?.type === 'video' ? (
194:                     <div id="multimedia-player" className="w-full h-full" />
195:                 ) : (
196:                     <div className="w-full h-full bg-white relative flex flex-col">
197:                         <iframe src={getEmbedUrl(currentItem.url)} className="flex-1 border-0" allow="autoplay" title="Tài liệu" />
198:                         {isReading && (
199:                             <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-200 z-10">
200:                                 <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${(docTimer / 30) * 100}%` }} />
201:                             </div>
202:                         )}
203:                     </div>
204:                 )}
205:                 {/* PLAYLIST POPUP */}
206:                 {showPlaylist && (
207:                     <div className="absolute inset-0 bg-black/95 z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
208:                         <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
209:                             <h3 className="text-white font-black text-base flex items-center gap-3">
210:                                 <List className="w-5 h-5 text-orange-500" /> DANH SÁCH HỌC ({playlist.length})
211:                             </h3>
212:                             <button onClick={() => setShowPlaylist(false)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all"><X className="w-5 h-5" /></button>
213:                         </div>
214:                         <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[66vh] custom-scrollbar">
215:                             {playlist.map((item, idx) => {
216:                                 const isCurrent = idx === currentIndex
217:                                 const prog = granularProgress[idx] || { maxTime: 0, duration: item.type === 'doc' ? 30 : 0 }
218:                                 const pct = prog.duration > 0 ? Math.round((prog.maxTime / prog.duration) * 100) : 0
219:                                 return (
220:                                     <button key={idx} onClick={() => { setCurrentVideoIndex(idx); setShowPlaylist(false); }} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all border ${isCurrent ? 'bg-orange-500/10 border-orange-500 shadow-lg' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800'}`}>
221:                                         <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isCurrent ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{item.type === 'video' ? <Play className="w-3 h-3 fill-current" /> : <FileText className="w-3 h-3" />}</div>
222:                                         <div className="flex-1 text-left min-w-0">
223:                                             <p className={`text-xs font-bold truncate ${isCurrent ? 'text-white' : 'text-zinc-400'}`}>{item.title}</p>
224:                                             <div className="flex items-center gap-2 mt-1">
225:                                                 <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${pct >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} /></div>
226:                                                 <span className="text-[9px] text-zinc-500 font-bold">{pct}%</span>
227:                                             </div>
228:                                         </div>
229:                                         {pct >= 95 && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
230:                                     </button>
231:                                 )
232:                             })}
233:                         </div>
234:                     </div>
235:                 )}
236:             </div>
237:             {/* ── 2. EXTERNAL CONTROL BAR ──────────────────────────────── */}
238:             <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
239:                 {/* Playlist Toggle */}
240:                 <div className="flex items-center gap-2 shrink-0">
241:                     <button 
242:                         onClick={() => setShowPlaylist(!showPlaylist)}
243:                         className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-all border border-zinc-700 shadow-sm"
244:                     >
245:                         <List className="w-4 h-4 text-orange-500" />
246:                         <span className="text-[10px] font-black uppercase tracking-tighter hidden sm:inline">Lộ trình ({currentIndex + 1}/{playlist.length})</span>
247:                     </button>
248:                 </div>
249:                 {/* Info & Type Icon */}
250:                 <div className="flex-1 flex flex-col items-center min-w-0 px-1">
251:                     <div className="flex items-center gap-1.5 max-w-full">
252:                         {currentItem?.type === 'video' ? <PlayCircle className="w-3 h-3 text-zinc-500 shrink-0" /> : <FileText className="w-3 h-3 text-zinc-500 shrink-0" />}
253:                         <p className="text-[10px] sm:text-[11px] font-black text-orange-400 truncate tracking-tight uppercase">{currentItem?.title}</p>
254:                     </div>
255:                     <div className="flex items-center gap-1.5 mt-0.5">
256:                         {currentItem?.type === 'doc' ? (
257:                             isReading ? (
258:                                 <span className="flex items-center gap-1 text-[8px] sm:text-[9px] text-zinc-500 font-bold uppercase"><Clock className="w-2.5 h-2.5 animate-spin" /> {30 - docTimer}s</span>
259:                             ) : (
260:                                 <span className="flex items-center gap-1 text-[8px] sm:text-[9px] text-emerald-500 font-bold uppercase"><CheckCircle2 className="w-2.5 h-2.5" /> Xong</span>
261:                             )
262:                         ) : (
263:                             <span className="text-[8px] sm:text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Video</span>
264:                         )}
265:                     </div>
266:                 </div>
267:                 {/* Navigation & Fullscreen Buttons */}
268:                 <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
269:                     <button onClick={handlePrev} className="p-1.5 sm:p-2 bg-zinc-800 hover:bg-orange-500 text-zinc-400 hover:text-white rounded-lg transition-all border border-zinc-700 active:scale-90"><SkipBack className="w-3.5 h-3.5 sm:w-4 h-4" /></button>
270:                     <button onClick={handleNext} className="p-1.5 sm:p-2 bg-zinc-800 hover:bg-orange-500 text-zinc-400 hover:text-white rounded-lg transition-all border border-zinc-700 active:scale-90"><SkipForward className="w-3.5 h-3.5 sm:w-4 h-4" /></button>
271:                     {/* Fullscreen Button - Nổi bật hơn trên mobile */}
272:                     <button 
273:                         onClick={toggleFullScreen}
274:                         className="p-1.5 sm:p-2 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white rounded-lg transition-all border border-orange-500/20 active:scale-90 ml-1"
275:                         title="Xem toàn màn hình"
276:                     >
277:                         <Maximize2 className="w-3.5 h-3.5 sm:w-4 h-4" />
278:                     </button>
279:                 </div>
280:             </div>
281:         </div>
282:     )
283: }
284: function extractVideoId(url: string) {
285:     const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?v=)|(shorts\/)|(\&v=))([^#\&\?]*).*/
286:     const match = url.match(regExp)
287:     return (match && match[9].length === 11) ? match[9] : null
288: }
````

## File: app/actions/course-actions.ts
````typescript
  1: 'use server'
  2: import { auth } from "@/auth"
  3: import prisma from "@/lib/prisma"
  4: import { revalidatePath } from "next/cache"
  5: import { createPaymentQR } from "@/lib/vietqr"
  6: /**
  7:  * Đăng ký khóa học mới
  8:  */
  9: export async function enrollInCourseAction(courseId: number) {
 10:     try {
 11:         const session = await auth()
 12:         if (!session?.user?.id) throw new Error("Vui lòng đăng nhập để tiếp tục.")
 13:         const userId = Number(session.user.id)
 14:         const course = await prisma.course.findUnique({
 15:             where: { id: courseId },
 16:             select: { 
 17:                 phi_coc: true,
 18:                 id_khoa: true,
 19:                 name_lop: true,
 20:                 stk: true,
 21:                 name_stk: true,
 22:                 bank_stk: true,
 23:                 noidung_email: true
 24:             }
 25:         })
 26:         if (!course) throw new Error("Khóa học không tồn tại.")
 27:         // Lấy thông tin user
 28:         const user = await prisma.user.findUnique({
 29:             where: { id: userId },
 30:             select: { id: true, name: true, phone: true, email: true }
 31:         })
 32:         // Kiểm tra xem user có active course 1 không
 33:         const vipEnrollment = await prisma.enrollment.findFirst({
 34:             where: {
 35:                 userId,
 36:                 courseId: 1,
 37:                 status: 'ACTIVE'
 38:             }
 39:         })
 40:         const effectivePhiCoc = vipEnrollment ? 0 : course.phi_coc
 41:         const existing = await prisma.enrollment.findUnique({
 42:             where: { userId_courseId: { userId, courseId } }
 43:         })
 44:         if (existing) return { success: true, status: existing.status }
 45:         const isAutoActive = effectivePhiCoc === 0
 46:         const newEnrollment = await prisma.enrollment.create({
 47:             data: {
 48:                 userId,
 49:                 courseId,
 50:                 status: isAutoActive ? "ACTIVE" : "PENDING"
 51:             }
 52:         })
 53:         const { sendTelegram, sendActivationEmail } = await import("@/lib/notifications")
 54:         if (isAutoActive) {
 55:             // Gửi thông báo kích hoạt MIỄN PHÍ
 56:             const msgAdmin = `🎁 <b>KÍCH HOẠT MIỄN PHÍ</b>\n\n` +
 57:                              `👤 Học viên: <b>${user?.name}</b> (#${user?.id})\n` +
 58:                              `🎓 Khóa học: <b>${course.name_lop} (${course.id_khoa})</b>\n` +
 59:                              `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
 60:             await sendTelegram(msgAdmin, 'ACTIVATE');
 61:             if (user?.email) {
 62:                 await sendActivationEmail(user.email, user.name || '', user.id, course.name_lop || course.id_khoa, course.noidung_email);
 63:             }
 64:         }
 65:         if (effectivePhiCoc > 0 && course.stk && course.name_stk) {
 66:             let qrCodeUrl = null
 67:             let transferContent = null
 68:             // Tạo QR code nếu có đủ thông tin
 69:             if (user?.phone && course.stk) {
 70:                 try {
 71:                     const qrResult = await createPaymentQR({
 72:                         phone: user.phone,
 73:                         userId: userId,
 74:                         courseId: courseId,
 75:                         courseCode: course.id_khoa,
 76:                         accountNo: course.stk,
 77:                         accountName: course.name_stk,
 78:                         acqId: course.bank_stk || 'SACOMBANK',
 79:                         amount: effectivePhiCoc
 80:                     })
 81:                     qrCodeUrl = qrResult.qrCodeUrl
 82:                     transferContent = qrResult.transferContent
 83:                 } catch (qrError) {
 84:                     console.error("Failed to generate QR:", qrError)
 85:                 }
 86:             }
 87:             // Fallback content nếu không tạo được qua API
 88:             if (!transferContent) {
 89:                 const cleanPhone = user?.phone ? user.phone.replace(/\D/g, '').slice(-6) : ''
 90:                 transferContent = `SDT ${cleanPhone} HV ${userId} COC ${course.id_khoa}`.toUpperCase()
 91:             }
 92:             await prisma.payment.create({
 93:                 data: {
 94:                     enrollmentId: newEnrollment.id,
 95:                     amount: effectivePhiCoc,
 96:                     status: 'PENDING',
 97:                     transferContent: transferContent,
 98:                     qrCodeUrl: qrCodeUrl,
 99:                     bankName: course.bank_stk || 'Sacombank',
100:                     accountNumber: course.stk,
101:                     phone: user?.phone // Lưu thêm phone vào Payment record
102:                 }
103:             })
104:         }
105:         revalidatePath('/')
106:         revalidatePath('/courses')
107:         return { success: true, status: newEnrollment.status }
108:     } catch (error: any) {
109:         console.error("Enroll Course Error:", error)
110:         throw new Error(error.message || "Không thể đăng ký khóa học.")
111:     }
112: }
113: /**
114:  * Xác nhận ngày bắt đầu hoặc Đặt lại lộ trình
115:  */
116: export async function confirmStartDateAction(courseId: number, date: any) {
117:     const logId = `[RESET-COURSE-${courseId}-${Date.now()}]`
118:     try {
119:         const session = await auth()
120:         if (!session?.user?.id) return { success: false, message: "Unauthorized" }
121:         const startDate = new Date(date)
122:         if (isNaN(startDate.getTime())) return { success: false, message: "Ngày bắt đầu không hợp lệ." }
123:         const userId = Number(session.user.id)
124:         const now = new Date()
125:         const enrollment = await prisma.enrollment.findUnique({
126:             where: { userId_courseId: { userId, courseId } },
127:             select: { id: true }
128:         })
129:         if (!enrollment) throw new Error("Không tìm thấy thông tin đăng ký khóa học.")
130:         await prisma.$transaction([
131:             prisma.enrollment.update({
132:                 where: { id: enrollment.id },
133:                 data: { startedAt: startDate, resetAt: now, lastLessonId: null }
134:             }),
135:             prisma.lessonProgress.updateMany({
136:                 where: { enrollmentId: enrollment.id, status: { not: 'RESET' } },
137:                 data: { status: 'RESET' }
138:             })
139:         ])
140:         try {
141:             revalidatePath(`/courses`)
142:             revalidatePath(`/courses/${courseId}/learn`)
143:         } catch (e) {}
144:         return { success: true }
145:     } catch (error: any) {
146:         console.error(`${logId} LỖI KHI RESET LỘ TRÌNH:`, error)
147:         return { success: false, message: "Lỗi hệ thống khi đặt lại ngày bắt đầu." }
148:     }
149: }
150: /**
151:  * Lưu tiến độ video (Hỗ trợ đa video/playlist)
152:  */
153: export async function saveVideoProgressAction({
154:     enrollmentId, lessonId, maxTime, duration, lastIndex, playlistScores
155: }: {
156:     enrollmentId: number, lessonId: string, maxTime: number, duration: number,
157:     lastIndex?: number, playlistScores?: any
158: }) {
159:     try {
160:         const session = await auth()
161:         if (!session?.user?.id) return { success: false }
162:         // [PLAYLIST LOGIC] Nếu có playlistScores, tính vidScore dựa trên tổng thể
163:         let vidScore = 0
164:         if (playlistScores) {
165:             let totalMax = 0
166:             let totalDur = 0
167:             Object.values(playlistScores).forEach((p: any) => {
168:                 totalMax += p.maxTime || 0
169:                 totalDur += p.duration || 0
170:             })
171:             const percent = totalDur > 0 ? totalMax / totalDur : 0
172:             vidScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
173:         } else {
174:             // Logic cũ cho 1 video
175:             const percent = duration > 0 ? maxTime / duration : 0
176:             vidScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
177:         }
178:         const existing = await prisma.lessonProgress.findUnique({
179:             where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
180:             select: { scores: true, status: true }
181:         })
182:         const existingScores = existing?.status === 'RESET' ? {} : (existing?.scores as any ?? {})
183:         const updatedScores = { 
184:             ...existingScores, 
185:             video: vidScore,
186:             lastVideoIndex: lastIndex ?? existingScores.lastVideoIndex ?? 0,
187:             playlist: playlistScores ?? existingScores.playlist ?? null
188:         }
189:         await prisma.lessonProgress.upsert({
190:             where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
191:             create: {
192:                 enrollmentId, lessonId, maxTime, duration,
193:                 scores: updatedScores as any,
194:                 status: "IN_PROGRESS"
195:             },
196:             update: {
197:                 maxTime, duration,
198:                 scores: updatedScores as any,
199:                 ...(existing?.status === 'RESET' ? { status: 'IN_PROGRESS' } : {})
200:             }
201:         })
202:         return { success: true, vidScore }
203:     } catch (error) {
204:         console.error("Save Video Progress Error:", error)
205:         return { success: false }
206:     }
207: }
208: /**
209:  * Nộp bài ghi nhận và tính điểm
210:  */
211: export async function submitAssignmentAction({
212:     enrollmentId, lessonId, reflection, links, supports,
213:     isUpdate = false, lessonOrder, startedAt,
214:     existingVideoScore, existingTimingScore,
215:     clientTimeZone = 'Asia/Ho_Chi_Minh' // Mặc định là giờ VN nếu không có
216: }: {
217:     enrollmentId: number, lessonId: string, reflection: string, links: string[], supports: boolean[],
218:     isUpdate?: boolean, lessonOrder?: number, startedAt?: any,
219:     existingVideoScore?: number, existingTimingScore?: number,
220:     clientTimeZone?: string
221: }) {
222:     const logId = `[SUBMIT-${lessonId}]`
223:     try {
224:         const session = await auth()
225:         if (!session?.user?.id) return { success: false, message: "Phiên đăng nhập hết hạn." }
226:         const now = new Date()
227:         let timingScore = 0
228:         // 1. Tính timingScore dựa trên múi giờ địa phương của học viên
229:         if (startedAt && lessonOrder) {
230:             const startDate = new Date(startedAt)
231:             if (!isNaN(startDate.getTime())) {
232:                 // Lấy thời điểm hiện tại theo múi giờ học viên
233:                 const nowStr = new Date().toLocaleString('en-US', { timeZone: clientTimeZone });
234:                 const nowLocal = new Date(nowStr);
235:                 // Tạo Deadline theo múi giờ học viên
236:                 const deadlineStr = new Date(startDate).toLocaleString('en-US', { timeZone: clientTimeZone });
237:                 const deadlineLocal = new Date(deadlineStr);
238:                 deadlineLocal.setDate(deadlineLocal.getDate() + (lessonOrder - 1));
239:                 deadlineLocal.setHours(23, 59, 59, 999);
240:                 const isCurrentlyOnTime = nowLocal.getTime() <= deadlineLocal.getTime();
241:                 if (isUpdate) {
242:                     timingScore = isCurrentlyOnTime ? 1 : (existingTimingScore ?? -1);
243:                 } else {
244:                     timingScore = isCurrentlyOnTime ? 1 : -1;
245:                 }
246:                 if (isUpdate && !isCurrentlyOnTime) {
247:                     const existingStatus = await prisma.lessonProgress.findUnique({
248:                         where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
249:                         select: { status: true }
250:                     })
251:                     if (existingStatus?.status === 'COMPLETED') {
252:                         return { success: false, message: "Bài học đã hết hạn cập nhật." }
253:                     }
254:                 }
255:             }
256:         }
257:         // 2. Lấy thông tin bài học
258:         const lesson = await prisma.lesson.findUnique({
259:             where: { id: lessonId },
260:             select: { videoUrl: true }
261:         })
262:         if (!lesson) return { success: false, message: "Không tìm thấy bài học." }
263:         // 3. Tính toán các đầu điểm
264:         const rawUrl = lesson.videoUrl ? String(lesson.videoUrl).trim() : ""
265:         const isYouTube = /youtu\.be\/|youtube\.com\/|v=/.test(rawUrl)
266:         let videoScore = 0
267:         if (rawUrl === "" || rawUrl.toLowerCase() === "null" || !isYouTube) {
268:             videoScore = 2 // Không dùng video Youtube -> Auto +2
269:         } else {
270:             // Lấy dữ liệu mới nhất
271:             const currentProg = await prisma.lessonProgress.findUnique({
272:                 where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
273:                 select: { scores: true, maxTime: true, duration: true }
274:             })
275:             const scoresJson = (currentProg?.scores as any) || {}
276:             // ƯU TIÊN 1: Tính từ Playlist detail nếu có
277:             if (scoresJson.playlist) {
278:                 let totalMax = 0
279:                 let totalDur = 0
280:                 Object.values(scoresJson.playlist).forEach((p: any) => {
281:                     totalMax += p.maxTime || 0
282:                     totalDur += p.duration || 0
283:                 })
284:                 const percent = totalDur > 0 ? totalMax / totalDur : 0
285:                 videoScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
286:             } 
287:             // ƯU TIÊN 2: Nếu mất playlist detail nhưng có maxTime/duration tổng ở ngoài (trường hợp bị ghi đè)
288:             else if (currentProg?.duration && currentProg.duration > 0) {
289:                 const percent = currentProg.maxTime / currentProg.duration
290:                 videoScore = percent >= 0.95 ? 2 : percent >= 0.5 ? 1 : 0
291:             }
292:             // ƯU TIÊN 3: Dùng điểm gửi từ client
293:             else {
294:                 videoScore = existingVideoScore ?? 0
295:             }
296:         }
297:         const reflectionScore = reflection.trim().length >= 50 ? 2 : reflection.trim().length > 0 ? 1 : 0
298:         const linkScore = Math.min(links.filter(l => l && l.trim() !== "").length, 3)
299:         const supportScore = supports.filter(s => s === true).length
300:         const totalScore = Math.max(0, videoScore + reflectionScore + linkScore + supportScore + timingScore)
301:         console.log(`${logId} POINT: V:${videoScore} R:${reflectionScore} L:${linkScore} S:${supportScore} T:${timingScore} => TOTAL:${totalScore}`)
302:         // 4. Lưu Database
303:         const updatedProgress = await prisma.lessonProgress.upsert({
304:             where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
305:             create: {
306:                 enrollmentId, lessonId,
307:                 assignment: { reflection, links, supports } as any,
308:                 scores: { video: videoScore, reflection: reflectionScore, link: linkScore, support: supportScore, timing: timingScore } as any,
309:                 totalScore, status: totalScore >= 5 ? "COMPLETED" : "IN_PROGRESS", submittedAt: now
310:             },
311:             update: {
312:                 assignment: { reflection, links, supports } as any,
313:                 scores: { video: videoScore, reflection: reflectionScore, link: linkScore, support: supportScore, timing: timingScore } as any,
314:                 totalScore, status: totalScore >= 5 ? "COMPLETED" : "IN_PROGRESS", submittedAt: now
315:             }
316:         })
317:         // Gửi thông báo Hoàn thành bài tập qua Telegram (Group LESSON)
318:         console.log(`🔍 Kiểm tra trạng thái bài học: ${updatedProgress.status}, Điểm: ${totalScore}`);
319:         if (updatedProgress.status === 'COMPLETED') {
320:             try {
321:                 const { sendTelegram } = await import("@/lib/notifications")
322:                 const enrollment = await prisma.enrollment.findUnique({
323:                     where: { id: enrollmentId },
324:                     include: { 
325:                         user: { select: { name: true, id: true } },
326:                         course: { select: { name_lop: true } }
327:                     }
328:                 })
329:                 const lesson = await prisma.lesson.findUnique({
330:                     where: { id: lessonId },
331:                     select: { title: true }
332:                 })
333:                 const msgAdmin = `📚 <b>HOÀN THÀNH BÀI HỌC</b>\n\n` +
334:                                  `👤 Học viên: <b>${enrollment?.user?.name}</b> (#${enrollment?.user?.id})\n` +
335:                                  `🎓 Khóa học: ${enrollment?.course?.name_lop}\n` +
336:                                  `📖 Bài học: <b>${lesson?.title}</b>\n` +
337:                                  `🏆 Điểm số: <b>${totalScore}đ</b>\n` +
338:                                  `📅 Thời gian: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
339:                 console.log(`📡 Đang gửi thông báo Telegram LESSON đến ChatID: ${process.env.TELEGRAM_CHAT_ID_LESSON}`);
340:                 await sendTelegram(msgAdmin, 'LESSON');
341:                 console.log(`✅ Đã gửi thông báo Telegram LESSON thành công!`);
342:             } catch (teleError: any) {
343:                 console.error(`❌ Lỗi khi gửi thông báo Telegram LESSON:`, teleError.message);
344:             }
345:         }
346:         // 5. Revalidate
347:         try {
348:             const enrollment = await prisma.enrollment.findUnique({
349:                 where: { id: enrollmentId },
350:                 select: { course: { select: { id_khoa: true } } }
351:             })
352:             if (enrollment?.course?.id_khoa) {
353:                 revalidatePath(`/courses/${enrollment.course.id_khoa}/learn`, 'page')
354:             }
355:         } catch (e) {}
356:         return { success: true, totalScore }
357:     } catch (error: any) {
358:         console.error(`${logId} ERROR:`, error)
359:         return { success: false, message: "Lỗi hệ thống khi lưu kết quả." }
360:     }
361: }
362: /**
363:  * Lưu nháp bài ghi nhận
364:  */
365: export async function saveAssignmentDraftAction({
366:     enrollmentId, lessonId, reflection, links, supports
367: }: {
368:     enrollmentId: number, lessonId: string, reflection: string, links: string[], supports: boolean[]
369: }) {
370:     try {
371:         const session = await auth()
372:         if (!session?.user?.id) return { success: false }
373:         const validLinks = links.filter((l: string) => l && l.trim().length > 0)
374:         await prisma.lessonProgress.upsert({
375:             where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
376:             create: {
377:                 enrollmentId, lessonId,
378:                 assignment: { reflection, links: validLinks, supports } as any,
379:                 status: "IN_PROGRESS"
380:             },
381:             update: {
382:                 assignment: { reflection, links: validLinks, supports } as any
383:             }
384:         })
385:         return { success: true }
386:     } catch (error) {
387:         return { success: false }
388:     }
389: }
390: /**
391:  * Cập nhật bài học cuối cùng
392:  */
393: export async function updateLastLessonAction(enrollmentId: number, lessonId: string) {
394:     try {
395:         const session = await auth()
396:         if (!session?.user?.id) return
397:         await prisma.enrollment.update({
398:             where: { id: enrollmentId },
399:             data: { lastLessonId: lessonId }
400:         })
401:     } catch (error) {}
402: }
````

## File: components/course/CoursePlayer.tsx
````typescript
  1: 'use client'
  2: import { useState, useCallback, useEffect, useRef } from 'react'
  3: import Link from "next/link"
  4: import { 
  5:     ArrowLeft, ListVideo, FileText, X, ClipboardCheck, 
  6:     Loader2, CheckCircle2, PlayCircle, Lock, CalendarDays, RefreshCw 
  7: } from "lucide-react"
  8: import { cn } from "@/lib/utils"
  9: import LessonSidebar from "./LessonSidebar"
 10: import VideoPlayer from "./VideoPlayer"
 11: import AssignmentForm from "./AssignmentForm"
 12: import ChatSection from "./ChatSection"
 13: import StartDateModal from "./StartDateModal"
 14: import {
 15:     confirmStartDateAction,
 16:     saveVideoProgressAction,
 17:     submitAssignmentAction,
 18:     updateLastLessonAction
 19: } from "@/app/actions/course-actions"
 20: interface CoursePlayerProps {
 21:     course: any
 22:     enrollment: any
 23:     session: any
 24: }
 25: type MobileTab = 'list' | 'content' | 'record'
 26: export default function CoursePlayer({ course, enrollment: initialEnrollment, session }: CoursePlayerProps) {
 27:     const [enrollment, setEnrollment] = useState(initialEnrollment)
 28:     const isSubmittingRef = useRef(false)
 29:     const [isMounted, setIsMounted] = useState(false)
 30:     // Lọc progress chỉ lấy các bài học không bị reset
 31:     const filteredLessonProgress = enrollment.lessonProgress.filter((p: any) => p.status !== 'RESET')
 32:     const [currentLessonId, setCurrentLessonId] = useState<string>(course.lessons[0]?.id)
 33:     const [videoPercent, setVideoPercent] = useState(0)
 34:     const [mobileTab, setMobileTab] = useState<MobileTab>('content')
 35:     const [progressMap, setProgressMap] = useState<Record<string, any>>(() =>
 36:         filteredLessonProgress.reduce((acc: any, p: any) => {
 37:             acc[p.lessonId] = p
 38:             return acc
 39:         }, {})
 40:     )
 41:     const [showContentModal, setShowContentModal] = useState(false)
 42:     const [currentFormData, setCurrentFormData] = useState<{ reflection: string; links: string[]; supports: boolean[] } | null>(null)
 43:     const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'loading' | 'success' | 'error' } | null>(null)
 44:     const assignmentFormRef = useRef<(() => Promise<void>) | undefined>(undefined)
 45:     const lastSavedPercentRef = useRef<number>(-1)
 46:     const videoProgressRef = useRef<{ maxTime: number; duration: number } | null>(null)
 47:     const prevMobileTabRef = useRef(mobileTab)
 48:     // [HYDRATION FIX] Đảm bảo component đã mount trên client mới thực hiện các tính toán logic và render giao diện chính
 49:     useEffect(() => {
 50:         setIsMounted(true)
 51:         // Chỉ tìm bài học cũ khi đã ở client
 52:         if (enrollment.lastLessonId) {
 53:             setCurrentLessonId(enrollment.lastLessonId)
 54:         } else {
 55:             const incomplete = filteredLessonProgress
 56:                 .filter((p: any) => p.status !== 'COMPLETED')
 57:                 .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
 58:             if (incomplete[0]?.lessonId) {
 59:                 setCurrentLessonId(incomplete[0].lessonId)
 60:             }
 61:         }
 62:     }, [])
 63:     const notify = useCallback((text: string, type: 'loading' | 'success' | 'error' = 'success', duration = 3000) => {
 64:         setStatusMsg({ text, type })
 65:         if (type !== 'loading') {
 66:             setTimeout(() => setStatusMsg(null), duration)
 67:         }
 68:     }, [])
 69:     const checkIsOnTime = useCallback((startedAt: Date | null, lessonOrder: number): boolean => {
 70:         if (!startedAt) return false
 71:         const deadline = new Date(startedAt)
 72:         deadline.setDate(deadline.getDate() + (lessonOrder - 1))
 73:         deadline.setHours(23, 59, 59, 999)
 74:         return new Date() <= deadline
 75:     }, [])
 76:     const [isMobile, setIsMobile] = useState(false)
 77:     useEffect(() => {
 78:         const mq = window.matchMedia('(max-width: 767px)')
 79:         setIsMobile(mq.matches)
 80:         const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
 81:         mq.addEventListener('change', handler)
 82:         return () => mq.removeEventListener('change', handler)
 83:     }, [])
 84:     useEffect(() => {
 85:         const handleTabChange = async () => {
 86:             const prevTab = prevMobileTabRef.current
 87:             const currentTab = mobileTab
 88:             if (currentTab !== prevTab) {
 89:                 if (prevTab === 'record' && currentTab === 'content' && assignmentFormRef.current && !isSubmittingRef.current) {
 90:                     await assignmentFormRef.current().catch(() => {})
 91:                 }
 92:             }
 93:             prevMobileTabRef.current = mobileTab
 94:         }
 95:         handleTabChange()
 96:     }, [mobileTab])
 97:     const handleLessonSelect = async (lessonId: string) => {
 98:         if (isSubmittingRef.current) return
 99:         if (assignmentFormRef.current) {
100:             await assignmentFormRef.current().catch(() => {})
101:         }
102:         if (currentLessonId && videoProgressRef.current) {
103:             await saveVideoProgressAction({
104:                 enrollmentId: enrollment.id,
105:                 lessonId: currentLessonId,
106:                 maxTime: videoProgressRef.current.maxTime,
107:                 duration: videoProgressRef.current.duration
108:             }).catch(() => {})
109:         }
110:         setCurrentLessonId(lessonId)
111:         setVideoPercent(0)
112:         setMobileTab('content')
113:         setShowContentModal(false)
114:         updateLastLessonAction(enrollment.id, lessonId).catch(() => {})
115:     }
116:     const handleVideoProgress = useCallback(async (maxTime: number, duration: number) => {
117:         if (!currentLessonId || duration === 0) return
118:         const pct = Math.min(100, Math.round((maxTime / duration) * 100))
119:         setVideoPercent(pct)
120:         videoProgressRef.current = { maxTime, duration }
121:         const threshold = Math.floor(pct / 10) * 10
122:         if ((threshold > lastSavedPercentRef.current || pct === 100) && threshold <= 100) {
123:             lastSavedPercentRef.current = threshold
124:             saveVideoProgressAction({ enrollmentId: enrollment.id, lessonId: currentLessonId, maxTime, duration }).catch(() => {})
125:         }
126:     }, [currentLessonId, enrollment.id])
127:     const handleSubmitAssignment = async (data: any, isUpdate: boolean = false) => {
128:         if (isSubmittingRef.current) return
129:         isSubmittingRef.current = true
130:         notify(isUpdate ? 'Đang cập nhật bài học...' : 'Đang chấm điểm...', 'loading')
131:         try {
132:             const currentProg = progressMap[currentLessonId!]
133:             const currentLessonData = course.lessons.find((l: any) => l.id === currentLessonId)
134:             const result = await submitAssignmentAction({
135:                 enrollmentId: enrollment.id,
136:                 lessonId: currentLessonId!,
137:                 reflection: data.reflection,
138:                 links: data.links,
139:                 supports: data.supports,
140:                 isUpdate,
141:                 lessonOrder: currentLessonData?.order,
142:                 startedAt: enrollment.startedAt,
143:                 existingVideoScore: currentProg?.scores?.video,
144:                 existingTimingScore: currentProg?.scores?.timing
145:             })
146:             if (!(result as any)?.success) {
147:                 notify((result as any)?.message || 'Lỗi xử lý dữ liệu!', 'error')
148:                 return
149:             }
150:             const res = result as any
151:             notify(res.totalScore >= 5 ? `✅ Hoàn thành! Điểm: ${res.totalScore}/10` : `📊 Đã ghi nhận: ${res.totalScore}/10đ`, 'success')
152:             const updatedProgress = {
153:                 ...(progressMap[currentLessonId!] || {}),
154:                 assignment: { reflection: data.reflection, links: data.links, supports: data.supports },
155:                 status: res.totalScore >= 5 ? 'COMPLETED' : 'IN_PROGRESS',
156:                 totalScore: res.totalScore
157:             }
158:             setProgressMap(prev => ({ ...prev, [currentLessonId!]: updatedProgress }))
159:             if (res.totalScore >= 5 && !isUpdate) {
160:                 const currentIndex = course.lessons.findIndex((l: any) => l.id === currentLessonId)
161:                 if (currentIndex < course.lessons.length - 1) {
162:                     setTimeout(() => handleLessonSelect(course.lessons[currentIndex + 1].id), 2000)
163:                 }
164:             }
165:         } catch (error: any) {
166:             console.error("[SUBMIT-ERROR]", error)
167:             notify('Lỗi kết nối máy chủ!', 'error')
168:         } finally {
169:             isSubmittingRef.current = false
170:             setStatusMsg(null)
171:         }
172:     }
173:     const currentLesson = course.lessons.find((l: any) => l.id === currentLessonId)
174:     const currentProgress = progressMap[currentLessonId]
175:     const initialPercent = !currentLesson?.videoUrl ? 100 : (
176:         currentProgress?.duration ? (currentProgress.maxTime / currentProgress.duration) * 100 : 0
177:     )
178:     const completedCount = Object.values(progressMap).filter((p: any) => p.status === 'COMPLETED').length
179:     const startedAt = enrollment.startedAt ? new Date(enrollment.startedAt) : null
180:     // [HYDRATION SAFEGUARD] Trả về giao diện trống tối giản trên server
181:     if (!isMounted) {
182:         return <div className="h-screen w-full bg-black flex items-center justify-center text-zinc-700 font-mono text-xs">Đang tải ứng dụng...</div>
183:     }
184:     return (
185:         <div className="flex flex-col h-full bg-black text-zinc-300">
186:             {/* Header */}
187:             <header className="h-14 shrink-0 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900 z-50 fixed top-0 left-0 right-0">
188:                 <div className="flex items-center gap-3 min-w-0">
189:                     <Link href="/" className="shrink-0 text-zinc-400 hover:text-white transition-colors">
190:                         <ArrowLeft className="w-5 h-5" />
191:                     </Link>
192:                     <h1 className="font-bold text-white truncate text-sm sm:text-base">{course.name_lop}</h1>
193:                 </div>
194:                 {statusMsg && (
195:                     <div className={`absolute left-1/2 -translate-x-1/2 top-16 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transition-all duration-300 z-[100] ${
196:                         statusMsg.type === 'loading' ? 'bg-orange-500 text-white' :
197:                         statusMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
198:                     }`}>
199:                         {statusMsg.type === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
200:                         {statusMsg.text}
201:                     </div>
202:                 )}
203:                 <div className="flex items-center gap-2 shrink-0">
204:                     <div className="flex items-center gap-2">
205:                         <span className="text-[10px] sm:text-xs text-zinc-400 font-mono">{completedCount}/{course.lessons.length}</span>
206:                         <div className="relative h-2 w-16 sm:w-24 bg-zinc-800 rounded-full overflow-hidden">
207:                             <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(completedCount / course.lessons.length) * 100}%` }} />
208:                         </div>
209:                         <span className="text-[10px] sm:text-xs font-bold text-emerald-400 min-w-[35px] text-right">
210:                             {Math.round((completedCount / course.lessons.length) * 100)}%
211:                         </span>
212:                     </div>
213:                 </div>
214:             </header>
215:             <div className={`flex flex-1 min-h-0 pt-14 ${isMobile ? 'pb-14' : ''}`}>
216:                 {!isMobile && (
217:                     <LessonSidebar
218:                         lessons={course.lessons}
219:                         currentLessonId={currentLessonId}
220:                         onLessonSelect={handleLessonSelect}
221:                         progress={progressMap}
222:                         startedAt={startedAt}
223:                         resetAt={enrollment.resetAt}
224:                         onResetStartDate={async (d: Date) => {
225:                             await confirmStartDateAction(course.id, d)
226:                             window.location.reload()
227:                         }}
228:                     />
229:                 )}
230:                 <main className="flex-1 flex flex-col min-h-0 overflow-hidden items-center bg-zinc-950">
231:                     <div className={isMobile ? 'shrink-0 w-full' : 'p-5 pb-0 shrink-0 w-full max-w-5xl'}>
232:                         <div className={isMobile ? '' : 'overflow-hidden border-2 border-white shadow-2xl bg-black'}>
233:                             <VideoPlayer
234:                                 key={currentLessonId}
235:                                 enrollmentId={enrollment.id}
236:                                 lessonId={currentLessonId!}
237:                                 videoUrl={currentLesson?.videoUrl || null}
238:                                 lessonContent={currentLesson?.content || null}
239:                                 initialMaxTime={currentProgress?.maxTime || 0}
240:                                 playlistData={currentProgress?.scores?.playlist}
241:                                 lastVideoIndex={currentProgress?.scores?.lastVideoIndex}
242:                                 onProgress={handleVideoProgress}
243:                                 onPercentChange={setVideoPercent}
244:                             />
245:                         </div>
246:                     </div>
247:                     {!isMobile && (
248:                         <div className="p-5 flex-1 flex flex-col gap-4 min-h-0 overflow-hidden w-full max-w-5xl">
249:                             <div className="shrink-0">
250:                                 <h2 className="text-lg font-bold text-white">{currentLesson?.title}</h2>
251:                                 {currentLesson?.content && !currentLesson.content.includes('docs.google.com') && (
252:                                     <div className="text-zinc-400 mt-1 text-sm leading-relaxed line-clamp-2 hover:line-clamp-none transition-all">{currentLesson.content}</div>
253:                                 )}
254:                             </div>
255:                             <div className="flex-1 min-h-0 border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden">
256:                                 <ChatSection lessonId={currentLessonId!} session={session} />
257:                             </div>
258:                         </div>
259:                     )}
260:                     {/* [HYDRATION FIX] Chỉ render Mobile logic khi đã Mounted và là Mobile */}
261:                     {isMounted && isMobile && (
262:                         <>
263:                             <div className="flex-1 min-h-0 w-full flex flex-col">
264:                                 {mobileTab === 'list' && (
265:                                     <div className="flex-1 overflow-y-auto">
266:                                         <LessonSidebarMobile
267:                                             lessons={course.lessons}
268:                                             currentLessonId={currentLessonId}
269:                                             onLessonSelect={handleLessonSelect}
270:                                             progress={progressMap}
271:                                             startedAt={startedAt}
272:                                             onResetStartDate={async (d: Date) => { await confirmStartDateAction(course.id, d); window.location.reload(); }}
273:                                         />
274:                                     </div>
275:                                 )}
276:                                 {mobileTab === 'content' && (
277:                                     <div className="flex-1 flex flex-col min-h-0">
278:                                         <div className="px-4 py-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
279:                                             <p className="text-base font-bold text-white leading-tight">{currentLesson?.title}</p>
280:                                             <button onClick={() => setShowContentModal(true)} className="text-xs text-orange-400 mt-2">Xem chi tiết nội dung →</button>
281:                                         </div>
282:                                         <div className="flex-1 min-h-0">
283:                                             <ChatSection lessonId={currentLessonId!} session={session} />
284:                                         </div>
285:                                     </div>
286:                                 )}
287:                                 {mobileTab === 'record' && (
288:                                     <div className="flex-1 overflow-hidden">
289:                                         <AssignmentForm
290:                                             key={currentLessonId}
291:                                             lessonId={currentLessonId!}
292:                                             lessonOrder={currentLesson?.order ?? 1}
293:                                             startedAt={startedAt}
294:                                             videoPercent={videoPercent}
295:                                             videoUrl={currentLesson?.videoUrl || null}
296:                                             onSubmit={handleSubmitAssignment}
297:                                             initialData={{ ...currentProgress, enrollmentId: enrollment.id }}
298:                                             onSaveDraft={assignmentFormRef}
299:                                             onFormDataChange={setCurrentFormData}
300:                                             onDraftSaved={(draftData) => {
301:                                                 setProgressMap(prev => ({
302:                                                     ...prev,
303:                                                     [currentLessonId!]: { ...prev[currentLessonId!], assignment: { ...prev[currentLessonId!]?.assignment, ...draftData } }
304:                                                 }))
305:                                             }}
306:                                         />
307:                                     </div>
308:                                 )}
309:                             </div>
310:                             <nav className="h-14 bg-zinc-900 border-t border-zinc-800 flex fixed bottom-0 left-0 right-0 z-50">
311:                                 {[
312:                                     { id: 'list', icon: ListVideo, label: 'Danh sách' },
313:                                     { id: 'content', icon: FileText, label: 'Nội dung' },
314:                                     { id: 'record', icon: ClipboardCheck, label: 'Ghi nhận' },
315:                                 ].map(tab => (
316:                                     <button
317:                                         key={tab.id}
318:                                         onClick={() => setMobileTab(tab.id as MobileTab)}
319:                                         className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] ${mobileTab === tab.id ? 'text-orange-400 bg-orange-400/5 border-t-2 border-orange-400' : 'text-zinc-500'}`}
320:                                     >
321:                                         <tab.icon className="w-5 h-5" />
322:                                         {tab.label}
323:                                     </button>
324:                                 ))}
325:                             </nav>
326:                         </>
327:                     )}
328:                 </main>
329:                 {!isMobile && (
330:                     <div className="w-[400px] shrink-0 border-l border-zinc-800 flex flex-col">
331:                         <AssignmentForm
332:                             key={currentLessonId}
333:                             lessonId={currentLessonId!}
334:                             lessonOrder={currentLesson?.order ?? 1}
335:                             startedAt={startedAt}
336:                             videoPercent={videoPercent}
337:                             videoUrl={currentLesson?.videoUrl || null}
338:                             onSubmit={handleSubmitAssignment}
339:                             initialData={{ ...currentProgress, enrollmentId: enrollment.id }}
340:                             onSaveDraft={assignmentFormRef}
341:                             onFormDataChange={setCurrentFormData}
342:                             onDraftSaved={(draftData) => {
343:                                 setProgressMap(prev => ({
344:                                     ...prev,
345:                                     [currentLessonId!]: { ...prev[currentLessonId!], assignment: { ...prev[currentLessonId!]?.assignment, ...draftData } }
346:                                 }))
347:                             }}
348:                         />
349:                     </div>
350:                 )}
351:             </div>
352:             {/* Content Modal */}
353:             {showContentModal && (
354:                 <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowContentModal(false)}>
355:                     <div className="bg-zinc-900 rounded-2xl border border-zinc-700 max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
356:                         <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
357:                             <h2 className="text-white font-bold text-sm truncate pr-4">{currentLesson?.title}</h2>
358:                             <button onClick={() => setShowContentModal(false)}><X className="w-5 h-5 text-zinc-400" /></button>
359:                         </div>
360:                         <div className="overflow-y-auto p-5 text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
361:                             {currentLesson?.content}
362:                         </div>
363:                     </div>
364:                 </div>
365:             )}
366:             <StartDateModal isOpen={!enrollment.startedAt} onConfirm={async (d) => { await confirmStartDateAction(course.id, d); window.location.reload(); }} />
367:         </div>
368:     )
369: }
370: function LessonSidebarMobile({ lessons, currentLessonId, onLessonSelect, progress, startedAt, onResetStartDate }: any) {
371:     const [showDatePicker, setShowDatePicker] = useState(false)
372:     const [dateInput, setDateInput] = useState(startedAt ? new Date(startedAt).toISOString().slice(0, 10) : '')
373:     const [saving, setSaving] = useState(false)
374:     // Lọc progress chỉ hiển thị các bài học không bị reset
375:     const filteredProgress = Object.entries(progress).reduce((acc: any, [id, p]: [string, any]) => { 
376:         if (p.status !== 'RESET') acc[id] = p; 
377:         return acc 
378:     }, {})
379:     const handleReset = async () => {
380:         if (!dateInput) return
381:         const confirmReset = window.confirm("⚠️ Cảnh báo: Dữ liệu học tập cũ sẽ không được tính vào lộ trình mới.\n\nNhấn OK để xác nhận đổi ngày bắt đầu mới.")
382:         if (!confirmReset) return
383:         setSaving(true)
384:         try {
385:             await onResetStartDate(new Date(dateInput))
386:             setShowDatePicker(false)
387:         } finally {
388:             setSaving(false)
389:         }
390:     }
391:     const completedCount = lessons.filter((l: any) => filteredProgress[l.id]?.status === 'COMPLETED').length
392:     return (
393:         <div className="flex flex-col h-full w-full bg-zinc-900 overflow-hidden">
394:             {/* ─ Cố định: ngày bắt đầu ─ */}
395:             <div className="shrink-0 bg-zinc-900 border-b border-zinc-800 p-4 space-y-3">
396:                 <div className="flex items-center justify-between">
397:                     <div className="flex items-center gap-2.5">
398:                         <CalendarDays className="w-4 h-4 text-orange-400 shrink-0" />
399:                         <div>
400:                             <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Ngày bắt đầu</p>
401:                             <p className="text-sm font-bold text-white leading-tight">
402:                                 {startedAt ? new Date(startedAt).toLocaleDateString('vi-VN') : '-- / -- / ----'}
403:                             </p>
404:                         </div>
405:                     </div>
406:                     <button 
407:                         onClick={() => setShowDatePicker(!showDatePicker)}
408:                         className="flex items-center gap-1 text-[11px] text-orange-400 border border-orange-500/30 rounded-lg px-2.5 py-1 font-bold active:scale-95 transition-all"
409:                     >
410:                         <RefreshCw className="w-3 h-3" /> Đặt lại
411:                     </button>
412:                 </div>
413:                 {showDatePicker && (
414:                     <div className="bg-zinc-800 rounded-xl p-3 space-y-2.5 border border-zinc-700 shadow-xl">
415:                         <p className="text-[10px] text-zinc-400 font-medium">Chọn ngày mới cho lộ trình:</p>
416:                         <input 
417:                             type="date" 
418:                             value={dateInput} 
419:                             onChange={e => setDateInput(e.target.value)} 
420:                             className="w-full bg-zinc-700 text-white text-sm rounded-lg px-3 py-2 border border-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500" 
421:                         />
422:                         <div className="flex gap-2">
423:                             <button 
424:                                 onClick={handleReset} 
425:                                 disabled={!dateInput || saving} 
426:                                 className="flex-1 text-xs font-black bg-orange-500 text-white rounded-lg py-2 disabled:opacity-50"
427:                             >
428:                                 {saving ? 'Đang lưu...' : 'XÁC NHẬN'}
429:                             </button>
430:                             <button 
431:                                 onClick={() => setShowDatePicker(false)} 
432:                                 className="flex-1 text-xs font-bold text-zinc-400 border border-zinc-700 rounded-lg py-2"
433:                             >
434:                                 HỦY
435:                             </button>
436:                         </div>
437:                     </div>
438:                 )}
439:             </div>
440:             {/* ─ Tiêu đề danh sách ─ */}
441:             <div className="shrink-0 px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
442:                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-white/60">Lộ trình học tập</span>
443:                 <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
444:                     {completedCount}/{lessons.length} BÀI
445:                 </span>
446:             </div>
447:             {/* ─ Danh sách cuộn ─ */}
448:             <div className="flex-1 overflow-y-auto overscroll-contain">
449:                 {lessons.map((lesson: any) => {
450:                     const prog = filteredProgress[lesson.id]
451:                     const isActive = currentLessonId === lesson.id
452:                     const unlocked = lesson.order === 1 || (filteredProgress[lessons.find((l:any)=>l.order===lesson.order-1)?.id]?.status === 'COMPLETED')
453:                     return (
454:                         <button
455:                             key={lesson.id}
456:                             onClick={() => unlocked && onLessonSelect(lesson.id)}
457:                             className={cn(
458:                                 'w-full flex items-center gap-3 px-4 py-4 text-left border-b border-zinc-800/50 transition-all active:bg-zinc-800', 
459:                                 isActive && 'bg-zinc-800 border-l-4 border-l-orange-500', 
460:                                 !unlocked && 'opacity-40 grayscale'
461:                             )}
462:                         >
463:                             <div className="shrink-0">
464:                                 {prog?.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : isActive ? <PlayCircle className="w-5 h-5 text-orange-400 animate-pulse" /> : !unlocked ? <Lock className="w-4 h-4 text-zinc-600" /> : <div className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-[8px] text-zinc-500">{lesson.order}</div>}
465:                             </div>
466:                             <div className="flex-1 min-w-0">
467:                                 <p className={cn('text-sm leading-snug', isActive ? 'text-white font-black' : 'text-zinc-400 font-medium')}>{lesson.title}</p>
468:                                 {prog?.totalScore !== undefined && <p className={cn('text-[10px] mt-1 font-bold', prog.totalScore >= 5 ? 'text-emerald-500' : 'text-orange-400')}>{prog.totalScore >= 5 ? '✓' : '✗'} Kết quả: {prog.totalScore}/10đ</p>}
469:                             </div>
470:                         </button>
471:                     )
472:                 })}
473:             </div>
474:         </div>
475:     )
476: }
````
