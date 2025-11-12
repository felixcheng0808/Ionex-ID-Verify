# Ionex ID Verify

台灣身分證辨識系統 - 整合 OCR 辨識、自動填寫、證件審核功能

## ⚠️ 重要提示

本系統支援兩種 OCR 引擎：

1. **Google Cloud Vision API**（推薦）
   - ✅ 辨識準確度：95%+
   - ✅ 前 1,000 次/月免費
   - ⚠️ 需要 Google Cloud 帳號設定
   - 📖 [設定教學](./GOOGLE_VISION_SETUP.md)

2. **Tesseract.js**（免費但效果有限）
   - ⚠️ 辨識準確度：約 5-10%
   - ✅ 完全免費，無需設定
   - ❌ 不建議用於生產環境
   - 📖 [測試報告](./TEST_RESULT.md)

## 🎯 功能特點

### 核心功能
- ✅ **身分證 OCR 辨識** - 支援上傳圖片與 URL 兩種方式
- ✅ **自動填寫監理服務網** - 自動開啟瀏覽器並填寫表單
- ✅ **證件審核系統** - 整合 Ionex API 的證件管理工作流程
- ✅ **雙 OCR 引擎支援** - Google Cloud Vision API / Tesseract.js
- ✅ **民國年日期轉換** - 自動轉換為 YYYMMDD 格式
- ✅ **瀏覽器自動化** - Puppeteer 整合，支援手動驗證碼輸入

### 三大系統
1. **OCR 辨識系統** - 精準辨識身分證資訊
2. **自動填寫系統** - 一鍵填寫政府網站表單
3. **證件審核系統** - 完整的證件審核工作流程

## 可辨識的資訊

- 身分證字號
- 姓名
- 性別
- 出生日期
- 發證日期
- 發證地點

## 🚀 快速開始

### 一分鐘上手

```bash
# 1. 啟動伺服器
npm start

# 2. 開啟測試工具
# 身分證辨識 + 自動填寫
http://localhost:3000/test-auto-fill-enhanced.html

# 證件審核系統
http://localhost:3000/document-review.html
```

## 系統需求

- Node.js >= 16.x
- npm 或 yarn
- 記憶體 >= 512MB (建議 1GB+ 用於瀏覽器自動化)

## 安裝

```bash
# 複製專案
git clone <repository-url>
cd Ionex-ID-Verify

# 安裝依賴套件
npm install

# 設定環境變數
cp .env.example .env
```

## 設定

### 選項 1: 使用 Google Cloud Vision API（推薦）

1. 按照 [GOOGLE_VISION_SETUP.md](./GOOGLE_VISION_SETUP.md) 完成設定
2. 編輯 `.env` 檔案：

```env
PORT=3888
NODE_ENV=development
USE_GOOGLE_VISION=true
GOOGLE_APPLICATION_CREDENTIALS=./config/google-vision-key.json
```

### 選項 2: 使用 Tesseract.js（免費但效果有限）

編輯 `.env` 檔案：

```env
PORT=3888
NODE_ENV=development
USE_GOOGLE_VISION=false
```

## 啟動服務

### 開發模式（自動重載）

```bash
npm run dev
```

### 生產模式

```bash
npm start
```

伺服器將會在 `http://localhost:3000` 啟動

## 📋 API 端點

### 主要端點（推薦使用）

#### 1. POST /api/verify/upload
**透過上傳圖片辨識（可選自動填寫）**

```bash
# 只辨識
curl -X POST http://localhost:3000/api/verify/upload \
  -F "image=@id-card.jpg"

# 辨識 + 自動填寫監理服務網
curl -X POST http://localhost:3000/api/verify/upload \
  -F "image=@id-card.jpg" \
  -F "autoFillForm=true"
```

#### 2. POST /api/verify/url
**透過圖片 URL 辨識（可選自動填寫）**

