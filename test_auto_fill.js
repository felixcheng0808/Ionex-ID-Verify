// 測試自動填寫功能
const webAutomationService = require('./src/services/webAutomationService');

// 測試資料 - 請替換成實際的身分證字號和生日
const testData = {
  idNumber: 'A123456789',  // 請替換成測試用身分證字號
  birthDate: '74年1月1日'   // 請替換成測試用生日
};

async function testAutoFill() {
  console.log('=== 測試查詢駕照違規記錄 ===\n');

  try {
    console.log('測試資料:');
    console.log(`  身分證字號: ${testData.idNumber}`);
    console.log(`  生日: ${testData.birthDate}\n`);

    console.log('開始執行查詢...\n');

    const hasViolation = await webAutomationService.isViolationRecords(
      testData.idNumber,
      testData.birthDate,
      {
        maxRetries: 10
      }
    );

    console.log('\n=== 執行結果 ===');
    console.log(`違規記錄: ${hasViolation ? '有違規' : '無違規'}`);

    if (hasViolation) {
      console.log('\n⚠️  查詢到違規記錄！');
    } else {
      console.log('\n✓ 無違規記錄');
    }

  } catch (error) {
    console.error('\n✗ 查詢過程發生錯誤:', error);
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
