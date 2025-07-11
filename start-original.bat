@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   WebP画像変換ツール（元サイズ保持版）
echo ========================================
echo.
echo 処理を開始します...
echo.

node convert.js

echo.
echo 処理が完了しました。
echo 出力先: output_webp/
echo.
pause 