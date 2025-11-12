// 測試日期格式轉換功能
const parserService = require('./src/services/parserService');

console.log('=== 測試監理服務網日期格式轉換 ===\n');

// 測試案例
const testCases = [
  { input: '74年1月1日', expected: '0740101', description: '民國74年1月1日' },
  { input: '74年01月01日', expected: '0740101', description: '民國74年01月01日 (已補0)' },
  { input: '74.1.1', expected: '0740101', description: '民國74.1.1' },
  { input: '74.01.01', expected: '0740101', description: '民國74.01.01' },
  { input: '100年12月31日', expected: '1001231', description: '民國100年12月31日 (三位數)' },
  { input: '5年5月5日', expected: '0050505', description: '民國5年5月5日 (個位數)' },
  { input: null, expected: null, description: '空值測試' },
];

console.log('測試 convertToMVDISFormat 函數:\n');
testCases.forEach((testCase, index) => {
  const result = parserService.convertToMVDISFormat(testCase.input);
  const status = result === testCase.expected ? '✓ 通過' : '✗ 失敗';
  console.log(`測試 ${index + 1}: ${testCase.description}`);
  console.log(`  輸入: ${testCase.input}`);
  console.log(`  預期: ${testCase.expected}`);
  console.log(`  結果: ${result}`);
  console.log(`  狀態: ${status}\n`);
});

console.log('\n=== 測試日期驗證功能 ===\n');

const validationTests = [
  { input: '0740101', shouldBeValid: true, description: '有效日期: 74年1月1日' },
  { input: '1001231', shouldBeValid: true, description: '有效日期: 100年12月31日' },
  { input: '074010', shouldBeValid: false, description: '無效日期: 只有6位數' },
  { input: '07401011', shouldBeValid: false, description: '無效日期: 8位數' },
  { input: '0741301', shouldBeValid: false, description: '無效日期: 13月' },
  { input: '0740132', shouldBeValid: false, description: '無效日期: 1月32日' },
  { input: '0740231', shouldBeValid: false, description: '無效日期: 2月31日' },
  { input: '', shouldBeValid: false, description: '無效日期: 空字串' },
];

console.log('測試 validateMVDISDate 函數:\n');
validationTests.forEach((test, index) => {
  const result = parserService.validateMVDISDate(test.input);
  const status = result.valid === test.shouldBeValid ? '✓ 通過' : '✗ 失敗';
  console.log(`測試 ${index + 1}: ${test.description}`);
  console.log(`  輸入: "${test.input}"`);
  console.log(`  預期驗證結果: ${test.shouldBeValid ? '有效' : '無效'}`);
  console.log(`  實際驗證結果: ${result.valid ? '有效' : '無效'}`);
  if (!result.valid) {
    console.log(`  錯誤訊息: ${result.error}`);
  }
  console.log(`  狀態: ${status}\n`);
});

console.log('\n=== 完整流程測試 ===\n');

// 模擬從 OCR 解析出的生日
const ocrBirthDate = '74年1月1日';
console.log(`OCR 辨識的生日: ${ocrBirthDate}`);

// 轉換為監理服務網格式
const mvdisFormat = parserService.convertToMVDISFormat(ocrBirthDate);
console.log(`轉換為監理服務網格式: ${mvdisFormat}`);

// 驗證格式
const validation = parserService.validateMVDISDate(mvdisFormat);
console.log(`驗證結果: ${validation.valid ? '✓ 有效' : '✗ 無效'}`);
if (validation.valid) {
  console.log(`最終格式化結果: ${validation.formatted}`);
} else {
  console.log(`錯誤: ${validation.error}`);
}