```bash
# 只辨識
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/id-card.jpg"}'

# 辨識 + 自動填寫
curl -X POST http://localhost:3000/api/verify/url \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/id-card.jpg", "autoFillForm": true}'
```

**參數說明：**
| 參數 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `image` / `imageUrl` | file / string | ✅ | - | 圖片檔案或 URL |
| `autoFillForm` | boolean | ✗ | false | 啟用自動填寫監理服務網 |
| `keepBrowserAlive` | boolean | ✗ | true | 保持瀏覽器開啟以輸入驗證碼 |
| `puppeteerOptions` | object | ✗ | {} | Puppeteer 自訂選項 |

**回應範例（含自動填寫）：**
```json
{
  "success": true,
  "data": {
    "idNumber": "A123456789",
    "name": "王小明",
    "gender": "男",
    "birthDate": "70年01月01日",
    "issueDate": "99.01.01",
    "issueLocation": "台北市"
  },
  "automation": {
    "success": true,
    "message": "表單已自動填寫完成，請手動輸入驗證碼並提交表單。瀏覽器將保持開啟狀態。",
    "data": {
      "url": "https://www.mvdis.gov.tw/m3-emv-vil/vil/driverLicensePenalty",
      "filledFields": {
        "idNumber": "A123456789",
        "birthDate": "0700101"
      },
      "waitingForCaptcha": true
    }
  },
  "confidence": 85.5,
  "message": "辨識成功"
}
```

### 獨立端點（向後兼容）

#### 3. POST /api/verify-and-fill/upload
強制啟用自動填寫的上傳端點

#### 4. POST /api/verify-and-fill/url
強制啟用自動填寫的 URL 端點

### 其他端點

#### GET /api/health
健康檢查

#### GET /api/status
系統狀態

#### GET /
API 文檔

## 🎨 網頁測試工具

### 1. 增強版辨識測試工具
```
http://localhost:3000/test-auto-fill-enhanced.html
```

**功能：**
- ✅ 上傳圖片模式
- ✅ 圖片 URL 模式
- ✅ Tab 切換介面
- ✅ 自動填寫開關
- ✅ 圖片預覽
- ✅ 範例 URL 快速測試
- ✅ 支援 URL 參數自動帶入

### 2. 證件審核系統
```
http://localhost:3000/document-review.html
```

**功能：**
- ✅ 環境切換 (Alpha / Prod)
- ✅ 帳號密碼登入
- ✅ Session 自動儲存
- ✅ GraphQL 證件查詢
- ✅ 待審核證件列表
- ✅ 一鍵帶入證件到辨識系統

## 📊 證件審核工作流程

```
1. 開啟證件審核系統
   ↓
2. 選擇環境 (Alpha/Prod) 並登入
   ↓
3. 查看待審核證件列表
   ↓
4. 點擊「帶入證件」按鈕
   ↓
5. 自動開啟辨識頁面並載入證件圖片
   ↓
6. 啟用自動填寫功能
   ↓
7. 系統辨識並自動填寫監理服務網
   ↓
8. 手動輸入驗證碼完成查詢
```

## 📁 專案結構

