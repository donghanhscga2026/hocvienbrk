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
- Only files matching these patterns are included: scripts/**/*
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Code comments have been removed from supported file types
- Empty lines have been removed from all files
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
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
scripts/debug-survey-data.js
scripts/export-modules.ts
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
scripts/migrate-to-flow.ts
scripts/payment-watcher.js
scripts/process-legacy-users.ts
scripts/push.ps1
scripts/seed-courses.ts
scripts/seed-enrollments.ts
scripts/seed-initial-survey.js
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
```

# Files

## File: scripts/add-reserved-id.ts
```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    const args = process.argv.slice(2)
    if (args.length < 1) {
        console.error('Usage: npm run add-reserved <id> [note]')
        process.exit(1)
    }
    const id = parseInt(args[0])
    const note = args[1] || 'Reserved by Admin'
    if (isNaN(id)) {
        console.error('Error: ID must be a number')
        process.exit(1)
    }
    try {
        const existing = await prisma.reservedId.findUnique({ where: { id } })
        if (existing) {
            console.log(`⚠️  ID ${id} is already reserved: "${existing.note}"`)
            return
        }
        await prisma.reservedId.create({
            data: {
                id,
                note
            }
        })
        console.log(`✅ Successfully reserved ID ${id} (${note}). New users will skip this ID.`)
    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}
main()
```

## File: scripts/auto-commit-push.ps1
```powershell
# ================================================================================
# Script: auto-commit-push.ps1
# Mục đích: Backup code hiện tại, đẩy code mới lên GitHub và cập nhật CODE_HISTORY.md
# Cách chạy: powershell -ExecutionPolicy Bypass -File .\scripts\auto-commit-push.ps1
# ================================================================================

$ErrorActionPreference = "Stop"

