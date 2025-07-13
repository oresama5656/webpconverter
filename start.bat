@echo off
chcp 65001 > nul
title WebP変換ツール

echo 🚀 WebP変換ツールを起動しています...
echo.

cd /d "%~dp0"

echo 📦 依存関係を確認中...
if not exist "node_modules" (
    echo npm install を実行中...
    npm install
    if errorlevel 1 (
        echo ❌ 依存関係のインストールに失敗しました
        pause
        exit /b 1
    )
)

echo.
echo 🌐 サーバーを起動中...
echo 📱 ブラウザで http://localhost:3000 にアクセスしてください
echo 📁 出力先: %USERPROFILE%\Desktop\WebPOutput
echo.
echo 終了するには Ctrl+C を押してください
echo.

REM サーバー起動をバックグラウンドで実行し、少し待ってからブラウザを開く
start /b node server.js
timeout /t 3 /nobreak > nul
echo 🌐 ブラウザを自動で開いています...
start http://localhost:3000

REM サーバープロセスを待機
waitfor /s %COMPUTERNAME% /t 1 > nul 2>&1

pause 