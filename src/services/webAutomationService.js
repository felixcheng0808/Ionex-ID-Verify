const puppeteer = require('puppeteer');
const parserService = require('./parserService');

/**
 * 網站自動化服務 - 用於自動填寫監理服務網表單
 */
class WebAutomationService {
  constructor() {
    this.browser = null;
    this.mvdisUrl = 'https://www.mvdis.gov.tw/m3-emv-vil/vil/driverLicensePenalty#gsc.tab=0';
  }

  /**
   * 初始化瀏覽器
   * @param {object} options - Puppeteer 啟動選項
   * @returns {Promise<Browser>}
   */
  async initBrowser(options = {}) {
    if (this.browser) {
      return this.browser;
    }

    const defaultOptions = {
      headless: false, // 設為 false 讓使用者可以看到瀏覽器並手動輸入驗證碼
      defaultViewport: {
        width: 1280,
        height: 800
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    };

    this.browser = await puppeteer.launch({
      ...defaultOptions,
      ...options
    });

    console.log('瀏覽器已啟動');
    return this.browser;
  }

  /**
   * 關閉瀏覽器
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('瀏覽器已關閉');
    }
  }

  /**
   * 自動填寫監理服務網駕照違規查詢表單
   * @param {string} idNumber - 身分證字號
   * @param {string} birthDate - 生日 (民國年格式，例如: "74年1月1日")
   * @param {object} options - 選項
   * @returns {Promise<object>} 填寫結果
   */
  async fillDriverLicensePenaltyForm(idNumber, birthDate, options = {}) {
    const result = {
      success: false,
      message: '',
      data: {
        idNumber: null,
        birthDate: null,
        birthDateFormatted: null,
        url: this.mvdisUrl,
        pageReady: false,
        formFilled: false,
        waitingForCaptcha: false
      },
      errors: []
    };

    let page = null;

    try {
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

      result.data.idNumber = idNumber;
      result.data.birthDate = birthDate;
      result.data.birthDateFormatted = birthDateFormatted;

      console.log(`準備填寫表單: 身分證=${idNumber}, 生日=${birthDateFormatted}`);

      // 4. 啟動瀏覽器
      await this.initBrowser(options.puppeteerOptions);

      // 5. 開啟新分頁
      page = await this.browser.newPage();

      // 設定 User-Agent 避免被偵測為機器人
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      console.log('正在導航到監理服務網...');

      // 6. 前往目標網站
      await page.goto(this.mvdisUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      result.data.pageReady = true;
      console.log('頁面載入完成');

      // 7. 等待表單元素載入
      await page.waitForSelector('input[name="uid"]', { timeout: 10000 });
      await page.waitForSelector('input[name="birthday"]', { timeout: 10000 });

      console.log('表單元素已找到');

      // 8. 填寫身分證字號
      await page.type('input[name="uid"]', idNumber, { delay: 100 });
      console.log(`已填寫身分證: ${idNumber}`);

      // 9. 填寫生日
      await page.type('input[name="birthday"]', birthDateFormatted, { delay: 100 });
      console.log(`已填寫生日: ${birthDateFormatted}`);

      result.data.formFilled = true;

      // 10. 等待使用者手動輸入驗證碼
      if (!options.skipCaptchaWait) {
        result.data.waitingForCaptcha = true;
        result.success = true;
        result.message = '表單已自動填寫完成，請手動輸入驗證碼並提交表單。瀏覽器將保持開啟狀態。';

        console.log('\n========================================');
        console.log('表單已自動填寫完成！');
        console.log(`身分證字號: ${idNumber}`);
        console.log(`生日: ${birthDateFormatted}`);
        console.log('請在瀏覽器中手動輸入驗證碼並提交表單');
        console.log('========================================\n');

        // 選項: 等待使用者關閉頁面或指定時間
        if (options.keepAlive) {
          console.log('瀏覽器將保持開啟，直到您手動關閉...');
          // 不關閉瀏覽器，讓使用者完成操作
        } else {
          console.log('瀏覽器將在 2 分鐘後自動關閉...');
          // 等待 2 分鐘後自動關閉
          setTimeout(async () => {
            if (!page.isClosed()) {
              console.log('自動關閉瀏覽器...');
              await this.closeBrowser();
            }
          }, 120000);
        }
      }

      return result;

    } catch (error) {
      console.error('自動填寫表單時發生錯誤:', error);
      result.success = false;
      result.message = error.message || '自動填寫表單失敗';
      result.errors.push(error.message);

      // 發生錯誤時關閉瀏覽器
      if (page && !page.isClosed()) {
        await page.close();
      }

      return result;
    }
  }

  /**
   * 取得驗證碼圖片
   * @returns {Promise<Buffer>} 驗證碼圖片 Buffer
   */
  async getCaptchaImage() {
    try {
      if (!this.browser) {
        throw new Error('瀏覽器未初始化');
      }

      const pages = await this.browser.pages();
      if (pages.length === 0) {
        throw new Error('沒有開啟的頁面');
      }

      const page = pages[pages.length - 1];

      // 尋找驗證碼圖片元素
      const captchaElement = await page.$('img[src*="captchaImg"]');
      if (!captchaElement) {
        throw new Error('找不到驗證碼圖片');
      }

      // 截取驗證碼圖片
      const screenshot = await captchaElement.screenshot();
      return screenshot;

    } catch (error) {
      console.error('取得驗證碼圖片失敗:', error);
      throw error;
    }
  }

  /**
   * 檢查瀏覽器狀態
   * @returns {object} 瀏覽器狀態
   */
  getStatus() {
    return {
      isInitialized: this.browser !== null,
      isConnected: this.browser ? this.browser.isConnected() : false
    };
  }

  /**
   * 關閉所有資源
   */
  async terminate() {
    await this.closeBrowser();
    console.log('WebAutomationService 已終止');
  }
}

module.exports = new WebAutomationService();