# Màu sắc cho output
function Write-Green { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Yellow { param($msg) Write-Host $msg -ForegroundColor Yellow }
function Write-Red { param($msg) Write-Host $msg -ForegroundColor Red }

Write-Yellow "=== Bat dau auto commit va push ==="

# Buoc 1: Kiem tra co thay doi khong
Write-Yellow "Kiem tra thay doi..."
$status = git status --porcelain
if (-not $status) {
    Write-Red "Khong co thay doi nao. Thoat."
    exit 0
}

# Buoc 2: Hien thi cac file thay doi
Write-Yellow "Cac file thay doi:"
git status --porcelain

# Buoc 3: Tao mo ta commit
$changedFiles = git diff --name-only
Write-Green "Cac file thay doi:"
$changedFiles | ForEach-Object { Write-Host "  - $_" }

# Kiem tra neu co cap nhat CODE_HISTORY.md
if ($changedFiles -contains "CODE_HISTORY.md") {
    $commitMsg = "cap nhat CODE_HISTORY.md"
} else {
    # Tao commit message tu ten file
    $fileNames = ($changedFiles | ForEach-Object { [System.IO.Path]::GetFileName($_) }) -join ", "
    if ($fileNames.Length -gt 100) {
        $commitMsg = $fileNames.Substring(0, 97) + "..."
    } else {
        $commitMsg = "cap nhat: $fileNames"
    }
}

Write-Green "Commit message: $commitMsg"

# Buoc 4: Git add
Write-Yellow "Git add..."
git add -A

# Buoc 5: Git commit
Write-Yellow "Git commit..."
git commit -m $commitMsg

# Buoc 6: Git push
Write-Yellow "Git push..."
git push origin master

Write-Green "=== Hoan thanh! ==="
Write-Green "Da day code len GitHub"
```

## File: scripts/auto-commit-push.sh
```bash
set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
echo -e "${YELLOW}=== Bắt đầu auto commit và push ===${NC}"
echo -e "${YELLOW}Kiểm tra thay đổi...${NC}"
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${RED}Không có thay đổi nào. Thoát.${NC}"
    exit 0
fi
echo -e "${YELLOW}Tạo mô tả thay đổi...${NC}"
CHANGES=$(git status --porcelain | head -20)
echo "$CHANGES"
CHANGED_FILES=$(git diff --name-only)
echo -e "${GREEN}Các file thay đổi:${NC}"
echo "$CHANGED_FILES"
if [ -n "$(echo "$CHANGED_FILES" | grep -E "CODE_HISTORY.md")" ]; then
    COMMIT_MSG="cap nhat CODE_HISTORY.md"
else
    FILE_NAMES=$(echo "$CHANGED_FILES" | xargs -I {} basename {} | tr '\n' ', ')
    FILE_NAMES=${FILE_NAMES%,}
    COMMIT_MSG="cap nhat: $FILE_NAMES"
fi
if [ ${
    COMMIT_MSG="${COMMIT_MSG:0:97}..."
fi
echo -e "${GREEN}Commit message: $COMMIT_MSG${NC}"
echo -e "${YELLOW}Git add...${NC}"
git add -A
echo -e "${YELLOW}Git commit...${NC}"
git commit -m "$COMMIT_MSG"
echo -e "${YELLOW}Git push...${NC}"
git push origin master
echo -e "${GREEN}=== Hoàn thành! ===${NC}"
echo -e "${GREEN}Đã đẩy code lên GitHub${NC}"
```

## File: scripts/backup.ps1
```powershell
# ============================================================
#  backup.ps1 - HocVien-BRK Project Backup Script
#  Usage: .\scripts\backup.ps1
#  Creates a timestamped ZIP of all important source files.
# ============================================================

$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path # Ensure $ProjectRoot is a string
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BackupDir = "$ProjectRoot\backups"
$ZipName = "backup_$Timestamp.zip"
$ZipPath = "$BackupDir\$ZipName"
$TempBackupDir = Join-Path ([System.IO.Path]::GetTempPath()) "BRK_Backup_Temp_$Timestamp"

# --- Files & folders to include (relative to project root) ---
$IncludePaths = @(
    # App source
    "app",
    "components",
    "lib",
    "types",
    "public",

    # Auth & config
    "auth.ts",
    "auth.config.ts",
    "middleware.ts",
    ".env",
    ".env.local",

    # DB / Prisma
    "prisma",

    # Scripts
    "scripts",

    # Project config
    "package.json",
    "next.config.ts",
    "tsconfig.json",
    "tsconfig.seed.json",
    "postcss.config.mjs",
    "eslint.config.mjs",
    "docker-compose.yml",

    # Docs
    "README.md",
    "DESIGN_SYSTEM.md"
)

# --- Paths/patterns to EXCLUDE even if inside an included folder ---
$ExcludePatterns = @(
    "*.log",
    "*.tsbuildinfo",
    ".next",
    "node_modules",
    ".git",
    "backups"
)

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  BRK Project Backup" -ForegroundColor Cyan
Write-Host "  Time   : $Timestamp" -ForegroundColor Cyan
Write-Host "  Output : $ZipPath" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Create backups directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Host "[+] Created backups/ folder" -ForegroundColor Green
}

# Create temporary directory for staging files
if (Test-Path $TempBackupDir) {
    Remove-Item -Path $TempBackupDir -Recurse -Force | Out-Null
}
New-Item -ItemType Directory -Path $TempBackupDir | Out-Null
Write-Host "[+] Created temporary staging folder: $TempBackupDir" -ForegroundColor Green

# Collect all files to backup
$FilesToBackup = @()

foreach ($rel in $IncludePaths) {
    $full = Join-Path $ProjectRoot $rel

    if (Test-Path $full -PathType Leaf) {
        # It's a single file
        $FilesToBackup += $full
    }
    elseif (Test-Path $full -PathType Container) {
        # It's a folder — collect all files recursively, applying exclusions
        $all = Get-ChildItem -Path $full -File -Recurse

        foreach ($file in $all) {
            $skip = $false
            foreach ($pattern in $ExcludePatterns) {
                # Check if any part of the full path matches the pattern
                if ($file.FullName -like "*\$pattern\*" -or $file.Name -like $pattern) {
                    $skip = $true; break
                }
            }
            if (-not $skip) { $FilesToBackup += $file.FullName }
        }
    }
    else {
        Write-Host "[!] Not found, skipping: $rel" -ForegroundColor Yellow
    }
}

if ($FilesToBackup.Count -eq 0) {
    Write-Host "[ERROR] No files found to backup." -ForegroundColor Red
    # Clean up temp directory before exiting
    if (Test-Path $TempBackupDir) {
        Remove-Item -Path $TempBackupDir -Recurse -Force | Out-Null
    }
    exit 1
}

Write-Host "[*] Collecting $($FilesToBackup.Count) files..." -ForegroundColor Gray

# Copy files to the temporary directory, maintaining relative structure
foreach ($filePath in $FilesToBackup) {
    # Get relative path from ProjectRoot
    $relativePath = $filePath.Substring($ProjectRoot.Length).TrimStart('\', '/')
    $destinationPath = Join-Path $TempBackupDir $relativePath

    # Ensure the destination directory exists in the temp structure
    $destinationDir = Split-Path -Parent $destinationPath
    if (-not (Test-Path $destinationDir)) {
        New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
    }

    # Copy the file
    Copy-Item -Path $filePath -Destination $destinationPath -Force
}

Write-Host "[*] Staged files to temporary directory. Creating ZIP archive..." -ForegroundColor Gray

# Create ZIP using Compress-Archive
try {
    Compress-Archive -Path "$TempBackupDir\*" -DestinationPath $ZipPath -Force
}
catch {
    Write-Host "[ERROR] Failed to create ZIP archive: $($_.Exception.Message)" -ForegroundColor Red
    # Clean up temp directory before exiting
    if (Test-Path $TempBackupDir) {
        Remove-Item -Path $TempBackupDir -Recurse -Force | Out-Null
    }
    exit 1
}

# Clean up the temporary directory
if (Test-Path $TempBackupDir) {
    Remove-Item -Path $TempBackupDir -Recurse -Force | Out-Null
    Write-Host "[+] Cleaned up temporary staging folder." -ForegroundColor Green
}

$sizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Backup complete!" -ForegroundColor Green
Write-Host "  File : $ZipName" -ForegroundColor Green
Write-Host "  Size : ${sizeMB} MB" -ForegroundColor Green
Write-Host "  Files: $($FilesToBackup.Count)" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Keep only the 5 most recent backups to save disk space
$OldBackups = Get-ChildItem -Path $BackupDir -Filter "backup_*.zip" |
Sort-Object LastWriteTime -Descending |
Select-Object -Skip 5

if ($OldBackups.Count -gt 0) {
    Write-Host "[*] Removing $($OldBackups.Count) old backup(s)..." -ForegroundColor Gray
    $OldBackups | Remove-Item -Force
}
```

## File: scripts/change-id.ts
```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    const args = process.argv.slice(2)
    if (args.length !== 2) {
        console.error('Usage: npm run change-id <current_id> <new_id>')
        process.exit(1)
    }
    const currentId = parseInt(args[0])
    const newId = parseInt(args[1])
    if (isNaN(currentId) || isNaN(newId)) {
        console.error('Error: IDs must be numbers')
        process.exit(1)
    }
    console.log(`🔄 Attempting to change User ID from ${currentId} to ${newId}...`)
    try {
        const user = await prisma.user.findUnique({ where: { id: currentId } })
        if (!user) {
            console.error(`❌ User with ID ${currentId} not found.`)
            process.exit(1)
        }
        const existingNewUser = await prisma.user.findUnique({ where: { id: newId } })
        if (existingNewUser) {
            console.error(`❌ Target ID ${newId} is already taken by user: ${existingNewUser.name} (${existingNewUser.email})`)
            process.exit(1)
        }
        const reserved = await prisma.reservedId.findUnique({ where: { id: newId } })
        if (reserved) {
            console.log(`💎 Target ID ${newId} is a RESERVED ID ("${reserved.note}"). allowing change because you are Admin.`)
        }
        console.log('⚡ Updating ID in database...')
        const result = await prisma.$executeRawUnsafe(`UPDATE "User" SET id = ${newId} WHERE id = ${currentId}`)
        if (result > 0) {
            console.log(`✅ Success! User ${user.email} now has ID: ${newId}`)
        } else {
            console.error('❌ Failed to update ID. No rows affected.')
        }
        console.log('🔄 Resetting Sequence...')
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id)+1, 1), false) FROM "User";`)
    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}
main()
```

## File: scripts/check-duplicates.ts
```typescript
import fs from 'fs'
import csv from 'csv-parser'
const results: any[] = []
const emailCount: Record<string, number> = {}
fs.createReadStream('processed-users.preview.csv')
    .pipe(csv())
    .on('data', (data) => {
        results.push(data)
        const email = data.email
        emailCount[email] = (emailCount[email] || 0) + 1
    })
    .on('end', () => {
        console.log('Duplicate Emails Found:')
        for (const [email, count] of Object.entries(emailCount)) {
            if (count > 1) {
                console.log(`- ${email}: ${count} times`)
                const ids = results.filter(r => r.email === email).map(r => r.id)
                console.log(`  IDs: ${ids.join(', ')}`)
            }
        }
    })
```

## File: scripts/check-missing-ids.ts
```typescript
import fs from 'fs'
import csv from 'csv-parser'
async function checkMissingIds() {
    const ids = new Set<number>()
    const csvFilePath = 'processed-users.preview.csv'
    if (!fs.existsSync(csvFilePath)) {
        console.error(`File not found: ${csvFilePath}`)
        return
    }
    console.log(`Checking IDs in ${csvFilePath}...`)
    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
            if (row.id) {
                ids.add(parseInt(row.id))
            }
        })
        .on('end', () => {
            console.log(`Found ${ids.size} unique IDs.`)
            const missingIds: number[] = []
            for (let i = 0; i <= 838; i++) {
                if (!ids.has(i)) {
                    missingIds.push(i)
                }
            }
            if (missingIds.length > 0) {
                console.log(`❌ Missing IDs found (${missingIds.length}):`)
                console.log(missingIds.join(', '))
            } else {
                console.log('✅ No missing IDs in range 0-838.')
            }
        })
}
checkMissingIds()
```

## File: scripts/cleanup-v3-data.js
```javascript
const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
async function readCsv(filePath) {
    const results = [];
    return new Promise((resolve) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results));
    });
}
async function cleanup() {
    console.log("=== BẮT ĐẦU DỌN DẸP DỮ LIỆU CHUẨN HÓA ===");
    const users = await readCsv('User.csv');
    const emailMap = {};
    const cleanedUsers = users.map(u => {
        const email = u.email.toLowerCase().trim();
        if (emailMap[email]) {
            const firstId = parseInt(emailMap[email]);
            const currentId = parseInt(u.id);
            if (currentId > firstId) {
                const parts = u.email.split('@');
                u.email = `${parts[0]}_${u.id}@${parts[1]}`;
                console.log(`Fix duplicate email: ${email} -> ${u.email} (ID: ${u.id})`);
            }
        } else {
            emailMap[email] = u.id;
        }
        return u;
    });
    const courses = await readCsv('Course.csv');
    const courseKhoaMap = {};
    const cleanedCourses = courses.map(c => {
        const khoa = c.id_khoa.trim();
        if (courseKhoaMap[khoa]) {
            c.id_khoa = `${khoa}_${c.id}`;
            console.log(`Fix duplicate id_khoa: ${khoa} -> ${c.id_khoa}`);
        } else {
            courseKhoaMap[khoa] = true;
        }
        return c;
    });
    const userWriter = createObjectCsvWriter({
        path: 'User.csv',
        header: Object.keys(cleanedUsers[0]).map(k => ({ id: k, title: k }))
    });
    await userWriter.writeRecords(cleanedUsers);
    const courseWriter = createObjectCsvWriter({
        path: 'Course.csv',
        header: Object.keys(cleanedCourses[0]).map(k => ({ id: k, title: k }))
    });
    await courseWriter.writeRecords(cleanedCourses);
    console.log("✅ Đã cập nhật User.csv và Course.csv");
    const enrollments = await readCsv('Enrollment.csv');
    const seenPairs = new Set();
    const cleanedEnrollments = [];
    let dupCount = 0;
    enrollments.forEach(e => {
        const key = `${e.userId}-${e.courseId}`;
        if (!seenPairs.has(key)) {
            seenPairs.add(key);
            cleanedEnrollments.push(e);
        } else {
            dupCount++;
        }
    });
    const enrollWriter = createObjectCsvWriter({
        path: 'Enrollment.csv',
        header: Object.keys(cleanedEnrollments[0]).map(k => ({ id: k, title: k }))
    });
    await enrollWriter.writeRecords(cleanedEnrollments);
    console.log(`✅ Đã cập nhật Enrollment.csv (Loại bỏ ${dupCount} dòng trùng lặp)`);
}
cleanup();
```

## File: scripts/debug-data.ts
```typescript
import fs from 'fs'
import csv from 'csv-parser'
async function main() {
    const courses: any[] = []
    const registrations: any[] = []
    await new Promise((resolve) => {
        fs.createReadStream('KhoaHoc.csv')
            .pipe(csv())
            .on('data', (data) => courses.push(data))
            .on('end', resolve)
    })
    console.log('--- PHÂN TÍCH KHOAHOC.CSV ---')
    console.log(`Tổng số khóa học: ${courses.length}`)
    const courseIds = courses.map(c => c.id_khoa).filter(Boolean)
    const courseLops = courses.map(c => c.id_lop).filter(Boolean)
    console.log('Unique id_khoa in KhoaHoc:', Array.from(new Set(courseIds)))
    console.log('Unique id_lop in KhoaHoc:', Array.from(new Set(courseLops)))
    const aiCourse = courses.find(c =>
        (c.name_lop && c.name_lop.includes('AI')) ||
        (c.mo_ta_ngan && c.mo_ta_ngan.includes('AI')) ||
        (c.mo_ta_dai && c.mo_ta_dai.includes('AI'))
    )
    console.log('Tìm kiếm khóa học AI:', aiCourse ? `Tìm thấy: ${aiCourse.name_lop} (ID: ${aiCourse.id_khoa})` : 'Không thấy')
    await new Promise((resolve) => {
        fs.createReadStream('LS_DangKy.csv')
            .pipe(csv())
            .on('data', (data) => registrations.push(data))
            .on('end', resolve)
    })
    console.log('\n--- PHÂN TÍCH LS_DANGKY.CSV ---')
    console.log(`Tổng số bản ghi: ${registrations.length}`)
    const regKhoas = registrations.map(r => r.id_khoa).filter(Boolean)
    const regLops = registrations.map(r => r.id_lop).filter(Boolean)
    const uniqueRegKhoas = Array.from(new Set(regKhoas))
    console.log('Unique id_khoa in LS_DangKy:', uniqueRegKhoas)
    const missingKhoas = uniqueRegKhoas.filter(id => !courseIds.includes(id))
    console.log('\nCác id_khoa trong LS_DangKy KHÔNG có trong KhoaHoc:', missingKhoas)
    const foundInLop = missingKhoas.filter(id => courseLops.includes(id))
    console.log('Các id_khoa bị thiếu NHƯNG tìm thấy trong cột id_lop của KhoaHoc:', foundInLop)
}
main()
```

## File: scripts/export-modules.ts
```typescript
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
const OUTPUT_DIR = 'source_md';
const TEMP_CONFIG = 'repomix.temp.json';
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
} else {
    const files = fs.readdirSync(OUTPUT_DIR);
    for (const file of files) fs.unlinkSync(path.join(OUTPUT_DIR, file));
}
const modules = [
    {
        name: 'overview.md',
        include: ["package.json", "next.config.ts", "tsconfig.json", "vercel.json"],
        desc: 'Cấu hình hệ thống & Deploy'
    },
    {
        name: 'frontend-ui.md',
        include: ["components/**/*", "app/**/page.tsx", "app/**/layout.tsx", "app/**/*.tsx"],
        desc: 'Giao diện & Cấu trúc trang (Pages + Components)'
    },
    {
        name: 'backend-logic.md',
        include: ["app/actions/**/*", "app/api/**/*"],
        desc: 'Xử lý phía Server (Actions & API)'
    },
    {
        name: 'database-infra.md',
        include: ["prisma/schema.prisma", "prisma/seed.ts", "types/**/*"],
        desc: 'Cấu trúc Database & Định nghĩa kiểu dữ liệu'
    },
    {
        name: 'core-system.md',
        include: ["lib/**/*", "auth.ts", "auth.config.ts", "middleware.ts"],
        desc: 'Hệ thống lõi, Bảo mật & Helpers'
    },
    {
        name: 'scripts.md',
        include: ["scripts/**/*"],
        desc: 'Toàn bộ Scripts tự động hóa'
    }
];
async function runExport() {
    console.log('🚀 Đang đóng gói tri thức TOÀN DIỆN (Bản đảm bảo không sót code)...');
    for (const mod of modules) {
        console.log(`📦 Đang xuất Module: ${mod.desc}`);
        const config = {
            output: {
                filePath: path.join(OUTPUT_DIR, mod.name),
                style: "markdown",
                removeComments: true,
                removeEmptyLines: true,
                showLineNumbers: false
            },
            include: mod.include,
            exclude: [
                "node_modules", ".next", ".git", "public", "source_md",
                "backups", "plan_temp", "*.md", "*.png", "*.jpg", "*.csv",
                "package-lock.json", "repomix.temp.json"
            ]
        };
        fs.writeFileSync(TEMP_CONFIG, JSON.stringify(config, null, 2));
        try {
            execSync(`npx repomix --config ${TEMP_CONFIG}`, { stdio: 'inherit' });
        } catch (error) {
            console.error(`❌ Lỗi tại module ${mod.name}`);
        }
    }
    if (fs.existsSync(TEMP_CONFIG)) fs.unlinkSync(TEMP_CONFIG);
    console.log('\n✅ HOÀN TẤT! Toàn bộ mã nguồn quan trọng đã được đóng gói an toàn trong /source_md');
}
runExport();
```

## File: scripts/fill-missing-ids.ts
```typescript
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()
async function main() {
    const missingIds = [208, 228, 304, 641]
    const defaultHash = await bcrypt.hash('Brk@3773', 10)
    console.log('Filling missing IDs...')
    for (const id of missingIds) {
        try {
            const idSuffix = id.toString().padStart(3, '0')
            await prisma.user.create({
                data: {
                    id: id,
                    name: `Học viên ${id}`,
                    email: `noemail${id}@gmail.com`,
                    phone: `3773986${idSuffix}`,
                    password: defaultHash,
                    role: Role.STUDENT,
                    referrerId: null,
                    createdAt: new Date(),
                }
            })
            console.log(`✅ Created placeholder user for ID: ${id}`)
        } catch (error) {
            console.error(`❌ Failed to create ID ${id}:`, error)
        }
    }
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id)+1, 1), false) FROM "User";`)
    console.log('Done.')
}
main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
```

## File: scripts/import-csv.ts
```typescript
import fs from 'fs'
import csv from 'csv-parser'
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()
interface UserRow {
    id: string
    name: string
    email: string
    phone: string
    password?: string
    role: string
    referrerId?: string
    createdAt?: string
}
async function main() {
    const results: UserRow[] = []
    const csvFilePath = 'processed-users.preview.csv'
    if (!fs.existsSync(csvFilePath)) {
        console.error(`Error: File '${csvFilePath}' not found. Please run 'npm run process-legacy' first.`)
        process.exit(1)
    }
    console.log('Reading processed CSV file...')
    await new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', resolve)
            .on('error', reject)
    })
    console.log(`Loaded ${results.length} users.`)
    try {
        console.log('🗑️  Cleaning existing database...')
        await prisma.account.deleteMany()
        await prisma.session.deleteMany()
        await prisma.user.deleteMany()
        console.log('✅ Database cleaned.')
        console.log('🚀 Phase 1: Inserting Users (Ignoring Referrer)...')
        const defaultHash = await bcrypt.hash('Brk@3773', 10)
        const usedEmails = new Set<string>()
        let successCount = 0
        for (const row of results) {
            let email = row.email
            if (usedEmails.has(email)) {
                const originalEmail = email
                email = `duplicate_${row.id}_${email}`
                console.warn(`⚠️  Email conflict for ID ${row.id}: '${originalEmail}' -> Renamed to '${email}'`)
            }
            usedEmails.add(email)
            let passwordHash = defaultHash
            if (row.password && row.password !== 'Brk@3773') {
                passwordHash = await bcrypt.hash(row.password, 10)
            }
            await prisma.user.create({
                data: {
                    id: parseInt(row.id),
                    name: row.name,
                    email: email,
                    phone: row.phone,
                    password: passwordHash,
                    role: row.role as Role,
                    referrerId: null,
                    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
                }
            })
            process.stdout.write('.')
            successCount++
        }
        console.log(`\n✅ Phase 1 Finished: Inserted ${successCount} users.`)
        console.log('🔗 Phase 2: Linking Referrers...')
        let linkCount = 0
        const allIds = new Set(results.map(r => parseInt(r.id)))
        for (const row of results) {
            const referrerId = row.referrerId ? parseInt(row.referrerId) : null
            if (referrerId && referrerId > 0) {
                if (allIds.has(referrerId)) {
                    await prisma.user.update({
                        where: { id: parseInt(row.id) },
                        data: { referrerId: referrerId }
                    })
                    linkCount++
                } else {
                }
            }
        }
        console.log(`\n✅ Phase 2 Finished: Linked ${linkCount} referrals.`)
        console.log('🔄 Resetting Database Sequence...')
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id)+1, 1), false) FROM "User";`)
        console.log('✅ Sequence reset successful.')
    } catch (error) {
        console.error('\n❌ Import Failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}
main()
```

