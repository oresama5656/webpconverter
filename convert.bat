@echo off
chcp 65001 >nul
echo 🖼️  シンプルWebP変換ツール
echo.

REM フォルダの存在確認
if "%~1"=="" (
    echo 使用方法: convert.bat フォルダパス [縮小率] [画質向上]
    echo.
    echo 例:
    echo   convert.bat "C:\画像フォルダ"
    echo   convert.bat "C:\画像フォルダ" 0.8
    echo   convert.bat "C:\画像フォルダ" 0.8 false
    echo.
    echo パラメータ:
    echo   フォルダパス: 変換したい画像が入っているフォルダ
    echo   縮小率: 0.1〜1.0 ^(デフォルト: 1.0^)
    echo   画質向上: true/false ^(デフォルト: true^)
    echo.
    pause
    exit /b 1
)

if not exist "%~1" (
    echo ❌ フォルダが見つかりません: %~1
    pause
    exit /b 1
)

REM Node.jsの確認
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.jsがインストールされていません
    echo Node.jsをhttps://nodejs.org/からダウンロードしてインストールしてください
    pause
    exit /b 1
)

REM 圧縮率の選択（ドラッグ&ドロップ時のみ）
set scale_factor=1.0
set enhance=true

if "%~2"=="" (
    echo.
    echo 📏 圧縮率を指定してください ^(0.1-1.0^):
    echo   例: 
    echo     1.0 = 100%% ^(元のサイズ^)
    echo     0.8 = 80%% ^(標準圧縮^)
    echo     0.5 = 50%% ^(高圧縮^)
    echo     0.1 = 10%% ^(最大圧縮^)
    echo.
    set /p scale_factor="圧縮率を入力してください (0.1-1.0): "
    
    echo.
    echo 🎨 画質向上を有効にしますか？
    echo   1. 有効 ^(推奨^)
    echo   2. 無効 ^(高速^)
    echo.
    set /p enhance_choice="選択してください (1-2): "
    
    if "%enhance_choice%"=="2" set enhance=false
    
    echo.
    echo 設定:
    echo   圧縮率: %scale_factor% ^(%scale_factor:0.=%%0^)
    echo   画質向上: %enhance%
    echo.
    echo 変換を開始します...
    echo.
    
    node simple-converter.js "%~1" %scale_factor% %enhance%
) else (
    REM コマンドライン引数が指定されている場合
    echo 変換を開始します...
    echo.
    
    if "%~3"=="" (
        node simple-converter.js "%~1" "%~2"
    ) else (
        node simple-converter.js "%~1" "%~2" "%~3"
    )
)

echo.
echo 変換が完了しました。何かキーを押してください...
pause > nul