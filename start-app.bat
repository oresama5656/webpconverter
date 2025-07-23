@echo off
echo WebP変換ツール（リサイズ対応）を起動しています...
echo.

REM Node.jsの確認
node --version >nul 2>&1
if errorlevel 1 (
    echo エラー: Node.jsがインストールされていません
    echo Node.jsをhttps://nodejs.org/からダウンロードしてインストールしてください
    pause
    exit /b 1
)

REM 依存関係のインストール
if not exist node_modules (
    echo 依存関係をインストールしています...
    npm install
    if errorlevel 1 (
        echo エラー: 依存関係のインストールに失敗しました
        pause
        exit /b 1
    )
)

REM サーバー起動
echo サーバーを起動しています...
echo ブラウザで http://localhost:3000 にアクセスしてください
echo 終了するには Ctrl+C を押してください
echo.

npm run resize

pause