## File: scripts/import-lessons-from-csv.ts
```typescript
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import csv from 'csv-parser'
const prisma = new PrismaClient()
const COURSE_ID = 16
interface CSVRow {
  STT: string
  'Tên File': string
  'Link Chia Sẻ': string
}
async function main() {
  console.log('🚀 Bắt đầu import lessons từ CSV...')
  const results: CSVRow[] = []
  fs.createReadStream('Danh sach bai hoc Mentor 7.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`📊 Đọc được ${results.length} dòng từ CSV`)
      let successCount = 0
      let errorCount = 0
      for (const row of results) {
        try {
          const order = parseInt(row.STT)
          const fileName = row['Tên File']
          const rawUrl = row['Link Chia Sẻ']
          if (isNaN(order)) {
            console.log(`⚠️ STT không hợp lệ: ${row.STT}`)
            errorCount++
            continue
          }
          let embedUrl = rawUrl
          if (embedUrl.includes('/edit')) {
            embedUrl = embedUrl.replace('/edit', '/preview')
          }
          const title = fileName.replace(/^Ngay\d+-P💎\s*/, '').trim()
          // Upsert lesson
          await prisma.lesson.upsert({
            where: {
              courseId_order: {
                courseId: COURSE_ID,
                order: order
              }
            },
            update: {
              title: title,
              videoUrl: embedUrl,
              content: embedUrl
            },
            create: {
              courseId: COURSE_ID,
              order: order,
              title: title,
              videoUrl: embedUrl,
              content: embedUrl
            }
          })
          successCount++
          console.log(`✅ Lesson ${order}: ${title.substring(0, 50)}...`)
        } catch (error) {
          errorCount++
          console.error(`❌ Lỗi khi xử lý dòng:`, error)
        }
      }
      console.log(`\n🎉 Hoàn thành!`)
      console.log(`   - Thành công: ${successCount}`)
      console.log(`   - Lỗi: ${errorCount}`)
      await prisma.$disconnect()
      process.exit(0)
    })
}
main().catch(async (e) => {
  console.error('❌ Lỗi nghiêm trọng:', e)
  await prisma.$disconnect()
  process.exit(1)
})
```

## File: scripts/import-reserved-list.ts
```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const reservedList = [
    8286,
    8386,
    8668,
    8686,
    3773,
    2689,
    9139,
    1102,
    1568,
    9319
]
async function main() {
    console.log(`Start importing ${reservedList.length} reserved IDs...`)
    let count = 0
    for (const id of reservedList) {
        try {
            const existing = await prisma.reservedId.findUnique({ where: { id } })
            if (existing) {
                console.log(`- ID ${id}: Already reserved`)
            } else {
                await prisma.reservedId.create({
                    data: {
                        id,
                        note: 'VIP List (Batch Import)'
                    }
                })
                console.log(`+ ID ${id}: Success`)
                count++
            }
        } catch (error) {
            console.error(`x ID ${id}: Failed`, error)
        }
    }
    console.log(`\nImport completed! Added ${count} new reserved IDs.`)
}
main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
```

## File: scripts/import-students.ts
```typescript
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()
const oldStudents = [
    { name: 'Nguyễn Văn A', email: 'a@gmail.com', phone: '0901234567' },
    { name: 'Trần Thị B', email: 'b@gmail.com', phone: '0901234568' },
]
async function main() {
    console.log('Start importing...')
    const defaultPassword = await bcrypt.hash('123456', 10)
    for (const student of oldStudents) {
        const user = await prisma.user.create({
            data: {
                name: student.name,
                email: student.email,
                phone: student.phone,
                password: defaultPassword,
                role: Role.STUDENT,
            },
        })
        console.log(`Created user with id: ${user.id}`)
    }
    console.log('Import finished.')
}
main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect())
```

## File: scripts/import-v3-data.ts
```typescript
import fs from 'fs'
import csv from 'csv-parser'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()
async function readCsv(filePath: string): Promise<any[]> {
    const results: any[] = []
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject)
    })
}
async function main() {
    console.log('🚀 Bắt đầu quy trình nạp dữ liệu chuẩn hóa (V3 - Nâng cấp)...')
    try {
        const users = await readCsv('User.csv')
        const courses = await readCsv('Course.csv')
        const enrollments = await readCsv('Enrollment.csv')
        console.log('🗑️  Đang làm sạch Database...')
        await (prisma as any).enrollment.deleteMany()
        await (prisma as any).account.deleteMany()
        await (prisma as any).session.deleteMany()
        await (prisma as any).course.deleteMany()
        await (prisma as any).user.deleteMany()
        console.log('✅ Đã làm sạch dữ liệu cũ.')
        console.log('📚 Đang nạp danh sách Khóa học...')
        for (const row of courses) {
            await (prisma as any).course.create({
                data: {
                    id: parseInt(row.id),
                    id_khoa: row.id_khoa,
                    name_lop: row.name_lop,
                    name_khoa: row.name_khoa,
                    date_join: row.date_join,
                    status: row.status.toUpperCase() === 'TRUE',
                    mo_ta_ngan: row.mo_ta_ngan,
                    mo_ta_dai: row.mo_ta_dai,
                    link_anh_bia: row.link_anh_bia_khoa,
                    link_zalo: row.link_zalo,
                    phi_coc: parseInt(row.phi_coc) || 0,
                    stk: row.stk,
                    name_stk: row.name_stk,
                    bank_stk: row.bank_stk,
                    noidung_stk: row.noidung_stk,
                    link_qrcode: row.link_qrcode,
                    file_email: row.file_email,
                    noidung_email: row.noidung_email,
                }
            })
        }
        console.log(`✅ Đã nạp ${courses.length} khóa học.`)
        console.log('👤 Đang nạp danh sách Học viên (Kèm mã hóa mật khẩu)...')
        const userCount = users.length;
        for (let i = 0; i < users.length; i++) {
            const u = users[i];
            try {
                let passwordHash = null;
                if (u.password && u.password.trim() !== '') {
                    passwordHash = await bcrypt.hash(u.password.trim(), 10);
                }
                // Chuẩn hóa dữ liệu trước khi nạp
                const data: any = {
                    id: parseInt(u.id),
                    name: u.name || null,
                    email: u.email.trim(),
                    phone: u.phone && u.phone.trim() !== '' ? u.phone.trim() : null,
                    role: u.role || 'STUDENT',
                    password: passwordHash,
                };
                if (u.createdAt) {
                    const parts = u.createdAt.split(' ');
                    const dateParts = parts[0].split('/');
                    if (dateParts.length === 3) {
                        const d = parseInt(dateParts[0]);
                        const m = parseInt(dateParts[1]) - 1;
                        const y = parseInt(dateParts[2]);
                        if (parts[1]) {
                            const t = parts[1].split(':');
                            data.createdAt = new Date(y, m, d,
                                parseInt(t[0] || '0'),
                                parseInt(t[1] || '0'),
                                parseInt(t[2] || '0'));
                        } else {
                            data.createdAt = new Date(y, m, d);
                        }
                    } else {
                        data.createdAt = new Date(u.createdAt);
                    }
                }
                await (prisma as any).user.create({ data });
                if ((i + 1) % 100 === 0) console.log(`... Đã nạp ${i + 1}/${userCount} học viên.`);
            } catch (err: any) {
                console.error(`❌ Lỗi tại User ID ${u.id} (${u.email}):`, err);
                throw err;
            }
        }
        console.log('🔗 Đang nối quan hệ Người giới thiệu...')
        for (const u of users) {
            if (u.referrerId && u.referrerId.trim() !== '') {
                await (prisma as any).user.update({
                    where: { id: parseInt(u.id) },
                    data: { referrerId: parseInt(u.referrerId) }
                }).catch(() => { });
            }
        }
        // 5. NẠP ĐĂNG KÍ KHÓA HỌC
        console.log('📋 Đang nạp danh sách Đăng ký (Enrollments)...')
        const enrCount = enrollments.length;
        for (let i = 0; i < enrollments.length; i++) {
            const e = enrollments[i];
            try {
                const data: any = {
                    userId: parseInt(e.userId),
                    courseId: parseInt(e.courseId),
                    status: e.status || 'ACTIVE',
                    phi_coc: parseInt(e.phi_coc) || 0,
                    link_anh_coc: e.link_anh_coc || null,
                };
                if (e.startedAt && e.startedAt.trim() !== '') {
                    data.startedAt = new Date(e.startedAt);
                }
                if (e.createdAt) {
                    const parts = e.createdAt.split(' ');
                    const dateParts = parts[0].split('/');
                    if (dateParts.length === 3) {
                        const d = parseInt(dateParts[0]);
                        const m = parseInt(dateParts[1]) - 1;
                        const y = parseInt(dateParts[2]);
                        if (parts[1]) {
                            const t = parts[1].split(':');
                            data.createdAt = new Date(y, m, d, parseInt(t[0] || '0'), parseInt(t[1] || '0'), parseInt(t[2] || '0'));
                        } else {
                            data.createdAt = new Date(y, m, d);
                        }
                    } else {
                        data.createdAt = new Date(e.createdAt);
                    }
                }
                await (prisma as any).enrollment.create({ data });
                if ((i + 1) % 100 === 0) console.log(`... Đã nạp ${i + 1}/${enrCount} lượt đăng ký.`);
            } catch (err: any) {
                console.error(`❌ Lỗi tại Enrollment dòng ${i + 2} (User: ${e.userId}, Course: ${e.courseId}):`, err.message);
                if (!err.message.includes('P2002')) throw err;
            }
        }
        console.log(`✅ Đã hoàn tất nạp lượt đăng ký.`)
        console.log('🔄 Đang đồng bộ lại bộ đếm ID (Sequence)...')
        await (prisma as any).$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), (SELECT MAX(id) FROM "User"));`)
        await (prisma as any).$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Course"', 'id'), (SELECT MAX(id) FROM "Course"));`)
        await (prisma as any).$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Enrollment"', 'id'), (SELECT MAX(id) FROM "Enrollment"));`)
        console.log('🎯 HOÀN TẤT NẠP DỮ LIỆU CHUẨN HÓA V3!')
    } catch (error) {
        console.error('❌ LỖI TRONG QUÁ TRÌNH NẠP:', error)
    } finally {
        await prisma.$disconnect()
    }
}
main()
```

## File: scripts/inspect_csv.py
```python
import csv
def inspect_khoa_hoc():
    print("=== INSPECTING KHOAHOC.CSV ===")
    courses = []
    with open('KhoaHoc.csv', mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            courses.append(row)
    print(f"Total courses parsed: {len(courses)}")
    for i, c in enumerate(courses):
        print(f"{i+1}. id_khoa: [{c.get('id_khoa')}] | id_lop: [{c.get('id_lop')}] | name: {c.get('name_lop')}")
        if 'AI' in (c.get('name_lop') or ''):
            print(f"   >>> FOUND AI COURSE: {c.get('name_lop')}")
    return courses
def inspect_ls_dang_ky(courses):
    print("\n=== INSPECTING LS_DANGKY.CSV ===")
    course_ids_in_db = {c.get('id_khoa') for c in courses if c.get('id_khoa')}
    course_lops_in_db = {c.get('id_lop') for c in courses if c.get('id_lop')}
    reg_counts = {}
    total_reg = 0
    with open('LS_DangKy.csv', mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_reg += 1
            kid = row.get('id_khoa')
            lid = row.get('id_lop')
            key = kid if kid else lid
            reg_counts[key] = reg_counts.get(key, 0) + 1
    print(f"Total registrations in CSV: {total_reg}")
    print("Registration breakdown by id_khoa (or id_lop if empty):")
    for key, count in sorted(reg_counts.items(), key=lambda x: x[1], reverse=True):
        status = "MATCHED (id_khoa)" if key in course_ids_in_db else ("MATCHED (id_lop)" if key in course_lops_in_db else "MISSING")
        print(f"- {key}: {count} regs | {status}")
if __name__ == "__main__":
    courses = inspect_khoa_hoc()
    inspect_ls_dang_ky(courses)
```

## File: scripts/inspect-csv.js
```javascript
const fs = require('fs');
const csv = require('csv-parser');
async function inspect() {
    console.log("=== COMPREHENSIVE DATA INSPECTION ===");
    const courses = [];
    await new Promise((resolve) => {
        fs.createReadStream('KhoaHoc.csv')
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim(),
                mapValues: ({ value }) => value.trim()
            }))
            .on('data', (data) => courses.push(data))
            .on('end', resolve);
    });
    console.log(`\n--- KHOA HOC SUMMARY (${courses.length} entries) ---`);
    courses.forEach((c, i) => {
        console.log(`${i + 1}. id_khoa: [${c.id_khoa}] | id_lop: [${c.id_lop}] | name: ${c.name_lop}`);
    });
    const registrations = [];
    await new Promise((resolve) => {
        fs.createReadStream('LS_DangKy.csv')
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim(),
                mapValues: ({ value }) => value.trim()
            }))
            .on('data', (data) => registrations.push(data))
            .on('end', resolve);
    });
    console.log(`\n--- LS DANG KY SUMMARY (${registrations.length} entries) ---`);
    const regCounts = {};
    registrations.forEach(r => {
        const key = r.id_khoa || r.id_lop || 'UNKNOWN';
        if (!regCounts[key]) regCounts[key] = { count: 0, sample_lop: r.id_lop };
        regCounts[key].count++;
    });
    const courseIds = new Set(courses.map(c => c.id_khoa));
    const courseLops = new Set(courses.map(c => c.id_lop));
    console.log("\nBreakdown of registrations and matching status:");
    Object.entries(regCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .forEach(([key, info]) => {
            let match = "MISSING";
            if (courseIds.has(key)) match = "MATCHED (id_khoa)";
            else if (courseLops.has(key)) match = "MATCHED (id_lop)";
            else {
                const fuzzy = courses.find(c => c.id_khoa.startsWith(key) || key.startsWith(c.id_khoa));
                if (fuzzy) match = `FUZZY MATCH with ${fuzzy.id_khoa}`;
            }
            console.log(`- ${key} (Lop: ${info.sample_lop}): ${info.count} regs | ${match}`);
        });
}
inspect();
```

## File: scripts/make-admin.ts
```typescript
import { PrismaClient, Role } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    const args = process.argv.slice(2)
    const email = args[0] || 'cuongchupanh001@gmail.com'
    console.log(`Checking email: ${email}...`)
    try {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            console.error(`❌ User with email '${email}' not found.`)
            return
        }
        const updatedUser = await prisma.user.update({
            where: { email },
            data: { role: Role.ADMIN },
        })
        console.log(`✅ Success! Updated user ${updatedUser.email} (ID: ${updatedUser.id}) to ADMIN role.`)
    } catch (e) {
        console.error('Error updating user:', e)
    } finally {
        await prisma.$disconnect()
    }
}
main()
```

## File: scripts/process-legacy-users.ts
```typescript
import fs from 'fs'
import csv from 'csv-parser'
import { createObjectCsvWriter } from 'csv-writer'
import path from 'path'
function parseDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString()
    try {
        const [datePart, timePart] = dateStr.trim().split(' ')
        const [day, month, year] = datePart.split('/').map(Number)
        if (!day || !month || !year) return new Date().toISOString()
        let hour = 0, minute = 0, second = 0
        if (timePart) {
            [hour, minute, second] = timePart.split(':').map(Number)
        }
        return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0).toISOString()
    } catch (e) {
        console.warn(`Invalid date: ${dateStr}. Using current time.`)
        return new Date().toISOString()
    }
}
async function main() {
    const inputFilePath = 'User old - User.csv'
    const outputFilePath = 'processed-users.preview.csv'
    if (!fs.existsSync(inputFilePath)) {
        console.error(`File not found: ${inputFilePath}`)
        process.exit(1)
    }
    const rawRows: any[] = []
    const nameMap = new Map<string, string[]>()
    console.log('📖 Reading CSV data...')
    await new Promise((resolve, reject) => {
        fs.createReadStream(inputFilePath)
            .pipe(csv())
            .on('data', (data) => {
                rawRows.push(data)
                const name = data.name ? data.name.trim() : ''
                if (name) {
                    const normalized = name.toLowerCase()
                    if (!nameMap.has(normalized)) {
                        nameMap.set(normalized, [])
                    }
                    nameMap.get(normalized)?.push(data.id)
                }
            })
            .on('end', resolve)
            .on('error', reject)
    })
    console.log(`📊 Loaded ${rawRows.length} rows. Processing...`)
    const processedData: any[] = []
    let resolvedCount = 0
    let ambiguousCount = 0
    let notFoundCount = 0
    for (const row of rawRows) {
        const id = row.id
        let email = row.email ? row.email.trim() : ''
        if (!email) {
            email = `noemail${id}@gmail.com`
        }
        // 2. Xử lý Phone
        let phone = row.phone ? row.phone.trim() : ''
        if (!phone) {
            const idSuffix = id.toString().padStart(3, '0')
            phone = `000000${idSuffix}`
        }
        let password = row.password ? row.password.trim() : ''
        if (!password) {
            password = 'Brk@3773'
        }
        let role = row.role ? row.role.trim() : ''
        if (!role) {
            role = 'STUDENT'
        }
        let referrerId = row.referrerId ? row.referrerId.trim() : null
        if (referrerId && isNaN(parseInt(referrerId))) {
            const referrerNameNormalized = referrerId.toLowerCase()
            const foundIds = nameMap.get(referrerNameNormalized)
            if (foundIds && foundIds.length === 1) {
                referrerId = foundIds[0]
                resolvedCount++
            } else if (foundIds && foundIds.length > 1) {
                ambiguousCount++
                referrerId = null
            } else {
                notFoundCount++
                referrerId = null
            }
        } else if (referrerId && !isNaN(parseInt(referrerId))) {
        } else {
            referrerId = null
        }
        const createdAt = parseDate(row.createdAt)
        processedData.push({
            id: id,
            name: row.name,
            email: email,
            phone: phone,
            password: password,
            role: role,
            referrerId: referrerId,
            createdAt: createdAt
        })
    }
    console.log(`\n--- Summary ---`)
    console.log(`Toal Users: ${processedData.length}`)
    console.log(`Referrers Resolved (Name->ID): ${resolvedCount}`)
    console.log(`Referrers Ambiguous (Skipped):   ${ambiguousCount}`)
    console.log(`Referrers Not Found (Skipped):   ${notFoundCount}`)
    const csvWriter = createObjectCsvWriter({
        path: outputFilePath,
        header: [
            { id: 'id', title: 'id' },
            { id: 'name', title: 'name' },
            { id: 'email', title: 'email' },
            { id: 'phone', title: 'phone' },
            { id: 'password', title: 'password' },
            { id: 'role', title: 'role' },
            { id: 'referrerId', title: 'referrerId' },
            { id: 'createdAt', title: 'createdAt' },
        ]
    })
    await csvWriter.writeRecords(processedData)
    console.log(`\n✅ Saved to: ${outputFilePath}`)
}
main()
```

## File: scripts/push.ps1
```powershell
# ============================================================
#  push.ps1 - Backup + Push len GitHub
#  Usage: .\scripts\push.ps1 "Noi dung ghi chu"
# ============================================================

