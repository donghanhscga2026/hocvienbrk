# ===============================================================================
# Script: restore-from-backup.ps1 - Khôi phục dự án từ file backup ZIP
# ===============================================================================

param(
    [string]$BackupFile = "",
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location

function Write-Green { param($msg) Write-Host "`n[OK] $msg" -ForegroundColor Green }
function Write-Yellow { param($msg) Write-Host "`n[WAIT] $msg" -ForegroundColor Yellow }
function Write-Red { param($msg) Write-Host "`n[ERROR] $msg" -ForegroundColor Red }
function Write-Cyan { param($msg) Write-Host "`n[INFO] $msg" -ForegroundColor Cyan }

# ── BƯỚC 1: CHỌN FILE BACKUP ─────────────────────────────────────────────
if ($BackupFile -eq "") {
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "   KHÔI PHỤC DỰ ÁN TỪ BACKUP ZIP" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    
    $backupDir = Join-Path $ProjectRoot "backups"
    if (-not (Test-Path $backupDir)) {
        Write-Red "Thư mục backups/ không tồn tại!"
        exit 1
    }
    
    $backups = Get-ChildItem -Path $backupDir -Filter "backup_*.zip" | Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Red "Không tìm thấy file backup nào trong $backupDir"
        exit 1
    }
    
    Write-Host "`nCác file backup có sẵn:"
    for ($i = 0; $i -lt $backups.Count; $i++) {
        $sizeMB = [math]::Round($backups[$i].Length / 1MB, 2)
        Write-Host "$($i+1). $($backups[$i].Name) ($sizeMB MB)" -ForegroundColor Yellow
    }
    
    $choice = Read-Host "`nChọn số thứ tự file backup (1-$($backups.Count))"
    $idx = [int]$choice - 1
    
    if ($idx -lt 0 -or $idx -ge $backups.Count) {
        Write-Red "Lựa chọn không hợp lệ!"
        exit 1
    }
    
    $BackupFile = $backups[$idx].FullName
}

# Kiểm tra file backup có tồn tại không
if (-not (Test-Path $BackupFile)) {
    Write-Red "File backup không tồn tại: $BackupFile"
    exit 1
}

$BackupFile = Resolve-Path $BackupFile
$sizeMB = [math]::Round((Get-Item $BackupFile).Length / 1MB, 2)

Write-Cyan "File backup đã chọn: $BackupFile ($sizeMB MB)"

# ── BƯỚC 2: XÁC NHẬN KHÔI PHỤC ─────────────────────────────────────────
if (-not $Force) {
    Write-Yellow "CẢNH BÁO: Thao tác này sẽ GHI ĐÈ toàn bộ file hiện tại!"
    Write-Yellow "Bạn có chắc chắn muốn khôi phục từ backup này? (y/n)"
    $confirm = Read-Host
    if ($confirm -ne "y") {
        Write-Yellow "Đã hủy thao tác khôi phục."
        exit 0
    }
}

# ── BƯỚC 3: BACKUP HIỆN TẠI TRƯỚC KHI KHÔI PHỤC ─────────────────────
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$TempBackupDir = Join-Path ([System.IO.Path]::GetTempPath()) "BRK_Before_Restore_$Timestamp"

Write-Cyan "Đang backup hiện tại trước khi khôi phục..."
New-Item -ItemType Directory -Path $TempBackupDir -Force | Out-Null

# Copy các thư mục quan trọng để backup tạm
$IncludePaths = @(
    "app", "components", "lib", "types", "public", "prisma", "scripts", "docs", "hooks",
    "auth.ts", "auth.config.ts", "middleware.ts", ".env", ".env.local", "next.config.ts",
    "package.json", "tsconfig.json", "postcss.config.mjs", "eslint.config.mjs", "README.md", "GEMINI.md"
)

foreach ($rel in $IncludePaths) {
    $full = Join-Path $ProjectRoot $rel
    if (Test-Path $full) {
        $dest = Join-Path $TempBackupDir $rel
        if (Test-Path $full -PathType Leaf) {
            Copy-Item -Path $full -Destination $dest -Force
        } else {
            Copy-Item -Path $full -Destination $dest -Recurse -Force
        }
    }
}

Write-Green "Đã backup hiện tại vào: $TempBackupDir"

# ── BƯỚC 4: GIẢI NÉN VÀ KHÔI PHỤC ────────────────────────────────────
Write-Cyan "Đang giải nén và khôi phục từ backup..."

$TempExtractDir = Join-Path ([System.IO.Path]::GetTempPath()) "BRK_Restore_$Timestamp"
New-Item -ItemType Directory -Path $TempExtractDir -Force | Out-Null

try {
    # Giải nén file ZIP
    Expand-Archive -Path $BackupFile -DestinationPath $TempExtractDir -Force
    Write-Green "Giải nén thành công vào: $TempExtractDir"
    
    # Copy từng file/thư mục vào project root
    $ExcludePatterns = @("node_modules", ".git", ".next", "backups", "plan_temp")
    
    Get-ChildItem -Path $TempExtractDir -Recurse -File | ForEach-Object {
        $relPath = $_.FullName.Substring($TempExtractDir.Length).TrimStart('\', '/')
        $skip = $false
        
        foreach ($p in $ExcludePatterns) {
            if ($relPath -like "*\$p\*" -or $_.Name -eq $p) {
                $skip = $true
                break
            }
        }
        
        if (-not $skip) {
            $destPath = Join-Path $ProjectRoot $relPath
            $destDir = Split-Path -Parent $destPath
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Copy-Item -Path $_.FullName -Destination $destPath -Force
        }
    }
    
    Write-Green "Khôi phục hoàn tất!"
    
} catch {
    Write-Red "Lỗi khi khôi phục: $($_.Exception.Message)"
    Write-Yellow "Backup hiện tại được lưu tại: $TempBackupDir"
    exit 1
} finally {
    # Dọn dẹp thư mục tạm giải nén
    if (Test-Path $TempExtractDir) {
        Remove-Item -Path $TempExtractDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# ── BƯỚC 5: KIỂM TRA SAU KHÔI PHỤC ───────────────────────────────────
Write-Cyan "Đang kiểm tra sau khôi phục..."

# Kiểm tra các file quan trọng
$checkFiles = @("package.json", "next.config.ts", "tsconfig.json")
foreach ($f in $checkFiles) {
    if (Test-Path (Join-Path $ProjectRoot $f)) {
        Write-Green "✓ $f tồn tại"
    } else {
        Write-Red "✗ $f bị thiếu!"
    }
}

# Kiểm tra node_modules
if (Test-Path (Join-Path $ProjectRoot "node_modules")) {
    Write-Yellow "⚠ node_modules vẫn được giữ nguyên (không khôi phục từ backup)"
} else {
    Write-Yellow "⚠ node_modules không tồn tại, hãy chạy 'npm install'"
}

Write-Green "=== HOÀN TẤT KHÔI PHỤC ==="
Write-Cyan "Backup cũ được lưu tại: $TempBackupDir"
Write-Yellow "Hãy chạy 'npm install' nếu cần thiết và kiểm tra lại dự án!"
