# Script tu dong day code len GitHub
# Cach dung: ./scripts/push.ps1 "Noi dung ghi chu"

param (
    [string]$Message = "Cap nhat he thong BRK Academy"
)

Write-Host "--- DANG BAT DAU QUAN TRINH DAY CODE ---" -ForegroundColor Cyan

# 1. Them tat ca thay doi
Write-Host "> Dang gom cac thay doi..." -ForegroundColor Yellow
git add .

# 2. Commit voi tin nhan
Write-Host "> Dang dong goi ban cap nhat voi ghi chu: '$Message'..." -ForegroundColor Yellow
git commit -m "$Message"

# 3. Push len GitHub
Write-Host "> Dang day code len GitHub (Nhanh master)..." -ForegroundColor Yellow
git push origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host "--- THANH CONG! CODE DA DUOC DAY LEN GITHUB ---" -ForegroundColor Green
}
else {
    Write-Host "--- THAT BAI! VUI LONG KIEM TRA LAI KET NOI HOAC XUNG DOT CODE ---" -ForegroundColor Red
}

Write-Host "Nhan phim bat ky de thoat..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
