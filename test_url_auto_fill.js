// 測試 URL 方式的自動填寫功能
const axios = require('axios');

// 測試資料 - 請替換成實際的圖片 URL
const testData = {
  imageUrl: 'https://example.com/id-card.jpg',  // 請替換成實際的身分證圖片 URL
  autoFillForm: true,
  keepBrowserAlive: true
};

async function testUrlAutoFill() {
  console.log('=== 測試 URL 方式的自動填寫功能 ===\n');

  try {
    console.log('測試資料:');
    console.log(`  圖片 URL: ${testData.imageUrl}`);
    console.log(`  啟用自動填寫: ${testData.autoFillForm}`);
    console.log(`  保持瀏覽器開啟: ${testData.keepBrowserAlive}\n`);

    console.log('正在發送請求...\n');

    const response = await axios.post('http://localhost:3000/api/verify/url', testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2分鐘超時
    });

    console.log('\n=== 執行結果 ===');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✓ 測試成功！');

      if (response.data.data) {
        console.log('\n【辨識結果】');
        console.log(`  身分證字號: ${response.data.data.idNumber || '未辨識'}`);
        console.log(`  姓名: ${response.data.data.name || '未辨識'}`);
        console.log(`  性別: ${response.data.data.gender || '未辨識'}`);
        console.log(`  出生日期: ${response.data.data.birthDate || '未辨識'}`);
        console.log(`  發證日期: ${response.data.data.issueDate || '未辨識'}`);
        console.log(`  發證地點: ${response.data.data.issueLocation || '未辨識'}`);
      }

      if (response.data.automation) {
        console.log('\n【自動填寫結果】');
        console.log(`  狀態: ${response.data.automation.success ? '✓ 成功' : '✗ 失敗'}`);
        console.log(`  訊息: ${response.data.automation.message}`);
        if (response.data.automation.data) {
          console.log(`  生日格式: ${response.data.automation.data.birthDateFormatted}`);
          console.log(`  網址: ${response.data.automation.data.url}`);
          console.log(`  表單已填寫: ${response.data.automation.data.formFilled ? '是' : '否'}`);
        }
      }

      if (response.data.automation && response.data.automation.success) {
        console.log('\n請在瀏覽器中檢查表單是否正確填寫。');
        console.log('您可以手動輸入驗證碼並提交表單。');
        console.log('\n按 Ctrl+C 退出程式...');
      }
    } else {
      console.log('\n✗ 測試失敗');
      console.error('錯誤:', response.data.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n✗ 測試過程發生錯誤:');
    if (error.response) {
      console.error('狀態碼:', error.response.status);
      console.error('錯誤訊息:', error.response.data);
    } else if (error.request) {
      console.error('無法連接到伺服器，請確認伺服器是否已啟動');
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// 執行測試
testUrlAutoFill();

// 處理退出信號
process.on('SIGINT', async () => {
  console.log('\n\n測試已中斷');
  process.exit(0);
});
