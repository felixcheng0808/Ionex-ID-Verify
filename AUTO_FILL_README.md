# 監理服務網自動填寫功能使用說明

## 功能概述

本功能可以在辨識身分證後,自動打開監理服務網駕照違規查詢頁面,並填入身分證字號和生日。使用者只需要手動輸入驗證碼即可完成查詢。

## 技術實作

### 核心功能

1. **日期格式轉換** (`src/services/parserService.js`)
   - `convertToMVDISFormat(rocDate)`: 將民國年日期轉換為監理服務網格式 (YYYMMDD)
   - `validateMVDISDate(dateStr)`: 驗證日期格式是否正確

2. **網站自動化** (`src/services/webAutomationService.js`)
   - 使用 Puppeteer 控制瀏覽器
   - 自動導航到監理服務網
   - 自動填寫身分證字號和生日
   - 等待使用者手動輸入驗證碼

3. **API 端點**
   - `POST /api/verify-and-fill/url`: 透過圖片 URL 辨識並填寫表單
   - `POST /api/verify-and-fill/upload`: 透過上傳圖片辨識並填寫表單

## API 使用範例

### 1. 透過 URL 辨識並填寫表單

```bash
curl -X POST http://localhost:3000/api/verify-and-fill/url \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/id-card.jpg",
    "keepBrowserAlive": true
  }'
```

### 2. 透過上傳圖片辨識並填寫表單

```bash
curl -X POST http://localhost:3000/api/verify-and-fill/upload \
  -F "image=@/path/to/id-card.jpg" \
  -F "keepBrowserAlive=true"
```

## 請求參數

| 參數 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `imageUrl` | string | 是(URL方式) | - | 身分證圖片的 URL |
| `image` | file | 是(上傳方式) | - | 身分證圖片檔案 |
| `keepBrowserAlive` | boolean | 否 | true | 是否保持瀏覽器開啟 |

## 回應格式

### 成功回應

```json
{
  "success": true,
  "message": "辨識成功並已自動填寫表單",
  "ocr": {
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
    "confidence": 0.95
  },
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
  "error": "辨識失敗，請確認圖片品質",
  "data": {
    "idNumber": null,
    "name": null,
    "gender": null,
    "birthDate": null,
    "issueDate": null,
    "issueLocation": null
  },
  "validation": {
    "isComplete": false,
    "missingFields": ["idNumber", "name", "birthDate"],
    "warnings": []
  }
}
```

## 測試方式

### 1. 測試日期格式轉換

```bash
node test_date_format.js
```

### 2. 測試自動填寫功能

1. 編輯 `test_auto_fill.js` 檔案,修改測試資料:

```javascript
const testData = {
  idNumber: 'A123456789',  // 替換成測試用身分證字號
  birthDate: '74年1月1日'   // 替換成測試用生日
};
```

2. 執行測試:

```bash
node test_auto_fill.js
```

3. 瀏覽器會自動開啟並填寫表單
4. 手動輸入驗證碼並提交
5. 按 Ctrl+C 關閉程式

### 3. 完整流程測試 (需要真實身分證圖片)

1. 啟動伺服器:

```bash
npm start
```

2. 使用 API 測試:

```bash
# 假設您有一張身分證圖片
curl -X POST http://localhost:3000/api/verify-and-fill/upload \
  -F "image=@/path/to/your/id-card.jpg" \
  -F "keepBrowserAlive=true"
```

## 工作流程

```
1. 使用者呼叫 API 並提供身分證圖片
   ↓
2. 系統使用 OCR 辨識身分證資訊
   ↓
3. 解析並驗證身分證字號和生日
   ↓
4. 將生日轉換為監理服務網格式 (YYYMMDD)
   ↓
5. 啟動 Puppeteer 瀏覽器
   ↓
6. 導航到監理服務網駕照違規查詢頁面
   ↓
7. 自動填寫身分證字號和生日
   ↓
8. 等待使用者手動輸入驗證碼
   ↓
9. 使用者提交表單查看結果
```

## 注意事項

1. **驗證碼處理**: 目前需要手動輸入驗證碼,系統會保持瀏覽器開啟等待使用者操作

2. **瀏覽器視窗**:
   - 預設 `headless: false` 讓使用者可以看到瀏覽器並操作
   - 可以透過 `keepBrowserAlive` 參數控制瀏覽器是否自動關閉

3. **日期格式**:
   - OCR 解析的日期必須是民國年格式 (例如: "74年1月1日")
   - 系統會自動轉換為監理服務網要求的 7 位數格式 (例如: "0740101")

4. **錯誤處理**:
   - 如果 OCR 無法辨識身分證字號或生日,將不會開啟瀏覽器
   - 如果日期格式轉換失敗,將返回錯誤訊息

5. **資源管理**:
   - 伺服器關閉時會自動關閉所有開啟的瀏覽器實例
   - 建議定期檢查並關閉未使用的瀏覽器視窗

## 日期格式範例

| OCR 解析結果 | 轉換後格式 | 說明 |
|-------------|-----------|------|
| 74年1月1日 | 0740101 | 民國74年1月1日 |
| 100年12月31日 | 1001231 | 民國100年12月31日 |
| 5年5月5日 | 0050505 | 民國5年5月5日 (補0) |
| 74.1.1 | 0740101 | 點號分隔格式 |

## 常見問題

### Q: 為什麼要保持瀏覽器開啟?
A: 因為監理服務網有驗證碼保護,需要使用者手動輸入。設定 `keepBrowserAlive: true` 可以讓系統填寫完表單後保持瀏覽器開啟,方便使用者繼續操作。

### Q: 可以自動辨識驗證碼嗎?
A: 目前版本需要手動輸入驗證碼。自動辨識驗證碼可能違反網站使用條款,因此採用人工輸入的方式。

### Q: 如何調整瀏覽器視窗大小?
A: 可以透過 `puppeteerOptions` 參數自訂 Puppeteer 設定。

### Q: 日期格式轉換失敗怎麼辦?
A: 確認 OCR 解析的日期格式是否正確。支援的格式包括:
- "74年1月1日"
- "74年01月01日"
- "74.1.1"
- "74.01.01"

## 系統需求

- Node.js 14 或以上
- 足夠的記憶體運行 Puppeteer (建議至少 512MB)
- 支援 Chromium 的作業系統 (Windows, macOS, Linux)

## 未來改進方向

1. 支援批次處理多張身分證
2. 新增查詢結果截圖功能
3. 整合更多監理服務網查詢功能
4. 提供 Webhook 通知查詢結果
5. 支援無頭模式並透過 API 返回驗證碼圖片供前端顯示
