Param(
  [string]$WorktreePath = "C:\Users\ADMIN\Desktop\HocVien-BRK.worktrees\upgrade-homepage-course-display",
  [string]$MainPath = "C:\Users\ADMIN\Desktop\HocVien-BRK",
  [string]$BranchName = "feat/top-courses-upgrade",
  [switch]$Force
)

# Files to sync (update list if you add more files in future)
$Files = @(
  "components\home\HomePageClient.tsx",
  "app\actions\admin-actions.ts",
  "app\actions\course-actions.ts",
  "app\api\courses\[id]\lessons\route.ts",
  "app\api\courses\[id]\lessons\import\route.ts"
)

Write-Host "Worktree: $WorktreePath"
Write-Host "Main repo: $MainPath"
Write-Host "Branch to push: $BranchName"
Write-Host ""

if (-not (Test-Path $WorktreePath)) { throw "Worktree path not found: $WorktreePath" }
if (-not (Test-Path $MainPath)) { throw "Main path not found: $MainPath" }

# Check git clean in main
Push-Location $MainPath
try {
  $status = git status --porcelain
  if ($status -and -not $Force) {
    Write-Host "MAIN repo has uncommitted changes. Abort to avoid data loss." -ForegroundColor Yellow
    Write-Host "Run again with -Force if you understand the risk." -ForegroundColor Yellow
    Write-Host "`nGit status (summary):"
    git status --short
    throw "Uncommitted changes in main repo"
  }
} finally {
  Pop-Location
}

# Create backup dir
$ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
$backupDir = Join-Path $MainPath "plan_temp\worktree_sync_backup_$ts"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "Backup directory: $backupDir`n"

$copied = @()
$missing = @()

foreach ($rel in $Files) {
  $src = Join-Path $WorktreePath $rel
  $dst = Join-Path $MainPath $rel
  if (-not (Test-Path $src)) {
    Write-Warning "Source missing: $src"
    $missing += $rel
    continue
  }
  $dstDir = Split-Path $dst -Parent
  if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }

  if (Test-Path $dst) {
    $bkName = $rel -replace '[\\/:]','_' 
    $bkPath = Join-Path $backupDir $bkName
    Copy-Item $dst $bkPath -Force
    Write-Host "Backed up: $dst -> $bkPath"
  } else {
    Write-Host "No existing main file; will create: $dst"
  }

  Copy-Item $src $dst -Force
  Write-Host "Copied: $src -> $dst"
  $copied += $rel
}

# Git commit & push on main repo
Push-Location $MainPath
try {
  # ensure inside git
  git rev-parse --is-inside-work-tree > $null 2>&1

  # create or switch to branch
  $branchExists = $false
  try { git show-ref --verify --quiet "refs/heads/$BranchName"; $branchExists = $LASTEXITCODE -eq 0 } catch { $branchExists = $false }
  if ($branchExists) {
    git checkout $BranchName
  } else {
    git checkout -b $BranchName
  }

  if ($copied.Count -eq 0) {
    Write-Host "No files were copied; nothing to commit.";
  } else {
    git add @($copied) 2>$null
    git commit -m "Sync changes from worktree: top-courses upgrade (auto-sync) - $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -q
    git push -u origin $BranchName
    Write-Host "`nPushed branch $BranchName to origin." -ForegroundColor Green
  }
} catch {
  Write-Error "Git error: $_"
} finally {
  Pop-Location
}

Write-Host "`nSUMMARY:"
Write-Host " Backups in: $backupDir"
Write-Host " Files copied: $($copied -join ', ')"
if ($missing.Count -gt 0) { Write-Host " Missing in worktree (not copied): $($missing -join ', ')" -ForegroundColor Yellow }
