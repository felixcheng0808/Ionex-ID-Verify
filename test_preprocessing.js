/**
 * 圖片預處理測試腳本
 * 用於測試和比較不同的圖片處理效果
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const inputImage = path.join(__dirname, 'temp/test_id_card.jpg');
const outputDir = path.join(__dirname, 'temp/processed_samples');

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // 目錄已存在
  }
}

async function getImageInfo(filepath, label) {
  const metadata = await sharp(filepath).metadata();
  const stats = await fs.stat(filepath);
  console.log(`\n${label}:`);
  console.log(`  - 尺寸: ${metadata.width}x${metadata.height}`);
  console.log(`  - 格式: ${metadata.format}`);
  console.log(`  - 檔案大小: ${(stats.size / 1024).toFixed(2)} KB`);
}

async function testPreprocessing() {
  console.log('============================================');
  console.log('圖片預處理測試');
  console.log('============================================\n');

  await ensureDir(outputDir);

  // 原始圖片資訊
  await getImageInfo(inputImage, '📄 原始圖片');

  // 1. Google Vision 專用預處理（推薦）
  console.log('\n\n處理中: Google Vision 專用預處理...');
  const googleVisionOutput = path.join(outputDir, '1_google_vision_optimized.jpg');
  await sharp(inputImage)
    .resize(2000, 2000, {
      fit: 'inside',
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3
    })
    .rotate() // 自動旋轉
    .median(2) // 降噪
    .normalize({ lower: 5, upper: 95 }) // 對比增強
    .sharpen({ sigma: 1.0, m1: 0.8, m2: 0.4 }) // 銳化
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(googleVisionOutput);

  await getImageInfo(googleVisionOutput, '✅ Google Vision 優化版');

  // 2. 強化版預處理（更激進）
  console.log('\n\n處理中: 強化版預處理...');
  const enhancedOutput = path.join(outputDir, '2_enhanced.jpg');
  await sharp(inputImage)
    .resize(2500, 2500, {
      fit: 'inside',
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3
    })
    .rotate()
    .median(3) // 更強的降噪
    .normalize({ lower: 1, upper: 99 }) // 更強的對比
    .modulate({
      brightness: 1.1, // 增加亮度
      saturation: 1.2  // 增加飽和度
    })
    .sharpen({ sigma: 1.5, m1: 1.0, m2: 0.5 })
    .jpeg({ quality: 98, mozjpeg: true })
    .toFile(enhancedOutput);

  await getImageInfo(enhancedOutput, '✅ 強化版');

  // 3. 黑白二值化版本（Tesseract 專用）
  console.log('\n\n處理中: 黑白二值化版本...');
  const bwOutput = path.join(outputDir, '3_black_white.png');
  await sharp(inputImage)
    .resize(3000, 3000, {
      fit: 'inside',
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3
    })
    .rotate()
    .median(3)
    .grayscale() // 轉灰階
    .normalize({ lower: 1, upper: 99 })
    .sharpen({ sigma: 1.5, m1: 1.0, m2: 0.5 })
    .linear(1.2, -(128 * 0.2)) // 線性拉伸
    .threshold(128) // 二值化
    .png({ quality: 100 })
    .toFile(bwOutput);

  await getImageInfo(bwOutput, '✅ 黑白二值化版');

  // 4. 保守版（最小處理）
  console.log('\n\n處理中: 保守版預處理...');
  const conservativeOutput = path.join(outputDir, '4_conservative.jpg');
  await sharp(inputImage)
    .resize(1500, 1500, {
      fit: 'inside',
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3
    })
    .rotate()
    .normalize()
    .sharpen()
    .jpeg({ quality: 90 })
    .toFile(conservativeOutput);

  await getImageInfo(conservativeOutput, '✅ 保守版');

  // 5. 超高對比版
  console.log('\n\n處理中: 超高對比版...');
  const highContrastOutput = path.join(outputDir, '5_high_contrast.jpg');
  await sharp(inputImage)
    .resize(2000, 2000, {
      fit: 'inside',
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3
    })
    .rotate()
    .median(2)
    .normalize({ lower: 0.1, upper: 99.9 })
    .modulate({ brightness: 1.15 })
    .linear(1.5, -(128 * 0.5)) // 強化對比
    .sharpen({ sigma: 2.0 })
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(highContrastOutput);

  await getImageInfo(highContrastOutput, '✅ 超高對比版');

  console.log('\n\n============================================');
  console.log('✅ 所有處理完成！');
  console.log('============================================\n');
  console.log(`處理後的圖片已儲存至: ${outputDir}\n`);
  console.log('檔案列表:');
  console.log('  1. 1_google_vision_optimized.jpg - Google Vision 專用（推薦）');
  console.log('  2. 2_enhanced.jpg - 強化版');
  console.log('  3. 3_black_white.png - 黑白二值化');
  console.log('  4. 4_conservative.jpg - 保守版');
  console.log('  5. 5_high_contrast.jpg - 超高對比版');
  console.log('\n建議使用: 1_google_vision_optimized.jpg (最適合 Google Vision API)');
}

// 執行測試
testPreprocessing()
  .then(() => {
    console.log('\n測試完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n錯誤:', error.message);
    process.exit(1);
  });
