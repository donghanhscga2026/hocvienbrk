# Đề xuất thay đổi thuật ngữ

**Mục tiêu:**
- Thay thế "MBC" thành "MFC"
- Thay thế "Ngân hàng phước báu" thành "Dòng chảy phước báu"

## 1. Trong Codebase

### `.env`
- Dòng 63: `TELEGRAM_CHAT_ID_MBC_LOG=-5202072707`

### `.env.local`
- Dòng 26: `TELEGRAM_CHAT_ID_MBC_LOG="-5202072707"`

### `AGENTS.md`
- Dòng 139: `- ❌ **CẤM**: `ĐÃ HOÀN THÀNH CẬP NHẬT`, `HỌC VIỆN BRK`, `CỘNG ĐỒNG MBC`, `MÃ SỐ`...`
- Dòng 140: `- ✅ **ĐÚNG**: `Đã hoàn thành cập nhật`, `Học viện BRK`, `Cộng đồng MBC`, `Mã số`...`
- Dòng 142: `- Từ/chuỗi không dấu hoặc kỹ thuật: `BRKD`, `BRKP`, `MBC`, `ID`, `API`, `OTP`, `HTML`, `BRK01`...`

### `app/actions/payment-actions.ts`
- Dòng 468: `reason: `Lỗi revert MBC member #${enrollment.userId}: ${err.message}``
- Dòng 683: `message: `Đã xóa toàn bộ dữ liệu MBC system #${systemId} (${systems.length} thành viên).``

### `app/actions/site-profile-actions.ts`
- Dòng 121: `* Lấy MBC default profile`

### `app/api/admin/email-verifier/start/route.ts`
- Dòng 39: `htmlContent: "Xin chào [Tên], đây là email kiểm tra kết nối kỹ thuật tự động từ hệ thống Cộng đồng MBC.<br/><br/>Mã xác nhận kết nối của bạn: <b>#[Nga`

### `app/api/auth/forgot-password/route.ts`
- Dòng 48: `<h2 style="color: #f97316;">CỘNG ĐỒNG MBC - QUÊN MẬT KHẨU</h2>`
- Dòng 60: `const result = await sendGmail(user.email, "Mã xác minh đặt lại mật khẩu - Cộng đồng MBC", htmlBody)`

### `app/api/unsubscribe/route.ts`
- Dòng 23: `<p>Bạn sẽ không nhận được các email thông báo từ Cộng đồng MBC nữa.</p>`

### `app/api/webhooks/telegram/route.ts`
- Dòng 50: ``✅ Tài khoản Telegram của bạn đã được liên kết thành công với Cộng đồng MBC.\n\n` +`

### `app/complete-profile/page.tsx`
- Dòng 145: `Vui lòng bổ sung thông tin để bắt đầu trải nghiệm Cộng đồng MBC`
- Dòng 346: `Bằng cách nhấn hoàn tất, bạn đồng ý với điều khoản sử dụng của Cộng đồng MBC.`

### `app/config/themes.ts`
- Dòng 236: `// 1. MBC Classic`
- Dòng 239: `name: 'MBC Classic',`

### `app/i18n/en.ts`
- Dòng 5: `appName: 'MBC Academy',`

### `app/i18n/vi.ts`
- Dòng 5: `appName: 'Cộng đồng MBC',`

### `app/khoa-hoc/[id]/page.tsx`
- Dòng 10: `const DEFAULT_OG_TITLE = 'MBC - Ngân hàng Phước Báu'`

### `app/land/[slug]/page.tsx`
- Dòng 7: `const DEFAULT_OG_TITLE = 'MBC - Ngân hàng Phước Báu'`

### `app/layout.tsx`
- Dòng 27: `default: "MBC - Ngân hàng Phước Báu",`
- Dòng 28: `template: "%s | MBC - Ngân hàng Phước Báu",`
- Dòng 32: `title: "MBC - Ngân hàng Phước Báu",`
- Dòng 37: `siteName: "MBC - Ngân hàng Phước Báu",`
- Dòng 43: `alt: "MBC - Ngân hàng Phước Báu",`
- Dòng 49: `title: "MBC - Ngân hàng Phước Báu",`

### `app/page/[slug]/page.tsx`
- Dòng 21: `const DEFAULT_OG_TITLE = 'MBC - Ngân hàng Phước Báu'`

### `app/page.tsx`
- Dòng 18: `title: 'MBC - Ngân hàng Phước Báu',`
- Dòng 21: `title: 'MBC - Ngân hàng Phước Báu',`
- Dòng 26: `siteName: 'MBC - Ngân hàng Phước Báu',`
- Dòng 32: `alt: 'MBC - Ngân hàng Phước Báu',`
- Dòng 38: `title: 'MBC - Ngân hàng Phước Báu',`
- Dòng 47: `// Lấy MBC Profile mặc định - Đã có try-catch fallback bên trong action`

### `app/tools/brk/brk-nav.ts`
- Dòng 3: `{ label: 'Ví MBC', href: '/tools/brk/wallet', icon: 'Wallet' },`

### `app/tools/brk/layout.tsx`
- Dòng 7: `<AdminSubNav title="MBC Affiliate" items={brkSubNav} />`

### `app/tools/brk/level/page.tsx`
- Dòng 205: `Theo dõi chi tiết điểm số, doanh số dồn, thu nhập đối ứng và từng mốc thăng hoa của bạn trên hệ thống MBC.`

### `app/tools/brk/page.tsx`
- Dòng 215: `<h1 className="text-2xl font-bold text-gray-800">MBC Affiliate</h1>`
- Dòng 281: `Bạn chưa tham gia hệ thống MBC nào. Hãy chuyển qua tab "Hệ thống" để tham gia.`
- Dòng 318: `Chưa có hệ thống MBC nào được tạo.`

### `app/tools/brk/wallet/page.tsx`
- Dòng 34: `<h1 className="text-2xl font-bold text-gray-800">Ví MBC</h1>`

### `app/tools/email-mkt/EMAIL_MKT_PLAN.md`
- Dòng 676: `const fromName = 'Cộng đồng MBC';`
- Dòng 1291: `'[Cộng đồng MBC] Xác minh tài khoản của bạn',`
- Dòng 1292: `'[Cộng đồng MBC] Kích hoạt tài khoản ngay',`
- Dòng 1293: `'[Cộng đồng MBC] Hoàn tất đăng ký - Xác nhận email của bạn',`
- Dòng 1294: `'[Cộng đồng MBC] Verify your account để bắt đầu học',`
- Dòng 1295: `'Xác nhận đăng ký thành công - Cộng đồng MBC',`
- Dòng 1296: `'[Cộng đồng MBC] Chào mừng! Xác minh email để tiếp tục',`
- Dòng 1297: `'Kích hoạt tài khoản Cộng đồng MBC của bạn',`
- Dòng 1484: `from: 'Cộng đồng MBC <onboarding@resend.dev>',`
- Dòng 1518: `const fromName = 'Cộng đồng MBC';`
- Dòng 1604: `<p style="color: #4b5563; line-height: 1.6;">Chào mừng bạn tham gia Cộng đồng MBC. Nhập mã này để xác nhận:</p>`
- Dòng 1675: `const subject = `[Cộng đồng MBC] Chào mừng bạn gia nhập cộng đồng - Mã học tập của bạn là #${studentId}`;`
- Dòng 1676: `const htmlBody = `Chào mừng <b>${studentName}</b> đến với Cộng đồng MBC,<br><br>Mã số học tập của bạn là: <b>#${studentId}</b>`;`
- Dòng 1689: `const subject = `[Cộng đồng MBC] Kích hoạt thành công khóa học: ${courseName}`;`
- Dòng 2679: `<img src="https://giautoandien.io.vn/logobrk-50px.png" alt="CỘNG ĐỒNG MBC" style="height: 40px; display: block; margin: 0 auto; color: #FACC15; font-w`
- Dòng 2681: `<div style="color: #FACC15; font-size: 10px; font-weight: bold; margin-top: 5px; letter-spacing: 2px;">NGÂN HÀNG PHƯỚC BÁU</div>`
- Dòng 2690: `Bạn nhận được thông báo này vì là thành viên của <b>Cộng đồng MBC</b>.<br>`
- Dòng 3531: `<p>Bạn sẽ không nhận được các email thông báo từ Cộng đồng MBC nữa.</p>`

### `app/tools/ho-tro/AssistantGuideTab.tsx`
- Dòng 137: `<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded`

### `app/tools/my-site/edit/page.tsx`
- Dòng 38: `{ name: 'Cam MBC', value: '#f97316' },`

### `app/tools/pages/SiteProfilesTab.tsx`
- Dòng 54: `<p className="text-sm text-gray-400 mt-0.5">Quản lý trang chủ cho MBC và các Teacher</p>`
- Dòng 84: `{profile.isDefault && <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-500 rounded text-[10px] font-bold">MBC</span>}`
- Dòng 90: `{profile.user ? <span className="text-gray-800">{profile.user.name}</span> : <span className="text-orange-500 italic">MBC Default</span>}`

