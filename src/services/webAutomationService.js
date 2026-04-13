require('dotenv/config');
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execFileAsync = promisify(execFile);
const parserService = require('./parserService');
const CAPTCHA_SCRIPT = path.join(__dirname, '../../scripts/solve_captcha.py');

/**
 * 網站自動化服務 - 用於自動填寫監理服務網表單
 */
class WebAutomationService {
  constructor() {
    this.browser = null;
    this.mvdisUrl = 'https://www.mvdis.gov.tw/m3-emv-vil/vil/driverLicensePenalty#gsc.tab=0';
  }

  /**
   * 查詢是否有駕照違規記錄
   * 自動填寫監理服務網表單、辨識驗證碼並查詢違規記錄
   * @param {string} idNumber - 身分證字號
   * @param {string} birthDate - 生日 (民國年格式，例如: "74年1月1日")
   * @param {object} options - 選項 (maxRetries: 最大重試次數，預設 5)
   * @returns {Promise<boolean>} true: 有違規記錄, false: 無違規記錄
   * @throws {Error} 當查詢失敗時拋出錯誤
   */
  async isViolationRecords(idNumber, birthDate, options = {}) {
    const maxRetries = options.maxRetries || 5;

    // 1. 驗證輸入資料
    if (!idNumber) {
      throw new Error('身分證字號不可為空');
    }

    if (!birthDate) {
      throw new Error('生日不可為空');
    }

    // 2. 轉換生日格式
    const birthDateFormatted = parserService.convertToMVDISFormat(birthDate);
    if (!birthDateFormatted) {
      throw new Error(`無法轉換生日格式: ${birthDate}`);
    }

    // 3. 驗證日期格式
    const dateValidation = parserService.validateMVDISDate(birthDateFormatted);
    if (!dateValidation.valid) {
      throw new Error(`生日格式驗證失敗: ${dateValidation.error}`);
    }

    console.log('開始自動填寫表單...');
    console.log(`💡 程式會自動重試最多 ${maxRetries} 次，直到成功取得查詢結果\n`);

    // 重試迴圈
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🔄 第 ${attempt} 次嘗試`);
      console.log('='.repeat(50));

      const result = await this.attemptFillForm(idNumber, birthDateFormatted);

      if (result.success) {
        console.log('\n✅ 表單處理成功！');
        // 回傳違規記錄判斷結果
        return result.data.hasViolation;
      }

      if (attempt < maxRetries) {
        console.log(`\n⚠️  第 ${attempt} 次嘗試失敗，準備重試...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('\n❌ 已達最大重試次數，表單處理失敗');
        throw new Error(`查詢失敗：${result.message || '已達最大重試次數'}`);
      }
    }

    // 理論上不會執行到這裡，但為了完整性加上
    throw new Error('查詢失敗：未知錯誤');
  }

  /**
   * 嘗試填寫表單（單次）
   * 內部輔助函數，由 isViolationRecords 調用
   * @param {string} idNumber - 身分證字號
   * @param {string} birthDateFormatted - 格式化後的生日（民國年7位數字）
   * @returns {Promise<object>} 填寫結果物件，包含 success, message, data (含 hasViolation), errors
   * @private
   */
  async attemptFillForm(idNumber, birthDateFormatted) {
    const result = {
      success: false,
      message: '',
      data: {
        idNumber: idNumber,
        birthDate: null,
        birthDateFormatted: birthDateFormatted,
        url: this.mvdisUrl,
        pageReady: false,
        formFilled: false,
        captchaRecognized: false,
        queryResult: null,
        hasViolation: false
      },
      errors: []
    };

    let browser = null;
    let context = null;
    let page = null;

    try {
      // 啟動 Playwright Chromium 瀏覽器
      browser = await chromium.launch({
        headless: true,
        slowMo: 100 // 放慢操作速度，更容易觀察
      });

      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      page = await context.newPage();

      console.log('正在開啟網頁...');
      await page.goto(this.mvdisUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000 // 60 秒超時
      });

      // 額外等待頁面穩定
      await page.waitForTimeout(2000);

      result.data.pageReady = true;

      console.log('正在填寫身份證字號...');
      await page.fill('#uid', idNumber);

      console.log('正在填寫生日...');
      await page.fill('#birthday', birthDateFormatted);

      result.data.formFilled = true;

      console.log('正在擷取驗證碼...');
      // 等待驗證碼圖片載入
      await page.waitForSelector('img[src*="captchaImg"]', { timeout: 5000 });

      // 擷取驗證碼圖片
      const captchaElement = await page.$('img[src*="captchaImg"]');
      if (!captchaElement) {
        throw new Error('找不到驗證碼圖片！');
      }

      const timestamp = Date.now();
      const captchaImagePath = path.join(__dirname, `../../temp/captcha_${timestamp}.png`);
      await captchaElement.screenshot({ path: captchaImagePath });
      console.log('✅ 驗證碼截圖完成');

      // 用 Gemini 辨識驗證碼
      const captchaText = await this.solveCaptcha(captchaImagePath);

      // 刪除驗證碼圖片
      try {
        await fs.unlink(captchaImagePath);
      } catch (err) {
        // 忽略刪除失敗
      }

      if (!captchaText) {
        result.message = '無法識別驗證碼';
        result.errors.push('驗證碼識別失敗');
        await browser.close();
        return result;
      }

      console.log(`🔑 驗證碼辨識結果: "${captchaText}"`);

      result.data.captchaRecognized = true;

      console.log('正在填寫驗證碼...');
      await page.fill('input[name="validateStr"]', captchaText);

      console.log('');
      console.log('========================================');
      console.log('📋 表單填寫完成！');
      console.log('========================================');
      console.log('身份證字號:', idNumber);
      console.log('生日:', birthDateFormatted);
      console.log('驗證碼:', captchaText);
      console.log('========================================');
      console.log('');

      // 自動提交表單
      console.log('正在提交表單...');
      await page.click('a.std_btn[href="#anchor"]');

      // 等待結果載入
      await page.waitForTimeout(1000);

      // 嘗試抓取 #disbanner 的內容
      const bannerElement = await page.$('#disbanner');
      if (bannerElement) {
        const bannerContent = await bannerElement.textContent();
        result.data.queryResult = bannerContent ? bannerContent.trim() : '無內容';

        // 判斷是否有違規記錄
        // 如果包含「該證號查無駕照吊扣銷資料」表示無違規
        const hasNoViolation = result.data.queryResult.includes('該證號查無駕照吊扣銷資料');
        result.data.hasViolation = !hasNoViolation;

        console.log('\n========================================');
        console.log('📊 查詢結果 (#disbanner)');
        console.log('========================================');
        console.log(result.data.queryResult);
        console.log('========================================');
        console.log(`${result.data.hasViolation ? '⚠️  有違規記錄' : '✅ 無違規記錄'}\n`);

        result.success = true;
        result.message = '表單提交成功，已取得查詢結果';
        await browser.close();
        return result;
      } else {
        console.log('⚠️  找不到 #disbanner 元素，可能是驗證碼識別錯誤');
        result.message = '驗證碼可能識別錯誤';
        result.errors.push('找不到查詢結果元素');
        await browser.close();
        return result;
      }

    } catch (error) {
      console.error('處理過程發生錯誤:', error);
      result.message = error.message || '表單處理失敗';
      result.errors.push(error.message);

      if (browser) {
        await browser.close();
      }

      return result;
    }
  }

  /**
   * 使用 ddddocr (Python) 辨識驗證碼
   * @param {string} imagePath - 驗證碼圖片路徑
   * @returns {Promise<string>} 驗證碼文字，失敗時回傳空字串
   */
  async solveCaptcha(imagePath) {
    try {
      const { stdout, stderr } = await execFileAsync('python3', [CAPTCHA_SCRIPT, imagePath]);
      if (stderr) {
        console.warn('ddddocr stderr:', stderr.trim());
      }
      const text = stdout.trim().replace(/\s+/g, '');
      console.log(`  ddddocr 辨識結果: "${text}"`);
      return text;
    } catch (error) {
      console.error('驗證碼辨識失敗:', error.message);
      return '';
    }
  }

  /**
   * 關閉所有資源
   */
  async terminate() {
    // Playwright 會在每次呼叫後自動關閉瀏覽器
    // 這裡只需要做一些清理工作
    console.log('WebAutomationService 已終止');
  }
}

module.exports = new WebAutomationService();
