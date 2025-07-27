const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// フォルダパス
const INPUT_DIR = 'input_images';
const TEMP_DIR = 'temp_images';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'output_webp_resize';

// 対応する画像拡張子
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

// 設定管理クラス
class ConversionConfig {
    constructor(scaleFactor, enhance = true) {
        this.scaleFactor = scaleFactor;
        this.enhance = enhance;
        this.webpOptions = {
            quality: 90,
            effort: 6,
            alphaQuality: 100,
            lossless: false
        };
        this.resizeOptions = {
            kernel: sharp.kernel.lanczos3,
            fit: 'fill'
        };
    }

    getUpscaleRules() {
        return {
            small: { threshold: 800, scale: 2.0 },
            medium: { threshold: 1200, scale: 1.5 },
            large: { threshold: Infinity, scale: 1.0 }
        };
    }

    getUpscaleFactorForDimensions(width, height) {
        const maxDimension = Math.max(width, height);
        const rules = this.getUpscaleRules();
        
        if (maxDimension <= rules.small.threshold) {
            return rules.small.scale;
        } else if (maxDimension <= rules.medium.threshold) {
            return rules.medium.scale;
        }
        return rules.large.scale;
    }
}

// ファイル操作ユーティリティクラス
class FileUtils {
    static isImageFile(filename) {
        const ext = path.extname(filename).toLowerCase();
        return SUPPORTED_EXTENSIONS.includes(ext);
    }

    static changeExtensionToWebp(filename) {
        const nameWithoutExt = path.parse(filename).name;
        return nameWithoutExt + '.webp';
    }

    static ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    static clearDirectory(dirPath) {
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            files.forEach(file => {
                fs.unlinkSync(path.join(dirPath, file));
            });
            console.log(`🗑️  ${dirPath} フォルダをクリアしました`);
        } else {
            FileUtils.ensureDirectoryExists(dirPath);
            console.log(`📁 ${dirPath} フォルダを作成しました`);
        }
    }
}

// 画像処理クラス
class ImageProcessor {
    constructor(config) {
        this.config = config;
    }

    async getImageMetadata(imagePath) {
        return await sharp(imagePath).metadata();
    }

    async upscaleImage(inputPath, outputPath, scaleFactor) {
        try {
            const metadata = await this.getImageMetadata(inputPath);
            const newWidth = Math.round(metadata.width * scaleFactor);
            const newHeight = Math.round(metadata.height * scaleFactor);
            
            await sharp(inputPath)
                .resize(newWidth, newHeight, this.config.resizeOptions)
                .png({ quality: 100, compressionLevel: 0 })
                .toFile(outputPath);
                
            console.log(`📈 拡大完了: ${path.basename(inputPath)} (${scaleFactor}x)`);
        } catch (error) {
            throw new Error(`画像拡大エラー: ${error.message}`);
        }
    }

    async convertToWebp(inputPath, outputPath, scaleFactor) {
        try {
            const metadata = await this.getImageMetadata(inputPath);
            const newWidth = Math.round(metadata.width * scaleFactor);
            const newHeight = Math.round(metadata.height * scaleFactor);
            
            await sharp(inputPath)
                .resize(newWidth, newHeight, this.config.resizeOptions)
                .webp(this.config.webpOptions)
                .toFile(outputPath);
                
            console.log(`📏 リサイズ: ${metadata.width}x${metadata.height} → ${newWidth}x${newHeight}`);
            console.log(`🔄 WebP変換完了: ${path.basename(outputPath)}`);
        } catch (error) {
            throw new Error(`WebP変換エラー: ${error.message}`);
        }
    }

    async convertWithEnhancement(inputPath, outputPath, targetScaleFactor) {
        try {
            const metadata = await this.getImageMetadata(inputPath);
            const originalWidth = metadata.width;
            const originalHeight = metadata.height;
            
            const enhanceScaleFactor = this.config.getUpscaleFactorForDimensions(originalWidth, originalHeight);
            
            if (enhanceScaleFactor > 1.0) {
                return await this._processWithUpscaling(
                    inputPath, outputPath, metadata, 
                    enhanceScaleFactor, targetScaleFactor
                );
            } else {
                return await this.convertToWebp(inputPath, outputPath, targetScaleFactor);
            }
        } catch (error) {
            throw new Error(`WebP変換エラー: ${error.message}`);
        }
    }

    async _processWithUpscaling(inputPath, outputPath, metadata, enhanceScale, targetScale) {
        const tempFilename = path.parse(path.basename(inputPath)).name + '_temp.png';
        const tempPath = path.join(TEMP_DIR, tempFilename);
        
        try {
            await this.upscaleImage(inputPath, tempPath, enhanceScale);
            
            const targetWidth = Math.round(metadata.width * targetScale);
            const targetHeight = Math.round(metadata.height * targetScale);
            
            await sharp(tempPath)
                .resize(targetWidth, targetHeight, this.config.resizeOptions)
                .webp(this.config.webpOptions)
                .toFile(outputPath);
                
            console.log(`📏 拡大→リサイズ: ${metadata.width}x${metadata.height} → ${targetWidth}x${targetHeight} (拡大${enhanceScale}x)`);
            console.log(`🔄 WebP変換完了: ${path.basename(outputPath)}`);
            
            fs.unlinkSync(tempPath);
        } catch (error) {
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            throw error;
        }
    }
}