```
Ionex-ID-Verify/
├── src/
│   ├── controllers/
│   │   └── idCardController.js         # API 控制器 (含自動填寫整合)
│   ├── services/
│   │   ├── imageService.js             # 圖片處理服務
│   │   ├── ocrService.js               # OCR 服務
│   │   ├── parserService.js            # 身分證資訊解析 + 日期轉換
│   │   └── webAutomationService.js     # 瀏覽器自動化服務 (NEW)
│   ├── middlewares/
│   │   └── uploadMiddleware.js         # 檔案上傳中介層
│   ├── utils/
│   │   └── validator.js                # 身分證字號驗證
│   └── app.js                          # 主應用程式 + 路由
├── public/
│   ├── test-auto-fill-enhanced.html    # 增強版測試工具 (NEW)
│   ├── test-auto-fill.html             # 基礎測試工具 (NEW)
│   ├── document-review.html            # 證件審核系統 (NEW)
│   └── index.html                      # 原始測試頁面
├── config/                             # 配置檔案
├── temp/                               # 臨時檔案目錄
├── uploads/                            # 上傳檔案目錄
├── tests/                              # 測試檔案
│   ├── test_date_format.js             # 日期轉換測試 (NEW)
│   ├── test_auto_fill.js               # 上傳自動填寫測試 (NEW)
│   └── test_url_auto_fill.js           # URL 自動填寫測試 (NEW)
├── docs/                               # 完整文檔 (NEW)
│   ├── QUICK_START.md                  # 快速開始
│   ├── COMPLETE_GUIDE.md               # 完整指南
│   ├── INTEGRATION_GUIDE.md            # 上傳整合指南
│   ├── URL_INTEGRATION_GUIDE.md        # URL 整合指南
│   ├── AUTO_FILL_README.md             # 自動填寫技術文檔
│   ├── DOCUMENT_REVIEW_GUIDE.md        # 證件審核指南
│   └── FINAL_INTEGRATION_REPORT.md     # 整合報告
├── .env                                # 環境變數
├── .env.example                        # 環境變數範例
├── package.json
└── README.md
```

## 🛠️ 技術棧

### 核心框架
- **後端框架**: Express.js
- **OCR 引擎**: Google Cloud Vision API / Tesseract.js (chi_tra)
- **瀏覽器自動化**: Puppeteer

### 功能套件
- **圖片處理**: Sharp
- **檔案上傳**: Multer
- **資料驗證**: Joi
- **HTTP 請求**: Axios

### 前端技術
- **UI 框架**: 原生 JavaScript + CSS3
- **API 整合**: Fetch API
- **狀態管理**: localStorage

## 辨識準確度優化建議

為了獲得最佳的辨識效果，請確保：

1. 圖片清晰度足夠（建議至少 1000x1000 像素）
2. 光線充足，避免陰影
3. 身分證放置平整，避免傾斜
4. 避免反光
5. 圖片格式為 JPG、PNG 或 WEBP
6. 檔案大小不超過 10MB

## 🔒 安全性考量

### 一般安全
- ✅ 檔案類型與大小驗證
- ✅ URL SSRF 攻擊防護
- ✅ 自動清理臨時檔案
- ✅ 不記錄敏感資訊到日誌
- ✅ 建議使用 HTTPS 傳輸

### 證件審核系統安全
- ⚠️ **API Key 管理** - 目前 API Key 在前端，建議移至後端環境變數
- ⚠️ **Token 儲存** - Token 儲存在 localStorage，需手動登出清除
- ✅ **Bearer Token 認證** - 使用標準 OAuth 認證機制
- ✅ **CORS 設定** - 適當的跨域請求設定

## ⚠️ 限制與注意事項

### OCR 辨識
- 使用 Tesseract.js 的準確度約 5-10%（建議使用 Google Vision API）
- 繁體中文辨識需要較高品質的圖片
- 首次啟動需要下載語言包（chi_tra）

### 瀏覽器自動化
- 驗證碼需要手動輸入（無法自動識別）
- 瀏覽器實例消耗記憶體（約 100-200MB/實例）
- 建議控制並發數量（2-5 個為佳）
- keepBrowserAlive=true 時需手動關閉瀏覽器

### 證件審核系統
- 圖片 URL 必須可公開訪問
- Token 可能過期需重新登入
- 目前一次載入 25 筆記錄

## 🐛 故障排除

### OCR 辨識失敗
- 確認圖片品質是否足夠（建議 1000x1000 以上）
- 檢查圖片是否為台灣身分證
- 嘗試調整圖片亮度和對比度
- 確認使用 Google Vision API（準確度更高）

