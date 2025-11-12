// 測試自動填寫功能
const webAutomationService = require('./src/services/webAutomationService');

// 測試資料 - 請替換成實際的身分證字號和生日
const testData = {
  idNumber: 'A123456789',  // 請替換成測試用身分證字號
  birthDate: '74年1月1日'   // 請替換成測試用生日
};

async function testAutoFill() {
  console.log('=== 測試自動填寫監理服務網表單 ===\n');

  try {
    console.log('測試資料:');
    console.log(`  身分證字號: ${testData.idNumber}`);
    console.log(`  生日: ${testData.birthDate}\n`);

    console.log('開始執行自動填寫...\n');

    const result = await webAutomationService.fillDriverLicensePenaltyForm(
      testData.idNumber,
      testData.birthDate,
      {
        keepAlive: true  // 保持瀏覽器開啟,讓使用者可以輸入驗證碼
      }
    );

    console.log('\n=== 執行結果 ===');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✓ 自動填寫成功！');
      console.log('請在瀏覽器中檢查表單是否正確填寫。');
      console.log('您可以手動輸入驗證碼並提交表單。');
      console.log('\n按 Ctrl+C 退出程式...');
    } else {
      console.log('\n✗ 自動填寫失敗');
      console.error('錯誤:', result.errors);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n✗ 測試過程發生錯誤:', error);
    process.exit(1);
  }
}

// 執行測試
testAutoFill();

// 處理退出信號
process.on('SIGINT', async () => {
  console.log('\n\n正在關閉瀏覽器...');
  await webAutomationService.terminate();
  console.log('已關閉');
  process.exit(0);
});
