# ============================================================
#  backup.ps1 - HocVien-BRK Project Backup Script (Git-Sync Version)
#  Usage: .\scripts\backup.ps1
#  Creates a timestamped ZIP of all Git-tracked files + sensitive configs.
# ============================================================

$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BackupDir = "$ProjectRoot\backups"
$ZipName = "backup_$Timestamp.zip"
$ZipPath = "$BackupDir\$ZipName"
$TempBackupDir = Join-Path ([System.IO.Path]::GetTempPath()) "BRK_Backup_Temp_$Timestamp"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  BRK Project Backup (Git-Sync)" -ForegroundColor Cyan
Write-Host "  Time   : $Timestamp" -ForegroundColor Cyan
Write-Host "  Output : $ZipPath" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Create backups directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Host "[+] Created backups/ folder" -ForegroundColor Green
}

# 2. Collect files to backup
Write-Host "[*] Identifying files to backup..." -ForegroundColor Gray
$FilesToBackup = @()

# --- A. Get all files tracked by Git ---
if (Test-Path (Join-Path $ProjectRoot ".git")) {
    Push-Location $ProjectRoot
    try {
        # Sử dụng -c core.quotepath=false để Git không bao ngoặc kép và mã hóa ký tự tiếng Việt
        $GitFiles = git -c core.quotepath=false ls-files
        foreach ($file in $GitFiles) {
            # Chuyển dấu gạch chéo xuôi (/) của Git thành gạch chéo ngược (\) của Windows
            $cleanFile = $file -replace '/', '\'
            $FilesToBackup += Join-Path $ProjectRoot $cleanFile
        }
        Write-Host "[+] Found $($GitFiles.Count) files tracked by Git." -ForegroundColor Green
    }
    catch {
        Write-Host "[!] Git command failed. Falling back to manual mode." -ForegroundColor Yellow
    }
    Pop-Location
} else {
    Write-Host "[!] Not a Git repository. Backup might be incomplete." -ForegroundColor Yellow
}

# --- B. Add sensitive/local files NOT in Git (often ignored) ---
$ManualIncludes = @(
    ".env",
    ".env.local",
    ".env.production",
    "prisma/dev.db" # Nếu bạn dùng SQLite cục bộ
)

foreach ($rel in $ManualIncludes) {
    $full = Join-Path $ProjectRoot $rel
    if (Test-Path $full -PathType Leaf) {
        if ($FilesToBackup -notcontains $full) {
            $FilesToBackup += $full
            Write-Host "[+] Added local file: $rel" -ForegroundColor Gray
        }
    }
}

if ($FilesToBackup.Count -eq 0) {
    Write-Host "[ERROR] No files found to backup. Ensure you have committed files or check Git status." -ForegroundColor Red
    exit 1
}

# 3. Create temporary staging directory
if (Test-Path $TempBackupDir) {
    Remove-Item -Path $TempBackupDir -Recurse -Force | Out-Null
}
New-Item -ItemType Directory -Path $TempBackupDir | Out-Null

# 4. Copy files to staging (maintaining structure)
Write-Host "[*] Staging $($FilesToBackup.Count) files..." -ForegroundColor Gray
foreach ($filePath in $FilesToBackup) {
    # Get relative path from ProjectRoot
    $relativePath = $filePath.Substring($ProjectRoot.Length).TrimStart('\', '/')
    $destinationPath = Join-Path $TempBackupDir $relativePath

    $destinationDir = Split-Path -Parent $destinationPath
    if (-not (Test-Path $destinationDir)) {
        New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
    }

    if (Test-Path $filePath -PathType Leaf) {
        Copy-Item -Path $filePath -Destination $destinationPath -Force
    }
}

# 5. Create ZIP archive
Write-Host "[*] Creating ZIP archive..." -ForegroundColor Gray
try {
    Compress-Archive -Path "$TempBackupDir\*" -DestinationPath $ZipPath -Force
}
catch {
    Write-Host "[ERROR] Failed to create ZIP archive: $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path $TempBackupDir) { Remove-Item -Path $TempBackupDir -Recurse -Force }
    exit 1
}

# 6. Cleanup temp folder
if (Test-Path $TempBackupDir) {
    Remove-Item -Path $TempBackupDir -Recurse -Force | Out-Null
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

# 7. Rotation: Keep only the 5 most recent backups
$OldBackups = Get-ChildItem -Path $BackupDir -Filter "backup_*.zip" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 5

if ($OldBackups.Count -gt 0) {
    Write-Host "[*] Removing $($OldBackups.Count) old backup(s) to save space..." -ForegroundColor Gray
    $OldBackups | Remove-Item -Force
}
