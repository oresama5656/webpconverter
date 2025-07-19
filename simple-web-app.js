const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const app = express();
const port = 3001; // 3000が使用中なので3001を使用

// 設定
const TEMP_DIR = 'temp_uploads';
const OUTPUT_DIR = 'output_webp_resize';
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

// ディレクトリ作成
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

app.use(express.json());
app.use(express.static('.'));

// アップロード設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, TEMP_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('対応していないファイル形式です'));
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB制限
    }
});

// メインページ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'simple-index.html'));
});

// 変換API
app.post('/convert', upload.array('files'), async (req, res) => {
    try {
        const files = req.files;
        const scale = parseFloat(req.body.scale) || 1.0;
        const enhance = req.body.enhance === 'true';

        if (!files || files.length === 0) {
            return res.json({ success: false, error: 'ファイルが選択されていません' });
        }

        if (scale < 0.25 || scale > 1.0) {
            return res.json({ success: false, error: '縮小率は0.25〜1.0の範囲で指定してください' });
        }

        const results = [];
        
        for (let file of files) {
            try {
                const result = await processImage(file.path, file.originalname, scale, enhance);
                results.push(result);
                
                // 一時ファイルを削除
                fs.unlinkSync(file.path);
            } catch (error) {
                console.error(`Error processing ${file.originalname}:`, error);
                results.push({
                    name: file.originalname,
                    success: false,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            results: results,
            message: `${results.filter(r => r.success).length}ファイルの変換が完了しました`
        });

    } catch (error) {
        console.error('Conversion error:', error);
        res.json({ success: false, error: error.message });
    }
});

// 画像処理関数（convert-resize.jsから移植）
async function processImage(inputPath, originalName, scaleFactor, enhance) {
    const outputFilename = path.parse(originalName).name + '.webp';
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    
    try {
        // 元画像のメタデータを取得
        const metadata = await sharp(inputPath).metadata();
        const originalWidth = metadata.width;
        const originalHeight = metadata.height;
        
        let img = sharp(inputPath);

        if (enhance) {
            // 画質向上処理
            const maxDim = Math.max(originalWidth, originalHeight);
            let factor = 1.0;
            if (maxDim <= 800) factor = 2.0;
            else if (maxDim <= 1200) factor = 1.5;
            
            if (factor > 1.0) {
                img = img.resize(Math.round(originalWidth * factor), Math.round(originalHeight * factor), {
                    kernel: sharp.kernel.lanczos3,
                    fit: 'fill'
                });
            }
        }

        // リサイズとWebP変換
        const targetWidth = Math.round(originalWidth * scaleFactor);
        const targetHeight = Math.round(originalHeight * scaleFactor);
        
        await img
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
            .toFile(outputPath);

        // ファイルサイズを取得
        const stats = fs.statSync(outputPath);
        const fileSizeKB = Math.round(stats.size / 1024);

        return {
            name: outputFilename,
            success: true,
            originalSize: `${originalWidth}x${originalHeight}`,
            newSize: `${targetWidth}x${targetHeight}`,
            fileSize: `${fileSizeKB}KB`,
            path: outputPath
        };

    } catch (error) {
        throw new Error(`画像処理エラー: ${error.message}`);
    }
}

// ダウンロードAPI
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(OUTPUT_DIR, filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename);
    } else {
        res.status(404).send('ファイルが見つかりません');
    }
});

// 出力ファイル一覧API
app.get('/files', (req, res) => {
    try {
        const files = fs.readdirSync(OUTPUT_DIR)
            .filter(file => file.endsWith('.webp'))
            .map(file => {
                const filePath = path.join(OUTPUT_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: Math.round(stats.size / 1024),
                    date: stats.mtime
                };
            });
        res.json({ files: files });
    } catch (error) {
        res.json({ files: [] });
    }
});

app.listen(port, () => {
    console.log(`🚀 シンプルWebP変換ツールが起動しました`);
    console.log(`📱 ブラウザで http://localhost:${port} にアクセスしてください`);
    console.log(`💾 出力先: ${OUTPUT_DIR}`);
}); 