### `app/tools/payments/page.tsx`
- Dòng 210: `if (!confirm(`Xác nhận đổi ${enrollmentIds.length} đăng ký về trạng thái CHỜ DUYỆT?\n\nTất cả dữ liệu MBC của thành viên sẽ bị xóa, hệ thống giữ nguyê`
- Dòng 217: `messages.push(`✅ Đã phẫu thuật revert ${result.brkReverted.length} MBC member: ${result.brkReverted.map(r => `#${r.userId}`).join(', ')}`)`
- Dòng 235: `if (!confirm('⚠️ Xóa TOÀN BỘ dữ liệu MBC của hệ thống này?\n\nTất cả thành viên, ví, hoa hồng, lịch sử sẽ bị xóa sạch.\nBạn sẽ phải rebuild thủ công s`
- Dòng 236: `if (!confirm('Xác nhận LẦN CUỐI: Xóa toàn bộ dữ liệu MBC?')) return`
- Dòng 776: `title="Xóa dữ liệu MBC thành viên, giữ nguyên hệ thống"`
- Dòng 786: `title="Xóa toàn bộ dữ liệu MBC hệ thống, rebuild thủ công"`

### `app/tools/settings/theme/page.tsx`
- Dòng 427: `<span className="font-bold" style={{ color: colors.onSurface }}>Cộng đồng MBC</span>`

### `app/tools/site-profiles/[id]/edit/page.tsx`
- Dòng 274: `placeholder="NGÂN HÀNG PHƯỚC BÁU"`

### `backups/db_2026-07-14_06-56-38.sql`
- Dòng 8187: `3	/	Chào mừng đến với BRK	Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu. Tôi là trợ lý ảo của bạn. Tại đây, bạn có thể khám phá các khóa họ`
- Dòng 8233: `22	XD_HETHONG_UP1000	Ngân hàng phước báu	Xây dựng hệ thống Ngân hàng phước báu BRK 1$ up 1000$	\N	t	Vừa học vừa chơi game thực chiến<br>Chinh phục doa`
- Dòng 10674: `cmr0vesj20001zjf2xidne5vh	Chào mừng bạn đến với Học viện BRK	Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu!\n\nĐây là nơi chúng ta cùng nha`
- Dòng 10701: `3	cmr0vesj20001zjf2xidne5vh	1093	Dạ em lê thúy Hằng gởi lời biết ơn chị Bê Nguyễn đã Gieo Duyên cho em biết đến Học Viện BRk - ngân hàng Phước Báu để `
- Dòng 10814: `1	\N	brk	t	t	\N	0.3	NGÂN HÀNG PHƯỚC BÁU	Tri thức là sức mạnh	Học hôm nay, thành công ngày mai	BRK mang đến những tri thức thực chiến giúp bạn phát tri`
- Dòng 12598: `4	VIP MB1	Voucher MB1	VIP	0	\N	Khi đăng ký khóa Ngân hàng phước báu (Mini game) với 26868 VNĐ, bạn nhận được Voucher VIP MB1 để kích hoạt tất cả các k`
- Dòng 14168: `2	4	2026-06-30 10:37:47.91	MB - Ngân hàng phước báu	22	\N	26868.00	30	1	21.00	2.00	3	0.56`

### `backups/db_2026-07-15_21-50-29.sql`
- Dòng 8418: `3	/	Chào mừng đến với BRK	Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu. Tôi là trợ lý ảo của bạn. Tại đây, bạn có thể khám phá các khóa họ`
- Dòng 8464: `22	XD_HETHONG_UP1000	Ngân hàng phước báu	Xây dựng hệ thống Ngân hàng phước báu BRK 1$ up 1000$	\N	t	Vừa học vừa chơi game thực chiến<br>Chinh phục doa`
- Dòng 10970: `161	1463	486868	Ngân hàng TMCP Sài Gòn Thương Tín	0912426481	\N	\N	+84947805051	\N	\N	PENDING	\N	\N	\N	2026-07-15 14:33:31.085	2026-07-15 14:33:31.085`
- Dòng 10981: `cmr0vesj20001zjf2xidne5vh	Chào mừng bạn đến với Học viện BRK	Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu!\n\nĐây là nơi chúng ta cùng nha`
- Dòng 11008: `3	cmr0vesj20001zjf2xidne5vh	1093	Dạ em lê thúy Hằng gởi lời biết ơn chị Bê Nguyễn đã Gieo Duyên cho em biết đến Học Viện BRk - ngân hàng Phước Báu để `
- Dòng 11125: `1	0	brk	t	t	\N	0.3	NGÂN HÀNG PHƯỚC BÁU	Tri thức là sức mạnh	Học hôm nay, thành công ngày mai	BRK mang đến những tri thức thực chiến giúp bạn phát triể`
- Dòng 12937: `4	VIP MB1	Voucher MB1	VIP	0	\N	Khi đăng ký khóa Ngân hàng phước báu (Mini game) với 26868 VNĐ, bạn nhận được Voucher VIP MB1 để kích hoạt tất cả các k`
- Dòng 15120: `2149	3773	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:14:38.68`
- Dòng 15121: `2150	976	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:17:49.174`
- Dòng 15125: `2154	1035	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:34:47.23`
- Dòng 15126: `2155	229	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:42:59.198`
- Dòng 15127: `2156	1057	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:18.78`
- Dòng 15128: `2157	1060	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:26.99`
- Dòng 15129: `2158	962	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:34.159`
- Dòng 15130: `2159	1010	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:40.22`
- Dòng 15131: `2160	1059	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:47:10.07`
- Dòng 15132: `2161	496	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:48:00.655`
- Dòng 15133: `2162	1061	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:48:29.93`
- Dòng 15134: `2163	965	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:50:02.219`
- Dòng 15135: `2164	1063	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:51:47.33`
- Dòng 15136: `2165	828	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:54:16.855`
- Dòng 15137: `2166	914	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:54:46.564`
- Dòng 15139: `2168	330	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 07:22:41.247`
- Dòng 15140: `2169	1029	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 07:27:32.88`
- Dòng 15142: `2171	379	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 07:38:29.255`
- Dòng 15146: `2175	1023	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 00:54:47.92`
- Dòng 15151: `2180	1068	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 05:43:14.32`
- Dòng 15154: `2183	1066	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 07:27:58.74`
- Dòng 15158: `2187	617	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 10:23:18.973`
- Dòng 15160: `2189	1044	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 12:30:46.14`
- Dòng 15162: `2191	974	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 14:25:03.001`
- Dòng 15166: `2195	1070	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 00:26:56.47`
- Dòng 15172: `2201	1053	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 05:01:46.78`
- Dòng 15173: `2202	1071	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 05:03:08.81`
- Dòng 15175: `2204	26	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 05:36:05.249`
- Dòng 15177: `2206	607	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 07:14:56.199`
- Dòng 15178: `2207	478	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 07:33:36.771`
- Dòng 15179: `2208	7	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 09:04:44.691`
- Dòng 15180: `2209	878	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 09:25:20.515`
- Dòng 15181: `2210	1072	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 12:18:26.85`
- Dòng 15182: `2211	944	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 13:14:30.62`
- Dòng 15183: `2212	1073	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 14:24:42.39`
- Dòng 15185: `2214	1074	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 15:39:45.80`
- Dòng 15186: `2215	1075	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-05 02:09:10.18`
- Dòng 15190: `2219	1076	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-05 13:02:58.70`
- Dòng 15195: `2224	1079	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-06 13:06:34.71`
- Dòng 15196: `2225	1077	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-06 15:15:21.74`
- Dòng 15197: `2226	1080	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-06 23:06:44.99`
- Dòng 15199: `2228	837	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 04:41:26.719`
- Dòng 15202: `2231	1081	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 06:26:34.06`
- Dòng 15204: `2233	1083	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 07:35:53.16`
- Dòng 15205: `2234	1085	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 07:56:54.41`
- Dòng 15206: `2235	1086	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 08:13:42.28`
- Dòng 15208: `2237	1087	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 08:38:52.82`
- Dòng 15209: `2238	1088	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 09:20:06.33`
- Dòng 15211: `2240	1089	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 10:54:02.80`
- Dòng 15212: `2241	834	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 13:00:42.81`
- Dòng 15213: `2242	1091	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 13:13:44.91`
- Dòng 15214: `2243	1026	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 15:50:01.00`
- Dòng 15217: `2246	1093	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 00:44:56.56`
- Dòng 15218: `2247	703	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 03:26:30.796`
- Dòng 15221: `2250	864	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 10:30:40.716`
- Dòng 15223: `2252	269	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 12:48:47.579`
- Dòng 15224: `2253	16	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 13:18:08.247`
- Dòng 15225: `2254	468	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 13:54:13.656`
- Dòng 15234: `2263	1095	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 00:44:47.45`
- Dòng 15235: `2264	749	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 02:41:23.362`
- Dòng 15236: `2265	1096	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 03:17:43.76`
- Dòng 15244: `2273	283	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 09:11:31.868`
- Dòng 15248: `2277	885	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 12:46:28.245`
- Dòng 15249: `2278	1098	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-10 00:15:32.80`
- Dòng 15255: `2284	256	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 02:54:35.547`
- Dòng 15256: `2285	1058	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 07:12:10.97`
- Dòng 15260: `2289	2	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 14:04:28.48`
- Dòng 15261: `2290	1042	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 16:18:05.65`
- Dòng 15265: `2294	1100	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-12 06:55:51.29`
- Dòng 15272: `2301	611	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 07:08:47.85`
- Dòng 15273: `2302	794	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 08:18:17.791`
- Dòng 15274: `2303	1105	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 10:33:24.75`
- Dòng 15280: `2309	861	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 14:49:18.456`
- Dòng 15281: `2310	1106	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 16:01:40.85`
- Dòng 15286: `2315	3773	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 06:17:13.124`
- Dòng 15287: `2316	976	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:27.061`
- Dòng 15288: `2317	1035	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:22.56`
- Dòng 15289: `2318	229	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:16.972`
- Dòng 15290: `2319	1057	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:11.254`
- Dòng 15291: `2320	1060	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:06.973`
- Dòng 15292: `2321	962	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:02.987`
- Dòng 15293: `2322	1010	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:58.653`
- Dòng 15294: `2323	1059	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:54.235`
- Dòng 15295: `2324	496	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:49.003`
- Dòng 15296: `2325	1061	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:44.317`
- Dòng 15297: `2326	965	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:39.439`
- Dòng 15298: `2327	1063	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:32.847`
- Dòng 15299: `2328	828	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 06:59:06.741`
- Dòng 15300: `2329	914	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 06:58:55.201`
- Dòng 15301: `2330	1008	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:21:39.057`
- Dòng 15302: `2331	330	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:25:38.537`
- Dòng 15303: `2332	1029	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:34:19.488`
- Dòng 15304: `2333	379	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:40:48.705`
- Dòng 15305: `2334	1023	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:56:14.707`
- Dòng 15306: `2335	1068	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:26:28.783`
- Dòng 15307: `2336	1066	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:26:40.544`
- Dòng 15308: `2337	617	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:26:49.967`
- Dòng 15309: `2338	1044	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:25:51.258`
- Dòng 15310: `2339	974	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 02:24:50.723`
- Dòng 15311: `2340	1070	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 02:24:22.964`
- Dòng 15312: `2341	1053	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 17:55:00`
- Dòng 15313: `2342	1071	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 05:04:05.516`
- Dòng 15314: `2343	26	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 05:37:27.95`
- Dòng 15315: `2344	607	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 07:14:56.433`
- Dòng 15316: `2345	478	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 07:34:59.963`
- Dòng 15317: `2346	7	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 09:13:41.284`
- Dòng 15318: `2347	878	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 05:23:16.745`
- Dòng 15319: `2348	1072	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 12:21:28.591`
- Dòng 15320: `2349	944	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 13:16:04.54`
- Dòng 15321: `2350	1073	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 14:44:38.179`
- Dòng 15322: `2351	1074	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 16:29:49.756`
- Dòng 15323: `2352	1075	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-05 02:25:24.016`
- Dòng 15324: `2353	1076	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-05 13:04:46.818`
- Dòng 15325: `2354	1079	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-06 13:07:58.184`
- Dòng 15326: `2355	1077	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-06 15:19:06.383`
- Dòng 15327: `2356	1080	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 01:23:15.702`
- Dòng 15328: `2357	837	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 05:25:57.827`
- Dòng 15329: `2358	1081	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:09:13.505`
- Dòng 15330: `2359	1083	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:09:00.551`
- Dòng 15331: `2360	1085	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:09:32.755`
- Dòng 15332: `2361	1086	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:35:10.087`
- Dòng 15333: `2362	1087	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 12:51:00.804`
- Dòng 15334: `2363	1088	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 12:50:32.235`
- Dòng 15335: `2364	1089	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 13:06:28.551`
- Dòng 15336: `2365	834	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 13:04:40.161`
- Dòng 15337: `2366	1091	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 13:35:42.051`
- Dòng 15338: `2367	1026	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 15:51:21.143`
- Dòng 15339: `2368	1093	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 03:37:58.915`
- Dòng 15340: `2369	703	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-08 03:29:28.818`
- Dòng 15341: `2370	864	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 08:06:14.708`
- Dòng 15342: `2371	269	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-08 12:50:56.897`
- Dòng 15343: `2372	16	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-08 13:25:07.335`
- Dòng 15344: `2373	468	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 09:22:00.222`
- Dòng 15345: `2374	1095	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 00:48:26.97`
- Dòng 15346: `2375	749	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 11:03:05.71`
- Dòng 15347: `2376	1096	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 03:37:32.01`
- Dòng 15348: `2377	283	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 13:21:40.418`
- Dòng 15349: `2378	885	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 10:43:22.781`
- Dòng 15350: `2379	1098	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-10 00:17:26.311`
- Dòng 15351: `2380	256	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 05:38:11.698`
- Dòng 15352: `2381	1058	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 07:12:58.539`
- Dòng 15353: `2382	2	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 14:05:23.722`
- Dòng 15354: `2383	1042	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 16:20:06.351`
- Dòng 15355: `2384	1100	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-12 06:57:05.391`
- Dòng 15356: `2385	611	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 07:10:54.456`
- Dòng 15357: `2386	794	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 08:19:55.985`
- Dòng 15358: `2387	1105	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 14:04:30.047`
- Dòng 15359: `2388	861	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 14:50:37.192`
- Dòng 15360: `2389	1106	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 16:06:03.242`
- Dòng 16320: `3350	700	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cours`
- Dòng 18511: `2	4	2026-06-30 10:37:47.91	MB - Ngân hàng phước báu	22	\N	26868.00	30	1	21.00	2.00	3	0.56`

### `backups/db_2026-07-19_15-35-57.sql`
- Dòng 8794: `3	/	Chào mừng đến với BRK	Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu. Tôi là trợ lý ảo của bạn. Tại đây, bạn có thể khám phá các khóa họ`
- Dòng 8843: `22	XD_HETHONG_UP1000	Ngân hàng phước báu	Xây dựng hệ thống Ngân hàng phước báu BRK 1$ up 1000$	\N	t	Vừa học vừa chơi game thực chiến<br>Chinh phục doa`
- Dòng 11511: `cmr0vesj20001zjf2xidne5vh	Chào mừng bạn đến với Học viện BRK	Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu!\n\nĐây là nơi chúng ta cùng nha`
- Dòng 11538: `3	cmr0vesj20001zjf2xidne5vh	1093	Dạ em lê thúy Hằng gởi lời biết ơn chị Bê Nguyễn đã Gieo Duyên cho em biết đến Học Viện BRk - ngân hàng Phước Báu để `
- Dòng 11667: `1	0	brk	t	t	\N	0.3	NGÂN HÀNG PHƯỚC BÁU	Tri thức là sức mạnh	Học hôm nay, thành công ngày mai	BRK mang đến những tri thức thực chiến giúp bạn phát triể`
- Dòng 13520: `4	VIP MB1	Voucher MB1	VIP	0	\N	Khi đăng ký khóa Ngân hàng phước báu (Mini game) với 26868 VNĐ, bạn nhận được Voucher VIP MB1 để kích hoạt tất cả các k`
- Dòng 15703: `2149	3773	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:14:38.68`
- Dòng 15704: `2150	976	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:17:49.174`
- Dòng 15708: `2154	1035	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:34:47.23`
- Dòng 15709: `2155	229	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:42:59.198`
- Dòng 15710: `2156	1057	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:18.78`
- Dòng 15711: `2157	1060	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:26.99`
- Dòng 15712: `2158	962	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:34.159`
- Dòng 15713: `2159	1010	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:40.22`
- Dòng 15714: `2160	1059	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:47:10.07`
- Dòng 15715: `2161	496	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:48:00.655`
- Dòng 15716: `2162	1061	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:48:29.93`
- Dòng 15717: `2163	965	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:50:02.219`
- Dòng 15718: `2164	1063	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:51:47.33`
- Dòng 15719: `2165	828	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:54:16.855`
- Dòng 15720: `2166	914	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:54:46.564`
- Dòng 15722: `2168	330	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 07:22:41.247`
- Dòng 15723: `2169	1029	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 07:27:32.88`
- Dòng 15725: `2171	379	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 07:38:29.255`
- Dòng 15729: `2175	1023	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 00:54:47.92`
- Dòng 15734: `2180	1068	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 05:43:14.32`
- Dòng 15737: `2183	1066	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 07:27:58.74`
- Dòng 15741: `2187	617	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 10:23:18.973`
- Dòng 15743: `2189	1044	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 12:30:46.14`
- Dòng 15745: `2191	974	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 14:25:03.001`
- Dòng 15749: `2195	1070	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 00:26:56.47`
- Dòng 15755: `2201	1053	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 05:01:46.78`
- Dòng 15756: `2202	1071	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 05:03:08.81`
- Dòng 15758: `2204	26	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 05:36:05.249`
- Dòng 15760: `2206	607	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 07:14:56.199`
- Dòng 15761: `2207	478	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 07:33:36.771`
- Dòng 15762: `2208	7	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 09:04:44.691`
- Dòng 15763: `2209	878	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 09:25:20.515`
- Dòng 15764: `2210	1072	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 12:18:26.85`
- Dòng 15765: `2211	944	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 13:14:30.62`
- Dòng 15766: `2212	1073	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 14:24:42.39`
- Dòng 15768: `2214	1074	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 15:39:45.80`
- Dòng 15769: `2215	1075	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-05 02:09:10.18`
- Dòng 15773: `2219	1076	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-05 13:02:58.70`
- Dòng 15778: `2224	1079	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-06 13:06:34.71`
- Dòng 15779: `2225	1077	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-06 15:15:21.74`
- Dòng 15780: `2226	1080	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-06 23:06:44.99`
- Dòng 15782: `2228	837	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 04:41:26.719`
- Dòng 15785: `2231	1081	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 06:26:34.06`
- Dòng 15787: `2233	1083	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 07:35:53.16`
- Dòng 15788: `2234	1085	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 07:56:54.41`
- Dòng 15789: `2235	1086	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 08:13:42.28`
- Dòng 15791: `2237	1087	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 08:38:52.82`
- Dòng 15792: `2238	1088	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 09:20:06.33`
- Dòng 15794: `2240	1089	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 10:54:02.80`
- Dòng 15795: `2241	834	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 13:00:42.81`
- Dòng 15796: `2242	1091	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 13:13:44.91`
- Dòng 15797: `2243	1026	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 15:50:01.00`
- Dòng 15800: `2246	1093	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 00:44:56.56`
- Dòng 15801: `2247	703	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 03:26:30.796`
- Dòng 15804: `2250	864	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 10:30:40.716`
- Dòng 15806: `2252	269	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 12:48:47.579`
- Dòng 15807: `2253	16	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 13:18:08.247`
- Dòng 15808: `2254	468	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 13:54:13.656`
- Dòng 15817: `2263	1095	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 00:44:47.45`
- Dòng 15818: `2264	749	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 02:41:23.362`
- Dòng 15819: `2265	1096	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 03:17:43.76`
- Dòng 15827: `2273	283	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 09:11:31.868`
- Dòng 15831: `2277	885	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 12:46:28.245`
- Dòng 15832: `2278	1098	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-10 00:15:32.80`
- Dòng 15838: `2284	256	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 02:54:35.547`
- Dòng 15839: `2285	1058	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 07:12:10.97`
- Dòng 15843: `2289	2	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 14:04:28.48`
- Dòng 15844: `2290	1042	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 16:18:05.65`
- Dòng 15848: `2294	1100	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-12 06:55:51.29`
- Dòng 15855: `2301	611	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 07:08:47.85`
- Dòng 15856: `2302	794	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 08:18:17.791`
- Dòng 15857: `2303	1105	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 10:33:24.75`
- Dòng 15863: `2309	861	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 14:49:18.456`
- Dòng 15864: `2310	1106	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 16:01:40.85`
- Dòng 15869: `2315	3773	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 06:17:13.124`
- Dòng 15870: `2316	976	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:27.061`
- Dòng 15871: `2317	1035	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:22.56`
- Dòng 15872: `2318	229	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:16.972`
- Dòng 15873: `2319	1057	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:11.254`
- Dòng 15874: `2320	1060	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:06.973`
- Dòng 15875: `2321	962	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:02.987`
- Dòng 15876: `2322	1010	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:58.653`
- Dòng 15877: `2323	1059	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:54.235`
- Dòng 15878: `2324	496	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:49.003`
- Dòng 15879: `2325	1061	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:44.317`
- Dòng 15880: `2326	965	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:39.439`
- Dòng 15881: `2327	1063	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:32.847`
- Dòng 15882: `2328	828	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 06:59:06.741`
- Dòng 15883: `2329	914	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 06:58:55.201`
- Dòng 15884: `2330	1008	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:21:39.057`
- Dòng 15885: `2331	330	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:25:38.537`
- Dòng 15886: `2332	1029	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:34:19.488`
- Dòng 15887: `2333	379	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:40:48.705`
- Dòng 15888: `2334	1023	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:56:14.707`
- Dòng 15889: `2335	1068	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:26:28.783`
- Dòng 15890: `2336	1066	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:26:40.544`
- Dòng 15891: `2337	617	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:26:49.967`
- Dòng 15892: `2338	1044	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:25:51.258`
- Dòng 15893: `2339	974	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 02:24:50.723`
- Dòng 15894: `2340	1070	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 02:24:22.964`
- Dòng 15895: `2341	1053	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 17:55:00`
- Dòng 15896: `2342	1071	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 05:04:05.516`
- Dòng 15897: `2343	26	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 05:37:27.95`
- Dòng 15898: `2344	607	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 07:14:56.433`
- Dòng 15899: `2345	478	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 07:34:59.963`
- Dòng 15900: `2346	7	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 09:13:41.284`
- Dòng 15901: `2347	878	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 05:23:16.745`
- Dòng 15902: `2348	1072	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 12:21:28.591`
- Dòng 15903: `2349	944	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 13:16:04.54`
- Dòng 15904: `2350	1073	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 14:44:38.179`
- Dòng 15905: `2351	1074	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 16:29:49.756`
- Dòng 15906: `2352	1075	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-05 02:25:24.016`
- Dòng 15907: `2353	1076	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-05 13:04:46.818`
- Dòng 15908: `2354	1079	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-06 13:07:58.184`
- Dòng 15909: `2355	1077	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-06 15:19:06.383`
- Dòng 15910: `2356	1080	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 01:23:15.702`
- Dòng 15911: `2357	837	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 05:25:57.827`
- Dòng 15912: `2358	1081	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:09:13.505`
- Dòng 15913: `2359	1083	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:09:00.551`
- Dòng 15914: `2360	1085	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:09:32.755`
- Dòng 15915: `2361	1086	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:35:10.087`
- Dòng 15916: `2362	1087	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 12:51:00.804`
- Dòng 15917: `2363	1088	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 12:50:32.235`
- Dòng 15918: `2364	1089	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 13:06:28.551`
- Dòng 15919: `2365	834	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 13:04:40.161`
- Dòng 15920: `2366	1091	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 13:35:42.051`
- Dòng 15921: `2367	1026	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 15:51:21.143`
- Dòng 15922: `2368	1093	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 03:37:58.915`
- Dòng 15923: `2369	703	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-08 03:29:28.818`
- Dòng 15924: `2370	864	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 08:06:14.708`
- Dòng 15925: `2371	269	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-08 12:50:56.897`
- Dòng 15926: `2372	16	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-08 13:25:07.335`
- Dòng 15927: `2373	468	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 09:22:00.222`
- Dòng 15928: `2374	1095	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 00:48:26.97`
- Dòng 15929: `2375	749	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 11:03:05.71`
- Dòng 15930: `2376	1096	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 03:37:32.01`
- Dòng 15931: `2377	283	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 13:21:40.418`
- Dòng 15932: `2378	885	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 10:43:22.781`
- Dòng 15933: `2379	1098	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-10 00:17:26.311`
- Dòng 15934: `2380	256	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 05:38:11.698`
- Dòng 15935: `2381	1058	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 07:12:58.539`
- Dòng 15936: `2382	2	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 14:05:23.722`
- Dòng 15937: `2383	1042	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 16:20:06.351`
- Dòng 15938: `2384	1100	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-12 06:57:05.391`
- Dòng 15939: `2385	611	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 07:10:54.456`
- Dòng 15940: `2386	794	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 08:19:55.985`
- Dòng 15941: `2387	1105	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 14:04:30.047`
- Dòng 15942: `2388	861	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 14:50:37.192`
- Dòng 15943: `2389	1106	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 16:06:03.242`
- Dòng 15949: `10124	1051	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-14 07:30:02.301`
- Dòng 15950: `10125	710	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-14 12:13:40.061`
- Dòng 15951: `10126	18	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-14 13:21:59.796`
- Dòng 15952: `10127	970	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-14 23:19:53.19`
- Dòng 15953: `10128	863	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 03:58:57.342`
- Dòng 15957: `10129	883	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 09:05:06.56`
- Dòng 15958: `10130	682	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 11:23:07.767`
- Dòng 15959: `10131	729	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 13:52:24.959`
- Dòng 15960: `10132	214	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-16 03:45:19.239`
- Dòng 15961: `10133	1114	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-16 15:29:27.595`
- Dòng 15962: `10134	1115	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-16 15:51:35.695`
- Dòng 15963: `10135	495	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-17 03:22:45.853`
- Dòng 15964: `11904	1082	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "test", "adminId": 3773, "courseId": 22, "enrollmentId": 1348}	2026-07-`
- Dòng 15968: `11911	1090	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "ok", "adminId": 3773, "courseId": 22, "enrollmentId": 1358}	2026-07-18`
- Dòng 15974: `11912	1097	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "ok", "adminId": 3773, "courseId": 22, "enrollmentId": 1398}	2026-07-18`
- Dòng 15975: `11914	1116	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "ok", "adminId": 3773, "courseId": 22, "enrollmentId": 1476}	2026-07-18`
- Dòng 15978: `11913	1107	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "ok", "adminId": 3773, "courseId": 22, "enrollmentId": 1441}	2026-07-18`
- Dòng 16202: `12077	1035	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16203: `12079	495	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enro`
- Dòng 16237: `3594	496	LESSON_COMPLETE	Hoàn thành bài: Buổi 1: Xây dựng hệ thống UP1000 Thực chiến (7đ)	{"score": 7, "courseName": "Ngân hàng phước báu", "lessonTit`
- Dòng 16286: `12087	3773	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16289: `12090	1010	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16294: `12095	1057	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16297: `12098	1061	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16301: `12102	965	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 16305: `12110	976	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 16309: `12106	229	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 16313: `12114	974	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 16317: `12122	1059	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16321: `12118	914	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 16325: `12126	828	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 16329: `12130	496	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 16333: `12134	1063	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16337: `12142	962	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 16341: `12146	330	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 16345: `12138	1060	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16349: `12150	1029	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16362: `12154	379	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 16366: `12158	1053	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16370: `12162	607	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 16378: `12170	1044	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16386: `12179	1117	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 16391: `12185	1068	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16400: `12199	617	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 16405: `12194	1066	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16410: `12204	1023	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 16411: `3350	700	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 04:36:55.386`
- Dòng 16455: `6083	496	LESSON_COMPLETE	Hoàn thành bài: B1 - Thực chiến 30 ngày xây dựng Hệ thống UP1000  (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "les`
- Dòng 17670: `2	4	2026-06-30 10:37:47.91	MB - Ngân hàng phước báu	22	\N	26868.00	30	1	21.00	2.00	3	0.56`

### `backups/db_2026-07-19_15-36-35/ActivityLog.json`
- Dòng 20345: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20356: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20400: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20411: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20422: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20433: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20444: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20455: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20466: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20477: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20488: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20499: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20510: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20521: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20532: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20554: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20565: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20587: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20631: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20686: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20719: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20763: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20785: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20807: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20851: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20917: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20928: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20950: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20972: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20983: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20994: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21005: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21016: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21027: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21038: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21060: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21071: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21115: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21170: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21181: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21192: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21214: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21247: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21269: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21280: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21291: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21313: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21324: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21346: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21357: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21368: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21379: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21412: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21423: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21456: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21478: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21489: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21500: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21599: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21610: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21621: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21709: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21753: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21764: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21830: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21841: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21885: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21896: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21940: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 22017: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 22028: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 22039: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 22105: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 22116: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 22171: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22182: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22193: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22204: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22215: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22226: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22237: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22248: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22259: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22270: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22281: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22292: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22303: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22314: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22325: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22336: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22347: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22358: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22369: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22380: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22391: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22402: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22413: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22424: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22435: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22446: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22457: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22468: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22479: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22490: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22501: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22512: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22523: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22534: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22545: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22556: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22567: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22578: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22589: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22600: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22611: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22622: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22633: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22644: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22655: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22666: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22677: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22688: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22699: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22710: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22721: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22732: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22743: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22754: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22765: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22776: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22787: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22798: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22809: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22820: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22831: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22842: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22853: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22864: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22875: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22886: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22897: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22908: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22919: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22930: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22941: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22952: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22963: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22974: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22985: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23059: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23070: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23081: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23092: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23103: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23155: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23166: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23177: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23188: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23199: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23210: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23221: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23232: `"detail": "Từ chối thanh toán: Ngân hàng phước báu",`
- Dòng 23284: `"detail": "Từ chối thanh toán: Ngân hàng phước báu",`
- Dòng 23361: `"detail": "Từ chối thanh toán: Ngân hàng phước báu",`
- Dòng 23374: `"detail": "Từ chối thanh toán: Ngân hàng phước báu",`
- Dòng 23410: `"detail": "Từ chối thanh toán: Ngân hàng phước báu",`
- Dòng 26042: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 26058: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 26507: `"courseName": "Ngân hàng phước báu",`
- Dòng 27155: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27197: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27267: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27311: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27368: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27426: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27484: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27542: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27600: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27658: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27716: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27774: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27832: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27890: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 27948: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 28006: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 28064: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 28235: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 28293: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 28351: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 28466: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 28579: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 28643: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 28767: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 28839: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 28911: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 28931: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 29503: `"courseName": "Ngân hàng phước báu",`

### `backups/db_2026-07-19_15-36-35/AssistantGuide.json`
- Dòng 6: `"script": "Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu. Tôi là trợ lý ảo của bạn. Tại đây, bạn có thể khám phá các khóa học, theo dõi lộ `
- Dòng 7: `"textContent": "Chào mừng bạn đến với Học viện BRK!\n\nBRK - Ngân hàng Phước Báu là nền tảng đào tạo trực tuyến, nơi bạn có thể:\n• Khám phá các khóa `

### `backups/db_2026-07-19_15-36-35/Course.json`
- Dòng 707: `"name_lop": "Ngân hàng phước báu",`
- Dòng 708: `"name_khoa": "Xây dựng hệ thống Ngân hàng phước báu BRK 1$ up 1000$",`

### `backups/db_2026-07-19_15-36-35/Post.json`
- Dòng 5: `"content": "Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu!\n\nĐây là nơi chúng ta cùng nhau học tập, chia sẻ và phát triển. BRK cam kết man`

### `backups/db_2026-07-19_15-36-35/PostComment.json`
- Dòng 22: `"content": "Dạ em lê thúy Hằng gởi lời biết ơn chị Bê Nguyễn đã Gieo Duyên cho em biết đến Học Viện BRk - ngân hàng Phước Báu để em học tập và phát tr`

### `backups/db_2026-07-19_15-36-35/SiteProfile.json`
- Dòng 54: `"title": "NGÂN HÀNG PHƯỚC BÁU",`
- Dòng 68: `"footerText": "© 2026 Ngân hàng Phước Báu. Mọi quyền được bảo lưu.",`
- Dòng 70: `"metaTitle": "BRK - Ngân hàng Phước Báu",`

### `backups/db_2026-07-19_15-36-35/SystemTree.json`
- Dòng 66: `"nameSystem": "MB - Ngân hàng phước báu",`

### `backups/db_2026-07-19_15-36-35/Voucher.json`
- Dòng 42: `"description": "Khi đăng ký khóa Ngân hàng phước báu (Mini game) với 26868 VNĐ, bạn nhận được Voucher VIP MB1 để kích hoạt tất cả các khóa thuộc mini `

### `backups/db_2026-08-06_11-17-39.sql`
- Dòng 10585: `3	/	Chào mừng đến với BRK	Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu. Tôi là trợ lý ảo của bạn. Tại đây, bạn có thể khám phá các khóa họ`
- Dòng 10636: `22	XD_HETHONG_UP1000	Quà tặng Lv1	Học các khóa học trị giá >10 triệu chỉ với 1$	\N	t	💰 Phí tham gia tượng trưng chỉ 1$ = 26.868 VND bạn được học các `
- Dòng 14744: `87	cmrmp55no0001pls5ne9lt9e6	1117	BÀI  HỌC HAY QUÁ Ạ!  BRK - Ngân hàng Phước Báu  Ngân hàng phước báu 0/7 0%   Phần 1  Video    B1 - Thực chiến 30 ngà`
- Dòng 14745: `88	cmrmp55no0001pls5ne9lt9e6	1117	BRK - Ngân hàng Phước Báu  Ngân hàng phước báu 0/7 0%   Phần 1  Video    B1 - Thực chiến 30 ngày xây dựng Hệ thống U`
- Dòng 15046: `67230	1345	cmr25zcbw000beqgenrxymq9e	{"link": 0, "video": 0, "timing": -1, "support": 2, "playlist": {"0": {"maxTime": 9.70647201525879, "duration": 5`
- Dòng 15319: `451	1678	269054	Ngân hàng TMCP Sài Gòn Thương Tín	0912426481	\N	\N	+84935484331	\N	\N	PENDING	\N	\N	\N	2026-08-04 11:48:27.655	2026-08-04 11:48:27.655`
- Dòng 15393: `430	1670	386868	Ngân hàng TMCP Việt Nam Thịnh Vượng	9767686877	\N	\N	+84904221979	\N	\N	PENDING	\N	\N	\N	2026-08-04 07:32:20.281	2026-08-04 07:32:20.2`
- Dòng 15397: `331	1505	26868	Ngân hàng TMCP Sài Gòn Thương Tín	0912426481	2026-07-15 16:04:24.959	Description SDT 120468 HV 883 COC XD_HETHONG_UP1000	+84919120468	X`
- Dòng 15411: `419	1651	26868	Sacombank	\N	2026-08-03 01:52:00	Description SDT 683985 HV 1180 COC XDHETHONGUP1000 CKN 639087 D2XXHXKH - PHAM THI THU HUYEN - Ngan han`
- Dòng 15417: `453	1690	26868	Sacombank	\N	2026-08-04 13:09:00	Description SDT 865845 HV 923 COC XDHETHONGUP1000 CKN 556443 E2DCFXYU - NGUYEN BA NGOC - Ngan hang TMC`
- Dòng 15429: `323	1493	26868	Sacombank	\N	2026-07-20 09:45:00	Description MBVCB.15208816844.6201BFTVG25UAPB L.SDT 267239 HV 1127 COC XDHETHONGUP1000.CT tu 101279555`
- Dòng 15431: `330	1504	26868	Ngân hàng TMCP Sài Gòn Thương Tín	0912426481	\N	\N	+84971795665	\N	\N	PENDING	\N	\N	\N	2026-07-21 13:46:04.906	2026-07-21 13:46:04.906	`
- Dòng 15437: `334	1509	26868	Sacombank	\N	2026-07-25 15:48:00	Description 139273503610 SDT 784622 HV 1136 COC XDHETHONGUP1000 CHUYEN TIEN OQCH000GSHbS MOMO139273503`
- Dòng 15448: `362	1599	26868	Sacombank	\N	2026-07-30 15:40:00	Description SDT 953806 HV 1159 COC XDHETHONGUP1000 FT26211878606807 CKN 699582 kCLY2V1L - VND-TGTT-BUI`
- Dòng 15452: `447	1676	655054	Sacombank	\N	2026-08-04 08:49:00	Description SDT 188768 HV 26 COC ZALOMASTERY CKN 045098 d1PHC9A1 - MBBANK IBFT - Ngan hang TMCP Quan `
- Dòng 15464: `401	1639	26868	Sacombank	\N	2026-08-02 03:15:00	Description SDT 779428 HV 1174 COC XDHETHONGUP1000 CKN 303549 iJHV5KN3 - DIEN THI THU HUONG - Ngan han`
- Dòng 15465: `403	1641	26868	Sacombank	\N	2026-08-02 06:05:00	Description QR - SDT 077859 HV 1175 COC XDHETHONGUP1000 CKN 395330 C2BS2I5X - NGUYEN THI NGUYET - Ngan`
- Dòng 15469: `456	1693	26868	Sacombank	\N	2026-08-04 13:49:00	Description SDT 393839 HV 769 COC XDHETHONGUP1000-040826-20:49:03 6216ASCB02TFJ29H CKN 704748 02TFJ29H`
- Dòng 15471: `473	1701	3868686	Sacombank	\N	2026-08-05 05:56:00	Description QR - SDT 128613 HV 1071 COC 86D CKN 879103 C2B7AX8P - NGUYEN THI PHUONG ANH - Ngan hang `
- Dòng 15473: `476	1702	26868	Sacombank	\N	2026-08-05 07:24:00	Description QR - SDT 864881 HV 238 COC XDHETHONGUP1000 CKN 080398 C2B7J28B - HO THI THUY - Ngan hang T`
- Dòng 15478: `459	1696	26868	Sacombank	\N	2026-08-05 17:20:00	Description SDT 432869 HV 1169 COC XDHETHONGUP1000 CKN 793891 D2SY1WT6 - NGUYEN HO BAC - Ngan hang TMC`
- Dòng 15489: `cmr0vesj20001zjf2xidne5vh	Chào mừng bạn đến với Học viện BRK	Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu!\n\nĐây là nơi chúng ta cùng nha`
- Dòng 15516: `3	cmr0vesj20001zjf2xidne5vh	1093	Dạ em lê thúy Hằng gởi lời biết ơn chị Bê Nguyễn đã Gieo Duyên cho em biết đến Học Viện BRk - ngân hàng Phước Báu để `
- Dòng 15766: `1	0	brk	t	t	\N	0.3	NGÂN HÀNG PHƯỚC BÁU	Tri thức là sức mạnh	Học hôm nay, thành công ngày mai	BRK mang đến những tri thức thực chiến giúp bạn phát triể`
- Dòng 17836: `4	VIP MB1	Voucher MB1	VIP	0	\N	Khi đăng ký khóa Ngân hàng phước báu (Mini game) với 26868 VNĐ, bạn nhận được Voucher VIP MB1 để kích hoạt tất cả các k`
- Dòng 20025: `2149	3773	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:14:38.68`
- Dòng 20026: `2150	976	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:17:49.174`
- Dòng 20030: `2154	1035	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:34:47.23`
- Dòng 20031: `2155	229	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:42:59.198`
- Dòng 20032: `2156	1057	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:18.78`
- Dòng 20033: `2157	1060	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:26.99`
- Dòng 20034: `2158	962	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:34.159`
- Dòng 20035: `2159	1010	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:40.22`
- Dòng 20036: `2160	1059	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:47:10.07`
- Dòng 20037: `2161	496	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:48:00.655`
- Dòng 20038: `2162	1061	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:48:29.93`
- Dòng 20039: `2163	965	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:50:02.219`
- Dòng 20040: `2164	1063	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:51:47.33`
- Dòng 20041: `2165	828	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:54:16.855`
- Dòng 20042: `2166	914	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:54:46.564`
- Dòng 20044: `2168	330	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 07:22:41.247`
- Dòng 20045: `2169	1029	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 07:27:32.88`
- Dòng 20047: `2171	379	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 07:38:29.255`
- Dòng 20051: `2175	1023	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 00:54:47.92`
- Dòng 20056: `2180	1068	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 05:43:14.32`
- Dòng 20059: `2183	1066	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 07:27:58.74`
- Dòng 20063: `2187	617	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 10:23:18.973`
- Dòng 20065: `2189	1044	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 12:30:46.14`
- Dòng 20067: `2191	974	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 14:25:03.001`
- Dòng 20071: `2195	1070	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 00:26:56.47`
- Dòng 20077: `2201	1053	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 05:01:46.78`
- Dòng 20078: `2202	1071	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 05:03:08.81`
- Dòng 20080: `2204	26	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 05:36:05.249`
- Dòng 20082: `2206	607	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 07:14:56.199`
- Dòng 20083: `2207	478	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 07:33:36.771`
- Dòng 20084: `2208	7	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 09:04:44.691`
- Dòng 20085: `2209	878	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 09:25:20.515`
- Dòng 20086: `2210	1072	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 12:18:26.85`
- Dòng 20087: `2211	944	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 13:14:30.62`
- Dòng 20088: `2212	1073	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 14:24:42.39`
- Dòng 20090: `2214	1074	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 15:39:45.80`
- Dòng 20091: `2215	1075	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-05 02:09:10.18`
- Dòng 20095: `2219	1076	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-05 13:02:58.70`
- Dòng 20100: `2224	1079	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-06 13:06:34.71`
- Dòng 20101: `2225	1077	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-06 15:15:21.74`
- Dòng 20102: `2226	1080	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-06 23:06:44.99`
- Dòng 20104: `2228	837	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 04:41:26.719`
- Dòng 20107: `2231	1081	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 06:26:34.06`
- Dòng 20109: `2233	1083	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 07:35:53.16`
- Dòng 20110: `2234	1085	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 07:56:54.41`
- Dòng 20111: `2235	1086	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 08:13:42.28`
- Dòng 20113: `2237	1087	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 08:38:52.82`
- Dòng 20114: `2238	1088	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 09:20:06.33`
- Dòng 20116: `2240	1089	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 10:54:02.80`
- Dòng 20117: `2241	834	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 13:00:42.81`
- Dòng 20118: `2242	1091	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 13:13:44.91`
- Dòng 20119: `2243	1026	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 15:50:01.00`
- Dòng 20122: `2246	1093	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 00:44:56.56`
- Dòng 20123: `2247	703	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 03:26:30.796`
- Dòng 20126: `2250	864	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 10:30:40.716`
- Dòng 20128: `2252	269	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 12:48:47.579`
- Dòng 20129: `2253	16	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 13:18:08.247`
- Dòng 20130: `2254	468	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 13:54:13.656`
- Dòng 20139: `2263	1095	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 00:44:47.45`
- Dòng 20140: `2264	749	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 02:41:23.362`
- Dòng 20141: `2265	1096	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 03:17:43.76`
- Dòng 20149: `2273	283	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 09:11:31.868`
- Dòng 20153: `2277	885	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 12:46:28.245`
- Dòng 20154: `2278	1098	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-10 00:15:32.80`
- Dòng 20160: `2284	256	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 02:54:35.547`
- Dòng 20161: `2285	1058	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 07:12:10.97`
- Dòng 20165: `2289	2	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 14:04:28.48`
- Dòng 20166: `2290	1042	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 16:18:05.65`
- Dòng 20170: `2294	1100	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-12 06:55:51.29`
- Dòng 20177: `2301	611	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 07:08:47.85`
- Dòng 20178: `2302	794	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 08:18:17.791`
- Dòng 20179: `2303	1105	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 10:33:24.75`
- Dòng 20185: `2309	861	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 14:49:18.456`
- Dòng 20186: `2310	1106	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 16:01:40.85`
- Dòng 20191: `2315	3773	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 06:17:13.124`
- Dòng 20192: `2316	976	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:27.061`
- Dòng 20193: `2317	1035	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:22.56`
- Dòng 20194: `2318	229	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:16.972`
- Dòng 20195: `2319	1057	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:11.254`
- Dòng 20196: `2320	1060	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:06.973`
- Dòng 20197: `2321	962	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:02.987`
- Dòng 20198: `2322	1010	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:58.653`
- Dòng 20199: `2323	1059	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:54.235`
- Dòng 20200: `2324	496	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:49.003`
- Dòng 20201: `2325	1061	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:44.317`
- Dòng 20202: `2326	965	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:39.439`
- Dòng 20203: `2327	1063	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:32.847`
- Dòng 20204: `2328	828	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 06:59:06.741`
- Dòng 20205: `2329	914	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 06:58:55.201`
- Dòng 20206: `2330	1008	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:21:39.057`
- Dòng 20207: `2331	330	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:25:38.537`
- Dòng 20208: `2332	1029	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:34:19.488`
- Dòng 20209: `2333	379	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:40:48.705`
- Dòng 20210: `2334	1023	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:56:14.707`
- Dòng 20211: `2335	1068	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:26:28.783`
- Dòng 20212: `2336	1066	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:26:40.544`
- Dòng 20213: `2337	617	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:26:49.967`
- Dòng 20214: `2338	1044	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:25:51.258`
- Dòng 20215: `2339	974	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 02:24:50.723`
- Dòng 20216: `2340	1070	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 02:24:22.964`
- Dòng 20217: `2341	1053	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 17:55:00`
- Dòng 20218: `2342	1071	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 05:04:05.516`
- Dòng 20219: `2343	26	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 05:37:27.95`
- Dòng 20220: `2344	607	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 07:14:56.433`
- Dòng 20221: `2345	478	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 07:34:59.963`
- Dòng 20222: `2346	7	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 09:13:41.284`
- Dòng 20223: `2347	878	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 05:23:16.745`
- Dòng 20224: `2348	1072	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 12:21:28.591`
- Dòng 20225: `2349	944	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 13:16:04.54`
- Dòng 20226: `2350	1073	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 14:44:38.179`
- Dòng 20227: `2351	1074	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 16:29:49.756`
- Dòng 20228: `2352	1075	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-05 02:25:24.016`
- Dòng 20229: `2353	1076	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-05 13:04:46.818`
- Dòng 20230: `2354	1079	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-06 13:07:58.184`
- Dòng 20231: `2355	1077	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-06 15:19:06.383`
- Dòng 20232: `2356	1080	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 01:23:15.702`
- Dòng 20233: `2357	837	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 05:25:57.827`
- Dòng 20234: `2358	1081	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:09:13.505`
- Dòng 20235: `2359	1083	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:09:00.551`
- Dòng 20236: `2360	1085	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:09:32.755`
- Dòng 20237: `2361	1086	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:35:10.087`
- Dòng 20238: `2362	1087	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 12:51:00.804`
- Dòng 20239: `2363	1088	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 12:50:32.235`
- Dòng 20240: `2364	1089	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 13:06:28.551`
- Dòng 20241: `2365	834	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 13:04:40.161`
- Dòng 20242: `2366	1091	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 13:35:42.051`
- Dòng 20243: `2367	1026	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 15:51:21.143`
- Dòng 20244: `2368	1093	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 03:37:58.915`
- Dòng 20245: `2369	703	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-08 03:29:28.818`
- Dòng 20246: `2370	864	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 08:06:14.708`
- Dòng 20247: `2371	269	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-08 12:50:56.897`
- Dòng 20248: `2372	16	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-08 13:25:07.335`
- Dòng 20249: `2373	468	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 09:22:00.222`
- Dòng 20250: `2374	1095	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 00:48:26.97`
- Dòng 20251: `2375	749	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 11:03:05.71`
- Dòng 20252: `2376	1096	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 03:37:32.01`
- Dòng 20253: `2377	283	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 13:21:40.418`
- Dòng 20254: `2378	885	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 10:43:22.781`
- Dòng 20255: `2379	1098	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-10 00:17:26.311`
- Dòng 20256: `2380	256	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 05:38:11.698`
- Dòng 20257: `2381	1058	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 07:12:58.539`
- Dòng 20258: `2382	2	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 14:05:23.722`
- Dòng 20259: `2383	1042	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 16:20:06.351`
- Dòng 20260: `2384	1100	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-12 06:57:05.391`
- Dòng 20261: `2385	611	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 07:10:54.456`
- Dòng 20262: `2386	794	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 08:19:55.985`
- Dòng 20263: `2387	1105	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 14:04:30.047`
- Dòng 20264: `2388	861	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 14:50:37.192`
- Dòng 20265: `2389	1106	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 16:06:03.242`
- Dòng 20271: `10124	1051	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-14 07:30:02.301`
- Dòng 20272: `10125	710	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-14 12:13:40.061`
- Dòng 20273: `10126	18	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-14 13:21:59.796`
- Dòng 20274: `10127	970	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-14 23:19:53.19`
- Dòng 20275: `10128	863	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 03:58:57.342`
- Dòng 20279: `10129	883	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 09:05:06.56`
- Dòng 20280: `10130	682	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 11:23:07.767`
- Dòng 20281: `10131	729	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 13:52:24.959`
- Dòng 20282: `10132	214	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-16 03:45:19.239`
- Dòng 20283: `10133	1114	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-16 15:29:27.595`
- Dòng 20284: `10134	1115	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-16 15:51:35.695`
- Dòng 20285: `10135	495	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-17 03:22:45.853`
- Dòng 20286: `11904	1082	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "test", "adminId": 3773, "courseId": 22, "enrollmentId": 1348}	2026-07-`
- Dòng 20290: `11911	1090	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "ok", "adminId": 3773, "courseId": 22, "enrollmentId": 1358}	2026-07-18`
- Dòng 20323: `11912	1097	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "ok", "adminId": 3773, "courseId": 22, "enrollmentId": 1398}	2026-07-18`
- Dòng 20324: `11914	1116	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "ok", "adminId": 3773, "courseId": 22, "enrollmentId": 1476}	2026-07-18`
- Dòng 20326: `19772	1128	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 20342: `11913	1107	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "ok", "adminId": 3773, "courseId": 22, "enrollmentId": 1441}	2026-07-18`
- Dòng 20771: `20760	944	LESSON_COMPLETE	Hoàn thành bài: B1 - Thực chiến 30 ngày xây dựng Hệ thống UP1000  (7đ)	{"score": 7, "courseName": "Ngân hàng phước báu", "le`
- Dòng 20942: `19949	1118	LESSON_COMPLETE	Hoàn thành bài: Buổi 2: Xây dựng hệ thống UP1000 Thực chiến (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "lessonT`
- Dòng 20989: `38880	1141	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 20997: `12077	1035	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21006: `27228	1121	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 21014: `12079	495	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enro`
- Dòng 21152: `3594	496	LESSON_COMPLETE	Hoàn thành bài: Buổi 1: Xây dựng hệ thống UP1000 Thực chiến (7đ)	{"score": 7, "courseName": "Ngân hàng phước báu", "lessonTit`
- Dòng 21201: `12087	3773	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21206: `12090	1010	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21228: `12095	1057	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21245: `12098	1061	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21264: `12102	965	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 21268: `12110	976	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 21285: `12106	229	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 21289: `12114	974	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 21293: `12122	1059	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21302: `12118	914	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 21306: `12126	828	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 21318: `12130	496	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 21322: `12134	1063	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21326: `12142	962	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 21330: `12146	330	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 21336: `12138	1060	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21355: `12150	1029	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21377: `12154	379	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 21394: `12158	1053	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21411: `12162	607	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 21445: `38886	1142	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 21492: `27833	1136	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 21495: `12170	1044	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21502: `38894	408	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enro`
- Dòng 21553: `12179	1117	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 21554: `14380	1122	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 21586: `12185	1068	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21603: `14397	1117	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 21604: `14398	1117	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 21606: `12199	617	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 21622: `12194	1066	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21627: `12204	1023	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21638: `3350	700	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 04:36:55.386`
- Dòng 21757: `12251	1070	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21758: `16636	1127	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 21762: `12266	478	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 21772: `16637	1118	LESSON_COMPLETE	Hoàn thành bài: B1 - Thực chiến 30 ngày xây dựng Hệ thống UP1000  (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "l`
- Dòng 21776: `12256	1071	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 21781: `12261	26	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cours`
- Dòng 21786: `12271	7	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "course`
- Dòng 21873: `19764	944	LESSON_COMPLETE	Hoàn thành bài: Buổi 1: Xây dựng hệ thống UP1000 Thực chiến (6đ)	{"score": 6, "courseName": "Ngân hàng phước báu", "lessonTi`
- Dòng 21953: `31458	1140	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 21971: `20528	1076	LESSON_COMPLETE	Hoàn thành bài: Buổi 1: Xây dựng hệ thống UP1000 Thực chiến (6đ)	{"score": 6, "courseName": "Ngân hàng phước báu", "lessonT`
- Dòng 22012: `20525	1076	LESSON_COMPLETE	Hoàn thành bài: Buổi 1: Xây dựng hệ thống UP1000 Thực chiến (6đ)	{"score": 6, "courseName": "Ngân hàng phước báu", "lessonT`
- Dòng 22098: `38901	379	LESSON_COMPLETE	Hoàn thành bài: Buổi 1: Xây dựng hệ thống UP1000 Thực chiến (7đ)	{"score": 7, "courseName": "Ngân hàng phước báu", "lessonTi`
- Dòng 23116: `23740	944	LESSON_COMPLETE	Hoàn thành bài: Buổi 2: Xây dựng hệ thống UP1000 Thực chiến (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "lessonTi`
- Dòng 23138: `23741	944	LESSON_COMPLETE	Hoàn thành bài: Buổi 3 Xây dựng hệ thống UP1000 Thực chiến  (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "lessonTi`
- Dòng 23376: `23749	1137	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 23611: `27359	1139	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 24144: `27380	229	LESSON_COMPLETE	Hoàn thành bài: Buổi 1: Xây dựng hệ thống UP1000 Thực chiến (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "lessonTi`
- Dòng 24279: `38594	965	LESSON_COMPLETE	Hoàn thành bài: B1 - Thực chiến 30 ngày xây dựng Hệ thống UP1000  (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "le`
- Dòng 24554: `6083	496	LESSON_COMPLETE	Hoàn thành bài: B1 - Thực chiến 30 ngày xây dựng Hệ thống UP1000  (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "les`
- Dòng 24625: `38979	1146	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 25349: `23579	1108	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 46384: `2	4	2026-06-30 10:37:47.91	MB - Ngân hàng phước báu	22	\N	26868.00	30	1	21.00	2.00	3	0.56	21`

### `backups/db_2026-08-06_11-24-40/ActivityLog.json`
- Dòng 20345: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20356: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20400: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20411: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20422: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20433: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20444: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20455: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20466: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20477: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20488: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20499: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20510: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20521: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20532: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20554: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20565: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20587: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20631: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20686: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20719: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20763: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20785: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20807: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20851: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20917: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20928: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20950: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20972: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20983: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 20994: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21005: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21016: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21027: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21038: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21060: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21071: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21115: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21170: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21181: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21192: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21214: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21247: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21269: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21280: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21291: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21313: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21324: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21346: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21357: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21368: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21379: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21412: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21423: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21456: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21478: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21489: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21500: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21599: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21610: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21621: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21709: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21753: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21764: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21830: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21841: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21885: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21896: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 21940: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 22017: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 22028: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 22039: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 22105: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 22116: `"detail": "Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)",`
- Dòng 22171: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22182: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22193: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22204: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22215: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22226: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22237: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22248: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22259: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22270: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22281: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22292: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22303: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22314: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22325: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22336: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22347: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22358: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22369: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22380: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22391: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22402: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22413: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22424: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22435: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22446: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22457: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22468: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22479: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22490: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22501: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22512: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22523: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22534: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22545: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22556: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22567: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22578: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22589: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22600: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22611: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22622: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22633: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22644: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22655: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22666: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22677: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22688: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22699: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22710: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22721: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22732: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22743: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22754: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22765: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22776: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22787: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22798: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22809: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22820: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22831: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22842: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22853: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22864: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22875: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22886: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22897: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22908: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22919: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22930: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22941: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22952: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22963: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22974: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 22985: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23059: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23070: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23081: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23092: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23103: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23155: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23166: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23177: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23188: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23199: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23210: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23221: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 23232: `"detail": "Từ chối thanh toán: Ngân hàng phước báu",`
- Dòng 23284: `"detail": "Từ chối thanh toán: Ngân hàng phước báu",`
- Dòng 23713: `"detail": "Từ chối thanh toán: Ngân hàng phước báu",`
- Dòng 23726: `"detail": "Từ chối thanh toán: Ngân hàng phước báu",`
- Dòng 23752: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 23957: `"detail": "Từ chối thanh toán: Ngân hàng phước báu",`
- Dòng 29250: `"courseName": "Ngân hàng phước báu",`
- Dòng 31477: `"courseName": "Ngân hàng phước báu",`
- Dòng 32089: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 32193: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 32313: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 32417: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 34196: `"courseName": "Ngân hàng phước báu",`
- Dòng 34844: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 34911: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 35203: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 35428: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 35678: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 35736: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 35962: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 36020: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 36078: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 36199: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 36257: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 36419: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 36477: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 36535: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 36593: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 36677: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 36931: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 37218: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 37443: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 37668: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 38117: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 38718: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 38757: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 38854: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 39506: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 39519: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 39934: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 40164: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 40177: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 40203: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 40418: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 40490: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 40640: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 42180: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 42200: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 42252: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 42394: `"courseName": "Ngân hàng phước báu",`
- Dòng 42444: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 42516: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 42588: `"detail": "Xác minh thanh toán: Ngân hàng phước báu - 26,868đ",`
- Dòng 43715: `"courseName": "Ngân hàng phước báu",`
- Dòng 44752: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 44988: `"courseName": "Ngân hàng phước báu",`
- Dòng 45521: `"courseName": "Ngân hàng phước báu",`
- Dòng 46640: `"courseName": "Ngân hàng phước báu",`
- Dòng 59722: `"courseName": "Ngân hàng phước báu",`
- Dòng 60005: `"courseName": "Ngân hàng phước báu",`
- Dòng 63093: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 66133: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 72881: `"courseName": "Ngân hàng phước báu",`
- Dòng 74583: `"courseName": "Ngân hàng phước báu",`
- Dòng 77979: `"courseName": "Ngân hàng phước báu",`
- Dòng 78869: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`
- Dòng 87850: `"detail": "Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ",`

### `backups/db_2026-08-06_11-24-40/AssistantGuide.json`
- Dòng 6: `"script": "Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu. Tôi là trợ lý ảo của bạn. Tại đây, bạn có thể khám phá các khóa học, theo dõi lộ `
- Dòng 7: `"textContent": "Chào mừng bạn đến với Học viện BRK!\n\nBRK - Ngân hàng Phước Báu là nền tảng đào tạo trực tuyến, nơi bạn có thể:\n• Khám phá các khóa `

### `backups/db_2026-08-06_11-24-40/Course.json`
- Dòng 881: `"link_anh_bia": "https://i.ibb.co/xKZX7gxN/QUA-TANG-LV1-MBC.jpg",`

### `backups/db_2026-08-06_11-24-40/LessonComment.json`
- Dòng 622: `"content": "BÀI  HỌC HAY QUÁ Ạ!  BRK - Ngân hàng Phước Báu  Ngân hàng phước báu 0/7 0%   Phần 1  Video    B1 - Thực chiến 30 ngày xây dựng Hệ thống UP`
- Dòng 629: `"content": "BRK - Ngân hàng Phước Báu  Ngân hàng phước báu 0/7 0%   Phần 1  Video    B1 - Thực chiến 30 ngày xây dựng Hệ thống UP1000  Xem chi tiết nộ`

### `backups/db_2026-08-06_11-24-40/LessonProgress.json`
- Dòng 5815: `"reflection": "Hoàn thành trước. Hoàn hảo sau. Copy trước. Sáng tạo sau. Đứng vững trước. Đứng cao sau.  Học gì có gia trị chia sẻ ngay. Mình sẽ rõ hì`

### `backups/db_2026-08-06_11-24-40/Payment.json`
- Dòng 39: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 1519: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 1599: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 1879: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 1999: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 2239: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 2279: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 2399: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 2619: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 2699: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 2939: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 2959: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 3039: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 3079: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 3119: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`
- Dòng 3219: `"qrCodeUrl": "data:image/png;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKCh`

### `backups/db_2026-08-06_11-24-40/Post.json`
- Dòng 5: `"content": "Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu!\n\nĐây là nơi chúng ta cùng nhau học tập, chia sẻ và phát triển. BRK cam kết man`

### `backups/db_2026-08-06_11-24-40/PostComment.json`
- Dòng 22: `"content": "Dạ em lê thúy Hằng gởi lời biết ơn chị Bê Nguyễn đã Gieo Duyên cho em biết đến Học Viện BRk - ngân hàng Phước Báu để em học tập và phát tr`

### `backups/db_2026-08-06_11-24-40/SiteProfile.json`
- Dòng 98: `"title": "NGÂN HÀNG PHƯỚC BÁU",`
- Dòng 112: `"footerText": "© 2026 Ngân hàng Phước Báu. Mọi quyền được bảo lưu.",`
- Dòng 114: `"metaTitle": "BRK - Ngân hàng Phước Báu",`

### `backups/db_2026-08-06_11-24-40/SystemTree.json`
- Dòng 70: `"nameSystem": "MB - Ngân hàng phước báu",`

### `backups/db_2026-08-06_11-24-40/Voucher.json`
- Dòng 42: `"description": "Khi đăng ký khóa Ngân hàng phước báu (Mini game) với 26868 VNĐ, bạn nhận được Voucher VIP MB1 để kích hoạt tất cả các khóa thuộc mini `

### `backups/db_2026-08-19_11-14-36.sql`
- Dòng 11805: `3	/	Chào mừng đến với MBC	Chào mừng bạn đến với Cộng đồng MBC - Ngân hàng Phước Báu. Tôi là trợ lý ảo của bạn. Tại đây, bạn có thể khám phá các khóa h`
- Dòng 11846: `10	ED	Edit video cơ bản	EDIT VIDEO CƠ BẢN	\N	t	EDIT VIDEO CƠ BẢN <br>\nNGƯỜI CHIA SẺ: <br>\nHỒNG HẠNH MENTOR 7	EDIT VIDEO CƠ BẢN\r\nNGÀY 06-08.01.2026`
- Dòng 11857: `22	QUA_LV1	Quà tặng Lv1	Học các khóa học trị giá >10 triệu chỉ với 1$	\N	t	💰 Phí tham gia tượng trưng chỉ 1$ = 26.868 VND bạn được học các khóa (trị `
- Dòng 14370: `1	BREVO1	hocvienbrk@gmail.com	f	brevo	\N	\N	\N	\N	BREVO_API_KEY_1	NHPB MBC	300	0	2026-08-19 01:36:09.1	t	2026-07-03 23:13:54.182	\N	\N	20	30	10	15	5	0`
- Dòng 14371: `2	BREVO2	donghanh.scga2025@gmail.com	f	brevo	\N	\N	\N	\N	BREVO_API_KEY_2	Academy MBC	300	0	2026-08-19 01:36:09.1	t	2026-07-03 23:14:12.783	\N	\N	20	30`
- Dòng 14372: `3	BREVO3	donghanhbrk@gmail.com	f	brevo	\N	\N	\N	\N	BREVO_API_KEY_3	Academy MBC	300	0	2026-08-19 01:36:09.1	t	2026-07-03 23:14:35.73	\N	\N	20	30	10	15	`
- Dòng 16317: `87	cmrmp55no0001pls5ne9lt9e6	1117	BÀI  HỌC HAY QUÁ Ạ!  BRK - Ngân hàng Phước Báu  Ngân hàng phước báu 0/7 0%   Phần 1  Video    B1 - Thực chiến 30 ngà`
- Dòng 16318: `88	cmrmp55no0001pls5ne9lt9e6	1117	BRK - Ngân hàng Phước Báu  Ngân hàng phước báu 0/7 0%   Phần 1  Video    B1 - Thực chiến 30 ngày xây dựng Hệ thống U`
- Dòng 16941: `67230	1345	cmr25zcbw000beqgenrxymq9e	{"link": 0, "video": 0, "timing": -1, "support": 2, "playlist": {"0": {"maxTime": 9.70647201525879, "duration": 5`
- Dòng 17401: `176238	1783	cmst6urk90001129yo6542o8d	{"link": 1, "video": 2, "timing": 1, "support": 2, "reflection": 2}	8	{"links": ["https://www.facebook.com/share`
- Dòng 17623: `430	1670	386868	Ngân hàng TMCP Việt Nam Thịnh Vượng	9767686877	\N	\N	+84904221979	\N	\N	PENDING	\N	\N	\N	2026-08-04 07:32:20.281	2026-08-04 07:32:20.2`
- Dòng 17628: `331	1505	26868	Ngân hàng TMCP Sài Gòn Thương Tín	0912426481	2026-07-15 16:04:24.959	Description SDT 120468 HV 883 COC XD_HETHONG_UP1000	+84919120468	X`
- Dòng 17629: `661	1819	386868	Ngân hàng TMCP Sài Gòn Thương Tín	0912426481	\N	\N	+84769467687	\N	\N	PENDING	\N	\N	\N	2026-08-13 21:28:56.298	2026-08-13 21:28:56.298`
- Dòng 17642: `419	1651	26868	Sacombank	\N	2026-08-03 01:52:00	Description SDT 683985 HV 1180 COC XDHETHONGUP1000 CKN 639087 D2XXHXKH - PHAM THI THU HUYEN - Ngan han`
- Dòng 17647: `453	1690	26868	Sacombank	\N	2026-08-04 13:09:00	Description SDT 865845 HV 923 COC XDHETHONGUP1000 CKN 556443 E2DCFXYU - NGUYEN BA NGOC - Ngan hang TMC`
- Dòng 17660: `323	1493	26868	Sacombank	\N	2026-07-20 09:45:00	Description MBVCB.15208816844.6201BFTVG25UAPB L.SDT 267239 HV 1127 COC XDHETHONGUP1000.CT tu 101279555`
- Dòng 17662: `330	1504	26868	Ngân hàng TMCP Sài Gòn Thương Tín	0912426481	\N	\N	+84971795665	\N	\N	PENDING	\N	\N	\N	2026-07-21 13:46:04.906	2026-07-21 13:46:04.906	`
- Dòng 17667: `334	1509	26868	Sacombank	\N	2026-07-25 15:48:00	Description 139273503610 SDT 784622 HV 1136 COC XDHETHONGUP1000 CHUYEN TIEN OQCH000GSHbS MOMO139273503`
- Dòng 17679: `362	1599	26868	Sacombank	\N	2026-07-30 15:40:00	Description SDT 953806 HV 1159 COC XDHETHONGUP1000 FT26211878606807 CKN 699582 kCLY2V1L - VND-TGTT-BUI`
- Dòng 17696: `401	1639	26868	Sacombank	\N	2026-08-02 03:15:00	Description SDT 779428 HV 1174 COC XDHETHONGUP1000 CKN 303549 iJHV5KN3 - DIEN THI THU HUONG - Ngan han`
- Dòng 17697: `403	1641	26868	Sacombank	\N	2026-08-02 06:05:00	Description QR - SDT 077859 HV 1175 COC XDHETHONGUP1000 CKN 395330 C2BS2I5X - NGUYEN THI NGUYET - Ngan`
- Dòng 17700: `456	1693	26868	Sacombank	\N	2026-08-04 13:49:00	Description SDT 393839 HV 769 COC XDHETHONGUP1000-040826-20:49:03 6216ASCB02TFJ29H CKN 704748 02TFJ29H`
- Dòng 17702: `473	1701	3868686	Sacombank	\N	2026-08-05 05:56:00	Description QR - SDT 128613 HV 1071 COC 86D CKN 879103 C2B7AX8P - NGUYEN THI PHUONG ANH - Ngan hang `
- Dòng 17704: `476	1702	26868	Sacombank	\N	2026-08-05 07:24:00	Description QR - SDT 864881 HV 238 COC XDHETHONGUP1000 CKN 080398 C2B7J28B - HO THI THUY - Ngan hang T`
- Dòng 17711: `459	1696	26868	Sacombank	\N	2026-08-05 17:20:00	Description SDT 432869 HV 1169 COC XDHETHONGUP1000 CKN 793891 D2SY1WT6 - NGUYEN HO BAC - Ngan hang TMC`
- Dòng 17716: `507	1720	26868	Sacombank	\N	2026-08-06 07:31:00	Description MBVCB.15449770411.6218BFTVGLLL1DZ N.SDT 628728 HV 1206 COC XDHETHONGUP1000.CT tu 086100008`
- Dòng 17723: `569	1756	2000	Sacombank	\N	2026-08-10 05:42:00	Description 141570198931 SDT 142245 HV 1229 COC LS03 CHUYEN TIEN OQCH000HX1ki MOMO141570198931MOMO CKN `
- Dòng 17727: `597	1780	26868	Sacombank	\N	2026-08-11 07:12:00	Description SDT 577135 HV 1242 COC XDHETHONGUP1000 CKN 635973 P2YIRWRG - NGUYEN THI THUAN - Ngan hang `
- Dòng 17734: `451	1678	269054	Sacombank	\N	2026-08-04 11:49:00	Description SDT 484331 HV 611 COC ZALOMASTERY CKN 108827 d1PT87KS - MBBANK IBFT - Ngan hang TMCP Quan`
- Dòng 17735: `559	1754	26868	Sacombank	\N	2026-08-09 07:05:00	Description SDT 567697 HV 1236 COC XDHETHONGUP1000 CKN 829016 D2SVFWXZ - DANG THI HA - Ngan hang TMCP `
- Dòng 17740: `571	1759	26868	Sacombank	\N	2026-08-10 12:07:00	Description SDT 574351 HV 1239 COC XDHETHONGUP1000 CKN 544553 D2SINKJ9 - HO KINH DOANH NGUYEN THI LOAN`
- Dòng 17744: `626	1789	26868	Sacombank	\N	2026-08-12 02:27:00	Description STB;0912426481;SDT 787881 HV 1209 COC QUALV1 CKN 527872 P2Y62C48 - PHAM THI THUY HIEN - Ng`
- Dòng 17745: `542	1748	386868	Ngân hàng TMCP Sài Gòn Thương Tín	0912426481	\N	\N	+84941345539	\N	\N	PENDING	\N	\N	\N	2026-08-07 05:28:16.374	2026-08-07 05:28:16.374`
- Dòng 17748: `568	1757	386868	Ngân hàng TMCP Việt Nam Thịnh Vượng	9767686877	\N	\N	+84985142245	\N	\N	PENDING	\N	\N	\N	2026-08-10 05:36:34.428	2026-08-10 05:36:34.4`
- Dòng 17750: `580	1764	26868	Sacombank	\N	2026-08-11 01:24:00	Description MBVCB.15523480239.6223BFTVGLLW9JI 5.SDT 746307 HV 1187 COC XDHETHONGUP1000.CT tu 102168985`
- Dòng 17758: `672	1831	268668	Ngân hàng TMCP Sài Gòn Thương Tín	0912426481	\N	\N	+84912511751	\N	\N	PENDING	\N	\N	\N	2026-08-16 04:17:39.87	2026-08-16 04:17:39.87	d`
- Dòng 17760: `637	1798	655054	Sacombank	\N	2026-08-12 06:18:00	Description QR - SDT 128613 HV 1071 COC ZALOMASTERY CKN 593027 C21W4NS7 - NGUYEN THI PHUONG ANH - Nga`
- Dòng 17766: `652	1811	26868	Sacombank	\N	2026-08-13 00:29:00	Description MBVCB.15555896236.6225BFTVGLL91HT J.SDT 437456 HV 1251 COC QUALV1.CT tu 0501000161967 TRAN`
- Dòng 17769: `658	1814	26868	Sacombank	\N	2026-08-13 14:28:00	Description QR - SDT 145234 HV 1256 COC QUALV1 CKN 294177 C21V6HV1 - NGUYEN THI SAM - Ngan hang TMCP C`
- Dòng 17771: `666	1824	26868	Sacombank	\N	2026-08-15 01:42:00	Description SDT 193131 HV 782 COC QUALV1 CKN 993144 D29KFTSY - LE THI HOAN - Ngan hang TMCP Quan Doi T`
- Dòng 17784: `cmr0vesj20001zjf2xidne5vh	Chào mừng bạn đến với Cộng đồng MBC	Chào mừng bạn đến với Cộng đồng MBC - Ngân hàng Phước Báu!\n\nĐây là nơi chúng ta cùng n`
- Dòng 17785: `cmr0vesqq0005zjf2eg5nzsj4	Cộng đồng MBC - Kết nối và phát triển	Cộng đồng MBC là nơi hội tụ những người cùng chí hướng, cùng nhau học tập và phát triể`
- Dòng 17786: `cmr0veso90003zjf213sn1b6t	Hướng dẫn sử dụng các công cụ học tập	Cộng đồng MBC cung cấp đầy đủ các công cụ hỗ trợ học tập:\n\n1. 📹 YouTube Tools - Quả`
- Dòng 17798: `1	Thông báo	thong-bao	Thông báo từ Cộng đồng MBC	1	2026-06-30 16:38:10.791`
- Dòng 17813: `3	cmr0vesj20001zjf2xidne5vh	1093	Dạ em lê thúy Hằng gởi lời biết ơn chị Bê Nguyễn đã Gieo Duyên cho em biết đến Cộng đồng MBC - ngân hàng Phước Báu để`
- Dòng 18149: `1	0	brk	t	t	\N	0.3	NGÂN HÀNG PHƯỚC BÁU	Tri thức là sức mạnh	Học hôm nay, thành công ngày mai	MBC mang đến những tri thức thực chiến giúp bạn phát triể`
- Dòng 18191: `1	Khảo sát định hướng MBC	Bài khảo sát giúp xác định lộ trình học tập phù hợp với bạn	{"edges": [{"id": "e_q1_branding", "source": "q1", "target": "op`
- Dòng 20386: `4	VIP MB1	Voucher MB1	VIP	0	\N	Khi đăng ký khóa Ngân hàng phước báu (Mini game) với 26868 VNĐ, bạn nhận được Voucher VIP MB1 để kích hoạt tất cả các k`
- Dòng 22582: `2149	3773	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:14:38.68`
- Dòng 22583: `2150	976	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:17:49.174`
- Dòng 22587: `2154	1035	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:34:47.23`
- Dòng 22588: `2155	229	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:42:59.198`
- Dòng 22589: `2156	1057	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:18.78`
- Dòng 22590: `2157	1060	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:26.99`
- Dòng 22591: `2158	962	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:34.159`
- Dòng 22592: `2159	1010	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:43:40.22`
- Dòng 22593: `2160	1059	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:47:10.07`
- Dòng 22594: `2161	496	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:48:00.655`
- Dòng 22595: `2162	1061	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:48:29.93`
- Dòng 22596: `2163	965	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:50:02.219`
- Dòng 22597: `2164	1063	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:51:47.33`
- Dòng 22598: `2165	828	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:54:16.855`
- Dòng 22599: `2166	914	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 06:54:46.564`
- Dòng 22601: `2168	330	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 07:22:41.247`
- Dòng 22602: `2169	1029	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 07:27:32.88`
- Dòng 22604: `2171	379	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-02 07:38:29.255`
- Dòng 22608: `2175	1023	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 00:54:47.92`
- Dòng 22613: `2180	1068	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 05:43:14.32`
- Dòng 22616: `2183	1066	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 07:27:58.74`
- Dòng 22620: `2187	617	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 10:23:18.973`
- Dòng 22622: `2189	1044	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 12:30:46.14`
- Dòng 22624: `2191	974	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-03 14:25:03.001`
- Dòng 22628: `2195	1070	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 00:26:56.47`
- Dòng 22634: `2201	1053	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 05:01:46.78`
- Dòng 22635: `2202	1071	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 05:03:08.81`
- Dòng 22637: `2204	26	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 05:36:05.249`
- Dòng 22639: `2206	607	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 07:14:56.199`
- Dòng 22640: `2207	478	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 07:33:36.771`
- Dòng 22641: `2208	7	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 09:04:44.691`
- Dòng 22642: `2209	878	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 09:25:20.515`
- Dòng 22643: `2210	1072	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 12:18:26.85`
- Dòng 22644: `2211	944	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 13:14:30.62`
- Dòng 22645: `2212	1073	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 14:24:42.39`
- Dòng 22647: `2214	1074	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-04 15:39:45.80`
- Dòng 22648: `2215	1075	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-05 02:09:10.18`
- Dòng 22652: `2219	1076	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-05 13:02:58.70`
- Dòng 22657: `2224	1079	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-06 13:06:34.71`
- Dòng 22658: `2225	1077	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-06 15:15:21.74`
- Dòng 22659: `2226	1080	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-06 23:06:44.99`
- Dòng 22661: `2228	837	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 04:41:26.719`
- Dòng 22664: `2231	1081	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 06:26:34.06`
- Dòng 22666: `2233	1083	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 07:35:53.16`
- Dòng 22667: `2234	1085	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 07:56:54.41`
- Dòng 22668: `2235	1086	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 08:13:42.28`
- Dòng 22670: `2237	1087	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 08:38:52.82`
- Dòng 22671: `2238	1088	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 09:20:06.33`
- Dòng 22673: `2240	1089	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 10:54:02.80`
- Dòng 22674: `2241	834	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 13:00:42.81`
- Dòng 22675: `2242	1091	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 13:13:44.91`
- Dòng 22676: `2243	1026	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-07 15:50:01.00`
- Dòng 22679: `2246	1093	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 00:44:56.56`
- Dòng 22680: `2247	703	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 03:26:30.796`
- Dòng 22683: `2250	864	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 10:30:40.716`
- Dòng 22685: `2252	269	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 12:48:47.579`
- Dòng 22686: `2253	16	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 13:18:08.247`
- Dòng 22687: `2254	468	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-08 13:54:13.656`
- Dòng 22696: `2263	1095	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 00:44:47.45`
- Dòng 22697: `2264	749	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 02:41:23.362`
- Dòng 22698: `2265	1096	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 03:17:43.76`
- Dòng 22706: `2273	283	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 09:11:31.868`
- Dòng 22710: `2277	885	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-09 12:46:28.245`
- Dòng 22711: `2278	1098	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-10 00:15:32.80`
- Dòng 22717: `2284	256	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 02:54:35.547`
- Dòng 22718: `2285	1058	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 07:12:10.97`
- Dòng 22722: `2289	2	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 14:04:28.48`
- Dòng 22723: `2290	1042	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-11 16:18:05.65`
- Dòng 22727: `2294	1100	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-12 06:55:51.29`
- Dòng 22734: `2301	611	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 07:08:47.85`
- Dòng 22735: `2302	794	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 08:18:17.791`
- Dòng 22736: `2303	1105	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 10:33:24.75`
- Dòng 22742: `2309	861	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 14:49:18.456`
- Dòng 22743: `2310	1106	ENROLL_PAID	Đăng ký khóa học: Ngân hàng phước báu (XD_HETHONG_UP1000)	{"idKhoa": "XD_HETHONG_UP1000", "courseId": 22}	2026-07-13 16:01:40.85`
- Dòng 22748: `2315	3773	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 06:17:13.124`
- Dòng 22749: `2316	976	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:27.061`
- Dòng 22750: `2317	1035	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:22.56`
- Dòng 22751: `2318	229	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:16.972`
- Dòng 22752: `2319	1057	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:11.254`
- Dòng 22753: `2320	1060	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:06.973`
- Dòng 22754: `2321	962	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:10:02.987`
- Dòng 22755: `2322	1010	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:58.653`
- Dòng 22756: `2323	1059	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:54.235`
- Dòng 22757: `2324	496	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:49.003`
- Dòng 22758: `2325	1061	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:44.317`
- Dòng 22759: `2326	965	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:39.439`
- Dòng 22760: `2327	1063	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:09:32.847`
- Dòng 22761: `2328	828	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 06:59:06.741`
- Dòng 22762: `2329	914	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 06:58:55.201`
- Dòng 22763: `2330	1008	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:21:39.057`
- Dòng 22764: `2331	330	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:25:38.537`
- Dòng 22765: `2332	1029	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:34:19.488`
- Dòng 22766: `2333	379	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 07:40:48.705`
- Dòng 22767: `2334	1023	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:56:14.707`
- Dòng 22768: `2335	1068	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:26:28.783`
- Dòng 22769: `2336	1066	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:26:40.544`
- Dòng 22770: `2337	617	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:26:49.967`
- Dòng 22771: `2338	1044	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-03 13:25:51.258`
- Dòng 22772: `2339	974	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 02:24:50.723`
- Dòng 22773: `2340	1070	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 02:24:22.964`
- Dòng 22774: `2341	1053	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-02 17:55:00`
- Dòng 22775: `2342	1071	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 05:04:05.516`
- Dòng 22776: `2343	26	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 05:37:27.95`
- Dòng 22777: `2344	607	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 07:14:56.433`
- Dòng 22778: `2345	478	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 07:34:59.963`
- Dòng 22779: `2346	7	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 09:13:41.284`
- Dòng 22780: `2347	878	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 05:23:16.745`
- Dòng 22781: `2348	1072	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 12:21:28.591`
- Dòng 22782: `2349	944	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 13:16:04.54`
- Dòng 22783: `2350	1073	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 14:44:38.179`
- Dòng 22784: `2351	1074	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-04 16:29:49.756`
- Dòng 22785: `2352	1075	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-05 02:25:24.016`
- Dòng 22786: `2353	1076	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-05 13:04:46.818`
- Dòng 22787: `2354	1079	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-06 13:07:58.184`
- Dòng 22788: `2355	1077	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-06 15:19:06.383`
- Dòng 22789: `2356	1080	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 01:23:15.702`
- Dòng 22790: `2357	837	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 05:25:57.827`
- Dòng 22791: `2358	1081	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:09:13.505`
- Dòng 22792: `2359	1083	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:09:00.551`
- Dòng 22793: `2360	1085	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:09:32.755`
- Dòng 22794: `2361	1086	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 08:35:10.087`
- Dòng 22795: `2362	1087	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 12:51:00.804`
- Dòng 22796: `2363	1088	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 12:50:32.235`
- Dòng 22797: `2364	1089	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 13:06:28.551`
- Dòng 22798: `2365	834	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 13:04:40.161`
- Dòng 22799: `2366	1091	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 13:35:42.051`
- Dòng 22800: `2367	1026	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-07 15:51:21.143`
- Dòng 22801: `2368	1093	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 03:37:58.915`
- Dòng 22802: `2369	703	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-08 03:29:28.818`
- Dòng 22803: `2370	864	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 08:06:14.708`
- Dòng 22804: `2371	269	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-08 12:50:56.897`
- Dòng 22805: `2372	16	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-08 13:25:07.335`
- Dòng 22806: `2373	468	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 09:22:00.222`
- Dòng 22807: `2374	1095	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 00:48:26.97`
- Dòng 22808: `2375	749	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 11:03:05.71`
- Dòng 22809: `2376	1096	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-09 03:37:32.01`
- Dòng 22810: `2377	283	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 13:21:40.418`
- Dòng 22811: `2378	885	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 10:43:22.781`
- Dòng 22812: `2379	1098	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-10 00:17:26.311`
- Dòng 22813: `2380	256	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 05:38:11.698`
- Dòng 22814: `2381	1058	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 07:12:58.539`
- Dòng 22815: `2382	2	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 14:05:23.722`
- Dòng 22816: `2383	1042	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-11 16:20:06.351`
- Dòng 22817: `2384	1100	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-12 06:57:05.391`
- Dòng 22818: `2385	611	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 07:10:54.456`
- Dòng 22819: `2386	794	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 08:19:55.985`
- Dòng 22820: `2387	1105	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 14:04:30.047`
- Dòng 22821: `2388	861	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 14:50:37.192`
- Dòng 22822: `2389	1106	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-13 16:06:03.242`
- Dòng 22828: `10124	1051	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-14 07:30:02.301`
- Dòng 22829: `10125	710	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-14 12:13:40.061`
- Dòng 22830: `10126	18	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-14 13:21:59.796`
- Dòng 22831: `10127	970	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-14 23:19:53.19`
- Dòng 22832: `10128	863	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 03:58:57.342`
- Dòng 22836: `10129	883	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 09:05:06.56`
- Dòng 22837: `10130	682	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 11:23:07.767`
- Dòng 22838: `10131	729	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 13:52:24.959`
- Dòng 22839: `10132	214	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-16 03:45:19.239`
- Dòng 22840: `10133	1114	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-16 15:29:27.595`
- Dòng 22841: `10134	1115	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-16 15:51:35.695`
- Dòng 22842: `10135	495	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-17 03:22:45.853`
- Dòng 22843: `11904	1082	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "test", "adminId": 3773, "courseId": 22, "enrollmentId": 1348}	2026-07-`
- Dòng 22847: `11911	1090	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "ok", "adminId": 3773, "courseId": 22, "enrollmentId": 1358}	2026-07-18`
- Dòng 22880: `11912	1097	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "ok", "adminId": 3773, "courseId": 22, "enrollmentId": 1398}	2026-07-18`
- Dòng 22881: `11914	1116	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "ok", "adminId": 3773, "courseId": 22, "enrollmentId": 1476}	2026-07-18`
- Dòng 22883: `19772	1128	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 22899: `11913	1107	PAYMENT_REJECTED	Từ chối thanh toán: Ngân hàng phước báu	{"reason": "ok", "adminId": 3773, "courseId": 22, "enrollmentId": 1441}	2026-07-18`
- Dòng 23328: `20760	944	LESSON_COMPLETE	Hoàn thành bài: B1 - Thực chiến 30 ngày xây dựng Hệ thống UP1000  (7đ)	{"score": 7, "courseName": "Ngân hàng phước báu", "le`
- Dòng 23499: `19949	1118	LESSON_COMPLETE	Hoàn thành bài: Buổi 2: Xây dựng hệ thống UP1000 Thực chiến (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "lessonT`
- Dòng 23546: `38880	1141	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 23554: `12077	1035	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 23563: `27228	1121	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 23571: `12079	495	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enro`
- Dòng 23709: `3594	496	LESSON_COMPLETE	Hoàn thành bài: Buổi 1: Xây dựng hệ thống UP1000 Thực chiến (7đ)	{"score": 7, "courseName": "Ngân hàng phước báu", "lessonTit`
- Dòng 23758: `12087	3773	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 23763: `12090	1010	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 23785: `12095	1057	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 23802: `12098	1061	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 23821: `12102	965	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 23825: `12110	976	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 23842: `12106	229	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 23846: `12114	974	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 23850: `12122	1059	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 23859: `12118	914	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 23863: `12126	828	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 23875: `12130	496	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 23879: `12134	1063	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 23883: `12142	962	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 23887: `12146	330	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 23893: `12138	1060	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 23912: `12150	1029	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 23934: `12154	379	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 23951: `12158	1053	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 23968: `12162	607	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 24002: `38886	1142	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 24049: `27833	1136	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 24052: `12170	1044	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 24059: `38894	408	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enro`
- Dòng 24110: `12179	1117	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 24111: `14380	1122	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 24143: `12185	1068	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 24160: `14397	1117	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 24161: `14398	1117	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 24163: `12199	617	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 24179: `12194	1066	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 24184: `12204	1023	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 24195: `3350	700	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "courseId": 22}	2026-07-15 04:36:55.386`
- Dòng 24314: `12251	1070	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 24315: `16636	1127	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 24319: `12266	478	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cour`
- Dòng 24329: `16637	1118	LESSON_COMPLETE	Hoàn thành bài: B1 - Thực chiến 30 ngày xây dựng Hệ thống UP1000  (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "l`
- Dòng 24333: `12256	1071	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cou`
- Dòng 24338: `12261	26	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "cours`
- Dòng 24343: `12271	7	PAYMENT_VERIFIED	Xác minh thanh toán: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Ngân hàng TMCP Sài Gòn Thương Tín", "course`
- Dòng 24430: `19764	944	LESSON_COMPLETE	Hoàn thành bài: Buổi 1: Xây dựng hệ thống UP1000 Thực chiến (6đ)	{"score": 6, "courseName": "Ngân hàng phước báu", "lessonTi`
- Dòng 24510: `31458	1140	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 24528: `20528	1076	LESSON_COMPLETE	Hoàn thành bài: Buổi 1: Xây dựng hệ thống UP1000 Thực chiến (6đ)	{"score": 6, "courseName": "Ngân hàng phước báu", "lessonT`
- Dòng 24569: `20525	1076	LESSON_COMPLETE	Hoàn thành bài: Buổi 1: Xây dựng hệ thống UP1000 Thực chiến (6đ)	{"score": 6, "courseName": "Ngân hàng phước báu", "lessonT`
- Dòng 24655: `38901	379	LESSON_COMPLETE	Hoàn thành bài: Buổi 1: Xây dựng hệ thống UP1000 Thực chiến (7đ)	{"score": 7, "courseName": "Ngân hàng phước báu", "lessonTi`
- Dòng 25673: `23740	944	LESSON_COMPLETE	Hoàn thành bài: Buổi 2: Xây dựng hệ thống UP1000 Thực chiến (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "lessonTi`
- Dòng 25695: `23741	944	LESSON_COMPLETE	Hoàn thành bài: Buổi 3 Xây dựng hệ thống UP1000 Thực chiến  (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "lessonTi`
- Dòng 25933: `23749	1137	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 26168: `27359	1139	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 26701: `27380	229	LESSON_COMPLETE	Hoàn thành bài: Buổi 1: Xây dựng hệ thống UP1000 Thực chiến (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "lessonTi`
- Dòng 26836: `38594	965	LESSON_COMPLETE	Hoàn thành bài: B1 - Thực chiến 30 ngày xây dựng Hệ thống UP1000  (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "le`
- Dòng 27111: `6083	496	LESSON_COMPLETE	Hoàn thành bài: B1 - Thực chiến 30 ngày xây dựng Hệ thống UP1000  (5đ)	{"score": 5, "courseName": "Ngân hàng phước báu", "les`
- Dòng 27182: `38979	1146	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 27906: `23579	1108	PAYMENT_VERIFIED	Xác minh thanh toán tự động: Ngân hàng phước báu - 26,868đ	{"amount": 26868, "bankName": "Sacombank", "courseId": 22, "enr`
- Dòng 61293: `2	4	2026-06-30 10:37:47.91	MB - Ngân hàng phước báu	22	\N	26868.00	30	1	21.00	2.00	3	0.56	21`

### `BAO_CAO_DANH_GIA_HIEU_NANG.md`
- Dòng 1: `# Báo cáo đánh giá hiệu năng toàn diện — BRK Academy / Cộng đồng MBC`

### `components/admin/settings/AttentionTooltipSettingsClient.tsx`
- Dòng 50: `const [previewText, setPreviewText] = useState('Ngân hàng Phước báu — thử gõ nội dung dài hơn để xem tự xuống dòng')`

### `components/admin/students/DeleteByUserSection.tsx`
- Dòng 192: `<p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ví MBC & Giao dịch</p>`

### `components/auth/AccountAssistantModal.tsx`
- Dòng 957: `<p className="text-[10px] text-brk-muted text-center">MBC - Ngân hàng Phước Báu</p>`

### `components/brk/BrkWalletCard.tsx`
- Dòng 12: `<h3 className="text-lg font-semibold text-amber-800 mb-4">Ví MBC</h3>`

### `components/genealogy/modals/MemberDetailsModal.tsx`
- Dòng 184: `{isBrk ? 'MB - Ngân hàng phước báu' : 'Hệ thống'}`

### `components/genealogy/settings/SettingsTab.tsx`
- Dòng 99: `<p className="text-[10px] text-slate-400 font-bold">Chỉ hệ thống MBC (#4) hỗ trợ chuyển đổi Promotion Logic</p>`

### `components/home/FooterSection.tsx`
- Dòng 16: `const footerText = profile.footerText || `© ${year} ${profile.title || 'MBC'}. All rights reserved.``

### `components/home/MessageCard.tsx`
- Dòng 50: `const displayLine1 = isDefault ? 'MBC' : (profile.title || 'MBC')`
- Dòng 51: `const displayLine2 = isDefault ? 'NGÂN HÀNG PHƯỚC BÁU' : (profile.subtitle || '')`
- Dòng 264: `💡 {isDefault ? 'CỘNG ĐỒNG MBC - NGÂN HÀNG PHƯỚC BÁU' : displayLine1?.toUpperCase()}`

### `components/home/PostDetailModal.tsx`
- Dòng 55: `MBC`

### `components/home/RealityMap.tsx`
- Dòng 47: `<p className="text-brk-muted text-sm font-medium line-clamp-3">{course.mo_ta_ngan || 'Khám phá những kiến thức thực chiến cùng Cộng đồng MBC.'}</p>`

### `components/home/Zero2HeroSurvey.tsx`
- Dòng 19: `<p className="absolute bottom-4 left-6 text-brk-on-surface font-black uppercase tracking-widest text-xs">{videoUrl ? 'Bấm để xem video tư vấn' : 'Vide`

### `components/landing/CourseLandingTemplate.tsx`
- Dòng 485: `<p>© 2026 Cộng đồng MBC. All rights reserved.</p>`

### `components/layout/MainHeader.tsx`
- Dòng 72: `const walletAttn = getAttnItem('mainheader.wallet', 'Ngân hàng Phước báu')`
- Dòng 95: `alt="MBC Logo"`
- Dòng 183: `title="Ví MBW — Ngân hàng Phước Báu"`
- Dòng 201: `course={{ id_khoa: '', name_lop: 'Trang cá nhân - Cộng đồng MBC' }}`

### `components/mbw/MbwDashboardPopup.tsx`
- Dòng 52: `<h2 className="text-sm font-black text-brk-on-surface">Tài khoản Ngân hàng Phước Báu</h2>`

### `components/share/ShareModal.tsx`
- Dòng 63: `? `Khóa học: ${course.name_lop} - Cộng đồng học tập MBC``
- Dòng 64: `: 'Trang chủ - Cộng đồng học tập MBC'`

### `CURRENT_STATE.md`
- Dòng 3: `> **Đọc file này CÙNG với `AGENTS.md` trước khi làm bất cứ việc gì.** File này là bản chụp nhanh (snapshot) của một chuỗi công việc bảo mật + hiệu năn`
- Dòng 38: `- **Thương hiệu:** Đang trong quá trình đổi tên hiển thị từ "Học Viện BRK" sang **"Cộng đồng MBC"** (xem mục 7 — thay đổi này KHÔNG do phiên làm việc `
- Dòng 171: `- `f1ab712` — "rebrand: Học Viện BRK -> Cộng đồng MBC (code, docs, database)" — đổi tên hiển thị ở **rất nhiều file** (đã xem qua `git show --stat`, p`
- Dòng 175: `- Nếu thấy code/UI có chỗ vẫn ghi "BRK"/"Học Viện BRK" xen lẫn "MBC"/"Cộng đồng MBC" — đó là rebrand chưa hoàn tất, không phải lỗi do các fix bảo mật/`

### `DESIGN_SYSTEM.md`
- Dòng 1: `# HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM) - CỘNG ĐỒNG MBC`
- Dòng 27: `| **Tiêu đề chính** | `text-3xl/5xl/6xl`, `font-black` | `white` (Opacity 90%) | "CỘNG ĐỒNG MBC" - Dòng trên, VIẾT HOA. |`
- Dòng 28: `| **Tiêu đề phụ** | `text-2xl/4xl/5xl`, `font-black` | `yellow-400` (Glow) | "NGÂN HÀNG PHƯỚC BÁU" - Dòng dưới, VIẾT HOA. |`

### `docs/AFFILIATE_SYSTEM.md`
- Dòng 2: `## MBC - Affiliate Marketing System`
- Dòng 510: `│  │ https://mbc.com/register?ref=MBC123 │                │`
- Dòng 669: `"code": "MBC123"`
- Dòng 821: `"r": "MBC123",      // Ref code`

### `docs/BREVO_INTEGRATION.md`
- Dòng 2: `## MBC - Brevo (Sendinblue) Email Integration`
- Dòng 28: `Tích hợp **Brevo (formerly Sendinblue)** làm provider gửi email chính cho Cộng đồng MBC, hỗ trợ kiến trúc multi-sender (nhiều tài khoản Brevo free tro`

### `docs/COURSE_LEARNING_GUIDE.md`
- Dòng 189: `*Tài liệu hướng dẫn sử dụng — Cộng đồng MBC*`

### `docs/COURSE_VIDEO_PLAYER_TECH.md`
- Dòng 369: `*Tài liệu kỹ thuật — Cộng đồng MBC*`

### `docs/LIB_COURSE_TECHNICAL_SPEC.md`
- Dòng 413: `*Document generated for MBC Project*`

### `docs/telegram-integration-plan.md`
- Dòng 3: `Tài liệu này lập kế hoạch chi tiết để tích hợp Telegram Bot vào hệ thống **Cộng đồng MBC**, chuyển đổi từ đặc tả thiết kế Supabase gốc sang kiến trúc `

### `docs/TELEGRAM_INTEGRATION.md`
- Dòng 3: `Tài liệu này hướng dẫn chi tiết về cấu trúc kỹ thuật, luồng nghiệp vụ và cách sử dụng tính năng **Liên kết tài khoản Telegram** của thành viên trong h`
- Dòng 68: `> ✅ Tài khoản Telegram của bạn đã được liên kết thành công với Cộng đồng MBC.`

### `docs/TEST_CHECKLIST.md`
- Dòng 8: `## 1. TRANG CHỦ MBC (`/`)`

### `hdsd/00_TONG_QUAN.md`
- Dòng 1: `# TÀI LIỆU TỔNG QUAN DỰ ÁN CỘNG ĐỒNG MBC`
- Dòng 2: `> **Mục đích**: Tài liệu này cung cấp bức tranh toàn cảnh về kiến trúc hệ thống, công nghệ nền tảng và triết lý thiết kế của dự án Cộng đồng MBC. Đây `
- Dòng 7: `**Cộng đồng MBC** là một nền tảng học trực tuyến kết hợp hệ thống quản trị cộng đồng và tiếp thị liên kết (Affiliate). Hệ thống được thiết kế để không`
- Dòng 73: `- `brk-accent`: Màu cam chủ đạo (Thương hiệu MBC).`

### `hdsd/01_GIAO_DIEN_TRANG_CHU.md`
- Dòng 2: `> **Mục đích**: Tài liệu này đặc tả logic hiển thị, cấu trúc dữ liệu và hướng dẫn sử dụng giao diện Trang chủ (Home Page) của Cộng đồng MBC.`

### `hdsd/02_XAC_THUC_VA_BAO_MAT.md`
- Dòng 2: `> **Mục đích**: Tài liệu này mô tả chi tiết các phương thức xác thực, luồng bảo vệ người dùng, cơ chế cấp phát định danh (ID) và các chính sách an toà`

### `hdsd/05_GENEALOGY_NHAN_MACH.md`
- Dòng 2: `> **Mục đích**: Tài liệu này đặc tả hệ thống Sơ đồ phả hệ (Genealogy) - linh hồn của dự án Cộng đồng MBC, bao gồm mô hình dữ liệu Closure Table, các c`

### `hdsd/11_ADMIN_TOOLS_HE_THONG.md`
- Dòng 18: `- Tự động ánh xạ (Map) ID TCA sang ID Thành viên trên hệ thống Cộng đồng MBC.`
- Dòng 19: `- **System Closure**: Mỗi hệ thống có một cây phả hệ riêng biệt (vd: `systemId=1` cho TCA) được lưu trữ độc lập để không làm ảnh hưởng đến cây nhân mạ`
- Dòng 36: `1. Cài đặt Chrome Extension của Cộng đồng MBC.`
- Dòng 56: `- Cây Nhân mạch dựa trên quan hệ giới thiệu trực tiếp của Cộng đồng MBC. Cây TCA dựa trên sơ đồ tổ chức thực tế của bạn tại công ty TCA. Hai cây này c`

### `lib/attention-highlight-registry.ts`
- Dòng 31: `{ id: 'mainheader.wallet', group: 'Header trang chủ', label: 'Nút Ví MBW', defaultTooltip: 'Ngân hàng Phước báu' },`

### `lib/brevo.ts`
- Dòng 12: `name: process.env.BREVO_SENDER_NAME || 'Cộng đồng MBC',`

### `lib/brk/activation-service.ts`
- Dòng 311: ``Hoàn 100% phí tham gia MBC (hủy trong thời gian cân nhắc)`,`

### `lib/brk/level-manager.ts`
- Dòng 67: ``🎖️ <b>THĂNG CẤP MBC</b>\n\n` +`

### `lib/brk/rebuild-service.ts`
- Dòng 204: `data: { nameSystem: 'MB - Ngân hàng phước báu', graceDays }`

### `lib/brk/tree-surgery-service.ts`
- Dòng 241: `if (!sourceSys) throw new Error('Source user not found in MBC system')`
- Dòng 244: `if (!refSys) throw new Error('New referrer not found in MBC system')`
- Dòng 321: `if (!refSys) { result.warnings.push('New referrer not found in MBC system'); return result }`

### `lib/brk/wallet-service.ts`
- Dòng 338: `throw new Error('Số dư MBC wallet không đủ')`

### `lib/db-fallback.ts`
- Dòng 7: `title: 'MBC - Ngân hàng phước báu',`
- Dòng 14: `footerText: '© 2026 MBC. Mọi quyền được bảo lưu.',`
- Dòng 18: `messageContent: 'Chào mừng bạn đến với cộng đồng MBC!',`
- Dòng 28: `metaTitle: 'MBC - Ngân hàng phước báu',`

### `lib/email-campaign-runner.ts`
- Dòng 238: `const fromName = 'Cộng đồng MBC';`
- Dòng 351: `name: sender.senderName || process.env.BREVO_SENDER_NAME || 'Cộng đồng MBC',`
- Dòng 1006: `<img src="https://giautoandien.io.vn/logobrk-50px.png" alt="CỘNG ĐỒNG MBC" style="height: 40px; display: block; margin: 0 auto; color: #FACC15; font-w`
- Dòng 1008: `<div style="color: #FACC15; font-size: 10px; font-weight: bold; margin-top: 5px; letter-spacing: 2px;">NGÂN HÀNG PHƯỚC BÁU</div>`
- Dòng 1017: `Bạn nhận được thông báo này vì là thành viên của <b>Cộng đồng MBC</b>.<br>`

### `lib/notifications.ts`
- Dòng 21: `'[Cộng đồng MBC] Xác minh tài khoản của bạn',`
- Dòng 22: `'[Cộng đồng MBC] Kích hoạt tài khoản ngay',`
- Dòng 23: `'[Cộng đồng MBC] Hoàn tất đăng ký - Xác nhận email của bạn',`
- Dòng 24: `'[Cộng đồng MBC] Verify your account để bắt đầu học',`
- Dòng 25: `'Xác nhận đăng ký thành công - Cộng đồng MBC',`
- Dòng 26: `'[Cộng đồng MBC] Chào mừng! Xác minh email để tiếp tục',`
- Dòng 27: `'Kích hoạt tài khoản Cộng đồng MBC của bạn',`
- Dòng 79: `ACTIVATE: process.env.TELEGRAM_CHAT_ID_ACTIVATE || process.env.TELEGRAM_CHAT_ID_MBC_LOG || process.env.TELEGRAM_CHAT_ID,`
- Dòng 241: `from: 'Cộng đồng MBC <onboarding@resend.dev>',`
- Dòng 331: `const fromName = 'Cộng đồng MBC';`
- Dòng 401: `<p style="color: #4b5563; line-height: 1.6;">Chào mừng bạn tham gia Cộng đồng MBC. Nhập mã này để xác nhận:</p>`
- Dòng 478: `const subject = `[Cộng đồng MBC] Chào mừng bạn gia nhập cộng đồng - Mã học tập của bạn là #${studentId}`;`
- Dòng 479: `const htmlBody = `Chào mừng <b>${studentName}</b> đến với Cộng đồng MBC,<br><br>Mã số học tập của bạn là: <b>#${studentId}</b>`;`
- Dòng 527: `const subject = `[Cộng đồng MBC] Kích hoạt thành công khóa học: ${courseName}`;`
- Dòng 545: `const subject = '[Cộng đồng MBC] Đặt lại mật khẩu tài khoản của bạn';`

### `lib/survey-data.ts`
- Dòng 22: `subtitle: 'Xác định hướng đi chính của bạn tại Cộng đồng MBC.',`
- Dòng 110: `* Lộ trình chuẩn của Cộng đồng MBC`

### `notebooklm_txt_bundles/BUNDLE_API_ROUTES.txt`
- Dòng 569: `<div style="color: #FACC15; font-size: 10px; font-weight: bold; margin-top: 5px; letter-spacing: 2px;">NGÂN HÀNG PHƯỚC BÁU</div>`

### `notebooklm_txt_bundles/BUNDLE_COMPONENTS_Part2.txt`
- Dòng 1366: `NGÂN HÀNG PHƯỚC BÁU`
- Dòng 1466: `💡 HỌC VIỆN BRK - NGÂN HÀNG PHƯỚC BÁU`

### `PLAN.md`
- Dòng 1418: `- Thêm "Ví Ngân hàng Phước Báu" menu item`
- Dòng 1531: `## ✅ Fix BRK Sys#4 — MB Ngân hàng Phước Báu (2026-07-15)`
- Dòng 1534: `Audit và fix toàn diện hệ thống MB Ngân hàng Phước Báu (Sys#4, Course #22): sửa 5 lỗi critical/high gây sai dữ liệu tài chính và hiệu suất thấp.`
- Dòng 1682: `- ✅ Chuyển tiếp kênh thông báo Telegram: Cập nhật hàm `sendTelegram` trong `lib/notifications.ts` để ưu tiên sử dụng biến môi trường `TELEGRAM_CHAT_ID`
- Dòng 1932: `- Điều chỉnh độ ưu tiên định tuyến tin nhắn: Nhóm thông báo `ACTIVATE` ưu tiên gửi về `TELEGRAM_CHAT_ID_ACTIVATE` trước `TELEGRAM_CHAT_ID_MBC_LOG` để `
- Dòng 2034: `## ✅ Re-brand "Học Viện BRK" → "Cộng đồng MBC" (2026-08-07)`
- Dòng 2037: `Đổi toàn bộ text hiển thị thương hiệu "BRK" / "Học Viện" / "Học viên" → "MBC" / "Cộng đồng" / "Thành viên" trong code cứng và tài liệu. **Giữ nguyên t`
- Dòng 2042: `- Nội dung: "Học Viện BRK" → "Cộng đồng MBC", "Học viên" → "Thành viên", onSystem 0 → 'Thành viên', `FALLBACK_PROFILE.slug` `'brk'` → `'mbc'`.`
- Dòng 2046: `- Nội dung: đổi toàn bộ chuỗi hiển thị BRK → MBC (layout, label, message, error text): "BRK member" → "MBC member", "in BRK system" → "in MBC system",`
- Dòng 2050: `- Theo quyết định user: `PLAN_DYNAMIC_HOMEPAGE.md` đổi `slug="brk"` → `"mbc"`, `redirect('/brk')` → `'/mbc'`; **giữ nguyên** Section 11.1 (script `cre`

### `PLAN_DYNAMIC_HOMEPAGE.md`
- Dòng 32: `- Giao diện giống MBC nhưng **100% tùy biến từ database**`
- Dòng 75: `│  /                   → MBC Profile (slug="mbc")             │`
- Dòng 86: `│    ├── MBC gốc (slug="mbc", userId=null, isDefault=true)   │`
- Dòng 89: `│  Fallback: Nếu Teacher chưa set config → dùng MBC default  │`
- Dòng 148: `// 1. MBC gốc: userId = null, slug = "mbc", isDefault = true`
- Dòng 150: `userId          Int?      @unique  // null = MBC gốc`
- Dòng 155: `isDefault       Boolean   @default(false)  // true = MBC gốc`
- Dòng 163: `title           String?   // "NGÂN HÀNG PHƯỚC BÁU" → tùy biến`
- Dòng 248: `profileId     Int?      @unique  // null = campaign global (MBC)`
- Dòng 327: `* Lấy MBC default profile`
- Dòng 363: `// MBC gốc → tất cả khóa học`
- Dòng 894: `title: 'NGÂN HÀNG PHƯỚC BÁU',`
- Dòng 903: `metaTitle: 'Học viện BRK - Ngân hàng Phước Báu',`
- Dòng 995: `- [ ] MBC Profile created`

### `prisma/seed-affiliate.ts`
- Dòng 18: `description: 'Chương trình affiliate mặc định cho Cộng đồng MBC',`

### `prisma/seed-assistant-guide.ts`
- Dòng 8: `title: 'Chào mừng đến với MBC',`
- Dòng 9: `script: 'Chào mừng bạn đến với Cộng đồng MBC - Ngân hàng Phước Báu. Tôi là trợ lý ảo của bạn. Tại đây, bạn có thể khám phá các khóa học, theo dõi lộ t`
- Dòng 10: `textContent: `Chào mừng bạn đến với Cộng đồng MBC!`
- Dòng 12: `MBC - Ngân hàng Phước Báu là nền tảng đào tạo trực tuyến, nơi bạn có thể:`

### `scripts/create-brk-profile.ts`
- Dòng 30: `title: 'NGÂN HÀNG PHƯỚC BÁU',`
- Dòng 42: `footerText: '© 2026 Ngân hàng Phước Báu. Mọi quyền được bảo lưu.',`
- Dòng 43: `metaTitle: 'BRK - Ngân hàng Phước Báu',`

### `scripts/migrations/add_site_profile.sql`
- Dòng 92: `'NGÂN HÀNG PHƯỚC BÁU',`
- Dòng 100: `'BRK - Ngân hàng Phước Báu',`
- Dòng 102: `'© 2026 Ngân hàng Phước Báu. Mọi quyền được bảo lưu.'`

### `scripts/move-1174.cjs`
- Dòng 5: `* được đưa về dưới #974 (chỗ cũ của #1172). Theo nguyên tắc MBC TCA giai đoạn 2`
- Dòng 157: `reason: `Đưa #${sysMember.userId} về đúng đội #379 theo nguyên tắc MBC TCA giai đoạn 2 (BFS referrer #379 → #${MOVE.newParentUserId})`,`

### `scripts/replay/inspect_3773_all_systems.ts`
- Dòng 32: `// 4. System 4 (MB - Ngân hàng phước báu)`
- Dòng 34: `console.log("\nSystem #4 (MB - Ngân hàng phước báu):", sys4 ? {`

### `scripts/retroactive-telegram-activation.ts`
- Dòng 207: `const chatId = process.env.TELEGRAM_CHAT_ID_ACTIVATE || process.env.TELEGRAM_CHAT_ID_MBC_LOG || process.env.TELEGRAM_CHAT_ID`

### `scripts/run-rebuild.ts`
- Dòng 17: `data: { nameSystem: 'MB - Ngân hàng phước báu', graceDays: 1 }`

### `scripts/seed-auto-verify-config.ts`
- Dòng 7: `// Khóa #22: NGÂN HÀNG PHƯỚC BÁU BRK1 → Sacombank → BRK System #4`

### `scripts/seed-homepage-data.ts`
- Dòng 9: `{ content: 'Học hôm nay, thành công ngày mai', detail: 'MBC mang đến những tri thức thực chiến giúp bạn phát triển bản thân và xây dựng sự nghiệp.' },`
- Dòng 12: `{ content: 'Tri thức là sức mạnh - Nâng tầm năng lực thực chiến', detail: 'MBC đồng hành cùng bạn trên con đường chinh phục tri thức và kiến tạo giá t`
- Dòng 13: `{ content: 'Kết nối - Chia sẻ - Phát triển', detail: 'Cùng nhau học tập, cùng nhau lớn mạnh trong cộng đồng MBC.' },`
- Dòng 27: `{ name: 'Thông báo', slug: 'thong-bao', description: 'Thông báo từ Cộng đồng MBC', order: 1 },`
- Dòng 52: `title: 'Chào mừng bạn đến với Cộng đồng MBC',`
- Dòng 53: `content: `Chào mừng bạn đến với Cộng đồng MBC - Ngân hàng Phước Báu!`
- Dòng 55: `Đây là nơi chúng ta cùng nhau học tập, chia sẻ và phát triển. MBC cam kết mang đến những giá trị thực chiến nhất giúp bạn nâng tầm năng lực và kiến tạ`
- Dòng 65: `content: `Cộng đồng MBC cung cấp đầy đủ các công cụ hỗ trợ học tập:`
- Dòng 79: `title: 'Cộng đồng MBC - Kết nối và phát triển',`
- Dòng 80: `content: `Cộng đồng MBC là nơi hội tụ những người cùng chí hướng, cùng nhau học tập và phát triển.`
- Dòng 143: `data: { label: 'Bạn muốn học để làm gì?', type: 'CHOICE', description: 'Xác định hướng đi chính của bạn tại Cộng đồng MBC.' },`
- Dòng 217: `name: 'Khảo sát định hướng MBC',`

### `scripts/seed-system-tree-and-profile.ts`
- Dòng 57: `title: 'NGÂN HÀNG PHƯỚC BÁU',`
- Dòng 62: `messageDetail: 'MBC mang đến những tri thức thực chiến giúp bạn phát triển bản thân và xây dựng sự nghiệp.',`
- Dòng 66: `communityTitle: 'Cộng đồng MBC',`
- Dòng 69: `footerText: '© 2026 Ngân hàng Phước Báu. Mọi quyền được bảo lưu.',`
- Dòng 70: `metaTitle: 'MBC - Ngân hàng Phước Báu',`

### `scripts/send-reset-link.ts`
- Dòng 74: `<h2 style="color: #f97316;">CỘNG ĐỒNG MBC - KHÔI PHỤC MẬT KHẨU</h2>`
- Dòng 90: `const result = await sendGmail(user.email, "Liên kết khôi phục mật khẩu - Cộng đồng MBC", htmlBody)`

## 2. Trong Database

Để kiểm tra trong Database một cách an toàn, cần rà soát qua các Model chứa nội dung có thể sinh ra từ người dùng hoặc cấu hình (VD: Post, Comment, Setting, Course...). Dưới đây là Prisma script để dry-run.


### Kết quả rà soát Database thực tế
- SiteProfile ID 1: title = "NGÂN HÀNG PHƯỚC BÁU"
- SiteProfile ID 1: metaTitle = "MBC - Ngân hàng Phước Báu"
- SiteProfile ID 1: footerText = "© 2026 Ngân hàng Phước Báu. Mọi quyền được bảo lưu."
