const fs = require('fs');
const path = require('path');

// 讀取 rental_user.json
const inputPath = path.join(__dirname, '..', 'rental_user.json');
const rentalUsers = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// 提取所有 userId
const userIds = rentalUsers.map(user => user.userId);

// 產生今天日期格式 YYYY-MM-DD
const today = new Date();
const dateStr = today.toISOString().split('T')[0];

// 輸出檔案名稱
const outputFileName = `notify_user_${dateStr}.json`;
const outputPath = path.join(__dirname, '..', outputFileName);

// 寫入 JSON 檔案
fs.writeFileSync(outputPath, JSON.stringify(userIds, null, 2), 'utf-8');

console.log(`已成功輸出 ${userIds.length} 筆 userId 到 ${outputFileName}`);
