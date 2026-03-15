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
- Only files matching these patterns are included: package.json, next.config.ts, tsconfig.json, vercel.json
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Code comments have been removed from supported file types
- Empty lines have been removed from all files
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
next.config.ts
package.json
tsconfig.json
vercel.json
```

# Files

## File: tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules", "scripts"]
}
```

## File: vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron/gmail-watch",
      "schedule": "0 0 * * 1"
    }
  ]
}
```

## File: next.config.ts
```typescript
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  compress: true,
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    unoptimized: true,
    qualities: [50, 70, 75, 80, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.imgur.com",
      },
      {
        protocol: "https",
        hostname: "postimg.cc",
      },
      {
        protocol: "https",
        hostname: "**.postimg.cc",
      },
      {
        protocol: "https",
        hostname: "api.vietqr.io",
      },
      {
        protocol: "https",
        hostname: "img.vietqr.io",
      }
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
```

## File: package.json
```json
{
  "name": "brk-academy",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "postinstall": "prisma generate",
    "start": "next start",
    "lint": "eslint",
    "import-csv": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/import-csv.ts",
    "process-legacy": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/process-legacy-users.ts",
    "check-missing": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/check-missing-ids.ts",
    "fill-missing": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/fill-missing-ids.ts",
    "change-id": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/change-id.ts",
    "add-reserved": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/add-reserved-id.ts",
    "import-reserved": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/import-reserved-list.ts",
    "make-admin": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/make-admin.ts",
    "seed-courses": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/seed-courses.ts",
    "seed-enrollments": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/seed-enrollments.ts",
    "import-v3": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/import-v3-data.ts",
    "push": "powershell -ExecutionPolicy Bypass -File ./scripts/push.ps1",
    "code-history": "ts-node --compiler-options \"{\\\"module\\\":\\\"CommonJS\\\"}\" scripts/generate-code-history.ts",
    "sync-ai": "ts-node --compiler-options \"{\\\"module\\\":\\\"CommonJS\\\"}\" scripts/export-modules.ts"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^2.11.1",
    "@hookform/resolvers": "^5.2.2",
    "@prisma/client": "5.22.0",
    "@supabase/supabase-js": "^2.95.3",
    "@types/bcryptjs": "^2.4.6",
    "@xyflow/react": "^12.10.1",
    "bcryptjs": "^3.0.3",
    "clsx": "^2.1.1",
    "csv-parser": "^3.2.0",
    "csv-writer": "^1.6.0",
    "date-fns": "^4.1.0",
    "dompurify": "^3.3.1",
    "dotenv": "^17.3.1",
    "googleapis": "^171.4.0",
    "lucide-react": "^0.570.0",
    "next": "16.1.6",
    "next-auth": "^5.0.0-beta.30",
    "react": "19.2.3",
    "react-day-picker": "^9.14.0",
    "react-dom": "19.2.3",
    "react-hook-form": "^7.71.1",
    "tailwind-merge": "^3.4.1",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "prisma": "5.22.0",
    "tailwindcss": "^4",
    "ts-node": "^10.9.2",
    "typescript": "^5"
  },
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```
