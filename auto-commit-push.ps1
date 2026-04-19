# ================================================================================
# Script: auto-commit-push.ps1 (Version Pro - Auto Sync PC & Mac)
# ================================================================================
# Parameters:
#   -Branch <master|staging>  : Branch to push (default: master)
#   -Deploy                   : Deploy to Vercel after push (default: false)
# Examples:
#   .\auto-commit-push.ps1                           -> Push to master, no deploy
#   .\auto-commit-push.ps1 -Branch staging             -> Push to staging, no deploy
#   .\auto-commit-push.ps1 -Deploy                  -> Push to master and deploy
#   .\auto-commit-push.ps1 -Branch staging -Deploy   -> Push to staging and deploy
# ================================================================================

param(
    [string]$Branch = "master",
    [switch]$Deploy = $false
)

$ErrorActionPreference = "Continue"

function Write-Green { param($msg) Write-Host "`n[OK] $msg" -ForegroundColor Green }
function Write-Yellow { param($msg) Write-Host "`n[WAIT] $msg" -ForegroundColor Yellow }
function Write-Red { param($msg) Write-Host "`n[ERROR] $msg" -ForegroundColor Red }

# Validate branch
$Branch = $Branch.ToLower()
if ($Branch -ne "master" -and $Branch -ne "staging") {
    Write-Red "Branch must be 'master' or 'staging'. Got: $Branch"
    exit 1
}

Write-Yellow "=== Bat dau quy trinh dong bo GitHub - Branch: $Branch ==="

# Bước 1: Kiểm tra thay đổi nội bộ
$status = git status --porcelain

if (-not $status) {
    Write-Red "Khong co thay doi nao de commit. Dang kiem tra code moi tu GitHub..."
} else {
    # Bước 2: Commit các thay đổi hiện tại
    Write-Yellow "Dang luu lai cac thay doi cua ban..."
    
    git add .
    
    $changedFiles = git diff --cached --name-only
    if (-not $changedFiles) {
        Write-Yellow "Tat ca thay doi deu thuoc danh sach bo qua (.gitignore). Khong co gi de commit."
    } else {
        $fileNames = ($changedFiles | ForEach-Object { [System.IO.Path]::GetFileName($_) }) -join ", "
        $commitMsg = if ($fileNames.Length -gt 80) { $fileNames.Substring(0, 77) + "..." } else { "cap nhat: $fileNames" }
        
        git commit -m $commitMsg
        Write-Green "Da Commit: $commitMsg"
    }
}

# Bước 3: QUAN TRỌNG - Kéo code mới về trước khi đẩy lên
Write-Yellow "Dang keo code moi tu GitHub (Pull) de tranh xung dot..."
git pull origin $Branch --rebase

if ($LASTEXITCODE -ne 0) {
    Write-Red "PHAT HIEN XUNG DOT (CONFLICT)!"
    Write-Host "Hay mo VS Code de giai quyet Conflict thu cong, sau do chay lai script." -ForegroundColor Cyan
    exit 1
}

# Bước 4: Đẩy code lên GitHub
Write-Yellow "Dang day code len GitHub (Push to $Branch)..."
git push origin $Branch

if ($LASTEXITCODE -ne 0) {
    Write-Red "Push that bai!"
    exit 1
}

Write-Green "=== PUSH THANH CONG! Code da len GitHub branch: $Branch ==="

# Bước 5: Deploy to Vercel (nếu có tham số -Deploy)
if ($Deploy) {
    Write-Yellow "Dang deploy len Vercel production..."
    
    # Kill any existing vercel processes
    Get-Process -Name "vercel" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Deploy to Vercel
    npx vercel --prod --yes 2>&1 | ForEach-Object { Write-Host $_ }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Green "=== DEPLOY THANH CONG! Da tren Vercel ==="
    } else {
        Write-Red "Deploy that bai! Vui long deploy thu cong qua Vercel dashboard."
    }
}