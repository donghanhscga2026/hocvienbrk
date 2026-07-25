# TAI LIEU KY THUAT: Chuyen Vercel Cron sang GitHub Actions

## 1. Muc tieu

Giai quyet loi **Vercel Deploy bi chan** do file `vercel.json` chua cron expression chay nhieu hon 1 lan/ngay, vi pham gioi han goi **Vercel Hobby**.

**Muc tieu cu the:**
- Deploy thanh cong len Vercel khong con loi cron
- Cac cron job van chay dung tan suat cu (3 job moi gio, 5 job moi ngay)
- Mien phi, khong can nang cap Vercel Pro

---

## 2. Thuc trang hien co

### 2.1. `vercel.json` - 8 Cron Jobs

| Cron Path | Schedule (UTC) | Tan suat | Vercel Hobby? |
|---|---|---|---|
| `/api/cron/gmail-watch` | `0 0 * * *` | 1x/ngay (07:00 ICT) | OK |
| `/api/cron/reset-sender-quota` | `0 0 * * *` | 1x/ngay (07:00 ICT) | OK |
| `/api/cron/scan-bounces` | `0 5 * * *` | 1x/ngay (12:00 ICT) | OK |
| `/api/cron/brk-daily-eval` | `8 * * * *` | **24x/ngay** | BLOCKED |
| `/api/cron/brk-grace-processing` | `5 17 * * *` | 1x/ngay (00:05 ICT+1) | OK |
| `/api/cron/mbtca-orchestrator` | `5 * * * *` | **24x/ngay** | BLOCKED |
| `/api/cron/brk-expiration` | `0 0 * * *` | 1x/ngay (07:00 ICT) | OK |
| `/api/cron/brk-revenue-share` | `6 * * * *` | **24x/ngay** | BLOCKED |

**Loi Vercel:** *"Hobby accounts are limited to daily cron jobs. This cron expression (8 * * * *) would run more than once per day."*

### 2.2. Auth Pattern (chung cho tat ca routes)

```typescript
const authHeader = request.headers.get('Authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

GitHub Actions chi can goi `curl` voi header `Authorization: Bearer <secret>` la du.

### 2.3. `verify-payments.yml` - Trung lap

Hien dang goi `/api/cron/gmail-watch` nhung ten workflow la "Auto Verify Payments" - trung lap voi cron moi se tao.

---

## 3. Giai phap

**Chuyen TOAN BO 8 cron jobs tu Vercel sang GitHub Actions.**

### Tai sao chuyen tat ca (khong chi 3 hourly)?
1. Don gian - mot file workflow duy nhat quan ly tat ca
2. An toan - Vercel khong co cron nao deploy khong bao gio bi chan
3. Thong nhat - tat ca cron o mot noi, de maintain
4. Ca 2 Vercel accounts deu deploy duoc

---

## 4. Chi tiet thay doi

### 4.1. TAO MOI: `.github/workflows/cron-jobs.yml`

Moi cron job la mot `job` rieng biet, goi endpoint bang `curl` voi `Bearer ${{ secrets.CRON_SECRET }}`.

**Schedule Mapping (UTC):**

| Cron Expression | ICT (GMT+7) | Job(s) |
|---|---|---|
| `8 * * * *` | Moi gio luc :08 | `brk-daily-eval` |
| `5 * * * *` | Moi gio luc :05 | `mbtca-orchestrator` |
| `6 * * * *` | Moi gio luc :06 | `brk-revenue-share` |
| `0 0 * * *` | 07:00 ICT | `gmail-watch`, `reset-sender-quota`, `brk-expiration` |
| `0 5 * * *` | 12:00 ICT | `scan-bounces` |
| `5 17 * * *` | 00:05 ICT (ngay hom sau) | `brk-grace-processing` |

**Quan trong:** GitHub Actions se trigger TAT CA jobs khi bat ky schedule nao khop. Can dung `if: github.event.schedule == '...'` de moi job chi chay khi schedule dung khop.

### 4.2. XOA: `vercel.json`

File hien tai chi chua section `crons`. Xoa hoan toan.

### 4.3. XOA: `.github/workflows/verify-payments.yml`

Trung lap voi `cron-jobs.yml` cho gmail-watch.

---

## 5. Cau hinh tren GitHub

**GitHub Repo > Settings > Secrets and variables > Actions**

| Type | Name | Gia tri |
|---|---|---|
| Secret | `CRON_SECRET` | Gia tri dang dung tren Vercel env |
| Variable | `SITE_URL` | `https://giautoandien.io.vn` |

---

## 6. Du kien Ket qua

**Truoc:** Vercel Deploy BLOCKED - Hobby accounts limited
**Sau:** Vercel Deploy OK + GitHub Actions chay 8 cron dung lich

---

## 7. Huong dan Trien khai

1. Backup: `vercel.json` va `verify-payments.yml` vao `plan_temp/`
2. Tao `.github/workflows/cron-jobs.yml`
3. Xoa `vercel.json`
4. Xoa `.github/workflows/verify-payments.yml`
5. Cau hinh GitHub Secrets/Variables
6. Push code len GitHub
7. Verify: Vercel deploy thanh cong, GitHub Actions chay dung

---

## 8. Lich su thay doi

| Ngay | Thay doi | Trang thai |
|---|---|---|
| 2026-07-25 | Tao tai lieu, trien khai chuyen Vercel Cron -> GitHub Actions | DANG THUC HIEN |
