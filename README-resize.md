# WebP画像変換ツール

画像をWebP形式に変換し、指定した縮小率でリサイズするNode.jsツールです。

## 機能

- PNG、JPG、JPEG、WebP形式の画像をWebP形式に変換
- 指定した縮小率でリサイズ（例：0.5 = 50%サイズ）
- 画質向上機能（小さい画像を拡大してから変換）
- バッチ処理対応

## インストール

```bash
npm install
```

## 使用方法

### 基本的な使用方法

```bash
node convert.js <縮小率>
```

**例：**
- `node convert.js 0.5` - 50%サイズに縮小
- `node convert.js 0.25` - 25%サイズに縮小
- `node convert.js 1.0` - サイズ変更なし

### 画質向上機能を無効にする

```bash
node convert.js <縮小率> --no-enhance
```

### 特定のファイルを変換

```bash
node convert.js <縮小率> <ファイルパス1> <ファイルパス2> ...
```

## フォルダ構成

- `input_images/` - 変換元の画像ファイル
- `output_webp_resize/` - 変換後のWebPファイル
- `temp_images/` - 一時ファイル（自動削除）

## 対応形式

- PNG (.png)
- JPEG (.jpg, .jpeg)
- WebP (.webp)

## 画質向上機能について

小さい画像（800px以下）は2倍、中サイズ画像（1200px以下）は1.5倍に拡大してから変換することで、より高品質なWebPファイルを生成します。

この機能を無効にしたい場合は `--no-enhance` オプションを使用してください。 