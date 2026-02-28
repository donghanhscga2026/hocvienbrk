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
