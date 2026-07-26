# Kế Hoạch Triển Khai: Cloudflare Worker Load Balancer cho Vercel Deployments

Bản kế hoạch này hướng dẫn chi tiết cách cấu hình và triển khai một Cloudflare Worker hoạt động như một Load Balancer (Bộ cân bằng tải) điều phối lưu lượng truy cập giữa 3 ứng dụng Vercel (Hobby plan) từ một kho mã nguồn GitHub duy nhất, đồng thời tối ưu hóa cơ chế chạy Cron bằng GitHub Actions.

---

## 1. Phân Tích Kiến Trúc & Giải Pháp Tối Ưu

### 1.1. Kháng Lỗi (Failover) & Phiên Làm Việc (Sticky Session)
* **Định Tuyến:** Worker kiểm tra Cookie `BRK_SERVER` trên Request. Nếu chưa có, Worker chọn ngẫu nhiên một Backend (0, 1, hoặc 2) và thiết lập Cookie này với thời hạn 30 ngày.
* **Xác Thực (NextAuth):** Do 3 Vercel Deployments sử dụng cùng Database và cùng các khóa bí mật (`NEXTAUTH_SECRET`, JWT secrets), các session của người dùng hoàn toàn có thể được giải mã bởi bất kỳ backend nào. Khi xảy ra failover, người dùng **không** bị đăng xuất.

### 1.2. Tối Ưu Hóa Cron Jobs (GitHub Actions)
Thay vì để các request Cron đi qua Load Balancer (làm tốn quota request của Cloudflare Worker), chúng ta sẽ cấu hình:
* **Tác vụ Cron** chạy qua **GitHub Actions** (đã thiết lập trong dự án tại `.github/workflows/cron-jobs.yml`).
* **Định cấu hình GitHub Variable:** Đổi biến `SITE_URL` trên GitHub Repo Settings thành URL trực tiếp của Vercel Backend 0 (ví dụ: `https://app1.vercel.app`).
* **Kết quả:** Các request Cron đi thẳng từ GitHub Actions vào Vercel Backend 0, bỏ qua Load Balancer, không bao giờ chạy trùng lặp và không làm tốn tài nguyên Cloudflare Worker.

---

## 2. Cấu Trúc Thư Mục Worker Đề Xuất

Chúng ta sẽ khởi tạo thư mục `workers/` trong dự án hiện tại:

```
workers/
  ├── wrangler.toml       # Cấu hình Cloudflare Wrangler
  ├── package.json        # Thư viện & Build script cho Worker
  ├── tsconfig.json       # Cấu hình TypeScript cho Worker
  └── src/
      ├── index.ts        # Entrypoint tiếp nhận request
      ├── config.ts       # Định nghĩa ENV và Backend Origins
      ├── cookie.ts       # Xử lý gán và đọc Sticky Cookie (BRK_SERVER)
      ├── proxy.ts        # Chuyển tiếp Request sang Vercel (Headers, Method, Body)
      ├── cache.ts        # Cấu hình cache cho Static assets, bypass API/Auth
      └── health.ts       # Xử lý tự động Retry & Failover khi backend lỗi 5xx
```

---

## 3. Mã Nguồn Các File Chi Tiết

### 3.1. `workers/wrangler.toml`
```toml
name = "brk-load-balancer"
main = "src/index.ts"
compatibility_date = "2026-07-25"

[vars]
COOKIE_NAME = "BRK_SERVER"
ORIGIN_0 = "https://hocvienbrk-dep1.vercel.app"  # URL Vercel 1
ORIGIN_1 = "https://hocvienbrk-dep2.vercel.app"  # URL Vercel 2
ORIGIN_2 = "https://hocvienbrk-dep3.vercel.app"  # URL Vercel 3
```

### 3.2. `workers/src/config.ts`
```typescript
export interface Env {
  COOKIE_NAME: string;
  ORIGIN_0: string;
  ORIGIN_1: string;
  ORIGIN_2: string;
}

export function getBackends(env: Env): string[] {
  return [env.ORIGIN_0, env.ORIGIN_1, env.ORIGIN_2].filter(Boolean);
}
```

### 3.3. `workers/src/cookie.ts`
```typescript
export function getStickyBackendIndex(request: Request, cookieName: string, maxBackends: number): number | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map(c => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split("=");
    if (name === cookieName) {
      const idx = parseInt(value, 10);
      if (!isNaN(idx) && idx >= 0 && idx < maxBackends) {
        return idx;
      }
    }
  }
  return null;
}

export function createStickyCookieHeader(cookieName: string, index: number): string {
  return `${cookieName}=${index}; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax`;
}
```

