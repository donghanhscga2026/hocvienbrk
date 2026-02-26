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
