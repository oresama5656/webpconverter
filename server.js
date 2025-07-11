const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const archiver = require('archiver');

const app = express();
const port = 3000;

// 一時保存ディレクトリ
const convertedDir = path.join(__dirname, 'converted_files');
if (!fs.existsSync(convertedDir)) {
    fs.mkdirSync(convertedDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// アップロード設定
const upload = multer({ 
    dest: 'temp_uploads/',
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.png', '.jpg', '.jpeg', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('対応していないファイル形式です'));
        }
    }
});

// ルート
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 変換API
app.post('/convert', upload.array('files'), async (req, res) => {
    try {
        const files = req.files;
        const scale = parseFloat(req.body.scale);
        const enhance = req.body.enhance === 'true';

        if (!files || files.length === 0) {
            return res.json({ success: false, error: 'ファイルが選択されていません' });
        }
        if (scale < 0.25 || scale > 1.0) {
            return res.json({ success: false, error: '縮小率は0.25〜1.0の範囲で指定してください' });
        }

        const convertedFiles = [];
        for (let file of files) {
            const originalPath = file.path;
            const originalName = file.originalname;
            try {
                const outName = await processFile(originalPath, originalName, scale, enhance);
                convertedFiles.push(outName);
            } catch (e) {
                console.error(e);
            }
            fs.unlinkSync(originalPath);
        }

        if (convertedFiles.length === 0) {
            return res.json({ success: false, error: '変換できるファイルがありませんでした' });
        }

        if (convertedFiles.length === 1) {
            res.json({ 
                success: true, 
                downloadUrl: `/download/${convertedFiles[0]}`,
                message: '変換が完了しました。ダウンロードを開始します。'
            });
        } else {
            const zipFileName = `webp_converted_${Date.now()}.zip`;
            await createZipFile(convertedFiles, zipFileName);
            res.json({ 
                success: true, 
                downloadUrl: `/download-zip/${zipFileName}`,
                message: `${convertedFiles.length}ファイルの変換が完了しました。ZIPファイルをダウンロードします。`
            });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 画像変換
async function processFile(inputPath, originalName, scale, enhance) {
    const outputName = path.parse(originalName).name + '.webp';
    const outputPath = path.join(convertedDir, outputName);

    const metadata = await sharp(inputPath).metadata();
    let img = sharp(inputPath);

    if (enhance) {
        const maxDim = Math.max(metadata.width, metadata.height);
        let factor = 1.0;
        if (maxDim <= 800) factor = 2.0;
        else if (maxDim <= 1200) factor = 1.5;
        if (factor > 1.0) {
            img = img.resize(Math.round(metadata.width * factor), Math.round(metadata.height * factor), {
                kernel: sharp.kernel.lanczos3,
                fit: 'fill'
            });
        }
    }
    await img
        .resize(Math.round(metadata.width * scale), Math.round(metadata.height * scale), {
            kernel: sharp.kernel.lanczos3,
            fit: 'fill'
        })
        .webp({ quality: 90, effort: 6, alphaQuality: 100, lossless: false })
        .toFile(outputPath);

    return outputName;
}

// ZIP作成
async function createZipFile(files, zipFileName) {
    return new Promise((resolve, reject) => {
        const zipPath = path.join(convertedDir, zipFileName);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve());
        archive.on('error', err => reject(err));
        archive.pipe(output);

        files.forEach(fileName => {
            archive.file(path.join(convertedDir, fileName), { name: fileName });
        });
        archive.finalize();
    });
}

// ダウンロードAPI
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(convertedDir, filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename, err => {
            if (!err) setTimeout(() => fs.unlinkSync(filePath), 1000);
        });
    } else {
        res.status(404).send('ファイルが見つかりません');
    }
});
app.get('/download-zip/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(convertedDir, filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename, err => {
            if (!err) setTimeout(() => {
                fs.unlinkSync(filePath);
                fs.readdirSync(convertedDir).forEach(f => {
                    if (f.endsWith('.webp')) fs.unlinkSync(path.join(convertedDir, f));
                });
            }, 1000);
        });
    } else {
        res.status(404).send('ファイルが見つかりません');
    }
});

app.listen(port, () => {
    console.log(`🚀 WebP変換ツールが起動しました`);
    console.log(`📱 ブラウザで http://localhost:${port} にアクセスしてください`);
    console.log(`💾 変換済みファイル保存先: ${convertedDir}`);
});