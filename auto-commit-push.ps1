# ================================================================================
# Script: auto-commit-push.ps1 (Version Ultimate V2 - Flex Backup + Git Sync)
# ================================================================================

param(
    [string]$Branch = "master",
    [switch]$NoDeploy = $false,
    [switch]$SkipBackup = $false
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Get-Location

function Write-Green { param($msg) Write-Host "`n[OK] $msg" -ForegroundColor Green }
function Write-Yellow { param($msg) Write-Host "`n[WAIT] $msg" -ForegroundColor Yellow }
function Write-Red { param($msg) Write-Host "`n[ERROR] $msg" -ForegroundColor Red }
function Write-Cyan { param($msg) Write-Host "`n[INFO] $msg" -ForegroundColor Cyan }

# ── BUOC 1: MENU CHON CHE DO PUSH ──────────────────────────────────────────────
if ($PSBoundParameters.Count -eq 0) {
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "   HE THONG TU DONG BACKUP & DAY CODE        " -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "1. Day len Master (Vercel tu dong PROD)" -ForegroundColor Green
    Write-Host "2. Day len Staging (CHI LUU GIT - NO DEPLOY)" -ForegroundColor Yellow
    Write-Host "3. Day len Staging (Vercel tu dong TEST)" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    
    $choice = Read-Host "Nhap lua chon cua ban (1, 2 hoac 3)"
    
    if ($choice -eq "1") {
        $Branch = "master"; $NoDeploy = $false; Write-Green "Che do: Master (PROD)"
    } elseif ($choice -eq "2") {
        $Branch = "staging"; $NoDeploy = $true; Write-Yellow "Che do: Staging (SAVE ONLY)"
    } elseif ($choice -eq "3") {
        $Branch = "staging"; $NoDeploy = $false; Write-Green "Che do: Staging (TEST)"
    } else {
        Write-Red "Lua chon khong hop le!"; exit 1
    }

    # Hỏi về việc Backup
    Write-Host ""
    $doBackup = Read-Host "Ban co muon Backup ZIP du an truoc khi Push? (y/n - Mac dinh: n)"
    if ($doBackup -eq "y") { $SkipBackup = $false } else { $SkipBackup = $true }
}

# ── BUOC 2: BACKUP DU AN (.ZIP) - CHI CHAY NEU CHON 'y' ────────────────────────
if (-not $SkipBackup) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
    $BackupDir = "$ProjectRoot\backups"
    $ZipName = "backup_$Timestamp.zip"
    $ZipPath = "$BackupDir\$ZipName"
    $TempDir = Join-Path ([System.IO.Path]::GetTempPath()) "BRK_Backup_$Timestamp"

    Write-Cyan "[1/2] Dang tien hanh Backup du an..."

    $IncludePaths = @(
        "app", "components", "lib", "types", "public", "prisma", "scripts", "docs", "hooks",
        "auth.ts", "auth.config.ts", "middleware.ts", ".env", ".env.local", "next.config.ts",
        "package.json", "tsconfig.json", "postcss.config.mjs", "eslint.config.mjs", "README.md", "GEMINI.md"
    )
    $ExcludePatterns = @("*.log", "*.tsbuildinfo", ".next", "node_modules", ".git", "backups")

    if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }
    if (Test-Path $TempDir) { Remove-Item -Path $TempDir -Recurse -Force | Out-Null }
    New-Item -ItemType Directory -Path $TempDir | Out-Null

    foreach ($rel in $IncludePaths) {
        $full = Join-Path $ProjectRoot $rel
        if (Test-Path $full -PathType Leaf) {
            $dest = Join-Path $TempDir $rel
            $parent = Split-Path -Parent $dest
            if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
            Copy-Item -Path $full -Destination $dest -Force
        } elseif (Test-Path $full -PathType Container) {
            Get-ChildItem -Path $full -File -Recurse | ForEach-Object {
                $skip = $false
                foreach ($p in $ExcludePatterns) { if ($_.FullName -like "*\$p\*" -or $_.Name -like $p) { $skip = $true; break } }
                if (-not $skip) {
                    $relPath = $_.FullName.Substring($ProjectRoot.ToString().Length).TrimStart('\', '/')
                    $dest = Join-Path $TempDir $relPath
                    $parent = Split-Path -Parent $dest
                    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
                    Copy-Item -Path $_.FullName -Destination $dest -Force
                }
            }
        }
    }

    try {
        Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipPath -Force
        $sizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
        Write-Green "Backup thanh cong: $ZipName ($sizeMB MB)"
    } catch {
        Write-Red "Loi khi tao file ZIP: $($_.Exception.Message)"
    }
    if (Test-Path $TempDir) { Remove-Item -Path $TempDir -Recurse -Force | Out-Null }
    $oldBackups = Get-ChildItem -Path $BackupDir -Filter "backup_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 5
    if ($oldBackups) { $oldBackups | Remove-Item -Force }
} else {
    Write-Cyan "[1/2] Bo qua buoc Backup ZIP (Skip Backup)."
}

# ── BUOC 3: DAY CODE LEN GITHUB ────────────────────────────────────────────────
Write-Cyan "[2/2] Dang day code len GitHub (Branch: $Branch)..."

$status = git status --porcelain
if ($status) {
    git add .
    $changedFiles = git diff --cached --name-only
    $fileNames = ($changedFiles | ForEach-Object { [System.IO.Path]::GetFileName($_) }) -join ", "
    $baseMsg = if ($fileNames.Length -gt 60) { $fileNames.Substring(0, 57) + "..." } else { "cap nhat: $fileNames" }
    $commitMsg = if ($NoDeploy) { "[skip ci] $baseMsg" } else { $baseMsg }
    git commit -m $commitMsg
    Write-Green "Da Commit: $commitMsg"
} else {
    Write-Yellow "Khong co thay doi moi de commit."
}

Write-Yellow "Dang kiem tra code moi tu GitHub..."
git pull origin $Branch --rebase

if ($LASTEXITCODE -eq 0) {
    Write-Yellow "Dang day code len $Branch..."
    git push origin $Branch
    if ($LASTEXITCODE -eq 0) {
        Write-Green "=== HOAN THANH! Code da len GitHub ($Branch) ==="
        if (-not $NoDeploy) { Write-Cyan "Vercel se tu dong Deploy trong giay lat..." }
    } else {
        Write-Red "Push that bai!"
    }
} else {
    Write-Red "Xung dot khi Pull! Hay xu ly xung dot thu cong."
}
