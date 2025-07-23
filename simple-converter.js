const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const archiver = require('archiver');

// 対応する画像拡張子
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

// 設定
const CONFIG = {
    scaleFactor: 1.0,  // 縮小率
    enhance: true,     // 画質向上
    outputDir: 'converted_webp'
};

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
        
        const enhanceScaleFactor = getScaleFactor(originalWidth, originalHeight);
        
        if (enhanceScaleFactor > 1.0) {
            const upscaledBuffer = await upscaleImage(inputBuffer, enhanceScaleFactor);
            
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
            return await convertToWebpWithResize(inputBuffer, targetScaleFactor);
        }
    } catch (error) {
        throw new Error(`WebP変換エラー: ${error.message}`);
    }
}

/**
 * 単一画像の処理
 */
async function processImage(inputPath, outputPath, scaleFactor, enhance) {
    try {
        console.log(`🔄 処理開始: ${path.basename(inputPath)}`);
        
        const inputBuffer = fs.readFileSync(inputPath);
        const metadata = await sharp(inputBuffer).metadata();
        
        console.log(`📏 元サイズ: ${metadata.width} x ${metadata.height}`);
        
        let outputBuffer;
        if (enhance) {
            outputBuffer = await convertToWebpWithEnhancement(inputBuffer, scaleFactor);
        } else {
            outputBuffer = await convertToWebpWithResize(inputBuffer, scaleFactor);
        }
        
        fs.writeFileSync(outputPath, outputBuffer);
        console.log(`✅ 変換完了: ${path.basename(outputPath)}`);
        return true;
    } catch (error) {
        console.error(`❌ エラー: ${path.basename(inputPath)} - ${error.message}`);
        return false;
    }
}

/**
 * フォルダ内の画像を一括変換
 */
async function convertFolder(inputFolder, scaleFactor = CONFIG.scaleFactor, enhance = CONFIG.enhance) {
    try {
        // 入力フォルダの確認
        if (!fs.existsSync(inputFolder)) {
            console.error('❌ 指定されたフォルダが見つかりません:', inputFolder);
            return;
        }
        
        // 出力フォルダの作成
        const outputFolder = path.join(inputFolder, CONFIG.outputDir);
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true });
        }
        
        // 画像ファイルを検索
        const files = fs.readdirSync(inputFolder);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return SUPPORTED_EXTENSIONS.includes(ext);
        });
        
        if (imageFiles.length === 0) {
            console.log('❌ 対応する画像ファイルが見つかりません');
            return;
        }
        
        console.log(`📂 ${imageFiles.length}個の画像ファイルを発見`);
        console.log(`🎯 縮小率: ${scaleFactor} (${Math.round(scaleFactor * 100)}%)`);
        console.log(`🎨 画質向上: ${enhance ? '有効' : '無効'}`);
        console.log('');
        
        // 各ファイルを処理
        let successCount = 0;
        for (const file of imageFiles) {
            const inputPath = path.join(inputFolder, file);
            const outputFilename = changeExtensionToWebp(file);
            const outputPath = path.join(outputFolder, outputFilename);
            
            const success = await processImage(inputPath, outputPath, scaleFactor, enhance);
            if (success) successCount++;
        }
        
        console.log('');
        console.log(`🎉 処理完了: ${successCount}/${imageFiles.length} ファイル`);
        console.log(`📁 出力フォルダ: ${outputFolder}`);
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    }
}

// コマンドライン引数の処理
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('🖼️  シンプルWebP変換ツール');
        console.log('');
        console.log('使用方法:');
        console.log('  node simple-converter.js <フォルダパス> [縮小率] [画質向上]');
        console.log('');
        console.log('例:');
        console.log('  node simple-converter.js "./images"');
        console.log('  node simple-converter.js "./images" 0.8');
        console.log('  node simple-converter.js "./images" 0.8 false');
        console.log('');
        console.log('パラメータ:');
        console.log('  フォルダパス: 変換したい画像が入っているフォルダ');
        console.log('  縮小率: 0.1〜1.0 (デフォルト: 1.0)');
        console.log('  画質向上: true/false (デフォルト: true)');
        process.exit(1);
    }
    
    const inputFolder = args[0];
    const scaleFactor = args[1] ? parseFloat(args[1]) : CONFIG.scaleFactor;
    const enhance = args[2] ? args[2].toLowerCase() === 'true' : CONFIG.enhance;
    
    // パラメータ検証
    if (isNaN(scaleFactor) || scaleFactor < 0.1 || scaleFactor > 1.0) {
        console.error('❌ 縮小率は0.1〜1.0の範囲で指定してください');
        process.exit(1);
    }
    
    convertFolder(inputFolder, scaleFactor, enhance);
}

module.exports = { convertFolder, processImage };