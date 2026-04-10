/**
 * 批量驗證使用者證件資料
 * 讀取 verify_user.json，查詢每個使用者的證件並解析姓名和身分證字號
 *
 * 使用方式:
 *   node scripts/batch-verify-users.js --token="YOUR_AUTH_TOKEN"
 *
 * 參數:
 *   --token    必填，Ionex API 的 Authorization Token
 *   --delay    選填，每筆查詢間隔毫秒數，預設 1000
 *   --dry-run  選填，只顯示會處理的資料，不實際執行
 */

const fs = require('fs').promises;
const path = require('path');

// 設定
const CONFIG = {
  graphqlUrl: 'https://nex-console.ionexenergy.com/d5eGQDwmbwYuWEdWfUZt-ionex',
  localApiUrl: 'http://localhost:3888/api/verify/url',
  healthUrl: 'http://localhost:3888/api/health',
  inputFile: path.join(__dirname, '..', 'verify_user.json'),
  outputFile: path.join(__dirname, '..', 'verify_user.json'),
  delayMs: 1000
};

// 解析命令行參數
function parseArgs() {
  const args = {
    token: null,
    delay: CONFIG.delayMs,
    dryRun: false
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--token=')) {
      args.token = arg.replace('--token=', '');
    } else if (arg.startsWith('--delay=')) {
      args.delay = parseInt(arg.replace('--delay=', ''), 10);
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    }
  }

  return args;
}

// 延遲函數
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 查詢使用者資料
async function fetchUserData(userId, token) {
  const query = `query RentalUserDetail($filter: RentalUsersFilter!, $orderBy: [UsersOrder!]!) {
    RentalUsersQuery {
      rentalUsers(filter: $filter, orderBy: $orderBy) {
        edges {
          node {
            userId
            displayName
            email
            phone
            rentalCertificates {
              certificateType
              status
              expiredAt
              url
            }
          }
        }
      }
    }
  }`;

  const response = await fetch(CONFIG.graphqlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query,
      variables: {
        filter: {
          organization: 'KYMCO_TW',
          userId: userId
        },
        orderBy: [{ direction: 'DESC', field: 'USER_ID' }]
      }
    })
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  const users = result.data?.RentalUsersQuery?.rentalUsers?.edges || [];
  return users.length > 0 ? users[0].node : null;
}

// 檢查本地服務是否運行
async function checkLocalService() {
  try {
    const response = await fetch(CONFIG.healthUrl, {
      method: 'GET'
    });
    const data = await response.json();
    // 確認是我們的服務（不是其他佔用端口的服務）
    return response.ok && data.status === 'ok';
  } catch (error) {
    return false;
  }
}

// 解析證件
async function analyzeIdCard(imageUrl, displayName) {
  const response = await fetch(CONFIG.localApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageUrl,
      documentType: 'id_card',
      displayName
    })
  });

  // 檢查回應類型
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`本地服務回應非 JSON: ${text.substring(0, 100)}`);
  }

  return await response.json();
}

// 主程式
async function main() {
  const args = parseArgs();

  // 檢查必要參數
  if (!args.token) {
    console.error('錯誤: 請提供 --token 參數');
    console.error('使用方式: node scripts/batch-verify-users.js --token="YOUR_AUTH_TOKEN"');
    process.exit(1);
  }

  console.log('========================================');
  console.log('  批量驗證使用者證件資料');
  console.log('========================================');
  console.log(`輸入檔案: ${CONFIG.inputFile}`);
  console.log(`輸出檔案: ${CONFIG.outputFile}`);
  console.log(`查詢間隔: ${args.delay}ms`);
  console.log(`模式: ${args.dryRun ? '測試模式 (不寫入)' : '正式執行'}`);
  console.log('');

  // 檢查本地服務
  console.log('檢查本地服務...');
  const isServiceRunning = await checkLocalService();
  if (!isServiceRunning) {
    console.error('');
    console.error('錯誤: 本地服務未運行!');
    console.error('請先啟動服務: npm start');
    console.error('');
    process.exit(1);
  }
  console.log('本地服務運行中 ✓');
  console.log('');

  // 讀取 JSON 檔案
  let users;
  try {
    const content = await fs.readFile(CONFIG.inputFile, 'utf-8');
    users = JSON.parse(content);
    console.log(`讀取到 ${users.length} 筆使用者資料`);
  } catch (error) {
    console.error('讀取檔案失敗:', error.message);
    process.exit(1);
  }

  if (args.dryRun) {
    console.log('\n[測試模式] 將處理以下使用者:');
    users.slice(0, 5).forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.userId} - ${u.displayName}`);
    });
    if (users.length > 5) {
      console.log(`  ... 還有 ${users.length - 5} 筆`);
    }
    process.exit(0);
  }

  // 統計
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  let noIdCardCount = 0;

  // 逐筆處理
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const progress = `[${i + 1}/${users.length}]`;

    // 如果已經有 idName 和 idNumber，跳過
    if (user.idName && user.idNumber) {
      console.log(`${progress} ${user.displayName} - 已有資料，跳過`);
      skipCount++;
      continue;
    }

    console.log(`${progress} 處理 ${user.displayName} (${user.userId})...`);

    try {
      // 1. 查詢使用者資料
      const userData = await fetchUserData(user.userId, args.token);

      if (!userData) {
        console.log(`  -> 找不到使用者資料`);
        errorCount++;
        continue;
      }

      // 2. 找到身分證正面圖片
      const idCardFront = userData.rentalCertificates?.find(
        cert => cert.certificateType === 'ID_CARD_FRONT'
      );

      if (!idCardFront || !idCardFront.url) {
        console.log(`  -> 無身分證正面圖片`);
        noIdCardCount++;
        continue;
      }

      // 3. 解析證件
      const result = await analyzeIdCard(idCardFront.url, userData.displayName);

      if (result.data) {
        const idName = result.data.name || null;
        const idNumber = result.data.idNumber || null;

        // 4. 更新使用者資料
        user.idName = idName;
        user.idNumber = idNumber;

        console.log(`  -> 姓名: ${idName || '(無)'}, 身分證: ${idNumber || '(無)'}`);
        successCount++;
      } else {
        console.log(`  -> 解析失敗: ${result.message || '未知錯誤'}`);
        errorCount++;
      }

    } catch (error) {
      console.log(`  -> 錯誤: ${error.message}`);
      errorCount++;
    }

    // 延遲避免 API 過載
    if (i < users.length - 1) {
      await delay(args.delay);
    }
  }

  // 儲存結果
  console.log('\n儲存結果...');
  try {
    await fs.writeFile(
      CONFIG.outputFile,
      JSON.stringify(users, null, 2),
      'utf-8'
    );
    console.log('儲存成功!');
  } catch (error) {
    console.error('儲存失敗:', error.message);
    process.exit(1);
  }

  // 顯示統計
  console.log('\n========================================');
  console.log('  處理完成');
  console.log('========================================');
  console.log(`成功: ${successCount}`);
  console.log(`跳過 (已有資料): ${skipCount}`);
  console.log(`無身分證圖片: ${noIdCardCount}`);
  console.log(`錯誤: ${errorCount}`);
  console.log(`總計: ${users.length}`);
}

// 執行
main().catch(error => {
  console.error('程式錯誤:', error);
  process.exit(1);
});
