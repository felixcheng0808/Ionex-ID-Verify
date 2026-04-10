const imageService = require('../services/imageService');
const ocrService = require('../services/ocrService');
const parserService = require('../services/parserService');
const Joi = require('joi');

class IDCardController {
  /**
   * 透過 URL 辨識身分證
   */
  async verifyByUrl(req, res) {
    let downloadedFile = null;
    let processedFile = null;
    const tracker = imageService.createResourceTracker();

    try {
      // 驗證請求資料
      const schema = Joi.object({
        imageUrl: Joi.string().uri().required().messages({
          'string.uri': '請提供有效的圖片 URL',
          'any.required': '請提供圖片 URL'
        }),
        documentType: Joi.string().valid('id_card', 'driving_license', 'auto').default('auto').messages({
          'any.only': 'documentType 必須是 id_card, driving_license 或 auto'
        }),
        displayName: Joi.string().allow('', null).optional()  // 用於輔助姓名辨識
      }).unknown(true);

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { imageUrl, documentType, displayName } = value;

      // 1. 下載圖片（帶入追蹤器記錄流量）
      console.log('正在下載圖片...');
      downloadedFile = await imageService.downloadFromUrl(imageUrl, tracker);

      // 2. 驗證圖片
      await imageService.validateImage(downloadedFile);

      // 3. 預處理圖片（根據 OCR 引擎選擇預處理方式）
      console.log('正在預處理圖片...');

      if (ocrService.useGoogleVision || ocrService.usePaddleOCR) {
        // 使用 Google Vision / PaddleOCR 專用預處理（彩色、適度增強）
        processedFile = await imageService.preprocessForGoogleVision(downloadedFile);
      } else {
        // 使用 Tesseract 專用預處理（灰階、強化處理）
        processedFile = await imageService.preprocessImage(downloadedFile);
      }

      // 4. 執行 OCR
      console.log('正在進行 OCR 辨識...');
      const ocrResult = await ocrService.recognizeText(processedFile);

      // 5. 判斷證件類型並解析
      console.log('正在解析證件資訊...');
      let parseResult;
      const text = ocrResult.text || '';

      // 根據 documentType 參數決定解析方式
      let isDrivingLicense = false;

      if (documentType === 'id_card') {
        // 強制使用身分證解析器
        console.log('指定使用身分證解析器...');
        isDrivingLicense = false;
      } else if (documentType === 'driving_license') {
        // 強制使用駕照解析器
        console.log('指定使用駕照解析器...');
        isDrivingLicense = true;
      } else {
        // 自動判斷 (包含「駕照」、「駕駛執照」、「機車」等關鍵字)
        isDrivingLicense = text.includes('駕照') ||
                           text.includes('駕駛執照') ||
                           text.includes('交通部') ||
                           /[A-Z]\d{2}\d{7,8}/.test(text); // 駕照號碼格式
      }

      if (isDrivingLicense) {
        console.log('使用駕照解析器...');
        parseResult = parserService.parseDrivingLicense(ocrResult);
      } else {
        console.log('使用身分證解析器...');
        parseResult = parserService.parseIDCard(ocrResult, { displayName });
      }

      // 6. 驗證解析結果
      const validation = parserService.validateParseResult(parseResult);

      // 7. 取得資源使用統計
      const resourceStats = tracker.getStats();
      console.log('資源使用統計:', JSON.stringify(resourceStats, null, 2));

      // 8. 回傳結果
      const response = {
        success: parseResult.success,
        data: parseResult.data,
        validation: {
          isComplete: validation.isComplete,
          missingFields: validation.missingFields,
        },
        confidence: parseResult.confidence,
        message: parseResult.success ? '辨識成功' : '辨識失敗，請確認圖片品質',
        resourceUsage: {
          processingTimeMs: resourceStats.processingTimeMs,
          downloadBytes: resourceStats.downloadBytes,
          downloadKB: resourceStats.downloadKB,
          memoryUsedMB: resourceStats.memory.heapUsedDiffMB
        }
      };

      return res.json(response);

    } catch (error) {
      console.error('辨識錯誤:', error);
      return res.status(500).json({
        success: false,
        error: error.message || '辨識過程發生錯誤'
      });
    } finally {
      // 清理臨時檔案
      await imageService.cleanupFiles([downloadedFile, processedFile]);
    }
  }

