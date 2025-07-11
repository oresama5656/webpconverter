const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// フォルダパス
const INPUT_DIR = 'input_images';
const TEMP_DIR = 'temp_images';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'output_webp_resize';

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
 * 画像をWebP変換（縮小率指定）
 * @param {string} inputPath 
 * @param {string} outputPath 
 * @param {number} scaleFactor 
 */
async function convertToWebpWithResize(inputPath, outputPath, scaleFactor) {
    try {
        const metadata = await sharp(inputPath).metadata();
        const newWidth = Math.round(metadata.width * scaleFactor);
        const newHeight = Math.round(metadata.height * scaleFactor);
        
        await sharp(inputPath)
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
            .toFile(outputPath);
            
        console.log(`📏 リサイズ: ${metadata.width}x${metadata.height} → ${newWidth}x${newHeight}`);
        console.log(`🔄 WebP変換完了: ${path.basename(outputPath)}`);
    } catch (error) {
        throw new Error(`WebP変換エラー: ${error.message}`);
    }
}

/**
 * 拡大処理ありでWebP変換
 * @param {string} inputPath 
 * @param {string} outputPath 
 * @param {number} targetScaleFactor 
 */
async function convertToWebpWithEnhancement(inputPath, outputPath, targetScaleFactor) {
    try {
        const metadata = await sharp(inputPath).metadata();
        const originalWidth = metadata.width;
        const originalHeight = metadata.height;
        
        // 拡大率を決定
        const enhanceScaleFactor = getScaleFactor(originalWidth, originalHeight);
        
        if (enhanceScaleFactor > 1.0) {
            // 拡大処理
            const tempFilename = path.parse(path.basename(inputPath)).name + '_temp.png';
            const tempPath = path.join(TEMP_DIR, tempFilename);
            
            await upscaleImage(inputPath, tempPath, enhanceScaleFactor);
            
            // 拡大画像を目標サイズにリサイズしつつWebP変換
            const targetWidth = Math.round(originalWidth * targetScaleFactor);
            const targetHeight = Math.round(originalHeight * targetScaleFactor);
            
            await sharp(tempPath)
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
                
            console.log(`📏 拡大→リサイズ: ${originalWidth}x${originalHeight} → ${targetWidth}x${targetHeight} (拡大${enhanceScaleFactor}x)`);
            console.log(`🔄 WebP変換完了: ${path.basename(outputPath)}`);
            
            // 一時ファイルを削除
            fs.unlinkSync(tempPath);
        } else {
            // 拡大なしで直接変換
            await convertToWebpWithResize(inputPath, outputPath, targetScaleFactor);
        }
    } catch (error) {
        throw new Error(`WebP変換エラー: ${error.message}`);
    }
}

/**
 * 単一画像の処理
 * @param {string} filename 
 * @param {number} scaleFactor 
 * @param {boolean} enhance 
 */
async function processImage(filename, scaleFactor, enhance) {
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
        console.log(`🔍 縮小率: ${scaleFactor}x`);
        console.log(`🎨 画質向上: ${enhance ? '有効' : '無効'}`);
        
        if (enhance) {
            // 拡大処理あり
            await convertToWebpWithEnhancement(inputPath, outputPath, scaleFactor);
        } else {
            // 拡大処理なし
            await convertToWebpWithResize(inputPath, outputPath, scaleFactor);
        }
        
        console.log(`✅ 変換完了: ${outputFilename}`);
        
    } catch (error) {
        console.error(`❌ エラー: ${filename} - ${error.message}`);
    }
}

/**
 * 特定のファイルを処理
 * @param {string} filePath 
 * @param {number} scaleFactor 
 * @param {boolean} enhance 
 * @param {string} outputDir 
 */
async function processSpecificImage(filePath, scaleFactor, enhance, outputDir = OUTPUT_DIR) {
    const outputFilename = changeExtensionToWebp(path.basename(filePath));
    const outputPath = path.join(outputDir, outputFilename);
    
    try {
        console.log(`\n🔄 処理開始: ${path.basename(filePath)}`);
        
        // 元画像のメタデータを取得
        const metadata = await sharp(filePath).metadata();
        const originalWidth = metadata.width;
        const originalHeight = metadata.height;
        
        console.log(`📏 元サイズ: ${originalWidth} x ${originalHeight}`);
        console.log(`🔍 縮小率: ${scaleFactor}x`);
        console.log(`🎨 画質向上: ${enhance ? '有効' : '無効'}`);
        
        if (enhance) {
            // 拡大処理あり
            await convertToWebpWithEnhancement(filePath, outputPath, scaleFactor);
        } else {
            // 拡大処理なし
            await convertToWebpWithResize(filePath, outputPath, scaleFactor);
        }
        
        console.log(`✅ 変換完了: ${outputFilename}`);
        
    } catch (error) {
        console.error(`❌ エラー: ${path.basename(filePath)} - ${error.message}`);
    }
}

/**
 * メイン処理
 */
async function main() {
    console.log('🚀 WebP画像変換ツール（縮小率指定版）開始\n');
    
    // コマンドライン引数を解析
    const args = process.argv.slice(2);
    const scaleFactor = parseFloat(args[0]);
    const enhance = !args.includes('--no-enhance') && !args.includes('-n'); // デフォルトで有効
    
    if (isNaN(scaleFactor) || scaleFactor <= 0 || scaleFactor > 1) {
        console.error('❌ エラー: 有効な縮小率を指定してください（0 < 縮小率 <= 1）');
        console.log('使用例: node convert-resize.js 0.5');
        console.log('使用例: node convert-resize.js 0.5 --no-enhance (画質向上無効)');
        console.log('例: 0.5 = 50%サイズ, 0.25 = 25%サイズ');
        process.exit(1);
    }
    
    console.log(`🎯 指定縮小率: ${scaleFactor} (${Math.round(scaleFactor * 100)}%)`);
    console.log(`🎨 画質向上: ${enhance ? '有効' : '無効'}`);
    
    // 特定のファイルが指定されているかチェック
    const specificFiles = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-') && isNaN(parseFloat(arg)));
    
    if (specificFiles.length > 0) {
        // 特定のファイルを処理
        console.log(`📊 処理対象: ${specificFiles.length} ファイル`);
        
        // 出力フォルダの作成
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
        
        for (const filePath of specificFiles) {
            if (fs.existsSync(filePath)) {
                const ext = path.extname(filePath).toLowerCase();
                if (SUPPORTED_EXTENSIONS.includes(ext)) {
                    await processSpecificImage(filePath, scaleFactor, enhance);
                } else {
                    console.log(`⚠️  スキップ: ${path.basename(filePath)} (対応形式外)`);
                }
            } else {
                console.error(`❌ ファイルが見つかりません: ${filePath}`);
            }
        }
    } else {
        // フォルダ内の全ファイルを処理
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
            await processImage(file, scaleFactor, enhance);
        }
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