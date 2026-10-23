# Tro ly huong dan (wi300.vn) — Quy tac gop nang cap

Tu ngay 2026-10-14, **moi dot nang cap** tinh nang Tro ly huong dan deu duoc day vao
nhanh duy nhat `feat/tro-ly-huong-dan-upgrade` va chi merge **1 PR duy nhat**
tuong ung. Khong mo them PR moi cho tung dot nang cap.

Quy trinh:

1. Moi dot nang cap: push them commit vao nhanh nay.
2. Vercel tu build preview moi tren cung 1 PR — test tren preview.
3. Neu loi: sua va push tiep vao cung nhanh (khong tao PR moi).
4. Khi test xong xuoi moi merge 1 PR nay vao master.

## Nguon goc

Nhanh duoc tach tu master tai commit merge PR #159 (PR moi nhat cua tinh nang
Tro ly huong dan). Da bao gom toan bo noi dung da merge:

- #157: steps + phan vai tro + tour "Dan toi lam" + 8 bai huong dan
- #158: cai thien tour va toast
- #159: anh minh hoa 3 bai dang nhap/dang ky/quen mat khau

## Dot nang cap 2026-10-14: phu kin moi giao dien

- API fallback trang cha (`app/api/assistant-guide/route.ts`): trang con chua co bai
  rieng tu ke thua bai cua trang cha gan nhat.
- Them 22 bai huong dan moi (`prisma/seed-assistant-guides.ts`), tong 62 bai.
- Da seed du lieu len production DB (21 bai moi, 41 bai cu giu nguyen).

## Trang thai merge PR #160

- 2026-10-14 toi: preview Vercel READY tren tai khoan moi (hocvienbrk-4qj3wv0q0-witech2.vercel.app),
  ni Cuong da kiem tra giao dien va dong y merge.
- Merge can check CI 'TypeScript, Prisma, Security & Build' xanh — commit nay kich hoat lai workflow.
