@echo off
chcp 65001 >nul
cd /d "%~dp0"
title AI Agent Consultant Learning Studio

where node >nul 2>nul
if errorlevel 1 (
  echo [錯誤] 找不到 Node.js，請先安裝 https://nodejs.org 後再執行。
  pause
  exit /b 1
)

if not exist node_modules (
  echo 第一次執行，正在安裝套件，請稍候...
  call npm install
  if errorlevel 1 (
    echo [錯誤] 套件安裝失敗。
    pause
    exit /b 1
  )
)

echo.
echo 正在啟動，瀏覽器會自動開啟 http://localhost:5173/
echo 要結束請關閉此視窗（或按 Ctrl+C）。
echo.
call npm run dev -- --open --port 5173
pause
