import 'dotenv/config';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface FormData {
  idNumber: string;      // 身份證字號 格式: [A-Z](1|2)\d{8}
  birthday: string;      // 生日 格式: 民國年YYYMMDD，例如 0780702
}

/**
 * 自動填寫表單
 */
async function fillForm(formData: FormData, headless: boolean = true) {
  const maxRetries = 10;
  let attempt = 1;

  while (attempt <= maxRetries) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔄 第 ${attempt} 次嘗試`);
    console.log('='.repeat(50));

    const success = await attemptFillForm(formData, headless);

    if (success) {
      console.log('\n✅ 表單處理成功！');
      return;
    }

    if (attempt < maxRetries) {
      console.log(`\n⚠️  第 ${attempt} 次嘗試失敗，準備重試...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempt++;
    } else {
      console.log('\n❌ 已達最大重試次數，表單處理失敗');
      throw new Error('表單處理失敗');
    }
  }
}

/**
 * 嘗試填寫表單（單次）
 */
async function attemptFillForm(formData: FormData, headless: boolean = true): Promise<boolean> {
  const browser = await chromium.launch({
    headless,
    slowMo: 100 // 放慢操作速度，更容易觀察
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    console.log('正在開啟網頁...');
    await page.goto('https://www.mvdis.gov.tw/m3-emv-vil/vil/driverLicensePenalty#gsc.tab=0', {
      waitUntil: 'networkidle'
    });

    console.log('正在填寫身份證字號...');
    await page.fill('#uid', formData.idNumber);

    console.log('正在填寫生日...');
    await page.fill('#birthday', formData.birthday);

    console.log('正在擷取驗證碼...');
    // 等待驗證碼圖片載入
    await page.waitForSelector('img[src*="captchaImg"]', { timeout: 5000 });

    // 擷取驗證碼圖片
    const captchaElement = await page.$('img[src*="captchaImg"]');
    if (captchaElement) {
      const timestamp = Date.now();
      let captchaImagePath = path.join(__dirname, `../captcha_${timestamp}.png`);
      await captchaElement.screenshot({ path: captchaImagePath });

      console.log('✅ 驗證碼圖片已儲存:', captchaImagePath);
      console.log('');

      // TODO: 實作驗證碼識別
      const captchaText = '';

      // 刪除驗證碼圖片
      try {
        await fs.unlink(captchaImagePath);
        console.log('🗑️  已刪除驗證碼圖片');
      } catch (err) {
        // 忽略刪除失敗
      }

      if (!captchaText) {
        console.error('❌ 無法識別驗證碼，請稍後再試');
        return;
      }

      console.log('正在填寫驗證碼...');
      await page.fill('input[name="validateStr"]', captchaText);

      console.log('');
      console.log('========================================');
      console.log('📋 表單填寫完成！');
      console.log('========================================');
      console.log('身份證字號:', formData.idNumber);
      console.log('生日:', formData.birthday);
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
        console.log('\n========================================');
        console.log('📊 查詢結果 (#disbanner)');
        console.log('========================================');
        console.log(bannerContent?.trim() || '無內容');
        console.log('========================================\n');

        await browser.close();
        return true; // 成功
      } else {
        console.log('⚠️  找不到 #disbanner 元素，可能是驗證碼識別錯誤');
        await browser.close();
        return false; // 失敗，需要重試
      }

    } else {
      console.error('找不到驗證碼圖片！');
      await browser.close();
      return false;
    }

  } catch (error) {
    console.error('處理過程發生錯誤:', error);
    await browser.close();
    return false; // 失敗，需要重試
  }
}

// 主程式
async function main() {
  // 從環境變數讀取設定
  const formData: FormData = {
    idNumber: process.env.ID_NUMBER || '',
    birthday: process.env.BIRTHDAY || ''
  };

  // 檢查必要的環境變數
  if (!formData.idNumber || !formData.birthday) {
    console.error('❌ 請在 .env 檔案中設定 ID_NUMBER 和 BIRTHDAY');
    console.error('💡 可以複製 .env.example 為 .env 並填入您的資料');
    return;
  }

  // 驗證身份證字號格式
  const idPattern = /^[A-Z][12]\d{8}$/;
  if (!idPattern.test(formData.idNumber)) {
    console.error('❌ 身份證字號格式錯誤！格式應為：一個大寫英文字母 + 1或2 + 8個數字');
    return;
  }

  // 驗證生日格式
  const birthdayPattern = /^\d{7}$/;
  if (!birthdayPattern.test(formData.birthday)) {
    console.error('❌ 生日格式錯誤！格式應為：民國年7位數字（YYYMMDD），例如：0800101');
    return;
  }

  console.log('開始自動填寫表單...');
  console.log('💡 程式會自動重試最多 10 次，直到成功取得查詢結果');
  console.log('');
  await fillForm(formData);
}

// 執行主程式
main().catch(console.error);
