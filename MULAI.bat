@echo off
setlocal
title BNIGHT Vector Studio - Lokal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0server-v2.ps1"
if errorlevel 1 (
  echo.
  echo Aplikasi belum bisa dimulai. Lihat pesan di atas.
  pause
)
endlocal
