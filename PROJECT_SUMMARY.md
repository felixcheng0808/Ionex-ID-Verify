# 專案總結文件

## 專案資訊

**專案名稱**: Ionex ID Verify
**版本**: 1.0.0
**類型**: 台灣身分證辨識系統
**主要技術**: Node.js + Tesseract.js (OCR)

## 專案結構

```
Ionex-ID-Verify/
├── src/                                    # 原始碼目錄
│   ├── controllers/                       # 控制器層
│   │   └── idCardController.js           # 身分證辨識 API 控制器
│   ├── services/                          # 服務層
│   │   ├── imageService.js               # 圖片處理服務
│   │   ├── ocrService.js                 # OCR 辨識服務
│   │   └── parserService.js              # 資訊解析服務
│   ├── middlewares/                       # 中介層
│   │   └── uploadMiddleware.js           # 檔案上傳中介層
│   ├── utils/                             # 工具函數
│   │   └── validator.js                  # 身分證字號驗證工具
│   └── app.js                            # Express 應用程式入口
├── tests/                                 # 測試文件
│   └── validator.test.js                 # 驗證器測試
├── config/                                # 配置目錄
├── temp/                                  # 臨時檔案（自動清理）
├── uploads/                               # 上傳檔案（自動清理）
├── .env                                   # 環境變數
├── .env.example                           # 環境變數範例
├── .gitignore                             # Git 忽略清單
├── package.json                           # 專案配置
├── README.md                              # 專案說明
├── QUICKSTART.md                          # 快速入門指南
├── PROJECT_SUMMARY.md                     # 本文件
├── example-test.js                        # 測試範例腳本
└── Ionex-ID-Verify.postman_collection.json  # Postman 測試集合
```

## 核心功能模組

### 1. 圖片處理服務 (imageService.js)

**功能**:
- 從 URL 下載圖片
- 圖片預處理（灰階、對比增強、銳利化）
- 圖片驗證（格式、大小）
- 臨時檔案管理

**關鍵方法**:
- `downloadFromUrl(imageUrl)` - 下載遠端圖片
- `preprocessImage(inputPath)` - 預處理圖片以提高 OCR 準確度
- `validateImage(filepath)` - 驗證圖片格式與尺寸
- `cleanupFiles(filepaths)` - 清理臨時檔案

**安全特性**:
- SSRF 攻擊防護
- 檔案大小限制（10MB）
- 支援格式限制（JPG, PNG, WEBP）

### 2. OCR 服務 (ocrService.js)

**功能**:
- Tesseract.js OCR 引擎封裝
- 繁體中文辨識
- Worker 生命週期管理

**關鍵方法**:
- `initialize()` - 初始化 OCR Worker
- `recognizeText(imagePath)` - 辨識圖片文字
- `terminate()` - 關閉 Worker
- `getStatus()` - 獲取 OCR 狀態

**技術細節**:
- 語言: chi_tra (繁體中文)
- 字元白名單: 英文、數字、中文縣市名稱
- 自動頁面分段模式

### 3. 解析服務 (parserService.js)

**功能**:
- 從 OCR 結果提取身分證資訊
- 正則表達式模式匹配
- 民國年轉西元年

**可提取欄位**:
- 身分證字號
- 姓名（2-4個中文字）
- 性別（從身分證字號推斷）
- 出生日期（民國年格式）
- 發證日期
- 發證地點（縣市）

**關鍵方法**:
- `parseIDCard(ocrResult)` - 主要解析函數
- `extractIDNumber(text)` - 提取身分證字號
- `extractName(text, lines)` - 提取姓名
- `extractBirthDate(text)` - 提取出生日期
- `convertROCToAD(rocDate)` - 民國年轉西元年

### 4. 驗證工具 (validator.js)

**功能**:
- 台灣身分證字號驗證
- 檢查碼演算法
- 資訊提取

**演算法**:
```
台灣身分證字號規則:
- 格式: 1個英文字母 + 1個數字(1或2) + 8個數字
- 第1碼: 縣市代碼
- 第2碼: 性別 (1=男, 2=女)
- 第3-9碼: 流水號
- 第10碼: 檢查碼（使用權重計算）
```

**關鍵方法**:
- `validateTaiwanID(id)` - 完整驗證
- `verifyChecksum(id)` - 檢查碼驗證
- `getIDInfo(id)` - 提取性別、縣市資訊
- `extractPossibleIDs(text)` - 從文字提取可能的身分證字號

### 5. 上傳中介層 (uploadMiddleware.js)

**功能**:
- Multer 檔案上傳處理
- 檔案類型驗證
- 檔案大小限制
- 錯誤處理

**限制**:
- 最大檔案: 10MB
- 允許格式: image/jpeg, image/png, image/webp
- 單次上傳: 1個檔案
- 欄位名稱: "image"

### 6. API 控制器 (idCardController.js)

**端點**:

