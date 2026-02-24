@echo off
set /p msg="Nhap ghi chu cap nhat (Nhan Enter de dung mac dinh): "
if "%msg%"=="" set msg="Cap nhat he thong BRK Academy"
powershell -ExecutionPolicy Bypass -File .\scripts\push.ps1 "%msg%"
pause
