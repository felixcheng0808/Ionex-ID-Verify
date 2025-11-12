const vision = require('@google-cloud/vision');
const fs = require('fs').promises;

class OCRService {
  constructor() {
    this.client = null;
    this.ocrEngine = null;
    this.isInitialized = false;

    // 支援三種 OCR 引擎：google、paddle、tesseract
    const engineType = process.env.OCR_ENGINE || 'paddle';
    this.useGoogleVision = engineType === 'google';
    this.usePaddleOCR = engineType === 'paddle';
    this.useTesseract = engineType === 'tesseract';

    // 調試輸出
    console.log('OCR Service 配置:');
    console.log('- OCR_ENGINE 環境變數:', process.env.OCR_ENGINE);
    console.log('- 使用引擎:', engineType);
    if (this.useGoogleVision) {
      console.log('- GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    }
  }

  /**
   * 初始化 OCR 引擎
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      if (this.useGoogleVision) {
        // 使用 Google Cloud Vision API
        const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        if (!keyFilename) {
          console.warn('⚠️  未設定 GOOGLE_APPLICATION_CREDENTIALS，將使用預設憑證');
        }

        this.client = new vision.ImageAnnotatorClient(
          keyFilename ? { keyFilename } : {}
        );

        this.isInitialized = true;
        console.log('✓ Google Cloud Vision API 初始化完成');
      } else if (this.usePaddleOCR) {
        // 使用 PaddleOCR (Guten OCR)
        // 使用動態 import 以支援 ES Module
        const ocrModule = await import('@gutenye/ocr-node');
        const Ocr = ocrModule.default;

        console.log('正在初始化 PaddleOCR (Guten OCR)...');
        this.ocrEngine = await Ocr.create({
          debug: false, // 設為 true 可看詳細日誌
        });

        this.isInitialized = true;
        console.log('✓ PaddleOCR (Guten OCR) 初始化完成');
      } else if (this.useTesseract) {
        // 使用 Tesseract.js (備選)
        const Tesseract = require('tesseract.js');

        this.worker = await Tesseract.createWorker('chi_tra', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR 進度: ${Math.round(m.progress * 100)}%`);
            }
          },
        });

        await this.worker.setParameters({
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz一二三四五六七八九十年月日台北新竹苗栗台中彰化南投雲林嘉義台南高雄屏東宜蘭花蓮台東澎湖金門連江基隆桃園男女省市縣',
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        });

        this.isInitialized = true;
        console.log('✓ Tesseract OCR 初始化完成');
      }
    } catch (error) {
      throw new Error(`OCR 初始化失敗: ${error.message}`);
    }
  }

  /**
   * 辨識圖片中的文字
   * @param {string} imagePath - 圖片路徑
   * @returns {Promise<object>} OCR 結果
   */
  async recognizeText(imagePath) {
    try {
      // 確保已初始化
      if (!this.isInitialized) {
        await this.initialize();
      }

      // 檢查檔案是否存在
      await fs.access(imagePath);

      if (this.useGoogleVision) {
        return await this.recognizeWithGoogleVision(imagePath);
      } else if (this.usePaddleOCR) {
        return await this.recognizeWithPaddleOCR(imagePath);
      } else {
        return await this.recognizeWithTesseract(imagePath);
      }
    } catch (error) {
      console.error('OCR 錯誤詳情:', error);
      throw new Error(`OCR 辨識失敗: ${error.message}`);
    }
  }

  /**
   * 使用 Google Vision API 辨識
   * @param {string} imagePath - 圖片路徑
   * @returns {Promise<object>} OCR 結果
   */
  async recognizeWithGoogleVision(imagePath) {
    try {
      console.log('使用 Google Cloud Vision API 辨識...');

      // 讀取圖片
      const imageBuffer = await fs.readFile(imagePath);

      // 調用 Google Vision API
      const [result] = await this.client.textDetection({
        image: { content: imageBuffer }
      });

      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        console.log('未偵測到任何文字');
        return {
          text: '',
          confidence: 0,
          words: [],
          lines: []
        };
      }

      // 第一個元素是完整文字
      const fullText = detections[0].description || '';

      // 計算平均信心度
      let totalConfidence = 0;
      let count = 0;

      for (const detection of detections.slice(1)) {
        if (detection.confidence !== undefined) {
          totalConfidence += detection.confidence;
          count++;
        }
      }

      const avgConfidence = count > 0 ? (totalConfidence / count) * 100 : 0;

      console.log('Google Vision 辨識結果:');
      console.log('- 文字長度:', fullText.length);
      console.log('- 信心度:', avgConfidence.toFixed(2) + '%');
      console.log('- 前100字元:', fullText.substring(0, 100));

      // 將結果轉換為統一格式
      const words = detections.slice(1).map(detection => ({
        text: detection.description,
        confidence: (detection.confidence || 0) * 100,
        bbox: detection.boundingPoly ? {
          x0: detection.boundingPoly.vertices[0]?.x || 0,
          y0: detection.boundingPoly.vertices[0]?.y || 0,
          x1: detection.boundingPoly.vertices[2]?.x || 0,
          y1: detection.boundingPoly.vertices[2]?.y || 0
        } : null
      }));

      return {
        text: fullText,
        confidence: avgConfidence,
        words: words,
        lines: [] // Google Vision 主要返回 words，lines 可以從 words 組合
      };
    } catch (error) {
      console.error('Google Vision API 錯誤詳情:');
      console.error('- 錯誤代碼:', error.code);
      console.error('- 錯誤訊息:', error.message);
      console.error('- 完整錯誤:', error);

      if (error.code === 7) {
        throw new Error(`Google Vision API 權限不足: ${error.message}`);
      } else if (error.code === 16) {
        throw new Error(`未經授權: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 使用 PaddleOCR (Guten OCR) 辨識
   * @param {string} imagePath - 圖片路徑
   * @returns {Promise<object>} OCR 結果
   */
  async recognizeWithPaddleOCR(imagePath) {
    try {
      console.log('使用 PaddleOCR (Guten OCR) 辨識...');

      // 讀取圖片
      const imageBuffer = await fs.readFile(imagePath);

      // 調用 PaddleOCR
      const result = await this.ocrEngine.detect(imageBuffer);

      console.log('PaddleOCR 辨識結果:');
      console.log('- 偵測到文字區塊數:', result.length);

      // 提取所有文字和計算平均信心度
      let fullText = '';
      let totalConfidence = 0;
      const words = [];

      for (const detection of result) {
        const text = detection.text || '';
        const confidence = (detection.score || 0) * 100;

        fullText += text + '\n';
        totalConfidence += confidence;

        words.push({
          text: text,
          confidence: confidence,
          bbox: detection.box ? {
            x0: Math.min(...detection.box.map(p => p[0])),
            y0: Math.min(...detection.box.map(p => p[1])),
            x1: Math.max(...detection.box.map(p => p[0])),
            y1: Math.max(...detection.box.map(p => p[1]))
          } : null
        });
      }

      const avgConfidence = result.length > 0 ? totalConfidence / result.length : 0;

      console.log('- 文字長度:', fullText.length);
      console.log('- 平均信心度:', avgConfidence.toFixed(2) + '%');
      console.log('- 前100字元:', fullText.substring(0, 100));

      return {
        text: fullText.trim(),
        confidence: avgConfidence,
        words: words,
        lines: [] // PaddleOCR 返回 words，可以從 words 組合成 lines
      };
    } catch (error) {
      console.error('PaddleOCR 錯誤:', error);
      throw error;
    }
  }

  /**
   * 使用 Tesseract.js 辨識 (備用方案)
   * @param {string} imagePath - 圖片路徑
   * @returns {Promise<object>} OCR 結果
   */
  async recognizeWithTesseract(imagePath) {
    try {
      console.log('使用 Tesseract.js 辨識...');

      const result = await this.worker.recognize(imagePath);
      const data = result.data || result;

      console.log('Tesseract 辨識結果:');
      console.log('- 文字長度:', data.text ? data.text.length : 0);
      console.log('- 信心度:', data.confidence || 0);
      console.log('- 前100字元:', (data.text || '').substring(0, 100));

      return {
        text: data.text || '',
        confidence: data.confidence || 0,
        words: Array.isArray(data.words) ? data.words.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        })) : [],
        lines: Array.isArray(data.lines) ? data.lines.map(line => ({
          text: line.text,
          confidence: line.confidence,
          bbox: line.bbox
        })) : []
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 清理並關閉 client
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }

    this.client = null;
    this.isInitialized = false;
    console.log('OCR 服務已關閉');
  }

  /**
   * 獲取 OCR 狀態
   */
  getStatus() {
    let engine = 'Unknown';
    if (this.useGoogleVision) {
      engine = 'Google Cloud Vision API';
    } else if (this.usePaddleOCR) {
      engine = 'PaddleOCR (Guten OCR)';
    } else if (this.useTesseract) {
      engine = 'Tesseract.js';
    }

    return {
      isInitialized: this.isInitialized,
      engine: engine,
      hasClient: this.client !== null || this.ocrEngine !== null || this.worker !== null
    };
  }
}

module.exports = new OCRService();