// 下位互換性のための関数（非推奨）
function getScaleFactor(width, height) {
    const config = new ConversionConfig(1.0);
    return config.getUpscaleFactorForDimensions(width, height);
}

function changeExtensionToWebp(filename) {
    return FileUtils.changeExtensionToWebp(filename);
}

function clearTempDirectory() {
    FileUtils.clearDirectory(TEMP_DIR);
}

async function upscaleImage(inputPath, tempPath, scaleFactor) {
    const config = new ConversionConfig(1.0);
    const processor = new ImageProcessor(config);
    return await processor.upscaleImage(inputPath, tempPath, scaleFactor);
}

async function convertToWebpWithResize(inputPath, outputPath, scaleFactor) {
    const config = new ConversionConfig(scaleFactor);
    const processor = new ImageProcessor(config);
    return await processor.convertToWebp(inputPath, outputPath, scaleFactor);
}

async function convertToWebpWithEnhancement(inputPath, outputPath, targetScaleFactor) {
    const config = new ConversionConfig(targetScaleFactor, true);
    const processor = new ImageProcessor(config);
    return await processor.convertWithEnhancement(inputPath, outputPath, targetScaleFactor);
}

/**
 * 単一画像の処理
 * @param {string} filename 
 * @param {number} scaleFactor 
 * @param {boolean} enhance 
 */
async function processImage(filename, scaleFactor, enhance) {
    const inputPath = path.join(INPUT_DIR, filename);
    const outputFilename = FileUtils.changeExtensionToWebp(filename);
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    
    const config = new ConversionConfig(scaleFactor, enhance);
    const processor = new ImageProcessor(config);
    
    try {
        console.log(`\n🔄 処理開始: ${filename}`);
        
        const metadata = await processor.getImageMetadata(inputPath);
        
        console.log(`📏 元サイズ: ${metadata.width} x ${metadata.height}`);
        console.log(`🔍 縮小率: ${scaleFactor}x`);
        console.log(`🎨 画質向上: ${enhance ? '有効' : '無効'}`);
        
        if (enhance) {
            await processor.convertWithEnhancement(inputPath, outputPath, scaleFactor);
        } else {
            await processor.convertToWebp(inputPath, outputPath, scaleFactor);
        }
        
        console.log(`✅ 変換完了: ${outputFilename}`);
        
    } catch (error) {
        console.error(`❌ エラー: ${filename} - ${error.message}`);
        throw error;
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
    const outputFilename = FileUtils.changeExtensionToWebp(path.basename(filePath));
    const outputPath = path.join(outputDir, outputFilename);
    
    const config = new ConversionConfig(scaleFactor, enhance);
    const processor = new ImageProcessor(config);
    
    try {
        console.log(`\n🔄 処理開始: ${path.basename(filePath)}`);
        
        const metadata = await processor.getImageMetadata(filePath);
        
        console.log(`📏 元サイズ: ${metadata.width} x ${metadata.height}`);
        console.log(`🔍 縮小率: ${scaleFactor}x`);
        console.log(`🎨 画質向上: ${enhance ? '有効' : '無効'}`);
        
        if (enhance) {
            await processor.convertWithEnhancement(filePath, outputPath, scaleFactor);
        } else {
            await processor.convertToWebp(filePath, outputPath, scaleFactor);
        }
        
        console.log(`✅ 変換完了: ${outputFilename}`);
        
    } catch (error) {
        console.error(`❌ エラー: ${path.basename(filePath)} - ${error.message}`);
        throw error;
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
        
        FileUtils.ensureDirectoryExists(OUTPUT_DIR);
        
        for (const filePath of specificFiles) {
            if (fs.existsSync(filePath)) {
                if (FileUtils.isImageFile(filePath)) {
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
        
        FileUtils.ensureDirectoryExists(OUTPUT_DIR);
        FileUtils.clearDirectory(TEMP_DIR);
        
        const files = fs.readdirSync(INPUT_DIR).filter(file => {
            return FileUtils.isImageFile(file);
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

// エラーハンドリングクラス
class ErrorHandler {
    static handleError(error, context = '') {
        const timestamp = new Date().toISOString();
        const message = context ? `${context}: ${error.message}` : error.message;
        
        console.error(`❌ [${timestamp}] ${message}`);
        
        if (process.env.NODE_ENV === 'development') {
            console.error('スタックトレース:', error.stack);
        }
    }

    static handleAsyncError(error, context = '') {
        ErrorHandler.handleError(error, context);
        
        // 致命的でないエラーの場合は処理を継続
        if (error.code === 'ENOENT' || error.code === 'EACCES') {
            console.log('⚠️ 処理を継続します...');
            return false; // 継続
        }
        
        return true; // 終了
    }

    static setupGlobalHandlers() {
        process.on('uncaughtException', (error) => {
            ErrorHandler.handleError(error, '予期しないエラー');
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            ErrorHandler.handleError(reason, '未処理のPromise拒否');
            process.exit(1);
        });
    }
}

// グローバルエラーハンドラーの設定
ErrorHandler.setupGlobalHandlers();

// メイン処理実行
main().catch(error => {
    ErrorHandler.handleError(error, 'メイン処理エラー');
    process.exit(1);
}); 