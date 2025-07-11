# WebP画像変換ツール

元画像の画質を最大限に保ちながら、最終的に元と同じサイズで高品質なWebP画像に変換するNode.jsツールです。

## 🎯 目的

すべての画像を「元画像と同じサイズのWebP」に変換し、画質向上のために自動的に最適な拡大処理を行います。

## 🔁 処理フロー

1. `input_images/` にある `.png`, `.jpg`, `.jpeg`, `.webp` を対象にする
2. 各画像について元のサイズ（width, height）を取得
3. 最適な拡大率を自動判定：
   - 元の長辺 ～800px → 2.0倍拡大
   - 元の長辺 ～1200px → 1.5倍拡大
   - それ以上 → 拡大しない
4. `sharp` を使用して画像を拡大（縦横比維持）し、一時ファイルとして保存
5. `sharp` で元画像と同じサイズに縮小しつつWebP変換
   - quality: 90
   - effort: 6
   - alphaQuality: 100
6. 出力ファイルは `output_webp/` に保存（拡張子のみ`.webp`に変更）

## 📁 フォルダ構成

```
webptool/
├── input_images/    ← 元画像をここに入れる
├── temp_images/     ← 拡大後の中間画像を一時保存（自動処理用）
├── output_webp/     ← 出力されるWebP画像（元サイズ・同名）
├── convert.js       ← メインスクリプト
├── package.json
└── README.md
```

## ⚙️ 使用ライブラリ

- `sharp` - 画像リサイズ・WebP変換用
- Node.js標準モジュール（fs, path）

## 🚀 使用方法

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 画像の配置

変換したい画像を `input_images/` フォルダに配置します。

対応形式: `.png`, `.jpg`, `.jpeg`, `.webp`

### 3. 変換実行

#### 方法1: コマンドライン
```bash
npm start
```

または

```bash
node convert.js
```

#### 方法2: ダブルクリック（推奨）
- `start-original.bat` をダブルクリック
- または `start-webp-converter.bat` をダブルクリックして選択

### 4. 結果確認

変換された画像は `output_webp/` フォルダに保存されます。

## 📊 処理例

```
🚀 WebP画像変換ツール開始

📊 処理対象: 3 ファイル
対象ファイル: sample1.png, sample2.jpg, sample3.webp

🔄 処理開始: sample1.png
📏 元サイズ: 640 x 480
🔍 拡大率: 2.0x
📈 拡大完了: sample1.png (2.0x)
🔄 WebP変換中...
✅ 変換完了: sample1.webp

🔄 処理開始: sample2.jpg
📏 元サイズ: 1920 x 1080
🔍 拡大率: 1.0x
🔄 WebP変換中（拡大なし）...
✅ 変換完了: sample2.webp

🎉 すべての処理が完了しました！
📁 出力先: output_webp/
```

## 📌 特徴

- ✅ 元画像と同じサイズを保持
- ✅ 画質向上のための自動拡大処理
- ✅ 高品質WebP変換（quality: 90）
- ✅ 詳細な処理ログ表示
- ✅ 自動フォルダ管理
- ✅ エラーハンドリング

## 🔧 カスタマイズ

`convert.js` 内の以下の部分を編集することで設定を変更できます：

```javascript
// 拡大率の設定
function getScaleFactor(width, height) {
    const maxDimension = Math.max(width, height);
    
    if (maxDimension <= 800) {
        return 2.0;  // ここを変更
    } else if (maxDimension <= 1200) {
        return 1.5;  // ここを変更
    } else {
        return 1.0;
    }
}
```

## ⚠️ 注意事項

- 処理中は `temp_images/` フォルダが一時的に使用されます
- 大きな画像や多数の画像を処理する場合は時間がかかる場合があります

## 🐛 トラブルシューティング

### エラー: input_images フォルダが見つかりません
- `input_images/` フォルダを作成し、変換したい画像を配置してください

### エラー: 処理対象の画像ファイルが見つかりません
- 対応形式（.png, .jpg, .jpeg, .webp）のファイルを `input_images/` に配置してください

### WebP変換エラー
- sharpが正しくインストールされているか確認してください
- `npm install` を再実行してください 