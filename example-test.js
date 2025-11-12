/**
 * API 測試範例
 * 執行前請確保服務已啟動：npm start
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000/api';

// 測試健康檢查
async function testHealth() {
  console.log('\n=== 測試健康檢查 ===');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✓ 健康檢查成功:', response.data);
  } catch (error) {
    console.error('✗ 健康檢查失敗:', error.message);
  }
}

// 測試系統狀態
async function testStatus() {
  console.log('\n=== 測試系統狀態 ===');
  try {
    const response = await axios.get(`${BASE_URL}/status`);
    console.log('✓ 系統狀態:', response.data);
  } catch (error) {
    console.error('✗ 狀態查詢失敗:', error.message);
  }
}

// 測試透過 URL 辨識
async function testVerifyByUrl() {
  console.log('\n=== 測試 URL 辨識 ===');
  try {
    // 請替換為真實的身分證圖片 URL
    const imageUrl = 'https://example.com/id-card.jpg';

    const response = await axios.post(`${BASE_URL}/verify/url`, {
      imageUrl: imageUrl
    });

    console.log('✓ 辨識結果:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error('✗ 辨識失敗:', error.response.data);
    } else {
      console.error('✗ 請求失敗:', error.message);
    }
  }
}

// 測試透過上傳辨識
async function testVerifyByUpload() {
  console.log('\n=== 測試上傳辨識 ===');

  // 請替換為真實的身分證圖片路徑
  const imagePath = './test-id-card.jpg';

  if (!fs.existsSync(imagePath)) {
    console.error('✗ 測試圖片不存在:', imagePath);
    console.log('請將測試用的身分證圖片放在專案根目錄，命名為 test-id-card.jpg');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));

    const response = await axios.post(`${BASE_URL}/verify/upload`, formData, {
      headers: formData.getHeaders()
    });

    console.log('✓ 辨識結果:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error('✗ 辨識失敗:', error.response.data);
    } else {
      console.error('✗ 請求失敗:', error.message);
    }
  }
}

// 執行所有測試
async function runAllTests() {
  console.log('開始執行 API 測試...\n');

  await testHealth();
  await testStatus();

  // 注意：以下測試需要實際的身分證圖片
  // await testVerifyByUrl();
  // await testVerifyByUpload();

  console.log('\n測試完成！');
  console.log('\n提示：');
  console.log('1. 若要測試 URL 辨識，請在 testVerifyByUrl() 中提供真實的圖片 URL');
  console.log('2. 若要測試上傳辨識，請在專案根目錄放置 test-id-card.jpg');
}

// 執行測試
runAllTests();
