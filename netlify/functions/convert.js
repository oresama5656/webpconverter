const sharp = require('sharp');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  // CORS設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONSリクエスト（プリフライト）の処理
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { files, scale, enhance } = body;

    if (!files || files.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'ファイルが選択されていません' })
      };
    }

    if (scale < 0.25 || scale > 1.0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '縮小率は0.25〜1.0の範囲で指定してください' })
      };
    }

    const convertedFiles = [];
    const tempDir = '/tmp/converted_files';
    
    // 一時ディレクトリを作成
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    for (let fileData of files) {
      try {
        const { name, data } = fileData;
        const buffer = Buffer.from(data, 'base64');
        const outputName = path.parse(name).name + '.webp';
        const outputPath = path.join(tempDir, outputName);

        const metadata = await sharp(buffer).metadata();
        let img = sharp(buffer);

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

        convertedFiles.push({ name: outputName, path: outputPath });
      } catch (e) {
        console.error('File processing error:', e);
      }
    }

    if (convertedFiles.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '変換できるファイルがありませんでした' })
      };
    }

    // 結果を返す
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        files: convertedFiles.map(f => ({
          name: f.name,
          data: fs.readFileSync(f.path).toString('base64')
        })),
        message: `${convertedFiles.length}ファイルの変換が完了しました。`
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}; 