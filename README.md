# WebP変換ツール

画像ファイルをWebP形式に変換するWebアプリケーションです。

## 機能

- ドラッグ＆ドロップで画像ファイルをアップロード
- PNG、JPG、JPEG、WebP形式に対応
- 画像の縮小率を調整可能（0.25〜1.0）
- 画質向上機能
- 複数ファイルの一括変換

## ローカルでの実行

```bash
npm install
npm start
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## Netlifyへのデプロイ

### 1. GitHubにプッシュ

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Netlifyでデプロイ

1. [Netlify](https://netlify.com)にアクセス
2. "New site from Git"をクリック
3. GitHubリポジトリを選択
4. 以下の設定でデプロイ：
   - Build command: `npm run build`
   - Publish directory: `.`
   - Functions directory: `netlify/functions`

### 3. 環境変数の設定（オプション）

Netlifyのダッシュボードで以下の環境変数を設定できます：

- `NODE_VERSION`: `18`（推奨）

## カスタムドメインの設定

1. Netlifyダッシュボードで「Domain settings」に移動
2. 「Add custom domain」をクリック
3. ドメイン名を入力して設定

## 技術仕様

- フロントエンド: HTML5, CSS3, JavaScript
- バックエンド: Netlify Functions
- 画像処理: Sharp.js
- 対応形式: PNG, JPG, JPEG, WebP

## ライセンス

MIT License 