### 3.4. `workers/src/cache.ts`
```typescript
export function getCacheOverride(request: Request): { cf: RequestInitCfProperties } | null {
  const url = new URL(request.url);
  const path = url.pathname;

  // 1. BYPASS CACHE các đường dẫn động, API, Auth, Admin
  if (
    path.startsWith("/api/") ||
    path.startsWith("/auth/") ||
    path.startsWith("/dashboard/") ||
    path.startsWith("/admin/") ||
    path === "/"
  ) {
    return {
      cf: {
        cacheTtl: -1,
        cacheEverything: false,
      }
    };
  }

  // 2. CACHE MẠNH các asset tĩnh của Next.js (chứa hash)
  if (path.startsWith("/_next/static/") || path.endsWith(".woff2")) {
    return {
      cf: {
        cacheTtl: 31536000, // 1 năm
        cacheEverything: true,
      }
    };
  }

  // 3. CACHE trung bình cho các file ảnh tĩnh công cộng
  const staticExtensions = [".js", ".css", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".ico"];
  if (staticExtensions.some(ext => path.endsWith(ext))) {
    return {
      cf: {
        cacheTtl: 86400, // 1 ngày
        cacheEverything: true,
      }
    };
  }

  return null;
}
```

### 3.5. `workers/src/proxy.ts`
```typescript
import { getCacheOverride } from "./cache";

export async function proxyRequest(
  request: Request,
  targetOrigin: string,
  stickyCookie: string | null
): Promise<Response> {
  const url = new URL(request.url);
  const targetUrl = new URL(url.pathname + url.search, targetOrigin);

  const newHeaders = new Headers(request.headers);
  newHeaders.set("Host", targetUrl.hostname);
  
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (clientIp) {
    newHeaders.set("X-Forwarded-For", clientIp);
  }

  const cacheConfig = getCacheOverride(request);

  const init: RequestInit = {
    method: request.method,
    headers: newHeaders,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const fetchInit = cacheConfig ? { ...init, ...cacheConfig } : init;
  const response = await fetch(targetUrl.toString(), fetchInit);

  const responseHeaders = new Headers(response.headers);
  if (stickyCookie) {
    responseHeaders.append("Set-Cookie", stickyCookie);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
```

### 3.6. `workers/src/health.ts`
```typescript
import { proxyRequest } from "./proxy";
import { createStickyCookieHeader } from "./cookie";

export async function handleWithFailover(
  request: Request,
  backends: string[],
  initialIndex: number,
  cookieName: string,
  wasCookieSet: boolean
): Promise<Response> {
  let attempts = 0;
  let currentIndex = initialIndex;
  const maxAttempts = Math.min(backends.length, 2);

  while (attempts < maxAttempts) {
    try {
      const targetOrigin = backends[currentIndex];
      const stickyCookieHeader = (!wasCookieSet || attempts > 0)
        ? createStickyCookieHeader(cookieName, currentIndex)
        : null;

      const response = await proxyRequest(request, targetOrigin, stickyCookieHeader);

      if (response.status >= 502 && response.status <= 504) {
        throw new Error(`Backend returned status ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error(`Attempt ${attempts + 1} failed on backend index ${currentIndex}:`, error);
      attempts++;
      currentIndex = (currentIndex + 1) % backends.length;
    }
  }

  return new Response("Service Temporarily Unavailable (All backends failed)", {
    status: 503,
    headers: { "Content-Type": "text/plain" },
  });
}
```

### 3.7. `workers/src/index.ts`
```typescript
import { Env, getBackends } from "./config";
import { getStickyBackendIndex } from "./cookie";
import { handleWithFailover } from "./health";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const backends = getBackends(env);
    
    if (backends.length === 0) {
      return new Response("No backends configured", { status: 500 });
    }

    let backendIndex = getStickyBackendIndex(request, env.COOKIE_NAME, backends.length);
    let wasCookieSet = true;

    if (backendIndex === null) {
      backendIndex = Math.floor(Math.random() * backends.length);
      wasCookieSet = false;
    }

    return handleWithFailover(request, backends, backendIndex, env.COOKIE_NAME, wasCookieSet);
  },
};
```

---

## 4. Kế Hoạch Các Bước Thực Hiện

1. **Bước 1 (Vercel):** Bạn thiết lập 3 deploy độc lập từ cùng 1 repository GitHub lên Vercel, cài đặt các biến môi trường giống hệt nhau (`DATABASE_URL`, `NEXTAUTH_SECRET`,...).
2. **Bước 2 (Worker Code):** Tôi sẽ tạo thư mục `workers/` và các file liên quan ngay dưới gốc dự án hiện tại.
3. **Bước 3 (Cloudflare Worker):** Bạn đăng nhập và chạy lệnh deploy Worker lên Cloudflare:
   ```bash
   cd workers
   wrangler deploy
   ```
   Sau đó trỏ Route DNS `giautoandien.io.vn/*` về Worker này.
4. **Bước 4 (Cron Actions):** Sửa giá trị variable `SITE_URL` trên GitHub Repo Settings thành URL trực tiếp của Vercel Backend 0 (ví dụ: `https://hocvienbrk-dep1.vercel.app`).

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
* [ ] **Sticky Session:** Đăng nhập, tải lại trang liên tục không bị logout, cookie `BRK_SERVER` được giữ nguyên.
* [ ] **Failover:** Giả lập tắt thử Vercel App 1, truy cập qua domain chính vẫn hoạt động bình thường (Worker tự động điều hướng sang Vercel App 2).
* [ ] **Bypass Cache:** Các yêu cầu API/Auth/Dashboard không bị cache.
* [ ] **Cron:** Tác vụ cron kích hoạt và hoàn thành thành công từ GitHub Actions gọi trực tiếp đến Vercel App 1 mà không đi qua Load Balancer.