param (
    [string]$Message = "Cap nhat he thong BRK Academy"
)

$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path

# ── BUOC 1: BACKUP ──────────────────────────────────────────
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BackupDir = "$ProjectRoot\backups"
$ZipName = "backup_$Timestamp.zip"
$ZipPath = "$BackupDir\$ZipName"
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) "BRK_Backup_$Timestamp"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  [1/2] BACKUP DU AN" -ForegroundColor Cyan
Write-Host "  Time   : $Timestamp" -ForegroundColor Cyan
Write-Host "  Output : $ZipPath" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

$IncludePaths = @(
    "app", "components", "lib", "types", "public",
    "auth.ts", "auth.config.ts", "middleware.ts", ".env", ".env.local",
    "prisma", "scripts",
    "package.json", "next.config.ts", "tsconfig.json", "tsconfig.seed.json",
    "postcss.config.mjs", "eslint.config.mjs", "docker-compose.yml",
    "README.md", "DESIGN_SYSTEM.md"
)
$ExcludePatterns = @("*.log", "*.tsbuildinfo", ".next", "node_modules", ".git", "backups")

if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }
if (Test-Path $TempDir) { Remove-Item -Path $TempDir -Recurse -Force | Out-Null }
New-Item -ItemType Directory -Path $TempDir | Out-Null

$FilesToBackup = @()
foreach ($rel in $IncludePaths) {
    $full = Join-Path $ProjectRoot $rel
    if (Test-Path $full -PathType Leaf) {
        $FilesToBackup += $full
    }
    elseif (Test-Path $full -PathType Container) {
        foreach ($file in (Get-ChildItem -Path $full -File -Recurse)) {
            $skip = $false
            foreach ($p in $ExcludePatterns) {
                if ($file.FullName -like "*\$p\*" -or $file.Name -like $p) { $skip = $true; break }
            }
            if (-not $skip) { $FilesToBackup += $file.FullName }
        }
    }
}

