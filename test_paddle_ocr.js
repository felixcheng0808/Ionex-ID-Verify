/**
 * 測試 PaddleOCR 辨識效果
 */

const path = require('path');
const fs = require('fs').promises;

// 設定環境變數使用 PaddleOCR
process.env.OCR_ENGINE = 'paddle';

const ocrService = require('./src/services/ocrService');

async function testPaddleOCR() {
  console.log('============================================');
  console.log('PaddleOCR 辨識測試');
  console.log('============================================\n');

  const imagePath = path.join(__dirname, 'temp/processed_samples/1_google_vision_optimized.jpg');

  try {
    // 檢查檔案是否存在
    await fs.access(imagePath);
    console.log('✓ 測試圖片:', imagePath);
    console.log('\n開始辨識...\n');

    // 執行 OCR
    const startTime = Date.now();
    const result = await ocrService.recognizeText(imagePath);
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n============================================');
    console.log('✅ 辨識完成！');
    console.log('============================================\n');

    console.log(`耗時: ${elapsedTime} 秒\n`);

    console.log('辨識結果:');
    console.log('-'.repeat(44));
    console.log(result.text);
    console.log('-'.repeat(44));
    console.log(`\n平均信心度: ${result.confidence.toFixed(2)}%`);
    console.log(`偵測到文字區塊數: ${result.words.length}`);

    console.log('\n文字區塊詳情:');
    result.words.forEach((word, index) => {
      console.log(`  ${index + 1}. "${word.text}" (信心度: ${word.confidence.toFixed(2)}%)`);
    });

  } catch (error) {
    console.error('\n❌ 錯誤:', error.message);
    console.error(error);
  } finally {
    await ocrService.terminate();
    process.exit(0);
  }
}

// 執行測試
testPaddleOCR();
