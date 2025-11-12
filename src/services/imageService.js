const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ImageService {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
  }

  /**
   * 從 URL 下載圖片
   * @param {string} imageUrl - 圖片 URL
   * @returns {Promise<string>} 下載後的檔案路徑
   */
  async downloadFromUrl(imageUrl) {
    try {
      // 驗證 URL 格式
      const url = new URL(imageUrl);

      // 防止 SSRF 攻擊 - 只允許 http/https
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('只支援 HTTP/HTTPS 協議');
      }

      // 下載圖片
      const response = await axios({
        url: imageUrl,
        method: 'GET',
        responseType: 'arraybuffer',
        timeout: 30000, // 30秒超時
        maxContentLength: 10 * 1024 * 1024, // 最大 10MB
        headers: {
          'User-Agent': 'Ionex-ID-Verify/1.0'
        }
      });

      // 生成唯一檔案名
      const filename = `${uuidv4()}.jpg`;
      const filepath = path.join(this.tempDir, filename);

      // 儲存檔案
      await fs.writeFile(filepath, response.data);

      return filepath;
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        throw new Error('無法連接到指定的 URL');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('下載圖片超時');
      } else if (error.response && error.response.status === 404) {
        throw new Error('圖片不存在');
      }
      throw new Error(`下載圖片失敗: ${error.message}`);
    }
  }

  /**
   * 預處理圖片以提高 OCR 準確度
   * @param {string} inputPath - 輸入圖片路徑
   * @param {object} options - 預處理選項
   * @returns {Promise<string>} 處理後的圖片路徑
   */
  async preprocessImage(inputPath, options = {}) {
    try {
      const {
        useAdvancedProcessing = true, // 使用進階處理
        targetWidth = 3000,
        targetHeight = 3000,
        enhanceContrast = true,
        sharpen = true,
        denoise = true
      } = options;

      const outputFilename = `processed_${uuidv4()}.png`;
      const outputPath = path.join(this.tempDir, outputFilename);

      console.log('開始圖片預處理...');
      console.log('- 進階處理:', useAdvancedProcessing);
      console.log('- 目標尺寸:', `${targetWidth}x${targetHeight}`);

      let pipeline = sharp(inputPath);

      // 1. 調整圖片尺寸
      pipeline = pipeline.resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: false,
        kernel: sharp.kernel.lanczos3
      });

      if (useAdvancedProcessing) {
        // 2. 自動旋轉（根據 EXIF）
        pipeline = pipeline.rotate();

        // 3. 降噪處理
        if (denoise) {
          pipeline = pipeline.median(3); // 中值濾波降噪
        }

        // 4. 增強對比度和亮度
        if (enhanceContrast) {
          pipeline = pipeline.normalize({
            lower: 1,
            upper: 99
          });
        }

        // 5. 銳化處理
        if (sharpen) {
          pipeline = pipeline.sharpen({
            sigma: 1.5,
            m1: 1.0,
            m2: 0.5,
            x1: 3,
            y2: 15,
            y3: 15
          });
        }

        // 6. 轉為灰階
        pipeline = pipeline.grayscale();

        // 7. 增強對比（線性拉伸）
        pipeline = pipeline.linear(1.2, -(128 * 0.2));

        // 8. 自適應二值化（使用閾值）
        pipeline = pipeline.threshold(128);
      } else {
        // 簡單處理模式
        pipeline = pipeline
          .grayscale()
          .normalize()
          .sharpen()
          .threshold(128);
      }

      // 9. 輸出為高品質 PNG
      pipeline = pipeline.png({
        compressionLevel: 6,
        quality: 100
      });

      // 執行處理
      await pipeline.toFile(outputPath);

      console.log('✓ 圖片預處理完成:', outputPath);

      // 顯示處理後的圖片資訊
      const info = await this.getImageInfo(outputPath);
      console.log(`  - 尺寸: ${info.width}x${info.height}`);
      console.log(`  - 檔案大小: ${info.sizeInMB} MB`);

      return outputPath;
    } catch (error) {
      throw new Error(`圖片預處理失敗: ${error.message}`);
    }
  }

  /**
   * 針對 Google Vision API 的專用預處理
   * @param {string} inputPath - 輸入圖片路徑
   * @returns {Promise<string>} 處理後的圖片路徑
   */
  async preprocessForGoogleVision(inputPath) {
    try {
      const outputFilename = `google_vision_${uuidv4()}.jpg`;
      const outputPath = path.join(this.tempDir, outputFilename);

      console.log('為 Google Vision API 預處理圖片...');

      // Google Vision API 適用的處理方式
      // 保留彩色、適度增強、不過度處理
      await sharp(inputPath)
        // 調整到合適的尺寸（不要太大以節省 API 費用）
        .resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: false,
          kernel: sharp.kernel.lanczos3
        })
        // 自動旋轉
        .rotate()
        // 降噪
        .median(2)
        // 適度增強對比度
        .normalize({
          lower: 5,
          upper: 95
        })
        // 適度銳化
        .sharpen({
          sigma: 1.0,
          m1: 0.8,
          m2: 0.4
        })
        // 輸出為高品質 JPEG（Google Vision 支援且檔案較小）
        .jpeg({
          quality: 95,
          mozjpeg: true
        })
        .toFile(outputPath);

      console.log('✓ Google Vision 預處理完成:', outputPath);

      const info = await this.getImageInfo(outputPath);
      console.log(`  - 尺寸: ${info.width}x${info.height}`);
      console.log(`  - 檔案大小: ${info.sizeInMB} MB`);

      return outputPath;
    } catch (error) {
      throw new Error(`Google Vision 預處理失敗: ${error.message}`);
    }
  }

  /**
   * 驗證圖片檔案
   * @param {string} filepath - 檔案路徑
   * @returns {Promise<boolean>}
   */
  async validateImage(filepath) {
    try {
      const metadata = await sharp(filepath).metadata();

      // 檢查是否為支援的圖片格式
      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
      if (!supportedFormats.includes(metadata.format)) {
        throw new Error('不支援的圖片格式，僅支援 JPG、PNG、WEBP');
      }

      // 檢查圖片尺寸
      if (metadata.width < 100 || metadata.height < 100) {
        throw new Error('圖片尺寸太小，至少需要 100x100 像素');
      }

      return true;
    } catch (error) {
      throw new Error(`圖片驗證失敗: ${error.message}`);
    }
  }

  /**
   * 刪除臨時檔案
   * @param {string} filepath - 檔案路徑
   */
  async cleanupFile(filepath) {
    try {
      if (filepath && await this.fileExists(filepath)) {
        await fs.unlink(filepath);
      }
    } catch (error) {
      console.error(`清理檔案失敗: ${error.message}`);
    }
  }

  /**
   * 刪除多個臨時檔案
   * @param {string[]} filepaths - 檔案路徑陣列
   */
  async cleanupFiles(filepaths) {
    const promises = filepaths.map(fp => this.cleanupFile(fp));
    await Promise.all(promises);
  }

  /**
   * 檢查檔案是否存在
   * @param {string} filepath - 檔案路徑
   * @returns {Promise<boolean>}
   */
  async fileExists(filepath) {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 獲取圖片資訊
   * @param {string} filepath - 檔案路徑
   * @returns {Promise<object>} 圖片元資料
   */
  async getImageInfo(filepath) {
    try {
      const metadata = await sharp(filepath).metadata();
      const stats = await fs.stat(filepath);

      return {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: stats.size,
        sizeInMB: (stats.size / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      throw new Error(`獲取圖片資訊失敗: ${error.message}`);
    }
  }
}

module.exports = new ImageService();