foreach ($filePath in $FilesToBackup) {
    $rel = $filePath.Substring($ProjectRoot.Length).TrimStart('\', '/')
    $dest = Join-Path $TempDir $rel
    $dir = Split-Path -Parent $dest
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Copy-Item -Path $filePath -Destination $dest -Force
}

try {
    Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipPath -Force
    $sizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
    Write-Host "[OK] Backup xong: $ZipName ($sizeMB MB, $($FilesToBackup.Count) files)" -ForegroundColor Green
}
catch {
    Write-Host "[LOI] Khong the tao ZIP: $($_.Exception.Message)" -ForegroundColor Red
}

# Xoa temp va giu toi da 5 ban backup gan nhat
if (Test-Path $TempDir) { Remove-Item -Path $TempDir -Recurse -Force | Out-Null }
$old = Get-ChildItem -Path $BackupDir -Filter "backup_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 5
if ($old.Count -gt 0) {
    Write-Host "[*] Xoa $($old.Count) backup cu..." -ForegroundColor Gray
    $old | Remove-Item -Force
}

# ── BUOC 2: PUSH LEN GITHUB ─────────────────────────────────
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  [2/2] DAY CODE LEN GITHUB" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

Write-Host "> Dang gom cac thay doi..." -ForegroundColor Yellow
git add .

$status = git status --porcelain
if ($status) {
    Write-Host "> Commit: '$Message'" -ForegroundColor Yellow
    git commit -m $Message
}
else {
    Write-Host "> Khong co thay doi moi de commit." -ForegroundColor Gray
}

Write-Host "> Dang day len nhanh master..." -ForegroundColor Yellow
git push origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "  HOAN THANH! Backup + Push thanh cong" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
}
else {
    Write-Host "[LOI] Push that bai! Kiem tra ket noi hoac xung dot code." -ForegroundColor Red
}
```

## File: scripts/seed-courses.ts
```typescript
import fs from 'fs'
import csv from 'csv-parser'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
interface CourseRow {
    id_lop: string
    name_lop: string
    id_khoa: string
    name_khoa: string
    date_join: string
    status: string
    mo_ta_dai: string
    link_zalo: string
    phi_coc: string
    stk: string
    name_stk: string
    bank_stk: string
    noidung_stk: string
    link_qrcode: string
    file_email: string
    noidung_email: string
    link_anh_bia_khoa: string
    mo_ta_ngan: string
}
async function main() {
    const results: CourseRow[] = []
    const csvFilePath = 'KhoaHoc.csv'
    if (!fs.existsSync(csvFilePath)) {
        console.error(`Error: File '${csvFilePath}' not found.`)
        process.exit(1)
    }
    console.log('Reading KhoaHoc.csv...')
    await new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data: CourseRow) => results.push(data))
            .on('end', resolve)
            .on('error', reject)
    })
    console.log(`Loaded ${results.length} course entries.`)
    let successCount = 0
    for (const row of results) {
        if (!row.id_khoa) continue;
        const uniqueKey = row.id_khoa === 'AI' ? `${row.id_khoa}_${row.name_lop.substring(0, 10)}` : row.id_khoa;
        try {
            await (prisma as any).course.upsert({
                where: { id_khoa: uniqueKey },
                update: {
                    name_lop: row.name_lop,
                    name_khoa: row.name_khoa,
                    date_join: row.date_join,
                    status: row.status.toUpperCase() === 'TRUE',
                    mo_ta_ngan: row.mo_ta_ngan,
                    mo_ta_dai: row.mo_ta_dai,
                    link_anh_bia: row.link_anh_bia_khoa,
                    link_zalo: row.link_zalo,
                    phi_coc: parseInt(row.phi_coc) || 0,
                    stk: row.stk,
                    name_stk: row.name_stk,
                    bank_stk: row.bank_stk,
                    noidung_stk: row.noidung_stk,
                    link_qrcode: row.link_qrcode,
                    file_email: row.file_email,
                    noidung_email: row.noidung_email,
                },
                create: {
                    id_khoa: uniqueKey,
                    name_lop: row.name_lop,
                    name_khoa: row.name_khoa,
                    date_join: row.date_join,
                    status: row.status.toUpperCase() === 'TRUE',
                    mo_ta_ngan: row.mo_ta_ngan,
                    mo_ta_dai: row.mo_ta_dai,
                    link_anh_bia: row.link_anh_bia_khoa,
                    link_zalo: row.link_zalo,
                    phi_coc: parseInt(row.phi_coc) || 0,
                    stk: row.stk,
                    name_stk: row.name_stk,
                    bank_stk: row.bank_stk,
                    noidung_stk: row.noidung_stk,
                    link_qrcode: row.link_qrcode,
                    file_email: row.file_email,
                    noidung_email: row.noidung_email,
                }
            })
            successCount++
        } catch (error) {
            console.error(`❌ Failed to seed course ${row.id_khoa}:`, error)
        }
    }
    console.log(`✅ Seeded ${successCount} courses successfully.`)
}
main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
```

## File: scripts/seed-enrollments.ts
```typescript
import fs from 'fs'
import csv from 'csv-parser'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
interface RegRow {
    time_stamp: string
    id_hocvien: string
    name_hocvien: string
    id_lop: string
    id_khoa: string
    phi_coc: string
    trang_thai: string
}
async function main() {
    const results: RegRow[] = []
    const csvFilePath = 'LS_DangKy.csv'
    if (!fs.existsSync(csvFilePath)) {
        console.error(`Error: File '${csvFilePath}' not found.`)
        process.exit(1)
    }
    console.log('Reading LS_DangKy.csv...')
    await new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data: RegRow) => results.push(data))
            .on('end', resolve)
            .on('error', reject)
    })
    console.log(`Loaded ${results.length} registration history entries.`)
    const allCourses = await (prisma as any).course.findMany();
    let successCount = 0
    let skipCount = 0
    let errorCount = 0
    for (const row of results) {
        const studentId = parseInt(row.id_hocvien)
        if (isNaN(studentId)) {
            skipCount++
            continue
        }
        let targetIdKhoa = row.id_khoa;
        if (targetIdKhoa === '1kF') targetIdKhoa = 'LS03';
        if (targetIdKhoa === 'AF386') targetIdKhoa = 'AF01';
        if (targetIdKhoa === 'VRD') targetIdKhoa = 'AF01';
        let course = allCourses.find((c: any) => c.id_khoa === targetIdKhoa);
        if (targetIdKhoa === 'AI') {
            course = allCourses.find((c: any) => c.id_khoa.startsWith('AI'));
        }
        if (!course && row.id_lop) {
            course = allCourses.find((c: any) => c.id_khoa === row.id_lop);
        }
        if (!course) {
            skipCount++
            continue
        }
        try {
            const user = await prisma.user.findUnique({ where: { id: studentId } })
            if (!user) {
                skipCount++
                continue
            }
            await (prisma as any).enrollment.upsert({
                where: {
                    userId_courseId: {
                        userId: studentId,
                        courseId: course.id
                    }
                },
                update: {
                    status: 'ACTIVE'
                },
                create: {
                    userId: studentId,
                    courseId: course.id,
                    status: 'ACTIVE'
                }
            })
            successCount++
        } catch (error) {
            errorCount++
        }
    }
    console.log(`--- KẾT QUẢ ĐỒNG BỘ ---`)
    console.log(`✅ Thành công: ${successCount}`)
    console.log(`⏭️ Bỏ qua (không khớp/lỗi): ${skipCount}`)
    console.log(`❌ Lỗi hệ thống: ${errorCount}`)
}
main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
```

## File: scripts/seed-lessons.ts
```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    console.log('--- SEEDING LESSONS ---')
    const af06 = await (prisma as any).course.findUnique({ where: { id_khoa: 'AF06' } })
    if (af06) {
        console.log(`Found AF06 with ID: ${af06.id}`)
        for (let i = 1; i <= 21; i++) {
            await (prisma as any).lesson.upsert({
                where: { courseId_order: { courseId: af06.id, order: i } },
                update: {},
                create: {
                    id: `AF06_L${i}`,
                    courseId: af06.id,
                    order: i,
                    title: `Bài ${i}: Nội dung thực chiến ngày ${i}`,
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    content: `Nội dung hướng dẫn chi tiết cho ngày thứ ${i} của lộ trình Affiliate.`
                }
            })
        }
    }
    const nh06 = await (prisma as any).course.findUnique({ where: { id_khoa: 'NH06' } })
    if (nh06) {
        for (let i = 1; i <= 21; i++) {
            await (prisma as any).lesson.upsert({
                where: { courseId_order: { courseId: nh06.id, order: i } },
                update: {},
                create: {
                    id: `NH06_L${i}`,
                    courseId: nh06.id,
                    order: i,
                    title: `Bài ${i}: Xây dựng nhân hiệu ngày ${i}`,
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    content: `Bước thứ ${i} trong hành trình xây dựng nhân hiệu từ gốc.`
                }
            })
        }
    }
    let challengeCourse = await (prisma as any).course.findUnique({ where: { id_khoa: 'CHALLENGE_DAILY' } })
    if (!challengeCourse) {
        console.log('Creating CHALLENGE_DAILY course...')
        challengeCourse = await (prisma as any).course.create({
            data: {
                id_khoa: 'CHALLENGE_DAILY',
                name_lop: 'Thử thách rèn luyện hàng ngày',
                name_khoa: 'BRK Discipline',
                type: 'CHALLENGE',
                phi_coc: 0,
                status: true,
                mo_ta_ngan: 'Chương trình rèn luyện kỷ luật 7-90 ngày tùy chọn.',
                mo_ta_dai: 'Tham gia thử thách để rèn luyện thói quen nộp bài tâm đắc ngộ và thực hành mỗi ngày.'
            }
        })
    } else {
        await (prisma as any).course.update({
            where: { id: challengeCourse.id },
            data: { type: 'CHALLENGE' }
        })
    }
    for (let i = 1; i <= 90; i++) {
        await (prisma as any).lesson.upsert({
            where: { courseId_order: { courseId: challengeCourse.id, order: i } },
            update: { isDailyChallenge: true },
            create: {
                id: `CHALLENGE_D${i}`,
                courseId: challengeCourse.id,
                order: i,
                title: `Ngày ${i}: Rèn luyện kỷ luật`,
                isDailyChallenge: true,
                content: `Ngày thứ ${i} trong chuỗi thử thách rèn luyện. Tập trung vào Tâm đắc ngộ và Thực hành mới.`
            }
        })
    }
    console.log('✅ Seeding completed.')
}
main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
```

## File: scripts/seed-messages.ts
```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const IMAGE_URLS = [
    'https://i.postimg.cc/hQjxMRz0/1.jpg',
    'https://i.postimg.cc/hzMT9tjp/10.jpg',
    'https://i.postimg.cc/FkRcGXdV/2.jpg',
    'https://i.postimg.cc/K3zLQhkn/3.jpg',
    'https://i.postimg.cc/8f5WwgJL/4.jpg',
    'https://i.postimg.cc/m1DMVWzY/5.jpg',
    'https://i.postimg.cc/DJ5LqwZj/6.jpg',
    'https://i.postimg.cc/BLNHxn6p/7.jpg',
    'https://i.postimg.cc/k6wKxg4c/8.jpg',
    'https://i.postimg.cc/phkzDLTk/9.jpg',
]
const messages = [
    {
        content: "Tri thức là sức mạnh - Học hôm nay, thành công ngày mai",
        detail: "Học viện BRK mang đến những tri thức thực chiến giúp bạn phát triển bản thân và sự nghiệp. Mỗi ngày học tập là một bước tiến trên con đường thành công.\n\n💡 Tri thức không chỉ là kiến thức, mà là khả năng áp dụng để tạo ra giá trị thực tế.",
        imageUrl: IMAGE_URLS[0]
    },
    {
        content: "Kiến tạo giá trị từ gốc - Nền tảng vững chắc cho tương lai",
        detail: "Mỗi chúng ta đều có tiềm năng để trở thành phiên bản tốt hơn của chính mình. Điều quan trọng là bắt đầu từ hôm nay và kiên trì theo đuổi mục tiêu.\n\n🌟 Học viện BRK đồng hành cùng bạn trên hành trình phát triển bản thân và sự nghiệp.",
        imageUrl: IMAGE_URLS[1]
    },
    {
        content: "Thành công không phải đích đến, mà là hành trình không ngừng học hỏi",
        detail: "Trong cuộc sống, việc học tập không bao giờ kết thúc. Mỗi ngày mới là cơ hội để tiếp thu kiến thức mới, kỹ năng mới và trở thành người tốt hơn.\n\n📚 Hãy biến việc học thành thói quen hàng ngày.",
        imageUrl: IMAGE_URLS[2]
    },
    {
        content: "Lan tỏa giá trị - Kiến tạo thịnh vượng bền vững",
        detail: "Thành công thực sự không chỉ đo bằng vật chất, mà còn bằng giá trị mà bạn mang đến cho người khác. Hãy lan tỏa những điều tốt đẹp xung quanh bạn.\n\n🤝 Cùng BRK kiến tạo cộng đồng phát triển.",
        imageUrl: IMAGE_URLS[3]
    },
    {
        content: "Từ gốc đến ngọn - Xây dựng nền tảng vững chắc",
        detail: "Mọi thành công lớn đều bắt đầu từ những bước nhỏ. Hãy kiên nhẫn xây dựng nền tảng từ hôm nay, và bạn sẽ thấy được kết quả trong tương lai.\n\n🏗️ Nền tảng vững = Thành công bền vững.",
        imageUrl: IMAGE_URLS[4]
    },
    {
        content: "Học để thay đổi - Thay đổi để thành công",
        detail: "Tri thức là chìa khóa mở mọi cánh cửa. Hãy không ngừng học hỏi, không ngừng phát triển để nắm bắt cơ hội và tạo ra những thay đổi tích cực trong cuộc sống.\n\n🔑 Học là chìa khóa của mọi thành công.",
        imageUrl: IMAGE_URLS[5]
    },
    {
        content: "Mỗi ngày là một cơ hội để trở nên tốt hơn",
        detail: "Đừng chờ đợi ngày mai để bắt đầu. Hôm nay chính là ngày quan trọng nhất trong cuộc đời bạn. Hãy trân trọng từng khoảnh khắc và không ngừng tiến bộ.\n\n⏰ Hành động ngay hôm nay - Thành công ngày mai.",
        imageUrl: IMAGE_URLS[6]
    },
    {
        content: "Tri thức + Hành động = Thành công",
        detail: "Biết là một chuyện, làm là chuyện khác. Tri thức chỉ có giá trị khi được áp dụng vào thực tế. Hãy kết hợp học với hành để đạt được kết quả mong muốn.\n\n⚡ Học + Hành = Thành công thực sự.",
        imageUrl: IMAGE_URLS[7]
    },
    {
        content: "Học viện BRK - Nơi tri thức được lan tỏa",
        detail: "Học viện BRK là nơi tập hợp những tri thức thực chiến về kinh doanh online, nhân hiệu và AI. Chúng tôi ở đây để đồng hành cùng bạn trên hành trình lan tỏa giá trị.\n\n🌟 Kiến tạo sự thịnh vượng bền vững từ gốc.",
        imageUrl: IMAGE_URLS[8]
    },
    {
        content: "Khởi đầu hôm nay - Thành công tương lai",
        detail: "Không bao giờ là quá muộn để bắt đầu học điều mới. Mỗi bước tiến dù nhỏ cũng là tiến bộ. Hãy bắt đầu hôm nay và theo đuổi ước mơ của bạn.\n\n🚀 Hành trình nghìn dặm bắt đầu từ một bước chân.",
        imageUrl: IMAGE_URLS[9]
    }
]
async function main() {
    console.log('🚀 Bắt đầu seed messages...')
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i]
        await prisma.message.upsert({
            where: { id: i + 1 },
            update: msg,
            create: { ...msg, isActive: true }
        })
        console.log(`✅ Đã thêm: ${msg.content.substring(0, 30)}...`)
    }
    console.log('🎉 Hoàn thành seed messages!')
}
main()
    .catch(async (e) => {
        console.error('❌ Lỗi:', e)
        await prisma.$disconnect()
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
```

## File: scripts/seed-sample-lessons.ts
```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const DEFAULT_VIDEO_URL = 'https://www.youtube.com/watch?v=ASlj2zjgatc'
const LESSON_TITLES = [
    'Bài 1: Giới thiệu khóa học & Tổng quan',
    'Bài 2: Nền tảng tư duy cốt lõi',
    'Bài 3: Kỹ năng thiết yếu – Phần 1',
    'Bài 4: Kỹ năng thiết yếu – Phần 2',
    'Bài 5: Thực chiến & Ứng dụng thực tế',
    'Bài 6: Nâng cao & Bứt phá giới hạn',
    'Bài 7: Tổng kết & Bước tiếp theo',
]
async function main() {
    const courses = await (prisma as any).course.findMany({
        where: { id_khoa: { not: 'CHALLENGE_DAILY' } },
        include: { lessons: { select: { id: true } } }
    })
    let seededCount = 0
    for (const course of courses) {
        if (course.lessons.length > 0) {
            console.log(`⏭  ${course.id_khoa} – đã có ${course.lessons.length} bài, bỏ qua.`)
            continue
        }
        console.log(`✅ ${course.id_khoa} – đang tạo 7 bài học mẫu...`)
        await (prisma as any).lesson.createMany({
            data: LESSON_TITLES.map((title, index) => ({
                courseId: course.id,
                title,
                order: index + 1,
                videoUrl: DEFAULT_VIDEO_URL,
                content: `Nội dung bài ${index + 1} – ${course.name_lop}. Hãy xem video hướng dẫn và hoàn thành bài tập thực hành.`,
            }))
        })
        seededCount++
    }
    console.log(`\n🎉 Hoàn thành! Đã thêm 7 bài vào ${seededCount} khóa học.`)
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
```

## File: scripts/validate-v3-data.js
```javascript
const fs = require('fs');
const csv = require('csv-parser');
async function readCsv(filePath) {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}
async function validate() {
    console.log("=== BẮT ĐẦU KIỂM TRA DỮ LIỆU CHUẨN HÓA ===");
    try {
        const users = await readCsv('User.csv');
        const courses = await readCsv('Course.csv');
        const enrollments = await readCsv('Enrollment.csv');
        console.log(`\n1. Kiểm tra số lượng:\n- Users: ${users.length}\n- Courses: ${courses.length}\n- Enrollments: ${enrollments.length}`);
        const errors = [];
        const warnings = [];
        const userIds = new Set(users.map(u => u.id));
        const userEmails = new Set();
        const courseIds = new Set(courses.map(c => c.id));
        const courseKhoas = new Set(courses.map(c => c.id_khoa));
        const enrollmentPairs = new Set();
        users.forEach(u => {
            if (!u.id) errors.push(`User thiếu ID: ${JSON.stringify(u)}`);
            if (userEmails.has(u.email)) errors.push(`User trùng Email: ${u.email}`);
            userEmails.add(u.email);
        });
        courses.forEach(c => {
            if (!c.id) errors.push(`Course thiếu ID: ${c.id_khoa}`);
            if (courseKhoas.has(c.id_khoa) && courses.filter(x => x.id_khoa === c.id_khoa).length > 1) {
            }
        });
        enrollments.forEach((e, index) => {
            const rowNum = index + 2;
            if (!userIds.has(e.userId)) {
                errors.push(`[Dòng ${rowNum}] Enrollment có userId (${e.userId}) không tồn tại trong User.csv`);
            }
            if (!courseIds.has(e.courseId)) {
                errors.push(`[Dòng ${rowNum}] Enrollment có courseId (${e.courseId}) không tồn tại trong Course.csv`);
            }
            const pair = `${e.userId}-${e.courseId}`;
            if (enrollmentPairs.has(pair)) {
                warnings.push(`[Dòng ${rowNum}] Trùng lặp Enrollment cho User ${e.userId} và Course ${e.courseId} (Sẽ bị bỏ qua khi nạp)`);
            }
            enrollmentPairs.add(pair);
            if (!['ACTIVE', 'PENDING'].includes(e.status)) {
                warnings.push(`[Dòng ${rowNum}] Trạng thái status '${e.status}' không chuẩn (Nên là ACTIVE hoặc PENDING)`);
            }
        });
        console.log("\n2. Kết quả kiểm tra lỗi:");
        if (errors.length === 0) {
            console.log("✅ KHÔNG có lỗi nghiêm trọng (Ràng buộc dữ liệu tốt)");
        } else {
            console.log(`❌ Có ${errors.length} lỗi cần xử lý:`);
            errors.slice(0, 10).forEach(err => console.log(` - ${err}`));
            if (errors.length > 10) console.log("   ... và nhiều lỗi khác");
        }
        console.log("\n3. Cảnh báo (Nên lưu ý):");
        if (warnings.length === 0) {
            console.log("✅ Không có cảnh báo.");
        } else {
            console.log(`⚠️ Có ${warnings.length} cảnh báo:`);
            warnings.slice(0, 5).forEach(w => console.log(` - ${w}`));
        }
    } catch (err) {
        console.error("❌ Lỗi khi đọc file:", err.message);
    }
}
validate();
```

## File: scripts/auto-verify-payment.js
```javascript
require('dotenv').config()
const { google } = require('googleapis')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
function extractTextFromHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
function parseSacombankEmail(htmlContent) {
  const text = extractTextFromHtml(htmlContent)
  const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i)
  const description = contentMatch ? contentMatch[1].trim() : ''
  // Format: SDT 123456 HV 8286 COC LS03
  const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i)
  const userIdMatch = description.match(/HV[\s\._]*(\d+)/i)
  const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i)
  // Tìm số tiền - format: 386,868 VND
  const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i)
  let amount = 0
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '')
    amount = parseInt(amountStr) || 0
  }
  return {
    phone: phoneMatch ? phoneMatch[1] : null,
    userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
    courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
    amount: amount,
    content: description,
    rawText: text
  }
}
async function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http:
  )
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  return google.gmail({ version: 'v1', auth: oAuth2Client })
}
async function processBankEmails() {
  const gmail = await getGmailClient()
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'sacombank thong bao giao dich is:unread',
    maxResults: 20
  })
  const messages = response.data.messages || []
  if (messages.length === 0) return;
  console.log(`📧 Phát hiện ${messages.length} email Sacombank mới chưa đọc...`)
  const pendingEnrollments = await prisma.enrollment.findMany({
    where: { status: 'PENDING' },
    include: {
      course: { select: { id_khoa: true, phi_coc: true } },
      user: { select: { name: true, phone: true } }
    }
  })
  if (pendingEnrollments.length === 0) {
      console.log('📝 Không có đăng ký nào đang chờ thanh toán.')
      return;
  }
  for (const msg of messages) {
    const message = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' })
    let body = ''
    if (message.data.payload?.body?.data) {
      body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8')
    } else if (message.data.payload?.parts) {
      for (const part of message.data.payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8')
          break
        }
      }
    }
    const parsed = parseSacombankEmail(body)
    for (const enrollment of pendingEnrollments) {
      const userPhone = enrollment.user.phone?.replace(/\D/g, '') || ''
      const emailPhone = parsed.phone || ''
      const userIdMatch = parsed.userId && parsed.userId === enrollment.userId
      const phoneMatch = userPhone && emailPhone && userPhone.includes(emailPhone)
      const courseCodeMatch = parsed.courseCode && enrollment.course.id_khoa.toUpperCase().includes(parsed.courseCode)
      const amountMatch = parsed.amount >= enrollment.course.phi_coc
      if (((parsed.userId ? userIdMatch : phoneMatch) && courseCodeMatch && amountMatch)) {
        console.log(`✅ Khớp! Đang kích hoạt HV: ${enrollment.user.name} - Khóa: ${enrollment.course.id_khoa}`)
        await prisma.payment.update({
          where: { enrollmentId: enrollment.id },
          data: {
            amount: parsed.amount, phone: parsed.phone, content: parsed.content,
            bankName: 'Sacombank', status: 'VERIFIED', verifiedAt: new Date(), verifyMethod: 'AUTO_EMAIL'
          }
        })
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: 'ACTIVE' }
        })
        await gmail.users.messages.modify({
          userId: 'me', id: msg.id,
          requestBody: { removeLabelIds: ['UNREAD'] }
        })
      }
    }
  }
}
processBankEmails()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect())
```

## File: scripts/auto-verify-payment.ts
```typescript
require('dotenv').config()
const { google } = require('googleapis')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
function parseSacombankEmail(htmlContent: string) {
  const text = extractTextFromHtml(htmlContent)
  const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i)
  const description = contentMatch ? contentMatch[1].trim() : ''
  // Format mới: SDT 123456 HV 8286 COC LS03
  // Tìm 6 số điện thoại cuối sau "SDT" (linh hoạt khoảng trống/kí tự đặc biệt)
  const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i)
  // Tìm mã học viên sau "HV"
  const userIdMatch = description.match(/HV[\s\._]*(\d+)/i)
  // Tìm mã khóa học sau "COC"
  const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i)
  // Tìm số tiền - format: 386,868 VND
  const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i)
  let amount = 0
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '')
    amount = parseInt(amountStr) || 0
  }
  return {
    phone: phoneMatch ? phoneMatch[1] : null,
    userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
    courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
    amount: amount,
    content: description,
    rawText: text
  }
}
async function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http:
  )
  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  })
  return google.gmail({ version: 'v1', auth: oAuth2Client })
}
async function processBankEmails() {
  console.log('🚀 Bắt đầu kiểm tra email ngân hàng...')
  const gmail = await getGmailClient()
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'sacombank thong bao giao dich',
    maxResults: 10
  })
  const messages = response.data.messages || []
  console.log(`📧 Tìm thấy ${messages.length} email Sacombank`)
  if (messages.length === 0) {
    console.log('✅ Không có email mới')
    return
  }
  const pendingEnrollments = await prisma.enrollment.findMany({
    where: { status: 'PENDING' },
    include: {
      course: {
        select: { id_khoa: true, phi_coc: true, noidung_stk: true, name_lop: true }
      },
      user: {
        select: { id: true, phone: true, name: true, email: true }
      }
    }
  })
  console.log(`📝 Có ${pendingEnrollments.length} enrollment chờ xác nhận`)
  for (const msg of messages) {
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full'
    })
    let body = ''
    if (message.data.payload?.body?.data) {
      body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8')
    } else if (message.data.payload?.parts) {
      for (const part of message.data.payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8')
          break
        }
      }
    }
    const parsed = parseSacombankEmail(body)
    console.log(`\n📱 Parsed: SĐT=${parsed.phone}, Tiền=${parsed.amount}, ND=${parsed.content}`)
    for (const enrollment of pendingEnrollments) {
      const userPhone = enrollment.user.phone?.replace(/\D/g, '') || ''
      const emailPhone = parsed.phone || ''
      // Khớp theo: userId + phone + courseCode
      const userIdMatch = parsed.userId && parsed.userId === enrollment.userId
      const phoneMatch = userPhone && emailPhone && userPhone.includes(emailPhone)
      const courseCodeMatch = parsed.courseCode && enrollment.course.id_khoa.toUpperCase().includes(parsed.courseCode)
      const amountMatch = parsed.amount >= enrollment.course.phi_coc
      // Cần khớp: (userId HOẶC phone) VÀ courseCode VÀ amount
      const matched = ((parsed.userId ? userIdMatch : phoneMatch) && courseCodeMatch && amountMatch)
      if (matched) {
        console.log(`✅ Tìm thấy khớp! Enrollment #${enrollment.id}`)
        console.log(`   User: ${enrollment.user.name}, Phone: ${enrollment.user.phone}, UserID: ${enrollment.userId}`)
        console.log(`   Course: ${enrollment.course.id_khoa}, Phi: ${enrollment.course.phi_coc}`)
        console.log(`   Parsed: phone=${parsed.phone}, userId=${parsed.userId}, courseCode=${parsed.courseCode}, amount=${parsed.amount}`)
        // Cập nhật payment và enrollment
        await prisma.payment.update({
          where: { enrollmentId: enrollment.id },
          data: {
            amount: parsed.amount,
            phone: parsed.phone,
            content: parsed.content,
            bankName: 'Sacombank',
            status: 'VERIFIED',
            verifiedAt: new Date(),
            verifyMethod: 'AUTO_EMAIL'
          }
        })
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: 'ACTIVE' }
        })
        console.log(`   ✅ Đã kích hoạt khóa học!`)
        await gmail.users.messages.modify({
          userId: 'me',
          id: msg.id,
          requestBody: { removeLabelIds: ['UNREAD'] }
        })
      }
    }
  }
  await prisma.$disconnect()
}
processBankEmails().catch(console.error)
```

## File: scripts/check-gmail-info.js
```javascript
require('dotenv').config()
const { google } = require('googleapis')
async function checkProfile() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  )
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })
  try {
    const profile = await gmail.users.getProfile({ userId: 'me' })
    console.log('\n--- THÔNG TIN HỆ THỐNG ---')
    console.log(`📧 Đang kết nối Gmail: ${profile.data.emailAddress}`)
    console.log(`📦 Tổng số tin nhắn: ${profile.data.messagesTotal}`)
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'sacombank thong bao giao dich is:unread',
      maxResults: 10
    })
    const messages = response.data.messages || []
    console.log(`✉️ Số email Sacombank chưa đọc (unread): ${messages.length}`)
    if (messages.length > 0) {
        console.log('\n--- DANH SÁCH EMAIL CHỜ XỬ LÝ ---')
        for (const msg of messages) {
            const message = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata' })
            const subject = message.data.payload.headers.find(h => h.name === 'Subject')?.value
            const date = message.data.payload.headers.find(h => h.name === 'Date')?.value
            console.log(`- ID: ${msg.id} | Ngày: ${date} | Tiêu đề: ${subject}`)
        }
    } else {
        console.log('\n✅ Hiện tại không có email Sacombank nào chưa đọc.')
    }
    console.log('--------------------------')
  } catch (error) {
    console.error('❌ Lỗi kiểm tra:', error.message)
  }
}
checkProfile()
```

## File: scripts/check-latest-sacombank.js
```javascript
require('dotenv').config()
const { google } = require('googleapis')
function extractTextFromHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
function parseSacombankEmail(htmlContent) {
  const text = extractTextFromHtml(htmlContent)
  const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i)
  const description = contentMatch ? contentMatch[1].trim() : ''
  // Format mới: SDT 123456 HV 8286 COC LS03
  const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i)
  const userIdMatch = description.match(/HV[\s\._]*(\d+)/i)
  const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i)
  // Tìm số tiền - format: 386,868 VND
  const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i)
  let amount = 0
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '')
    amount = parseInt(amountStr) || 0
  }
  return {
    phone: phoneMatch ? phoneMatch[1] : null,
    userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
    courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
    amount: amount,
    content: description,
    rawText: text
  }
}
async function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http:
  )
  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  })
  return google.gmail({ version: 'v1', auth: oAuth2Client })
}
async function checkLatestEmail() {
  console.log('🔍 Đang kiểm tra email Sacombank mới nhất...')
  const gmail = await getGmailClient()
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'sacombank thong bao giao dịch',
    maxResults: 1
  })
  const messages = response.data.messages || []
  if (messages.length === 0) {
    console.log('❌ Không tìm thấy email Sacombank nào.')
    return
  }
  const msgId = messages[0].id
  const message = await gmail.users.messages.get({
    userId: 'me',
    id: msgId,
    format: 'full'
  })
  let body = ''
  if (message.data.payload?.body?.data) {
    body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8')
  } else if (message.data.payload?.parts) {
    for (const part of message.data.payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8')
        break
      }
    }
  }
  const parsed = parseSacombankEmail(body)
  console.log('\n--- KẾT QUẢ TRÍCH XUẤT ---')
  console.log(`Email ID: ${msgId}`)
  console.log(`Nội dung chuyển khoản (Gốc): ${parsed.content}`)
  console.log(`SĐT (6 số cuối): ${parsed.phone || 'Không tìm thấy'}`)
  console.log(`Mã học viên (HV): ${parsed.userId || 'Không tìm thấy'}`)
  console.log(`Mã khóa học (COC): ${parsed.courseCode || 'Không tìm thấy'}`)
  console.log(`Số tiền: ${parsed.amount.toLocaleString()} VND`)
  console.log('--------------------------')
}
checkLatestEmail().catch(console.error)
```

## File: scripts/check-latest-sacombank.ts
```typescript
require('dotenv').config()
const { google } = require('googleapis')
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
function parseSacombankEmail(htmlContent: string) {
  const text = extractTextFromHtml(htmlContent)
  const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i)
  const description = contentMatch ? contentMatch[1].trim() : ''
  // Format mới: SDT 123456 HV 8286 COC LS03
  const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i)
  const userIdMatch = description.match(/HV[\s\._]*(\d+)/i)
  const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i)
  // Tìm số tiền - format: 386,868 VND
  const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i)
  let amount = 0
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '')
    amount = parseInt(amountStr) || 0
  }
  return {
    phone: phoneMatch ? phoneMatch[1] : null,
    userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
    courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
    amount: amount,
    content: description,
    rawText: text
  }
}
async function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http:
  )
  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  })
  return google.gmail({ version: 'v1', auth: oAuth2Client })
}
async function checkLatestEmail() {
  console.log('🔍 Đang kiểm tra email Sacombank mới nhất...')
  const gmail = await getGmailClient()
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'sacombank thong bao giao dich',
    maxResults: 1
  })
  const messages = response.data.messages || []
  if (messages.length === 0) {
    console.log('❌ Không tìm thấy email Sacombank nào.')
    return
  }
  const msgId = messages[0].id
  const message = await gmail.users.messages.get({
    userId: 'me',
    id: msgId,
    format: 'full'
  })
  let body = ''
  if (message.data.payload?.body?.data) {
    body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8')
  } else if (message.data.payload?.parts) {
    for (const part of message.data.payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8')
        break
      }
    }
  }
  const parsed = parseSacombankEmail(body)
  console.log('\n--- KẾT QUẢ TRÍCH XUẤT ---')
  console.log(`Email ID: ${msgId}`)
  console.log(`Nội dung chuyển khoản (Gốc): ${parsed.content}`)
  console.log(`SĐT (6 số cuối): ${parsed.phone || 'Không tìm thấy'}`)
  console.log(`Mã học viên (HV): ${parsed.userId || 'Không tìm thấy'}`)
  console.log(`Mã khóa học (COC): ${parsed.courseCode || 'Không tìm thấy'}`)
  console.log(`Số tiền: ${parsed.amount.toLocaleString()} VND`)
  console.log('--------------------------')
}
checkLatestEmail().catch(console.error)
```

## File: scripts/debug-enrollment.js
```javascript
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function debugEnrollment() {
  const userId = 1;
  const courseCode = 'CB';
  console.log(`🔍 Đang kiểm tra Enrollment cho User ID: ${userId}, Course Code: ${courseCode}...`)
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: userId,
      course: {
        id_khoa: courseCode
      }
    },
    include: {
      course: true,
      user: true,
      payment: true
    }
  })
  if (enrollments.length === 0) {
    console.log('❌ Không tìm thấy Enrollment nào khớp.')
    return
  }
  enrollments.forEach(e => {
    console.log('\n--- THÔNG TIN ENROLLMENT ---')
    console.log(`ID: ${e.id}`)
    console.log(`Trạng thái: ${e.status}`)
    console.log(`Học viên: ${e.user.name} (Phone: ${e.user.phone})`)
    console.log(`Khóa học: ${e.course.name_lop} (${e.course.id_khoa})`)
    console.log(`Phí cọc yêu cầu: ${e.course.phi_coc.toLocaleString()} VND`)
    console.log(`Thanh toán đi kèm: ${e.payment ? e.payment.status : 'Chưa có payment'}`)
    if (e.payment) {
        console.log(`   Số tiền đã nhận: ${e.payment.amount.toLocaleString()} VND`)
    }
    console.log('----------------------------')
  })
}
debugEnrollment()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
```

## File: scripts/debug-survey-data.js
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function checkFlowAndUser() {
  console.log('🔍 ĐANG KIỂM TRA HỆ THỐNG...');
  const activeSurvey = await prisma.survey.findFirst({ where: { isActive: true } });
  if (!activeSurvey) {
    console.log('⚠️ CẢNH BÁO: Không có bài khảo sát nào đang Active!');
  } else {
    console.log(`✅ Bài khảo sát đang chạy: "${activeSurvey.name}"`);
    const flow = activeSurvey.flow;
    console.log(`📊 Sơ đồ có: ${flow.nodes?.length} nodes, ${flow.edges?.length} edges`);
    const courseNodes = flow.nodes?.filter(n => n.type === 'courseNode');
    console.log(`🎓 Số lượng khóa học có trong sơ đồ: ${courseNodes?.length}`);
  }
  const lastUser = await prisma.user.findFirst({
    where: { NOT: { customPath: null } },
    orderBy: { updatedAt: 'desc' },
    select: { name: true, customPath: true, goal: true, surveyResults: true }
  });
  if (lastUser) {
    console.log('👤 NGƯỜI DÙNG MỚI NHẤT CÓ LỘ TRÌNH:');
    console.log(`- Tên: ${lastUser.name}`);
    console.log(`- Lộ trình (ID): ${JSON.stringify(lastUser.customPath)}`);
    console.log(`- Mục tiêu: ${lastUser.goal}`);
  } else {
    console.log('❌ Chưa có User nào lưu được lộ trình trong Database.');
  }
}
checkFlowAndUser()
  .finally(() => prisma.$disconnect());
```

