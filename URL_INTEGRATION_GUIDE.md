# 📘 URL 方式整合指南

## 概述

URL 方式的自動填寫功能已完全整合!您可以透過提供圖片 URL 來進行身分證辨識和自動填寫監理服務網表單。

## 🚀 快速開始

### 使用網頁測試工具

**增強版測試頁面 (推薦):**
```
http://localhost:3000/test-auto-fill-enhanced.html
```

此頁面提供:
- ✅ Tab 切換 (上傳圖片 / 圖片 URL)
- ✅ URL 輸入與預覽
- ✅ 範例 URL 快速填入
- ✅ 完整的選項設定
- ✅ 即時結果顯示

**原版測試頁面:**
```
http://localhost:3000/test-auto-fill.html
```

## 📝 API 使用方式

### 基本用法 (只辨識)

```bash
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/id-card.jpg"
  }'
```

### 進階用法 (辨識 + 自動填寫)

```bash
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/id-card.jpg",
    "autoFillForm": true,
    "keepBrowserAlive": true
  }'
```

## 🔧 參數說明

| 參數 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `imageUrl` | string | ✓ 是 | - | 身分證圖片的 URL (必須可公開訪問) |
| `autoFillForm` | boolean | ✗ 否 | false | 是否啟用自動填寫監理服務網 |
| `keepBrowserAlive` | boolean | ✗ 否 | true | 自動填寫時是否保持瀏覽器開啟 |
| `puppeteerOptions` | object | ✗ 否 | {} | Puppeteer 自訂選項 (進階) |

## 💻 程式範例

### JavaScript (Node.js)

```javascript
const axios = require('axios');

async function verifyByUrl(imageUrl, autoFill = false) {
  try {
    const response = await axios.post('http://localhost:3000/api/verify/url', {
      imageUrl: imageUrl,
      autoFillForm: autoFill,
      keepBrowserAlive: true
    });

    console.log('辨識結果:', response.data);
    return response.data;
  } catch (error) {
    console.error('錯誤:', error.response?.data || error.message);
    throw error;
  }
}

// 使用範例
verifyByUrl('https://example.com/id-card.jpg', true)
  .then(result => {
    console.log('身分證字號:', result.data.idNumber);
    if (result.automation) {
      console.log('已自動填寫表單');
    }
  });
```

### JavaScript (瀏覽器端 Fetch API)

```javascript
async function verifyByUrl(imageUrl, autoFill = false) {
  const response = await fetch('/api/verify/url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageUrl: imageUrl,
      autoFillForm: autoFill,
      keepBrowserAlive: true
    })
  });

  return await response.json();
}

// 使用範例
verifyByUrl('https://example.com/id-card.jpg', true)
  .then(result => {
    console.log('辨識結果:', result);
  })
  .catch(error => {
    console.error('錯誤:', error);
  });
```

### Python

```python
import requests

def verify_by_url(image_url, auto_fill=False):
    response = requests.post(
        'http://localhost:3000/api/verify/url',
        json={
            'imageUrl': image_url,
            'autoFillForm': auto_fill,
            'keepBrowserAlive': True
        }
    )
    return response.json()

# 使用範例
result = verify_by_url('https://example.com/id-card.jpg', auto_fill=True)
print('辨識結果:', result['data'])

if 'automation' in result:
    print('自動填寫狀態:', result['automation']['success'])
```

### cURL

```bash
# 只辨識
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/id-card.jpg"}'

# 辨識並自動填寫
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/id-card.jpg",
    "autoFillForm": true,
    "keepBrowserAlive": true
  }'
```

## 📊 回應格式

### 成功回應 (啟用自動填寫)

```json
{
  "success": true,
  "message": "辨識成功，已自動填寫監理服務網表單",
  "data": {
    "idNumber": "A123456789",
    "name": "王小明",
    "gender": "男",
    "birthDate": "74年01月01日",
    "issueDate": "99.01.01",
    "issueLocation": "台北市"
  },
  "validation": {
    "isComplete": true,
    "missingFields": [],
    "warnings": []
  },
  "confidence": 0.95,
  "automation": {
    "success": true,
    "message": "表單已自動填寫完成，請手動輸入驗證碼並提交表單。瀏覽器將保持開啟狀態。",
    "data": {
      "idNumber": "A123456789",
      "birthDate": "74年01月01日",
      "birthDateFormatted": "0740101",
      "url": "https://www.mvdis.gov.tw/m3-emv-vil/vil/driverLicensePenalty#gsc.tab=0",
      "pageReady": true,
      "formFilled": true,
      "waitingForCaptcha": true
    },
    "errors": []
  }
}
```

### 失敗回應

```json
{
  "success": false,
  "error": "請提供有效的圖片 URL"
}
```

## 🧪 測試方式

### 方式 1: 使用測試腳本

1. 編輯 `test_url_auto_fill.js`:

```javascript
const testData = {
  imageUrl: 'YOUR_IMAGE_URL_HERE',  // 替換成實際的 URL
  autoFillForm: true,
  keepBrowserAlive: true
};
```

2. 執行測試:

```bash
node test_url_auto_fill.js
```

### 方式 2: 使用網頁測試工具

1. 啟動伺服器:
```bash
npm start
```

2. 開啟瀏覽器:
```
http://localhost:3000/test-auto-fill-enhanced.html
```

