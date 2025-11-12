# 整合指南 - 身分證辨識 + 自動填寫表單

## 功能整合說明

自動填寫監理服務網表單的功能已整合至原有的身分證辨識 API 中。現在您只需要在原本的 API 請求中加上 `autoFillForm=true` 參數即可啟用自動填寫功能。

## 快速使用

### 方式 1: 原有 API + 自動填寫選項 (推薦)

#### 透過 URL 辨識 + 自動填寫

```bash
# 只辨識，不自動填寫 (預設行為)
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/id-card.jpg"
  }'

# 辨識並自動填寫表單
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/id-card.jpg",
    "autoFillForm": true,
    "keepBrowserAlive": true
  }'
```

#### 透過上傳辨識 + 自動填寫

```bash
# 只辨識，不自動填寫 (預設行為)
curl -X POST http://localhost:3000/api/verify/upload \
  -F "image=@/path/to/id-card.jpg"

# 辨識並自動填寫表單
curl -X POST http://localhost:3000/api/verify/upload \
  -F "image=@/path/to/id-card.jpg" \
  -F "autoFillForm=true" \
  -F "keepBrowserAlive=true"
```

### 方式 2: 專用的自動填寫 API (保持向後兼容)

```bash
# 這些端點會強制執行自動填寫
curl -X POST http://localhost:3000/api/verify-and-fill/url \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/id-card.jpg"
  }'

curl -X POST http://localhost:3000/api/verify-and-fill/upload \
  -F "image=@/path/to/id-card.jpg"
```

## API 參數說明

### 通用參數

| 參數 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `autoFillForm` | boolean | 否 | false | 是否啟用自動填寫監理服務網表單 |
| `keepBrowserAlive` | boolean | 否 | true | 自動填寫時是否保持瀏覽器開啟 (需手動輸入驗證碼) |
| `puppeteerOptions` | object | 否 | {} | Puppeteer 瀏覽器自訂選項 (進階使用) |

### URL 方式專用參數

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `imageUrl` | string | 是 | 身分證圖片的 URL |

### 上傳方式專用參數

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `image` | file | 是 | 身分證圖片檔案 |

## 回應格式

### 不啟用自動填寫 (autoFillForm=false 或未設定)

```json
{
  "success": true,
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
  "message": "辨識成功"
}
```

### 啟用自動填寫 (autoFillForm=true)

```json
{
  "success": true,
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
  "message": "辨識成功，已自動填寫監理服務網表單",
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

## 使用範例

### JavaScript (Fetch API)

```javascript
// 只辨識
async function verifyIDCard(imageUrl) {
  const response = await fetch('http://localhost:3000/api/verify/url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl: imageUrl
    })
  });

  return await response.json();
}

// 辨識並自動填寫
async function verifyAndFillForm(imageUrl) {
  const response = await fetch('http://localhost:3000/api/verify/url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl: imageUrl,
      autoFillForm: true,
      keepBrowserAlive: true
    })
  });

  return await response.json();
}

// 使用範例
verifyAndFillForm('https://example.com/id-card.jpg')
  .then(result => {
    console.log('辨識結果:', result.data);
    if (result.automation) {
      console.log('自動填寫結果:', result.automation);
    }
  })
  .catch(error => {
    console.error('錯誤:', error);
  });
```

### JavaScript (上傳檔案)

```javascript
async function uploadAndVerify(file, autoFill = false) {
  const formData = new FormData();
  formData.append('image', file);

  if (autoFill) {
    formData.append('autoFillForm', 'true');
    formData.append('keepBrowserAlive', 'true');
  }

  const response = await fetch('http://localhost:3000/api/verify/upload', {
    method: 'POST',
    body: formData
  });

  return await response.json();
}

// 使用範例
const fileInput = document.getElementById('idCardImage');
const file = fileInput.files[0];

uploadAndVerify(file, true)
  .then(result => {
    console.log('辨識結果:', result);
  });
```

### Python (requests)

```python
import requests

# 只辨識
def verify_id_card(image_url):
    response = requests.post(
        'http://localhost:3000/api/verify/url',
        json={'imageUrl': image_url}
    )
    return response.json()

# 辨識並自動填寫
def verify_and_fill_form(image_url):
    response = requests.post(
        'http://localhost:3000/api/verify/url',
        json={
            'imageUrl': image_url,
            'autoFillForm': True,
            'keepBrowserAlive': True
        }
    )
    return response.json()

# 上傳檔案並辨識
def upload_and_verify(file_path, auto_fill=False):
    with open(file_path, 'rb') as f:
        files = {'image': f}
        data = {}

        if auto_fill:
            data['autoFillForm'] = 'true'
            data['keepBrowserAlive'] = 'true'

        response = requests.post(
            'http://localhost:3000/api/verify/upload',
            files=files,
            data=data
        )
        return response.json()

