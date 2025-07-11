@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   WebP画像変換ツール（縮小率指定版）
echo ========================================
echo.
echo 縮小率を入力してください（例: 0.5 = 50%%サイズ）
echo 0.25 = 25%%, 0.5 = 50%%, 0.75 = 75%%, 1.0 = 元サイズ
echo.
set /p scale=縮小率を入力: 

if "%scale%"=="" (
    echo エラー: 縮小率が入力されていません。
    pause
    exit /b 1
)

echo.
echo 処理を開始します...
echo.

node convert-resize.js %scale%

echo.
echo 処理が完了しました。
echo 出力先: output_webp_resize/
echo.
pause 