| 方法 | 路徑 | 功能 |
|------|------|------|
| GET | /api/health | 健康檢查 |
| GET | /api/status | 系統狀態 |
| POST | /api/verify/url | URL 辨識 |
| POST | /api/verify/upload | 上傳辨識 |

**流程**:
1. 請求驗證（Joi）
2. 圖片獲取（URL 下載或上傳）
3. 圖片驗證
4. 圖片預處理
5. OCR 辨識
6. 資訊解析
7. 結果驗證
8. 回傳 JSON
9. 清理臨時檔案

## API 回應格式

### 成功回應

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
  "validation": {
    "isComplete": true,
    "missingFields": [],
    "warnings": []
  },
  "confidence": 85.5,
  "message": "辨識成功"
}
```

### 失敗回應

```json
{
  "success": false,
  "error": "錯誤訊息"
}
```

## 技術棧

| 類別 | 技術 | 版本 | 用途 |
|------|------|------|------|
| 執行環境 | Node.js | >= 16.x | JavaScript 執行環境 |
| Web 框架 | Express.js | ^5.1.0 | HTTP 伺服器框架 |
| OCR 引擎 | Tesseract.js | ^6.0.1 | 文字辨識 |
| 圖片處理 | Sharp | ^0.34.5 | 圖片預處理 |
| 檔案上傳 | Multer | ^2.0.2 | multipart/form-data 處理 |
| HTTP 請求 | Axios | ^1.13.2 | 下載遠端圖片 |
| 資料驗證 | Joi | ^18.0.1 | 請求資料驗證 |
| 環境變數 | dotenv | ^17.2.3 | 環境變數管理 |
| UUID | uuid | ^13.0.0 | 唯一檔案名生成 |
| 測試框架 | Jest | ^30.2.0 | 單元測試 |
| 開發工具 | Nodemon | ^3.1.10 | 自動重載 |

## 環境變數配置

```env
PORT=3000                          # 伺服器埠號
NODE_ENV=development               # 執行環境
API_RATE_LIMIT=100                # API 速率限制
API_TIMEOUT=30000                 # API 超時時間
MAX_FILE_SIZE=10485760            # 最大檔案大小
ALLOWED_FILE_TYPES=jpg,jpeg,png,webp  # 允許的檔案類型
OCR_LANGUAGE=chi_tra              # OCR 語言
OCR_CONFIDENCE_THRESHOLD=60       # OCR 信心度門檻
LOG_LEVEL=info                    # 日誌級別
```

## 啟動指令

```bash
# 開發模式（自動重載）
npm run dev

# 生產模式
npm start

# 執行測試
npm test

# 測試監聽模式
npm run test:watch
```

## 效能考量

### 辨識速度
- 首次啟動: 較慢（下載語言包）
- 後續辨識: 3-10秒/張（取決於圖片大小）

### 記憶體使用
- 基礎: ~100MB
- OCR Worker: +50-100MB
- 建議最小記憶體: 512MB

### 最佳化建議
1. 圖片預處理減少檔案大小
2. 使用適當的圖片尺寸（不要太大）
3. 考慮增加 Worker Pool（多請求時）
4. 升級到商業 OCR 服務（如 Google Vision API）

## 安全性功能

1. **SSRF 防護**: 只允許 HTTP/HTTPS 協議
2. **檔案驗證**: 類型、大小、格式驗證
3. **臨時檔案清理**: 處理後自動刪除
4. **輸入驗證**: 使用 Joi 驗證所有輸入
5. **CORS 設定**: 可配置跨域存取
6. **敏感資訊**: 不記錄身分證資訊到日誌

## 已知限制

1. **準確度**: Tesseract 對繁體中文辨識準確度約 70-85%
2. **圖片品質**: 需要清晰、平整、光線充足的圖片
3. **新式身分證**: 主要針對舊式身分證設計
4. **並發處理**: 單 Worker 設計，高並發需要優化
5. **錯誤修正**: OCR 錯誤（如 O->0）只做基本修正

## 未來改進方向

- [ ] 多 Worker Pool 提高並發效能
- [ ] 支援新式數位身分證
- [ ] 整合商業 OCR API（Google Vision, Azure）
- [ ] 增加辨識歷史記錄
- [ ] 實作 API 速率限制
- [ ] Docker 容器化部署
- [ ] 批次辨識功能
- [ ] WebSocket 即時進度回報
- [ ] 管理後台介面
- [ ] 資料庫整合

## 測試覆蓋率

目前已實作:
- ✓ 身分證字號驗證單元測試
- ✓ API 端點測試範例

待完成:
- [ ] 圖片處理測試
- [ ] OCR 服務測試
- [ ] 解析服務測試
- [ ] 整合測試
- [ ] E2E 測試

## 授權

ISC License

## 維護者

Ionex Team

---

**最後更新**: 2025-11-09
**文件版本**: 1.0.0
