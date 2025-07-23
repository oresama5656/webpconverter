const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// 対応する画像拡張子
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

// 出力ディレクトリ
const OUTPUT_DIR = 'output_webp_resize';
const TEMP_DIR = 'temp_uploads';

// ディレクトリの作成
[OUTPUT_DIR, TEMP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Multerの設定（メモリ保存）
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('対応していないファイル形式です'), false);
        }
    }
});

// 静的ファイルの配信
app.use(express.static('.'));

/**
 * 画像の長辺に基づいて拡大率を決定
 */
function getScaleFactor(width, height) {
    const maxDimension = Math.max(width, height);
    
    if (maxDimension <= 800) {
        return 2.0;
    } else if (maxDimension <= 1200) {
        return 1.5;
    } else {
        return 1.0;
    }
}

/**
 * ファイル名の拡張子を.webpに変更
 */
function changeExtensionToWebp(filename) {
    const nameWithoutExt = path.parse(filename).name;
    return nameWithoutExt + '.webp';
}

/**
 * 画像を拡大処理
 */
async function upscaleImage(inputBuffer, scaleFactor) {
    try {
        const metadata = await sharp(inputBuffer).metadata();
        const newWidth = Math.round(metadata.width * scaleFactor);
        const newHeight = Math.round(metadata.height * scaleFactor);
        
        return await sharp(inputBuffer)
            .resize(newWidth, newHeight, {
                kernel: sharp.kernel.lanczos3,
                fit: 'fill'
            })
            .png({ quality: 100, compressionLevel: 0 })
            .toBuffer();
    } catch (error) {
        throw new Error(`画像拡大エラー: ${error.message}`);
    }
}

/**
 * 画像をWebP変換（縮小率指定）
 */
async function convertToWebpWithResize(inputBuffer, scaleFactor) {
    try {
        const metadata = await sharp(inputBuffer).metadata();
        const newWidth = Math.round(metadata.width * scaleFactor);
        const newHeight = Math.round(metadata.height * scaleFactor);
        
        return await sharp(inputBuffer)
            .resize(newWidth, newHeight, {
                kernel: sharp.kernel.lanczos3,
                fit: 'fill'
            })
            .webp({ 
                quality: 90,
                effort: 6,
                alphaQuality: 100,
                lossless: false
            })
            .toBuffer();
    } catch (error) {
        throw new Error(`WebP変換エラー: ${error.message}`);
    }
}

/**
 * 拡大処理ありでWebP変換
 */
async function convertToWebpWithEnhancement(inputBuffer, targetScaleFactor) {
    try {
        const metadata = await sharp(inputBuffer).metadata();
        const originalWidth = metadata.width;
        const originalHeight = metadata.height;
        
        // 拡大率を決定
        const enhanceScaleFactor = getScaleFactor(originalWidth, originalHeight);
        
        if (enhanceScaleFactor > 1.0) {
            // 拡大処理
            const upscaledBuffer = await upscaleImage(inputBuffer, enhanceScaleFactor);
            
            // 拡大画像を目標サイズにリサイズしつつWebP変換
            const targetWidth = Math.round(originalWidth * targetScaleFactor);
            const targetHeight = Math.round(originalHeight * targetScaleFactor);
            
            return await sharp(upscaledBuffer)
                .resize(targetWidth, targetHeight, {
                    kernel: sharp.kernel.lanczos3,
                    fit: 'fill'
                })
                .webp({ 
                    quality: 90,
                    effort: 6,
                    alphaQuality: 100,
                    lossless: false
                })
                .toBuffer();
        } else {
            // 拡大なしで直接変換
            return await convertToWebpWithResize(inputBuffer, targetScaleFactor);
        }
    } catch (error) {
        throw new Error(`WebP変換エラー: ${error.message}`);
    }
}

/**
 * 単一画像の処理
 */