3. 選擇「🔗 圖片 URL」tab
4. 輸入圖片 URL
5. 勾選「啟用自動填寫」
6. 點擊「開始辨識」

### 方式 3: 使用 cURL

```bash
# 測試基本辨識
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "YOUR_URL"}' | json_pp

# 測試自動填寫
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "YOUR_URL",
    "autoFillForm": true
  }' | json_pp
```

## ⚠️ 注意事項

### 1. URL 要求

圖片 URL 必須:
- ✅ 可公開訪問 (無需認證)
- ✅ 返回圖片內容 (Content-Type: image/*)
- ✅ 支援 HTTPS (建議)
- ✅ 檔案大小合理 (建議 < 10MB)

### 2. 常見的 URL 來源

**可用的 URL 來源:**
- ✅ AWS S3 公開 bucket
- ✅ Google Cloud Storage 公開檔案
- ✅ Azure Blob Storage 公開容器
- ✅ CDN 託管的圖片
- ✅ 公開的 HTTP/HTTPS 伺服器

**不適用的 URL:**
- ✗ 需要認證的私有 bucket
- ✗ 本地檔案路徑 (file://)
- ✗ 防盜鏈保護的圖片
- ✗ 短期連結 (過期的)

### 3. CORS 考量

如果圖片 URL 來自不同的網域,確保:
- 圖片伺服器允許跨域請求
- 或使用後端 API 代理

### 4. 安全性建議

- 驗證 URL 格式
- 限制允許的網域 (選填)
- 設定請求超時
- 檢查圖片大小

## 🔍 故障排除

### 問題: 無法下載圖片

**可能原因:**
- URL 無效或無法訪問
- 網路連線問題
- 圖片需要認證

**解決方式:**
1. 確認 URL 在瀏覽器中可直接開啟
2. 檢查網路連線
3. 使用公開可訪問的 URL

### 問題: 辨識失敗

**可能原因:**
- 圖片品質不佳
- 圖片格式不支援
- 圖片內容不是身分證

**解決方式:**
1. 使用清晰的圖片
2. 確認格式為 JPG/PNG
3. 確認圖片包含完整的身分證資訊

### 問題: 自動填寫沒有執行

**可能原因:**
- `autoFillForm` 未設為 true
- OCR 辨識失敗

**解決方式:**
1. 確認請求包含 `"autoFillForm": true`
2. 檢查辨識結果是否包含身分證字號和生日
3. 查看伺服器日誌

## 📈 效能考量

### URL 方式 vs 上傳方式

| 項目 | URL 方式 | 上傳方式 |
|------|---------|---------|
| 傳輸速度 | 取決於圖片來源 | 取決於用戶網速 |
| 伺服器負載 | 需下載圖片 | 直接處理 |
| 適用場景 | 圖片已存在遠端 | 即時拍攝上傳 |
| 延遲 | 可能較高 | 通常較低 |

### 優化建議

1. **使用 CDN**: 將圖片放在 CDN 上加速下載
2. **圖片優化**: 適當壓縮圖片大小
3. **快取策略**: 考慮快取 OCR 結果
4. **並發控制**: 限制同時處理的請求數

## 🎯 使用場景

### 場景 1: 批次處理

```javascript
const imageUrls = [
  'https://example.com/id1.jpg',
  'https://example.com/id2.jpg',
  'https://example.com/id3.jpg'
];

// 依序處理
for (const url of imageUrls) {
  const result = await verifyByUrl(url, false);
  console.log('處理:', url, '結果:', result.data.idNumber);
}
```

### 場景 2: 雲端儲存整合

```javascript
// AWS S3 範例
const s3Url = 'https://my-bucket.s3.amazonaws.com/id-cards/user123.jpg';
const result = await verifyByUrl(s3Url, true);
```

### 場景 3: Webhook 整合

```javascript
// 接收 webhook 後處理
app.post('/webhook/id-uploaded', async (req, res) => {
  const { imageUrl, userId } = req.body;

  const result = await verifyByUrl(imageUrl, false);

  // 儲存結果到資料庫
  await saveToDatabase(userId, result.data);

  res.json({ success: true });
});
```

## 📚 相關文檔

- **INTEGRATION_GUIDE.md** - 完整整合指南
- **QUICK_START.md** - 快速開始
- **AUTO_FILL_README.md** - 自動填寫技術文檔

## 🆚 兩種方式對比

| 特性 | URL 方式 | 上傳方式 |
|------|---------|---------|
| **API 端點** | `/api/verify/url` | `/api/verify/upload` |
| **Content-Type** | application/json | multipart/form-data |
| **傳輸方式** | JSON body | FormData |
| **適用場景** | 圖片已在遠端 | 即時上傳 |
| **優點** | 無需傳輸圖片、可批次處理 | 更快速、更安全 |
| **缺點** | URL 必須可公開訪問 | 需上傳流量 |
| **autoFillForm** | ✅ 支援 | ✅ 支援 |

## 總結

URL 方式已完全整合!您可以:

✅ 使用 `POST /api/verify/url` API
✅ 支援 `autoFillForm` 參數啟用自動填寫
✅ 使用增強版測試頁面測試
✅ 使用測試腳本 `test_url_auto_fill.js`
✅ 完全向後兼容

**推薦使用:**
- 圖片已存在雲端 → 使用 URL 方式
- 即時拍攝上傳 → 使用上傳方式
- 批次處理 → 使用 URL 方式

立即開始使用! 🚀