# 使用範例
result = verify_and_fill_form('https://example.com/id-card.jpg')
print('辨識結果:', result['data'])
if 'automation' in result:
    print('自動填寫結果:', result['automation'])
```

## 完整工作流程

```
1. 前端上傳身分證圖片並設定 autoFillForm=true
   ↓
2. 後端使用 OCR 辨識身分證資訊
   ↓
3. 解析並驗證身分證字號和生日
   ↓
4. 如果啟用自動填寫且資料完整：
   4.1. 將生日轉換為監理服務網格式 (YYYMMDD)
   4.2. 啟動 Puppeteer 瀏覽器
   4.3. 導航到監理服務網駕照違規查詢頁面
   4.4. 自動填寫身分證字號和生日
   4.5. 等待使用者手動輸入驗證碼
   ↓
5. 回傳辨識結果 + 自動填寫結果
   ↓
6. 使用者在瀏覽器中輸入驗證碼並提交
```

## 優點與特色

### 1. 向後兼容
- 不影響現有的 API 使用方式
- 預設不啟用自動填寫功能
- 只需加上參數即可啟用新功能

### 2. 彈性使用
- 可選擇是否啟用自動填寫
- 可控制瀏覽器是否保持開啟
- 支援自訂 Puppeteer 選項

### 3. 錯誤隔離
- 自動填寫失敗不影響 OCR 辨識結果
- 清楚區分辨識錯誤和自動填寫錯誤
- 詳細的錯誤訊息

### 4. 使用者友善
- 瀏覽器視窗可見,方便手動操作
- 保持瀏覽器開啟直到使用者完成操作
- 清楚的狀態回饋

## 注意事項

1. **資料完整性檢查**
   - 只有當 OCR 成功辨識出身分證字號和生日時才會執行自動填寫
   - 如果缺少必要資訊,將只返回辨識結果,不執行自動填寫

2. **驗證碼處理**
   - 監理服務網有驗證碼保護,需要手動輸入
   - 瀏覽器預設保持開啟 (`keepBrowserAlive: true`)
   - 可以在瀏覽器中查看表單是否正確填寫

3. **瀏覽器資源**
   - 每次啟用自動填寫會開啟新的瀏覽器視窗
   - 建議完成操作後關閉瀏覽器
   - 伺服器關閉時會自動清理所有瀏覽器實例

4. **並發限制**
   - 大量並發請求可能消耗大量記憶體
   - 建議根據伺服器資源限制並發數

5. **日期格式**
   - OCR 解析的日期必須是民國年格式
   - 系統會自動轉換為監理服務網要求的格式
   - 支援多種日期格式 (詳見 AUTO_FILL_README.md)

## 測試建議

1. **基本功能測試**
```bash
# 測試只辨識
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "YOUR_IMAGE_URL"}'

# 測試辨識 + 自動填寫
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "YOUR_IMAGE_URL", "autoFillForm": true}'
```

2. **錯誤處理測試**
```bash
# 測試無效圖片
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "invalid-url", "autoFillForm": true}'

# 測試缺少必要欄位
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "URL_TO_POOR_QUALITY_IMAGE", "autoFillForm": true}'
```

## 故障排除

### 問題: 自動填寫沒有執行
**可能原因:**
- `autoFillForm` 參數未設定或為 false
- OCR 辨識失敗,缺少身分證字號或生日
- 網路連線問題

**解決方式:**
1. 確認請求中包含 `"autoFillForm": true`
2. 檢查 OCR 辨識結果是否完整
3. 查看伺服器日誌中的錯誤訊息

### 問題: 瀏覽器無法開啟
**可能原因:**
- 伺服器環境不支援圖形界面
- Puppeteer 安裝不完整

**解決方式:**
1. 確認伺服器有圖形界面支援
2. 重新安裝 Puppeteer: `npm install puppeteer`
3. 檢查系統是否安裝必要的依賴

### 問題: 日期格式轉換失敗
**可能原因:**
- OCR 辨識的日期格式不正確

**解決方式:**
1. 使用 `test_date_format.js` 測試日期轉換
2. 檢查支援的日期格式
3. 改善圖片品質提高 OCR 準確度

## API 端點對照表

| 端點 | 說明 | 自動填寫 | 推薦使用 |
|------|------|---------|---------|
| POST /api/verify/url | 辨識 (可選自動填寫) | 可選 | ✓ 推薦 |
| POST /api/verify/upload | 辨識 (可選自動填寫) | 可選 | ✓ 推薦 |
| POST /api/verify-and-fill/url | 辨識並強制自動填寫 | 強制 | 向後兼容 |
| POST /api/verify-and-fill/upload | 辨識並強制自動填寫 | 強制 | 向後兼容 |

## 相關文檔

- `AUTO_FILL_README.md` - 自動填寫功能詳細說明
- `test_date_format.js` - 日期格式轉換測試
- `test_auto_fill.js` - 自動填寫功能測試
