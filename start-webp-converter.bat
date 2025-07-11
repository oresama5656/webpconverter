@echo off
chcp 65001 >nul
:menu
cls
echo.
echo ========================================
echo        WebP画像変換ツール
echo ========================================
echo.
echo 使用するツールを選択してください:
echo.
echo [1] 元サイズ保持版（画質向上）
echo     元画像と同じサイズでWebP変換
echo     画質向上のため自動拡大処理あり
echo.
echo [2] 縮小率指定版（推奨）
echo     指定した縮小率でWebP変換
echo     画質向上オプション付き
echo     例: 0.5 = 50%%サイズ, 0.25 = 25%%サイズ
echo.
echo [3] 終了
echo.
set /p choice=選択してください (1-3): 

if "%choice%"=="1" goto original
if "%choice%"=="2" goto resize
if "%choice%"=="3" goto exit
echo 無効な選択です。1-3の数字を入力してください。
pause
goto menu

:original
cls
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
goto menu

:resize
cls
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
    goto resize
)

echo.
echo.
echo 処理を開始します...
echo.

node convert-resize.js %scale%

echo.
echo 処理が完了しました。
echo 出力先: output_webp_resize/
echo.
pause
goto menu

:exit
echo.
echo 終了します。
exit /b 0 