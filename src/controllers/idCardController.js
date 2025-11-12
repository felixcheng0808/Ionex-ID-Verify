const imageService = require('../services/imageService');
const ocrService = require('../services/ocrService');
const parserService = require('../services/parserService');
const webAutomationService = require('../services/webAutomationService');
const Joi = require('joi');

class IDCardController {
  /**
   * 透過 URL 辨識身分證
   */
  async verifyByUrl(req, res) {
    let downloadedFile = null;
    let processedFile = null;

    try {
      // 驗證請求資料
      const schema = Joi.object({
        imageUrl: Joi.string().uri().required().messages({
          'string.uri': '請提供有效的圖片 URL',
          'any.required': '請提供圖片 URL'
        }),
        autoFillForm: Joi.boolean().default(false).messages({
          'boolean.base': 'autoFillForm 必須是布林值'
        }),
        keepBrowserAlive: Joi.boolean().default(true),
        puppeteerOptions: Joi.object().default({})
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { imageUrl, autoFillForm, keepBrowserAlive, puppeteerOptions } = value;

      // 1. 下載圖片
      console.log('正在下載圖片...');
      downloadedFile = await imageService.downloadFromUrl(imageUrl);

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

      // 判斷是否為駕照 (包含「駕照」、「駕駛執照」、「機車」等關鍵字)
      const isDrivingLicense = text.includes('駕照') ||
                               text.includes('駕駛執照') ||
                               text.includes('交通部') ||
                               /[A-Z]\d{2}\d{7,8}/.test(text); // 駕照號碼格式

      if (isDrivingLicense) {
        console.log('偵測到駕照,使用駕照解析器...');
        parseResult = parserService.parseDrivingLicense(ocrResult);
      } else {
        console.log('使用身分證解析器...');
        parseResult = parserService.parseIDCard(ocrResult);
      }

      // 6. 驗證解析結果
      const validation = parserService.validateParseResult(parseResult);

      // 7. 如果啟用自動填寫且辨識成功
      let automationResult = null;
      if (autoFillForm && parseResult.success && parseResult.data.idNumber && parseResult.data.birthDate) {
        console.log('正在自動填寫監理服務網表單...');
        try {
          automationResult = await webAutomationService.fillDriverLicensePenaltyForm(
            parseResult.data.idNumber,
            parseResult.data.birthDate,
            {
              keepAlive: keepBrowserAlive,
              puppeteerOptions
            }
          );
        } catch (autoError) {
          console.error('自動填寫表單失敗:', autoError);
          automationResult = {
            success: false,
            message: autoError.message || '自動填寫表單失敗',
            errors: [autoError.message]
          };
        }
      }

      // 8. 回傳結果
      const response = {
        success: parseResult.success,
        data: parseResult.data,
        validation: {
          isComplete: validation.isComplete,
          missingFields: validation.missingFields,
          warnings: validation.warnings
        },
        confidence: parseResult.confidence,
        message: parseResult.success ? '辨識成功' : '辨識失敗，請確認圖片品質'
      };

      // 如果有執行自動填寫，加入結果
      if (automationResult) {
        response.automation = automationResult;
        if (automationResult.success) {
          response.message += '，已自動填寫監理服務網表單';
        } else {
          response.message += '，但自動填寫表單失敗';
        }
      }

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

    try {
      // 檢查是否有上傳檔案（由 middleware 處理，這裡雙重檢查）
      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          error: '請上傳圖片檔案'
        });
      }

      // 取得選項參數
      const autoFillForm = req.body.autoFillForm === 'true' || req.body.autoFillForm === true;
      const keepBrowserAlive = req.body.keepBrowserAlive === 'true' || req.body.keepBrowserAlive === true || req.body.keepBrowserAlive === undefined;
      const puppeteerOptions = req.body.puppeteerOptions ? JSON.parse(req.body.puppeteerOptions) : {};

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

      // 6. 如果啟用自動填寫且辨識成功
      let automationResult = null;
      if (autoFillForm && parseResult.success && parseResult.data.idNumber && parseResult.data.birthDate) {
        console.log('正在自動填寫監理服務網表單...');
        try {
          automationResult = await webAutomationService.fillDriverLicensePenaltyForm(
            parseResult.data.idNumber,
            parseResult.data.birthDate,
            {
              keepAlive: keepBrowserAlive,
              puppeteerOptions
            }
          );
        } catch (autoError) {
          console.error('自動填寫表單失敗:', autoError);
          automationResult = {
            success: false,
            message: autoError.message || '自動填寫表單失敗',
            errors: [autoError.message]
          };
        }
      }

      // 7. 回傳結果
      const response = {
        success: parseResult.success,
        data: parseResult.data,
        validation: {
          isComplete: validation.isComplete,
          missingFields: validation.missingFields,
          warnings: validation.warnings
        },
        confidence: parseResult.confidence,
        message: parseResult.success ? '辨識成功' : '辨識失敗，請確認圖片品質'
      };

      // 如果有執行自動填寫，加入結果
      if (automationResult) {
        response.automation = automationResult;
        if (automationResult.success) {
          response.message += '，已自動填寫監理服務網表單';
        } else {
          response.message += '，但自動填寫表單失敗';
        }
      }

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

  /**
   * 辨識身分證並自動填寫監理服務網表單 (透過 URL)
   */
  async verifyAndFillFormByUrl(req, res) {
    let downloadedFile = null;
    let processedFile = null;

    try {
      // 驗證請求資料
      const schema = Joi.object({
        imageUrl: Joi.string().uri().required().messages({
          'string.uri': '請提供有效的圖片 URL',
          'any.required': '請提供圖片 URL'
        }),
        keepBrowserAlive: Joi.boolean().default(true),
        puppeteerOptions: Joi.object().default({})
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { imageUrl, keepBrowserAlive, puppeteerOptions } = value;

      // 1. 下載圖片
      console.log('正在下載圖片...');
      downloadedFile = await imageService.downloadFromUrl(imageUrl);

      // 2. 驗證圖片
      await imageService.validateImage(downloadedFile);

      // 3. 預處理圖片
      console.log('正在預處理圖片...');
      if (ocrService.useGoogleVision || ocrService.usePaddleOCR) {
        processedFile = await imageService.preprocessForGoogleVision(downloadedFile);
      } else {
        processedFile = await imageService.preprocessImage(downloadedFile);
      }

      // 4. 執行 OCR
      console.log('正在進行 OCR 辨識...');
      const ocrResult = await ocrService.recognizeText(processedFile);

      // 5. 判斷證件類型並解析
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

      // 6. 驗證解析結果
      const validation = parserService.validateParseResult(parseResult);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: '辨識失敗，請確認圖片品質',
          data: parseResult.data,
          validation
        });
      }

      // 7. 檢查必要欄位
      if (!parseResult.data.idNumber || !parseResult.data.birthDate) {
        return res.status(400).json({
          success: false,
          error: '缺少必要資訊：身分證字號或生日',
          data: parseResult.data,
          validation
        });
      }

      // 8. 自動填寫表單
      console.log('正在自動填寫監理服務網表單...');
      const formResult = await webAutomationService.fillDriverLicensePenaltyForm(
        parseResult.data.idNumber,
        parseResult.data.birthDate,
        {
          keepAlive: keepBrowserAlive,
          puppeteerOptions
        }
      );

      // 9. 回傳結果
      return res.json({
        success: true,
        message: '辨識成功並已自動填寫表單',
        ocr: {
          data: parseResult.data,
          validation: {
            isComplete: validation.isComplete,
            missingFields: validation.missingFields,
            warnings: validation.warnings
          },
          confidence: parseResult.confidence
        },
        automation: formResult
      });

    } catch (error) {
      console.error('處理過程發生錯誤:', error);
      return res.status(500).json({
        success: false,
        error: error.message || '處理過程發生錯誤'
      });
    } finally {
      // 清理臨時檔案
      await imageService.cleanupFiles([downloadedFile, processedFile]);
    }
  }

  /**
   * 辨識身分證並自動填寫監理服務網表單 (透過上傳)
   */
  async verifyAndFillFormByUpload(req, res) {
    let processedFile = null;
    const uploadedFile = req.file ? req.file.path : null;

    try {
      // 檢查是否有上傳檔案
      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          error: '請上傳圖片檔案'
        });
      }

