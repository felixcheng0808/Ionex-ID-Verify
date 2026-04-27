const crypto = require('crypto');
const imageService = require('../services/imageService');
const ocrService = require('../services/ocrService');
const parserService = require('../services/parserService');
const errorLogService = require('../services/errorLogService');
const { STEPS, ERROR_CODES, logError } = errorLogService;
const Joi = require('joi');

class IDCardController {
  /**
   * 透過 URL 辨識身分證
   */
  async verifyByUrl(req, res) {
    let downloadedFile = null;
    let processedFile = null;
    const tracker = imageService.createResourceTracker();
    const sessionId = crypto.randomUUID();
    const endpoint = '/api/verify/url';

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
        displayName: Joi.string().allow('', null).optional()
      }).unknown(true);

      const { error, value } = schema.validate(req.body);
      if (error) {
        await logError({
          sessionId, endpoint,
          step: STEPS.REQUEST_VALIDATION,
          errorCode: ERROR_CODES.VALIDATION_ERROR,
          message: error.details[0].message,
          context: { body: req.body },
        });
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const { imageUrl, documentType, displayName } = value;
      const baseContext = { documentType, imageUrl, ocrEngine: ocrService.getStatus().engine };

      // 1. 下載圖片
      console.log('正在下載圖片...');
      try {
        downloadedFile = await imageService.downloadFromUrl(imageUrl, tracker);
      } catch (err) {
        await logError({
          sessionId, endpoint,
          step: STEPS.IMAGE_DOWNLOAD,
          errorCode: ERROR_CODES.DOWNLOAD_FAILED,
          message: err.message,
          context: baseContext,
          error: err,
        });
        throw err;
      }

      // 2. 驗證圖片
      try {
        await imageService.validateImage(downloadedFile);
      } catch (err) {
        await logError({
          sessionId, endpoint,
          step: STEPS.IMAGE_VALIDATION,
          errorCode: ERROR_CODES.INVALID_IMAGE,
          message: err.message,
          context: baseContext,
          error: err,
        });
        throw err;
      }

      // 3. 預處理圖片
      console.log('正在預處理圖片...');
      try {
        if (ocrService.useGoogleVision || ocrService.usePaddleOCR) {
          processedFile = await imageService.preprocessForGoogleVision(downloadedFile);
        } else {
          processedFile = await imageService.preprocessImage(downloadedFile);
        }
      } catch (err) {
        await logError({
          sessionId, endpoint,
          step: STEPS.IMAGE_PREPROCESSING,
          errorCode: ERROR_CODES.PREPROCESSING_FAILED,
          message: err.message,
          context: baseContext,
          error: err,
        });
        throw err;
      }

      // 4. 執行 OCR
      console.log('正在進行 OCR 辨識...');
      let ocrResult;
      try {
        ocrResult = await ocrService.recognizeText(processedFile);
      } catch (err) {
        err._logged = true;
        await logError({
          sessionId, endpoint,
          step: STEPS.OCR_RECOGNITION,
          errorCode: ERROR_CODES.OCR_FAILED,
          message: err.message,
          context: baseContext,
          error: err,
        });
        throw err;
      }

      // OCR 空結果或低信心警告
      // confidence === null 代表 PaddleOCR 未回傳評分（非真正低信心），不記錄
      const text = ocrResult.text || '';
      if (!text.trim()) {
        await logError({
          sessionId, endpoint,
          step: STEPS.OCR_RECOGNITION,
          errorCode: ERROR_CODES.OCR_EMPTY_RESULT,
          message: 'OCR 未辨識到任何文字',
          context: { ...baseContext, confidence: ocrResult.confidence },
        });
      } else if (ocrResult.confidence !== null && ocrResult.confidence < 30) {
        await logError({
          sessionId, endpoint,
          step: STEPS.OCR_RECOGNITION,
          errorCode: ERROR_CODES.OCR_LOW_CONFIDENCE,
          message: `OCR 信心值過低: ${ocrResult.confidence.toFixed(1)}%`,
          context: { ...baseContext, confidence: ocrResult.confidence },
        });
      }

      // 5. 判斷證件類型並解析
      console.log('正在解析證件資訊...');
      let parseResult;
      let isDrivingLicense = false;

      if (documentType === 'id_card') {
        console.log('指定使用身分證解析器...');
        isDrivingLicense = false;
      } else if (documentType === 'driving_license') {
        console.log('指定使用駕照解析器...');
        isDrivingLicense = true;
      } else {
        isDrivingLicense = text.includes('駕照') ||
                           text.includes('駕駛執照') ||
                           text.includes('交通部') ||
                           /[A-Z]\d{2}\d{7,8}/.test(text);
      }

      try {
        if (isDrivingLicense) {
          console.log('使用駕照解析器...');
          parseResult = parserService.parseDrivingLicense(ocrResult);
        } else {
          console.log('使用身分證解析器...');
          parseResult = parserService.parseIDCard(ocrResult, { displayName });
        }
      } catch (err) {
        err._logged = true;
        await logError({
          sessionId, endpoint,
          step: STEPS.DATA_PARSING,
          errorCode: ERROR_CODES.PARSE_FAILED,
          message: err.message,
          context: { ...baseContext, confidence: ocrResult.confidence, isDrivingLicense },
          error: err,
        });
        throw err;
      }

      // 6. 驗證解析結果
      const validation = parserService.validateParseResult(parseResult);

      // 記錄欄位缺失的情況，加入 rawText 方便後續 debug 姓名辨識失敗問題
      if (!validation.isComplete) {
        await logError({
          sessionId, endpoint,
          step: STEPS.RESULT_VALIDATION,
          errorCode: ERROR_CODES.INCOMPLETE_RESULT,
          message: `辨識結果欄位不完整，缺少: ${validation.missingFields.join(', ')}`,
          context: {
            ...baseContext,
            confidence: parseResult.confidence,
            isDrivingLicense,
            missingFields: validation.missingFields,
            extractedData: parseResult.data,
            rawText: text.slice(0, 300),
          },
        });
      }

      // 7. 取得資源使用統計
      const resourceStats = tracker.getStats();
      console.log('資源使用統計:', JSON.stringify(resourceStats, null, 2));

      const response = {
        success: parseResult.success,
        data: parseResult.data,
        validation: {
          isComplete: validation.isComplete,
          missingFields: validation.missingFields,
        },
        confidence: parseResult.confidence,
        message: parseResult.success ? '辨識成功' : '辨識失敗，請確認圖片品質',
        sessionId,
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
      // 如果是尚未被個別步驟捕捉的未知錯誤，統一記錄
      if (!error._logged) {
        await logError({
          sessionId, endpoint,
          step: STEPS.DATA_PARSING,
          errorCode: ERROR_CODES.UNKNOWN_ERROR,
          message: error.message || '未知錯誤',
          context: { body: req.body },
          error,
        }).catch(() => {});
      }
      return res.status(500).json({
        success: false,
        error: error.message || '辨識過程發生錯誤',
        sessionId,
      });
    } finally {
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
    const sessionId = crypto.randomUUID();
    const endpoint = '/api/verify/upload';

    try {
      if (!uploadedFile) {
        await logError({
          sessionId, endpoint,
          step: STEPS.REQUEST_VALIDATION,
          errorCode: ERROR_CODES.VALIDATION_ERROR,
          message: '請上傳圖片檔案',
          context: {},
        });
        return res.status(400).json({ success: false, error: '請上傳圖片檔案' });
      }

      const fs = require('fs').promises;
      const uploadStats = await fs.stat(uploadedFile);
      tracker.addDownloadBytes(uploadStats.size);
      console.log(`上傳檔案大小: ${(uploadStats.size / 1024).toFixed(2)} KB`);

      const baseContext = { ocrEngine: ocrService.getStatus().engine, uploadSizeKB: (uploadStats.size / 1024).toFixed(2) };

      // 1. 驗證圖片
      try {
        await imageService.validateImage(uploadedFile);
      } catch (err) {
        await logError({
          sessionId, endpoint,
          step: STEPS.IMAGE_VALIDATION,
          errorCode: ERROR_CODES.INVALID_IMAGE,
          message: err.message,
          context: baseContext,
          error: err,
        });
        throw err;
      }

      // 2. 預處理圖片
      console.log('正在預處理圖片...');
      try {
        if (ocrService.useGoogleVision || ocrService.usePaddleOCR) {
          processedFile = await imageService.preprocessForGoogleVision(uploadedFile);
        } else {
          processedFile = await imageService.preprocessImage(uploadedFile);
        }
      } catch (err) {
        await logError({
          sessionId, endpoint,
          step: STEPS.IMAGE_PREPROCESSING,
          errorCode: ERROR_CODES.PREPROCESSING_FAILED,
          message: err.message,
          context: baseContext,
          error: err,
        });
        throw err;
      }

      // 3. 執行 OCR
      console.log('正在進行 OCR 辨識...');
      let ocrResult;
      try {
        ocrResult = await ocrService.recognizeText(processedFile);
      } catch (err) {
        err._logged = true;
        await logError({
          sessionId, endpoint,
          step: STEPS.OCR_RECOGNITION,
          errorCode: ERROR_CODES.OCR_FAILED,
          message: err.message,
          context: baseContext,
          error: err,
        });
        throw err;
      }

      const text = ocrResult.text || '';
      if (!text.trim()) {
        await logError({
          sessionId, endpoint,
          step: STEPS.OCR_RECOGNITION,
          errorCode: ERROR_CODES.OCR_EMPTY_RESULT,
          message: 'OCR 未辨識到任何文字',
          context: { ...baseContext, confidence: ocrResult.confidence },
        });
      } else if (ocrResult.confidence !== null && ocrResult.confidence < 30) {
        await logError({
          sessionId, endpoint,
          step: STEPS.OCR_RECOGNITION,
          errorCode: ERROR_CODES.OCR_LOW_CONFIDENCE,
          message: `OCR 信心值過低: ${ocrResult.confidence.toFixed(1)}%`,
          context: { ...baseContext, confidence: ocrResult.confidence },
        });
      }

      // 4. 判斷證件類型並解析
      console.log('正在解析證件資訊...');
      let parseResult;
      const isDrivingLicense = text.includes('駕照') ||
                               text.includes('駕駛執照') ||
                               text.includes('交通部') ||
                               /[A-Z]\d{2}\d{7,8}/.test(text);

      try {
        if (isDrivingLicense) {
          console.log('偵測到駕照,使用駕照解析器...');
          parseResult = parserService.parseDrivingLicense(ocrResult);
        } else {
          console.log('使用身分證解析器...');
          parseResult = parserService.parseIDCard(ocrResult);
        }
      } catch (err) {
        err._logged = true;
        await logError({
          sessionId, endpoint,
          step: STEPS.DATA_PARSING,
          errorCode: ERROR_CODES.PARSE_FAILED,
          message: err.message,
          context: { ...baseContext, confidence: ocrResult.confidence, isDrivingLicense },
          error: err,
        });
        throw err;
      }

      // 5. 驗證解析結果
      const validation = parserService.validateParseResult(parseResult);

      if (!validation.isComplete) {
        await logError({
          sessionId, endpoint,
          step: STEPS.RESULT_VALIDATION,
          errorCode: ERROR_CODES.INCOMPLETE_RESULT,
          message: `辨識結果欄位不完整，缺少: ${validation.missingFields.join(', ')}`,
          context: {
            ...baseContext,
            confidence: parseResult.confidence,
            isDrivingLicense,
            missingFields: validation.missingFields,
            extractedData: parseResult.data,
            rawText: text.slice(0, 300),
          },
        });
      }

      // 6. 取得資源使用統計
      const resourceStats = tracker.getStats();
      console.log('資源使用統計:', JSON.stringify(resourceStats, null, 2));

      const response = {
        success: parseResult.success,
        data: parseResult.data,
        validation: {
          isComplete: validation.isComplete,
          missingFields: validation.missingFields,
        },
        confidence: parseResult.confidence,
        message: parseResult.success ? '辨識成功' : '辨識失敗，請確認圖片品質',
        sessionId,
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
      if (!error._logged) {
        await logError({
          sessionId, endpoint,
          step: STEPS.DATA_PARSING,
          errorCode: ERROR_CODES.UNKNOWN_ERROR,
          message: error.message || '未知錯誤',
          context: {},
          error,
        }).catch(() => {});
      }
      return res.status(500).json({
        success: false,
        error: error.message || '辨識過程發生錯誤',
        sessionId,
      });
    } finally {
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
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 健康檢查端點
   */
  async healthCheck(req, res) {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }
}

module.exports = new IDCardController();