## File: scripts/generate-code-history.ts
```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = path.join(PROJECT_ROOT);
function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
}
function getProjectStructure(): string {
  const ignoreDirs = ['node_modules', '.next', '.git', '.agent', 'test-github-run', '__pycache__'];
  const structure: string[] = [];
  function walkDir(dir: string, prefix: string = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const dirs: string[] = [];
    const files: string[] = [];
    for (const item of items) {
      const relativePath = path.relative(PROJECT_ROOT, path.join(dir, item.name));
      if (ignoreDirs.includes(item.name)) continue;
      if (item.isDirectory()) {
        dirs.push(item.name);
      } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx') || item.name.endsWith('.json') || item.name.endsWith('.prisma') || item.name.endsWith('.css') || item.name.endsWith('.md') || item.name.match(/^(next\.config|tsconfig|postcss|tailwind)/i))) {
        files.push(item.name);
      }
    }
    for (const d of dirs) {
      structure.push(`${prefix}├── ${d}/`);
      walkDir(path.join(dir, d), prefix + '│   ');
    }
    for (let i = 0; i < files.length; i++) {
      const isLast = i === files.length - 1 && dirs.length === 0;
      structure.push(`${prefix}${isLast ? '└── ' : '├── '}${files[i]}`);
    }
  }
  structure.push('HocVien-BRK/');
  walkDir(PROJECT_ROOT);
  return structure.join('\n');
}
function getAllSourceFiles(): { filePath: string; relativePath: string; category: string }[] {
  const files: { filePath: string; relativePath: string; category: string }[] = [];
  const seen = new Set<string>();
  const extensions = ['.ts', '.tsx', '.json', '.prisma'];
  function walkDir(dir: string) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relativePath = path.relative(PROJECT_ROOT, fullPath).replace(/\\/g, '/');
        if (relativePath.includes('node_modules') ||
            relativePath.includes('.next') ||
            relativePath.includes('test-github-run') ||
            relativePath.includes('generate-code-history') ||
            relativePath.includes('.agent') ||
            relativePath.startsWith('.')) continue;
        if (seen.has(relativePath)) continue;
        if (item.isDirectory()) {
          walkDir(fullPath);
        } else if (item.isFile()) {
          const ext = path.extname(item.name);
          if (!extensions.includes(ext) && !item.name.match(/^(next\.config|tsconfig|postcss|tailwind)/i)) continue;
          seen.add(relativePath);
          let category = 'other';
          if (relativePath.startsWith('app/actions/')) category = 'actions';
          else if (relativePath.startsWith('app/api/')) category = 'api';
          else if (relativePath.startsWith('app/admin/')) category = 'admin';
          else if (relativePath.startsWith('app/courses/')) category = 'courses';
          else if (relativePath.startsWith('components/')) category = 'components';
          else if (relativePath.startsWith('lib/')) category = 'lib';
          else if (relativePath.startsWith('prisma/')) category = 'prisma';
          else if (relativePath.startsWith('scripts/')) category = 'scripts';
          else if (relativePath.startsWith('types/')) category = 'types';
          else if (relativePath === 'auth.ts' || relativePath === 'auth.config.ts' || relativePath === 'middleware.ts') category = 'auth';
          else if (relativePath.includes('package.json') || relativePath.includes('tsconfig') || relativePath.includes('next.config')) category = 'config';
          files.push({
            filePath: fullPath,
            relativePath,
            category
          });
        }
      }
    } catch (e) {
    }
  }
  walkDir(PROJECT_ROOT);
  return files;
}
function readFileContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}
function generateMarkdown(): string {
  const timestamp = getTimestamp();
  const now = new Date().toISOString().slice(0, 10);
  let md = `# CODE_HISTORY_${timestamp}.md
