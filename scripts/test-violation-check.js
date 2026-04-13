/**
 * 違規查詢測試腳本
 * 用法: node scripts/test-violation-check.js <身分證字號> <生日YYYMMDD>
 * 範例: node scripts/test-violation-check.js F128326969 0800402
 */
require('dotenv/config');
const webAutomationService = require('../src/services/webAutomationService');

const [,, idNumber, birthDate] = process.argv;

if (!idNumber || !birthDate) {
  console.log('用法: node scripts/test-violation-check.js <身分證字號> <生日YYYMMDD>');
  console.log('範例: node scripts/test-violation-check.js F128326969 0800402');
  process.exit(1);
}

(async () => {
  console.log(`查詢: 身分證=${idNumber}, 生日=${birthDate}`);
  try {
    const hasViolation = await webAutomationService.isViolationRecords(idNumber, birthDate);
    console.log(`\n結果: ${hasViolation ? '⚠️  有違規記錄' : '✅ 無違規記錄'}`);
  } catch (err) {
    console.error('查詢失敗:', err.message);
  }
})();
