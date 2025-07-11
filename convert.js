const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// フォルダパス
const INPUT_DIR = 'input_images';
const TEMP_DIR = 'temp_images';
const OUTPUT_DIR = 'output_webp';

// 対応する画像拡張子
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

/**
 * 画像の長辺に基づいて拡大率を決定
 * @param {number} width 
 * @param {number} height 
 * @returns {number} 拡大率
 */
function getScaleFactor(width, height) {
    const maxDimension = Math.max(width, height);
    
    if (maxDimension <= 800) {
        return 2.0;
    } else if (maxDimension <= 1200) {
        return 1.5;
    } else {
        return 1.0; // 拡大しない
    }
}

/**
 * ファイル名の拡張子を.webpに変更
 * @param {string} filename 
 * @returns {string}
 */
function changeExtensionToWebp(filename) {
    const nameWithoutExt = path.parse(filename).name;
    return nameWithoutExt + '.webp';
}

/**
 * temp_imagesフォルダを空にする
 */
function clearTempDirectory() {
    if (fs.existsSync(TEMP_DIR)) {
        const files = fs.readdirSync(TEMP_DIR);
        files.forEach(file => {
            fs.unlinkSync(path.join(TEMP_DIR, file));
        });
        console.log('🗑️  temp_images フォルダをクリアしました');
    }
}

/**
 * 画像を拡大してtemp_imagesに保存
 * @param {string} inputPath 
 * @param {string} tempPath 
 * @param {number} scaleFactor 
 */
async function upscaleImage(inputPath, tempPath, scaleFactor) {
    try {
        const metadata = await sharp(inputPath).metadata();
        const newWidth = Math.round(metadata.width * scaleFactor);
        const newHeight = Math.round(metadata.height * scaleFactor);
        
        await sharp(inputPath)
            .resize(newWidth, newHeight, {
                kernel: sharp.kernel.lanczos3,
                fit: 'fill'
            })
            .png({ quality: 100, compressionLevel: 0 })
            .toFile(tempPath);
            
        console.log(`📈 拡大完了: ${path.basename(inputPath)} (${scaleFactor}x)`);
    } catch (error) {
        throw new Error(`画像拡大エラー: ${error.message}`);
    }
}

/**
 * SharpでWebP変換（元サイズにリサイズ）
 * @param {string} inputPath 
 * @param {string} outputPath 
 * @param {number} targetWidth 
 * @param {number} targetHeight 
 */
async function convertToWebp(inputPath, outputPath, targetWidth, targetHeight) {
    try {
        await sharp(inputPath)
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
            
        console.log(`🔄 WebP変換完了: ${path.basename(outputPath)}`);
    } catch (error) {
        throw new Error(`WebP変換エラー: ${error.message}`);
    }
}

/**
 * 直接WebP変換（拡大なし）
 * @param {string} inputPath 
 * @param {string} outputPath 
 */
async function convertDirectToWebp(inputPath, outputPath) {
    try {
        await sharp(inputPath)
            .webp({ 
                quality: 90,
                effort: 6,
                alphaQuality: 100,
                lossless: false
            })
            .toFile(outputPath);
            
        console.log(`🔄 WebP変換完了: ${path.basename(outputPath)}`);
    } catch (error) {
        throw new Error(`WebP変換エラー: ${error.message}`);
    }
}

/**
 * 単一画像の処理
 * @param {string} filename 
 */
async function processImage(filename) {
    const inputPath = path.join(INPUT_DIR, filename);
    const outputFilename = changeExtensionToWebp(filename);
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    
    try {
        console.log(`\n🔄 処理開始: ${filename}`);
        
        // 元画像のメタデータを取得
        const metadata = await sharp(inputPath).metadata();
        const originalWidth = metadata.width;
        const originalHeight = metadata.height;
        
        console.log(`📏 元サイズ: ${originalWidth} x ${originalHeight}`);
        
        // 拡大率を決定
        const scaleFactor = getScaleFactor(originalWidth, originalHeight);
        console.log(`🔍 拡大率: ${scaleFactor}x`);
        
        if (scaleFactor > 1.0) {
            // 拡大処理
            const tempFilename = path.parse(filename).name + '_temp.png';
            const tempPath = path.join(TEMP_DIR, tempFilename);
            
            await upscaleImage(inputPath, tempPath, scaleFactor);
            
            // 元サイズに縮小しつつWebP変換
            console.log(`🔄 WebP変換中（元サイズに縮小）...`);
            await convertToWebp(tempPath, outputPath, originalWidth, originalHeight);
            
            // 一時ファイルを削除
            fs.unlinkSync(tempPath);
        } else {
            // 拡大なしで直接WebP変換
            console.log(`🔄 WebP変換中（拡大なし）...`);
            await convertDirectToWebp(inputPath, outputPath);
        }
        
        console.log(`✅ 変換完了: ${outputFilename}`);
        
    } catch (error) {
        console.error(`❌ エラー: ${filename} - ${error.message}`);
    }
}

/**
 * メイン処理
 */
async function main() {
    console.log('🚀 WebP画像変換ツール開始\n');
    
    // フォルダの存在確認
    if (!fs.existsSync(INPUT_DIR)) {
        console.error(`❌ エラー: ${INPUT_DIR} フォルダが見つかりません`);
        process.exit(1);
    }
    
    // 出力フォルダの作成
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // temp_imagesフォルダのクリア
    clearTempDirectory();
    
    // 対象ファイルの取得
    const files = fs.readdirSync(INPUT_DIR).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return SUPPORTED_EXTENSIONS.includes(ext);
    });
    
    if (files.length === 0) {
        console.log('📂 処理対象の画像ファイルが見つかりません');
        console.log('対応形式: .png, .jpg, .jpeg, .webp');
        return;
    }
    
    console.log(`📊 処理対象: ${files.length} ファイル`);
    console.log('対象ファイル:', files.join(', '));
    
    // 各ファイルを処理
    for (const file of files) {
        await processImage(file);
    }
    
    console.log('\n🎉 すべての処理が完了しました！');
    console.log(`📁 出力先: ${OUTPUT_DIR}/`);
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
    console.error('❌ 予期しないエラー:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未処理のPromise拒否:', reason);
    process.exit(1);
});

// メイン処理実行
main().catch(error => {
    console.error('❌ メイン処理エラー:', error.message);
    process.exit(1);
}); 