  /**
   * 透過上傳圖片辨識身分證
   */
  async verifyByUpload(req, res) {
    let processedFile = null;
    const uploadedFile = req.file ? req.file.path : null;
    const tracker = imageService.createResourceTracker();

    try {
      // 檢查是否有上傳檔案（由 middleware 處理，這裡雙重檢查）
      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          error: '請上傳圖片檔案'
        });
      }

      // 記錄上傳檔案大小
      const fs = require('fs').promises;
      const uploadStats = await fs.stat(uploadedFile);
      tracker.addDownloadBytes(uploadStats.size);
      console.log(`上傳檔案大小: ${(uploadStats.size / 1024).toFixed(2)} KB`);

      // 1. 驗證圖片
      await imageService.validateImage(uploadedFile);

      // 2. 預處理圖片（根據 OCR 引擎選擇預處理方式）
      console.log('正在預處理圖片...');

      if (ocrService.useGoogleVision || ocrService.usePaddleOCR) {
        // 使用 Google Vision / PaddleOCR 專用預處理（彩色、適度增強）
        processedFile = await imageService.preprocessForGoogleVision(uploadedFile);
      } else {
        // 使用 Tesseract 專用預處理（灰階、強化處理）
        processedFile = await imageService.preprocessImage(uploadedFile);
      }

      // 3. 執行 OCR
      console.log('正在進行 OCR 辨識...');
      const ocrResult = await ocrService.recognizeText(processedFile);

      // 4. 判斷證件類型並解析
      console.log('正在解析證件資訊...');
      let parseResult;
      const text = ocrResult.text || '';

      // 判斷是否為駕照
      const isDrivingLicense = text.includes('駕照') ||
                               text.includes('駕駛執照') ||
                               text.includes('交通部') ||
                               /[A-Z]\d{2}\d{7,8}/.test(text);

      if (isDrivingLicense) {
        console.log('偵測到駕照,使用駕照解析器...');
        parseResult = parserService.parseDrivingLicense(ocrResult);
      } else {
        console.log('使用身分證解析器...');
        parseResult = parserService.parseIDCard(ocrResult);
      }

      // 5. 驗證解析結果
      const validation = parserService.validateParseResult(parseResult);

      // 6. 取得資源使用統計
      const resourceStats = tracker.getStats();
      console.log('資源使用統計:', JSON.stringify(resourceStats, null, 2));

      // 7. 回傳結果
      const response = {
        success: parseResult.success,
        data: parseResult.data,
        validation: {
          isComplete: validation.isComplete,
          missingFields: validation.missingFields,
        },
        confidence: parseResult.confidence,
        message: parseResult.success ? '辨識成功' : '辨識失敗，請確認圖片品質',
        resourceUsage: {
          processingTimeMs: resourceStats.processingTimeMs,
          uploadBytes: resourceStats.downloadBytes,
          uploadKB: resourceStats.downloadKB,
          memoryUsedMB: resourceStats.memory.heapUsedDiffMB
        }
      };

      return res.json(response);

    } catch (error) {
      console.error('辨識錯誤:', error);
      return res.status(500).json({
        success: false,
        error: error.message || '辨識過程發生錯誤'
      });
    } finally {
      // 清理臨時檔案
      await imageService.cleanupFiles([uploadedFile, processedFile]);
    }
  }

  /**
   * 取得 API 狀態
   */
  async getStatus(req, res) {
    try {
      const ocrStatus = ocrService.getStatus();

      return res.json({
        success: true,
        status: 'running',
        ocr: ocrStatus,
        version: '1.0.0'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 健康檢查端點
   */
  async healthCheck(req, res) {
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new IDCardController();