================================================================================
PHIÊN BẢN: ${timestamp}
NGÀY TẠO: ${now}
MÔ TẢ: Tự động generate toàn bộ code dự án BRK Academy
================================================================================
`;
  md += `## CẤU TRÚC DỰ ÁN
\`\`\`
${getProjectStructure()}
\`\`\`
`;
  const files = getAllSourceFiles();
  const categoryOrder = ['auth', 'config', 'prisma', 'lib', 'actions', 'api', 'components', 'admin', 'courses', 'scripts', 'types', 'other'];
  for (const category of categoryOrder) {
    const categoryFiles = files.filter(f => f.category === category);
    if (categoryFiles.length === 0) continue;
    md += `## ${category.toUpperCase()} FILES\n\n`;
    for (const file of categoryFiles) {
      const content = readFileContent(file.filePath);
      if (!content) continue;
      const ext = path.extname(file.relativePath);
      const lang = ext === '.tsx' ? 'tsx' : ext === '.prisma' ? 'prisma' : 'ts';
      md += `### ${file.relativePath}\n\n`;
      md += `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
    }
  }
  return md;
}
function main() {
  console.log('🔄 Đang generate CODE_HISTORY...');
  const timestamp = getTimestamp();
  const outputFile = path.join(OUTPUT_DIR, `CODE_HISTORY_${timestamp}.md`);
  const content = generateMarkdown();
  fs.writeFileSync(outputFile, content, 'utf-8');
  const stats = fs.statSync(outputFile);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`✅ Đã tạo file: ${outputFile}`);
  console.log(`📊 Kích thước: ${sizeKB} KB`);
}
main();
```

## File: scripts/hash.js
```javascript
const bcrypt = require('bcryptjs');
bcrypt.hash('Cuong#3773', 10).then(console.log);
```

## File: scripts/migrate-to-flow.ts
```typescript
import { surveyQuestions } from '../lib/survey-data';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const ROADMAP_FLOW_KEY = 'ZERO_TO_HERO_FLOW';
async function migrate() {
  console.log('🚀 Bắt đầu chuyển đổi dữ liệu khảo sát cũ sang sơ đồ Mindmap...');
  const nodes: any[] = [];
  const edges: any[] = [];
  let x = 100;
  let y = 100;
  const spacingX = 300;
  const spacingY = 150;
  Object.keys(surveyQuestions).forEach((qId, qIndex) => {
    const q = (surveyQuestions as any)[qId];
    const questionNodeId = qId;
    nodes.push({
      id: questionNodeId,
      type: 'questionNode',
      position: { x: x + qIndex * spacingX, y: y },
      data: { label: q.question, type: q.type }
    });
    if (q.options) {
      q.options.forEach((opt: any, optIndex: number) => {
        const optionNodeId = `opt_${qId}_${opt.id}`;
        nodes.push({
          id: optionNodeId,
          type: 'optionNode',
          position: { x: x + qIndex * spacingX + (optIndex * 100 - 50), y: y + spacingY },
          data: { label: opt.label }
        });
        edges.push({
          id: `e_${questionNodeId}_${optionNodeId}`,
          source: questionNodeId,
          target: optionNodeId
        });
        if (opt.nextQuestionId && opt.nextQuestionId !== 'done') {
            edges.push({
              id: `e_${optionNodeId}_${opt.nextQuestionId}`,
              source: optionNodeId,
              target: opt.nextQuestionId
            });
        }
        if (opt.isAdvice) {
            const adviceNodeId = `advice_${qId}_${opt.id}`;
            nodes.push({
                id: adviceNodeId,
                type: 'adviceNode',
                position: { x: x + qIndex * spacingX, y: y + spacingY * 2 },
                data: { label: 'https://youtube.com' }
            });
            edges.push({
                id: `e_${optionNodeId}_${adviceNodeId}`,
                source: optionNodeId,
                target: adviceNodeId
            });
        }
      });
    }
  });
  const flow = { nodes, edges };
  await prisma.systemConfig.upsert({
    where: { key: ROADMAP_FLOW_KEY },
    update: { value: flow },
    create: {
      key: ROADMAP_FLOW_KEY,
      value: flow
    }
  });
  console.log('✅ Đã chuyển đổi thành công! Hãy vào trang Admin > Lộ trình để kiểm tra.');
}
migrate()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
```

## File: scripts/payment-watcher.js
```javascript
require('dotenv').config()
const { exec } = require('child_process');
const CHECK_INTERVAL = 3 * 60 * 1000;
function runVerification() {
    const now = new Date().toLocaleString();
    console.log(`[${now}] 🔍 Đang quét email giao dịch mới...`);
    exec('node scripts/auto-verify-payment.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`[${now}] ❌ Lỗi khi chạy xác thực: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`[${now}] ⚠️ Cảnh báo: ${stderr}`);
        }
        console.log(`[${now}] ✅ Kết quả: \n${stdout}`);
    });
}
runVerification();
setInterval(runVerification, CHECK_INTERVAL);
console.log('🚀 Payment Watcher đã khởi động!');
console.log(`Hệ thống sẽ tự động quét Gmail mỗi ${CHECK_INTERVAL / 60000} phút.`);
console.log('Nhấn Ctrl+C để dừng.');
```

## File: scripts/seed-initial-survey.js
```javascript
const { PrismaClient } = require('@prisma/client');
const { surveyQuestions } = require('../lib/survey-data');
const prisma = new PrismaClient();
async function seedInitialSurvey() {
  console.log('🚀 Bắt đầu chuyển đổi dữ liệu khảo sát tĩnh sang Database...');
  const nodes = [];
  const edges = [];
  let x = 100;
  let y = 100;
  const spacingX = 450;
  const spacingY = 200;
  const questions = surveyQuestions;
  const questionKeys = Object.keys(questions);
  questionKeys.forEach((qId, qIndex) => {
    const q = questions[qId];
    nodes.push({
      id: qId,
      type: 'questionNode',
      position: { x: x + qIndex * spacingX, y: y },
      data: { label: q.question, type: q.type }
    });
    if (Array.isArray(q.options)) {
      q.options.forEach((opt, optIndex) => {
        const optionNodeId = `opt_${qId}_${opt.id}`;
        nodes.push({
          id: optionNodeId,
          type: 'optionNode',
          position: { x: x + qIndex * spacingX + (optIndex * 180 - 150), y: y + spacingY },
          data: { label: opt.label }
        });
        edges.push({
          id: `e_${qId}_${optionNodeId}`,
          source: qId,
          target: optionNodeId
        });
        if (opt.nextQuestionId && opt.nextQuestionId !== 'done') {
            edges.push({
              id: `e_${optionNodeId}_${opt.nextQuestionId}`,
              source: optionNodeId,
              target: opt.nextQuestionId
            });
        }
        if (opt.isAdvice) {
            const adviceNodeId = `advice_${qId}_${opt.id}`;
            nodes.push({
                id: adviceNodeId,
                type: 'adviceNode',
                position: { x: x + qIndex * spacingX + (optIndex * 180 - 150), y: y + spacingY * 2 },
                data: { label: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
            });
            edges.push({
                id: `e_${optionNodeId}_${adviceNodeId}`,
                source: optionNodeId,
                target: adviceNodeId
            });
        }
      });
    }
  });
  try {
    const survey = await prisma.survey.create({
      data: {
        name: 'Lộ trình Zero 2 Hero (Bản gốc)',
        description: 'Bài khảo sát mặc định được chuyển đổi từ mã nguồn tĩnh.',
        flow: { nodes, edges },
        isActive: true
      }
    });
    console.log(`✅ Thành công! Đã tạo bài khảo sát với ID: ${survey.id}`);
    console.log('💡 Bây giờ học viên sẽ thực hiện khảo sát dựa trên dữ liệu trong Database.');
  } catch (error) {
    console.error('❌ Lỗi khi lưu vào Database:', error.message);
  }
}
seedInitialSurvey()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
```

## File: scripts/setup-gmail-watch.js
```javascript
require('dotenv').config()
const { google } = require('googleapis')
async function setupWatch() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  )
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })
  try {
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/${process.env.GCP_PROJECT_ID}/topics/gmail-notifications`,
        labelIds: ['INBOX'],
      },
    })
    console.log('✅ Chế độ Gmail Watch đã được kích hoạt thành công!')
    console.log('Thông tin phản hồi:', response.data)
  } catch (error) {
    console.error('❌ Lỗi khi thiết lập Watch:', error)
  }
}
setupWatch()
```

## File: scripts/sync-to-drive.ts
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';
require('dotenv').config();
const FOLDER_ID = '1XudNfFRNBM3t3Ty0uSuG2MVELTE7J2Dm';
const FILE_NAME = 'project-source.md';
const FILE_PATH = path.join(process.cwd(), FILE_NAME);
async function getDriveClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  );
  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
  return google.drive({ version: 'v3', auth: oAuth2Client });
}
async function syncToDrive() {
  console.log('🚀 Đang chuẩn bị đồng bộ lên Google Drive...');
  if (!fs.existsSync(FILE_PATH)) {
    console.error(`❌ Không tìm thấy file ${FILE_NAME}. Hãy chạy 'npx repomix' trước.`);
    return;
  }
  try {
    const drive = await getDriveClient();
    const response = await drive.files.list({
      q: `name = '${FILE_NAME}' and '${FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    const existingFile = response.data.files?.[0];
    const media = {
      mimeType: 'text/markdown',
      body: fs.createReadStream(FILE_PATH),
    };
    if (existingFile && existingFile.id) {
      console.log(`📝 Đang cập nhật file hiện tại (ID: ${existingFile.id})...`);
      await drive.files.update({
        fileId: existingFile.id as string,
        media: media,
      });
      console.log('✅ Cập nhật thành công!');
    } else {
      console.log('🆕 Đang tạo file mới trên Drive...');
      await drive.files.create({
        requestBody: {
          name: FILE_NAME,
          parents: [FOLDER_ID],
        },
        media: media,
      } as any);
      console.log('✅ Tải lên file mới thành công!');
    }
  } catch (error: any) {
    console.error('❌ Lỗi khi đồng bộ lên Drive:', error.message);
    if (error.message.includes('invalid_grant')) {
      console.error('💡 Gợi ý: Refresh token có thể đã hết hạn hoặc sai.');
    }
  }
}
syncToDrive();
```

## File: scripts/test-gmail.ts
```typescript
require('dotenv').config()
const { google } = require('googleapis')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  )
  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  })
  return google.gmail({ version: 'v1', auth: oAuth2Client })
}
async function testGmail() {
  console.log('🔍 Debug: Kiểm tra kết nối Gmail...')
  console.log('Email:', process.env.GMAIL_EMAIL)
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
    console.log('⚠️  Chưa cấu hình Gmail credentials')
    return
  }
  try {
    const gmail = await getGmailClient()
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20
    })
    const messages = response.data.messages || []
    console.log(`📧 Tổng số email: ${messages.length}`)
    if (messages.length === 0) {
      console.log('Không có email nào')
      return
    }
    for (const msg of messages.slice(0, 10)) {
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id
      })
      const headers = message.data.payload?.headers || []
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
      const from = headers.find((h: any) => h.name === 'From')?.value || ''
      const date = headers.find((h: any) => h.name === 'Date')?.value || ''
      const snippet = message.data.snippet || ''
      console.log(`\n--- Email #${msg.id} ---`)
      console.log(`From: ${from}`)
      console.log(`Subject: ${subject}`)
      console.log(`Date: ${date}`)
      console.log(`Snippet: ${snippet.substring(0, 100)}...`)
    }
  } catch (error: any) {
    console.error('❌ Lỗi:', error.message)
  }
}
testGmail()
```

## File: scripts/test-new-format.ts
```typescript
import { parseFullTransferEmail } from '../lib/email-parser';
const mockEmailContent = `
Sacombank thông báo giao dịch:
Tài khoản: 0123456789
Phát sinh: +386,868 VND
Thời gian: 05/03/2026 14:30
Nội dung: SDT 123456 HV 8286 COC LS03
Số dư cuối: 10,000,000 VND
`;
console.log('🚀 Đang test logic bóc tách email với format mới...');
console.log('--- Nội dung giả lập ---');
console.log(mockEmailContent);
const result = parseFullTransferEmail(mockEmailContent);
console.log('\n--- Kết quả bóc tách ---');
console.log(`Số điện thoại (6 số cuối): ${result.phone}`);
console.log(`Mã học viên (UserID): ${result.userId}`);
console.log(`Mã khóa học: ${result.courseCode}`);
console.log(`Số tiền: ${result.amount.toLocaleString()} VND`);
if (result.userId === 8286 && result.courseCode === 'LS03' && result.amount === 386868) {
    console.log('\n✅ TEST THÀNH CÔNG: Logic nhận diện hoàn hảo!');
} else {
    console.log('\n❌ TEST THẤT BẠI: Cần kiểm tra lại Regex.');
}
```

## File: scripts/test-pure-js.js
```javascript
const mockEmailContent = `
Sacombank thông báo giao dịch:
Tài khoản: 0123456789
Phát sinh: +386,868 VND
Thời gian: 05/03/2026 14:30
Nội dung: SDT 123456 HV 8286 COC LS03
Số dư cuối: 10,000,000 VND
`;
function testParser(description, text) {
    const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i);
    const userIdMatch = description.match(/HV[\s\._]*(\d+)/i);
    const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i);
    const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i);
    let amount = 0;
    if (amountMatch) {
        amount = parseInt(amountMatch[1].replace(/\./g, '').replace(/,/g, '')) || 0;
    }
    return {
        phone: phoneMatch ? phoneMatch[1] : null,
        userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
        courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
        amount: amount
    };
}
console.log('🚀 Đang test logic bóc tách email (JS thuần)...');
const result = testParser("SDT 123456 HV 8286 COC LS03", mockEmailContent);
console.log('\n--- Kết quả bóc tách ---');
console.log(`Số điện thoại (6 số cuối): ${result.phone}`);
console.log(`Mã học viên (UserID): ${result.userId}`);
console.log(`Mã khóa học: ${result.courseCode}`);
console.log(`Số tiền: ${result.amount.toLocaleString()} VND`);
if (result.userId === 8286 && result.courseCode === 'LS03' && result.amount === 386868) {
    console.log('\n✅ TEST THÀNH CÔNG: Logic nhận diện hoàn hảo!');
} else {
    console.log('\n❌ TEST THẤT BẠI: Cần kiểm tra lại Regex.');
}
```

## File: scripts/test-sacombank.ts
```typescript
require('dotenv').config()
const { google } = require('googleapis')
async function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  )
  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  })
  return google.gmail({ version: 'v1', auth: oAuth2Client })
}
async function getSacombankEmails() {
  console.log('🔍 Tìm email Sacombank...')
  const gmail = await getGmailClient()
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'sacombank thong bao',
    maxResults: 10
  })
  const messages = response.data.messages || []
  console.log(`📧 Tìm thấy ${messages.length} email Sacombank`)
  for (const msg of messages) {
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full'
    })
    const headers = message.data.payload?.headers || []
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
    const from = headers.find((h: any) => h.name === 'From')?.value || ''
    const date = headers.find((h: any) => h.name === 'Date')?.value || ''
    // Lấy body
    let body = ''
    if (message.data.payload?.body?.data) {
      body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8')
    } else if (message.data.payload?.parts) {
      for (const part of message.data.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8')
          break
        }
      }
    }
    console.log(`\n=== Email: ${subject} ===`)
    console.log(`From: ${from}`)
    console.log(`Date: ${date}`)
    console.log(`\n--- Nội dung email (text) ---`)
    console.log(body.substring(0, 2000))
  }
}
getSacombankEmails().catch(console.error)
```

## File: scripts/test-vietqr.ts
```typescript
require('dotenv').config()
async function testVietQR() {
  console.log('🧪 Test VietQR API...')
  const requestBody = {
    accountNo: "1039789789",
    accountName: "NGUYEN VAN A",
    acqId: "970403",
    amount: 500000,
    addInfo: "SDT0389758138MHV123COCNH",
    template: "compact",
    format: "text"
  }
  console.log('Request:', JSON.stringify(requestBody, null, 2))
  try {
    const response = await fetch('https://api.vietqr.io/v2/generate', {
      method: 'POST',
      headers: {
        'x-client-id': process.env.VIETQR_CLIENT_ID || '',
        'x-api-key': process.env.VIETQR_API_KEY || '',
        'Content-Type': 'application/json'
      } as any,
      body: JSON.stringify(requestBody)
    })
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    if (data.code === '00') {
      console.log('✅ QR Generated successfully!')
      console.log('QR Data URL:', data.data?.qrDataURL?.substring(0, 100) + '...')
    } else {
      console.log('❌ Error:', data.desc)
    }
  } catch (error: any) {
    console.error('❌ Request failed:', error.message)
  }
}
testVietQR()
```