### 自動填寫失敗
- 確認身分證字號和生日都已正確辨識
- 檢查瀏覽器是否成功啟動
- 查看控制台錯誤訊息
- 確認監理服務網網址未變更

### 證件審核系統登入失敗
- 確認環境選擇正確（Alpha / Prod）
- 檢查帳號密碼是否正確
- 確認 API Key 配置正確
- 查看瀏覽器控制台網路請求

### 瀏覽器無法啟動
- 確認 Puppeteer 已正確安裝：`npm install puppeteer`
- Linux 環境可能需要安裝額外依賴
- macOS 可能需要授予 Terminal 自動化權限

### 記憶體不足
- 減少同時處理的請求數（建議 2-5 個）
- 設定 keepBrowserAlive=false 自動關閉瀏覽器
- 考慮增加伺服器記憶體

## 🧪 測試

### 自動測試腳本
```bash
# 日期格式轉換測試
node test_date_format.js

# 上傳方式自動填寫測試
node test_auto_fill.js

# URL 方式自動填寫測試
node test_url_auto_fill.js
```

### 單元測試
```bash
# 執行測試
npm test

# 執行測試並監聽變化
npm run test:watch
```

## 📖 詳細文檔

### 快速參考
- 📘 **[QUICK_START.md](./QUICK_START.md)** - 一分鐘快速上手
- 📗 **[COMPLETE_GUIDE.md](./COMPLETE_GUIDE.md)** - 完整使用指南

### 功能指南
- 📙 **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - 上傳方式整合指南
- 📕 **[URL_INTEGRATION_GUIDE.md](./URL_INTEGRATION_GUIDE.md)** - URL 方式整合指南
- 📔 **[AUTO_FILL_README.md](./AUTO_FILL_README.md)** - 自動填寫技術文檔
- 📓 **[DOCUMENT_REVIEW_GUIDE.md](./DOCUMENT_REVIEW_GUIDE.md)** - 證件審核系統指南

### 參考資料
- 📄 **[README_INTEGRATION.md](./README_INTEGRATION.md)** - 整合完成摘要
- 📄 **[INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md)** - 整合檢查清單
- 📄 **[FINAL_INTEGRATION_REPORT.md](./FINAL_INTEGRATION_REPORT.md)** - 最終整合報告

## 🚀 使用範例

### 範例 1: 簡單的身分證辨識

```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('http://localhost:3000/api/verify/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('身分證字號:', result.data.idNumber);
console.log('姓名:', result.data.name);
console.log('生日:', result.data.birthDate);
```

### 範例 2: 辨識後自動填寫

```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('autoFillForm', 'true');

const response = await fetch('http://localhost:3000/api/verify/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.automation && result.automation.success) {
  console.log('表單已自動填寫，請輸入驗證碼');
}
```

### 範例 3: URL 方式批次處理

```javascript
const imageUrls = [
  'https://example.com/id1.jpg',
  'https://example.com/id2.jpg',
  'https://example.com/id3.jpg'
];

for (const url of imageUrls) {
  const response = await fetch('http://localhost:3000/api/verify/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: url })
  });

  const result = await response.json();
  console.log(`處理 ${url}:`, result.data.idNumber);
}
```

## 💡 最佳實踐

### 選擇適合的方式
- **上傳方式** - 即時拍攝、本地圖片、需要高安全性
- **URL 方式** - 雲端圖片、批次處理、已存在 S3/GCS

### 自動填寫設定建議
```javascript
{
  autoFillForm: true,        // 啟用自動填寫
  keepBrowserAlive: true     // 保持開啟以輸入驗證碼
}
```

### 錯誤處理
```javascript
try {
  const result = await fetch('/api/verify/upload', {
    method: 'POST',
    body: formData
  }).then(r => r.json());

  if (result.success) {
    // 處理成功
  } else {
    // 處理失敗
    console.error(result.error);
  }
} catch (error) {
  console.error('網路錯誤:', error);
}
```