      // 取得選項參數
      const keepBrowserAlive = req.body.keepBrowserAlive === 'true' || req.body.keepBrowserAlive === true;
      const puppeteerOptions = req.body.puppeteerOptions ? JSON.parse(req.body.puppeteerOptions) : {};

      // 1. 驗證圖片
      await imageService.validateImage(uploadedFile);

      // 2. 預處理圖片
      console.log('正在預處理圖片...');
      if (ocrService.useGoogleVision || ocrService.usePaddleOCR) {
        processedFile = await imageService.preprocessForGoogleVision(uploadedFile);
      } else {
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

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: '辨識失敗，請確認圖片品質',
          data: parseResult.data,
          validation
        });
      }

      // 6. 檢查必要欄位
      if (!parseResult.data.idNumber || !parseResult.data.birthDate) {
        return res.status(400).json({
          success: false,
          error: '缺少必要資訊：身分證字號或生日',
          data: parseResult.data,
          validation
        });
      }

      // 7. 自動填寫表單
      console.log('正在自動填寫監理服務網表單...');
      const formResult = await webAutomationService.fillDriverLicensePenaltyForm(
        parseResult.data.idNumber,
        parseResult.data.birthDate,
        {
          keepAlive: keepBrowserAlive,
          puppeteerOptions
        }
      );

      // 8. 回傳結果
      return res.json({
        success: true,
        message: '辨識成功並已自動填寫表單',
        ocr: {
          data: parseResult.data,
          validation: {
            isComplete: validation.isComplete,
            missingFields: validation.missingFields,
            warnings: validation.warnings
          },
          confidence: parseResult.confidence
        },
        automation: formResult
      });

    } catch (error) {
      console.error('處理過程發生錯誤:', error);
      return res.status(500).json({
        success: false,
        error: error.message || '處理過程發生錯誤'
      });
    } finally {
      // 清理臨時檔案
      await imageService.cleanupFiles([uploadedFile, processedFile]);
    }
  }
}

module.exports = new IDCardController();