async function processImage(fileBuffer, filename, scaleFactor, enhance) {
    try {
        console.log(`🔄 処理開始: ${filename}`);
        
        // 元画像のメタデータを取得
        const metadata = await sharp(fileBuffer).metadata();
        const originalWidth = metadata.width;
        const originalHeight = metadata.height;
        
        console.log(`📏 元サイズ: ${originalWidth} x ${originalHeight}`);
        console.log(`🔍 縮小率: ${scaleFactor}x`);
        console.log(`🎨 画質向上: ${enhance ? '有効' : '無効'}`);
        
        let outputBuffer;
        if (enhance) {
            // 拡大処理あり
            outputBuffer = await convertToWebpWithEnhancement(fileBuffer, scaleFactor);
        } else {
            // 拡大処理なし
            outputBuffer = await convertToWebpWithResize(fileBuffer, scaleFactor);
        }
        
        const outputFilename = changeExtensionToWebp(filename);
        console.log(`✅ 変換完了: ${outputFilename}`);
        
        return {
            filename: outputFilename,
            buffer: outputBuffer
        };
    } catch (error) {
        console.error(`❌ エラー: ${filename} - ${error.message}`);
        throw error;
    }
}

// メインルート
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'resize-ui.html'));
});

// index.htmlへのアクセスもresize-ui.htmlにリダイレクト
app.get('/index.html', (req, res) => {
    res.redirect('/');
});

// 画像変換エンドポイント
app.post('/convert-resize', upload.array('images'), async (req, res) => {
    try {
        const { scale, enhance } = req.body;
        const files = req.files;
        
        if (!files || files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'ファイルが選択されていません' 
            });
        }
        
        const scaleFactor = parseFloat(scale);
        const enhanceFlag = enhance === 'true';
        
        if (isNaN(scaleFactor) || scaleFactor <= 0 || scaleFactor > 1) {
            return res.status(400).json({ 
                success: false, 
                error: '有効な縮小率を指定してください（0 < 縮小率 <= 1）' 
            });
        }
        
        console.log(`🎯 指定縮小率: ${scaleFactor} (${Math.round(scaleFactor * 100)}%)`);
        console.log(`🎨 画質向上: ${enhanceFlag ? '有効' : '無効'}`);
        console.log(`📊 処理対象: ${files.length} ファイル`);
        
        // 各ファイルを処理
        const processedFiles = [];
        for (const file of files) {
            try {
                const result = await processImage(
                    file.buffer, 
                    file.originalname, 
                    scaleFactor, 
                    enhanceFlag
                );
                processedFiles.push(result);
            } catch (error) {
                console.error(`ファイル処理エラー: ${file.originalname}`, error);
                // エラーがあっても他のファイルは処理を続行
            }
        }
        
        if (processedFiles.length === 0) {
            return res.status(500).json({ 
                success: false, 
                error: '処理できるファイルがありませんでした' 
            });
        }
        
        // ZIPファイルを作成
        const zipFilename = `converted_images_${Date.now()}.zip`;
        const zipPath = path.join(OUTPUT_DIR, zipFilename);
        
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', () => {
            console.log(`📦 ZIP作成完了: ${zipFilename} (${archive.pointer()} bytes)`);
        });
        
        archive.on('error', (err) => {
            throw err;
        });
        
        archive.pipe(output);
        
        // 処理済みファイルをZIPに追加
        processedFiles.forEach(file => {
            archive.append(file.buffer, { name: file.filename });
        });
        
        await archive.finalize();
        
        // レスポンスを返す
        res.json({
            success: true,
            message: `${processedFiles.length}個のファイルを変換しました`,
            processedCount: processedFiles.length,
            totalCount: files.length,
            downloadUrl: `/download/${zipFilename}`
        });
        
    } catch (error) {
        console.error('変換処理エラー:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ダウンロードエンドポイント
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(OUTPUT_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'ファイルが見つかりません' });
    }
    
    res.download(filePath, filename, (err) => {
        if (err) {
            console.error('ダウンロードエラー:', err);
            res.status(500).json({ error: 'ダウンロードに失敗しました' });
        } else {
            // ダウンロード完了後、ファイルを削除（オプション）
            setTimeout(() => {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ ダウンロード済みファイルを削除: ${filename}`);
                } catch (error) {
                    console.error('ファイル削除エラー:', error);
                }
            }, 60000); // 1分後に削除
        }
    });
});

// エラーハンドリング
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false, 
                error: 'ファイルサイズが大きすぎます（最大50MB）' 
            });
        }
    }
    
    console.error('サーバーエラー:', error);
    res.status(500).json({ 
        success: false, 
        error: error.message || 'サーバーエラーが発生しました' 
    });
});

// サーバー起動
app.listen(PORT, () => {
    console.log('🚀 WebP変換ツール（リサイズ対応）サーバーが起動しました');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log('📂 ブラウザでアクセスして画像をアップロードしてください');
});

module.exports = app;