## 📈 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                    使用者界面                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 增強版測試頁  │  │ 證件審核系統  │  │  第三方應用   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             ↓
          ┌──────────────────────────────────────┐
          │         Express.js API Server         │
          │  ┌────────────────────────────────┐  │
          │  │    idCardController.js         │  │
          │  │  - verifyByUpload()            │  │
          │  │  - verifyByUrl()               │  │
          │  │  - verifyAndFillForm...()      │  │
          │  └────────────────────────────────┘  │
          └──────────────────────────────────────┘
                             ↓
          ┌──────────────────┴──────────────────┐
          │                                      │
          ↓                                      ↓
┌─────────────────────┐              ┌─────────────────────┐
│   ocrService.js     │              │ webAutomationService│
│ - Google Vision API │              │ - Puppeteer         │
│ - Tesseract.js      │              │ - 瀏覽器自動化       │
│ - 圖片預處理         │              │ - 表單填寫          │
└─────────────────────┘              └─────────────────────┘
          │                                      │
          ↓                                      ↓
┌─────────────────────┐              ┌─────────────────────┐
│  parserService.js   │              │  監理服務網          │
│ - 資料解析          │              │ www.mvdis.gov.tw    │
│ - 日期格式轉換       │              │ - 違規查詢表單       │
│ - 資料驗證          │              │ - 驗證碼輸入         │
└─────────────────────┘              └─────────────────────┘
```

## 🎯 核心特色

### 1. 無縫整合設計
- ✅ 在原有 API 加入可選參數 `autoFillForm`
- ✅ 預設行為不變，完全向後兼容
- ✅ 不影響現有應用程式

### 2. 雙模式支援
- ✅ 上傳圖片方式 - 適合即時拍攝
- ✅ 圖片 URL 方式 - 適合批次處理
- ✅ 統一的參數介面

### 3. 智能日期轉換
- ✅ 支援民國年格式：74年1月1日
- ✅ 自動轉換為 YYYMMDD：0740101
- ✅ 支援多種輸入格式

### 4. 瀏覽器自動化
- ✅ Puppeteer 整合
- ✅ 自動開啟政府網站
- ✅ 自動填寫表單欄位
- ✅ 保持開啟等待驗證碼輸入

### 5. 證件審核工作流程
- ✅ 環境切換 (Alpha/Prod)
- ✅ OAuth Bearer Token 認證
- ✅ GraphQL 證件查詢
- ✅ 一鍵帶入證件到辨識系統
- ✅ 完整的審核工作流程

## 🎉 整合狀態

✅ **OCR 辨識系統** - 100% 完成
✅ **自動填寫系統** - 100% 完成
✅ **證件審核系統** - 100% 完成
✅ **測試工具** - 100% 完成
✅ **文檔** - 100% 完成

**系統狀態**: 可立即使用 🚀

## 📞 支援與聯絡

如有問題請參考：
1. 📖 [完整文檔](./COMPLETE_GUIDE.md)
2. 🧪 測試工具和範例
3. 📋 API 端點說明
4. 🐛 故障排除指南

## 授權

ISC License

## 貢獻

歡迎提交 Issue 和 Pull Request

---

## 🔮 未來規劃

### 短期 (已完成)
- [x] 支援圖片 URL 辨識
- [x] 自動填寫監理服務網
- [x] 民國年日期轉換
- [x] 證件審核系統整合
- [x] 完整測試工具

### 中期
- [ ] 證件審核功能（通過/拒絕）
- [ ] 支援更多證件類型
- [ ] 批次辨識優化
- [ ] API 速率限制

### 長期
- [ ] 支援新式數位身分證
- [ ] 身分證真偽驗證
- [ ] Docker 部署支援
- [ ] 辨識歷史紀錄
- [ ] 審核工作流程引擎

---

**版本**: 2.0.0
**最後更新**: 2025-11-12
**整合狀態**: ✅ 完整整合完成
