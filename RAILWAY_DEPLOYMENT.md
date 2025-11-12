# 🚂 Railway 部署指南

## 📋 部署前準備

### 1. 確認檔案已準備好
- ✅ `railway.json` - Railway 配置
- ✅ `nixpacks.toml` - Nixpacks 建置配置
- ✅ `package.json` - Node.js 依賴
- ✅ `.env.example` - 環境變數範例

### 2. 重要檔案說明

#### railway.json
Railway 部署配置，包含：
- 建置器設定（NIXPACKS）
- 啟動命令
- 重啟策略

#### nixpacks.toml
Nixpacks 建置配置，包含：
- Chromium 安裝（用於 Puppeteer）
- 必要的系統套件
- Puppeteer 環境變數

## 🚀 部署步驟

### 步驟 1: 連接 GitHub Repository

1. 前往 [Railway](https://railway.app/)
2. 點擊 **"New Project"**
3. 選擇 **"Deploy from GitHub repo"**
4. 授權 Railway 訪問您的 GitHub
5. 選擇 `felixcheng0808/Ionex-ID-Verify`

### 步驟 2: 配置環境變數

在 Railway 專案中，前往 **Variables** 頁面，添加以下環境變數：

#### 必要環境變數

```bash
# 伺服器設定
PORT=3000
NODE_ENV=production

# OCR 引擎選擇 (擇一)
OCR_ENGINE=tesseract
# 或使用 Google Vision
# OCR_ENGINE=google
# USE_GOOGLE_VISION=true

# Puppeteer 設定 (重要!)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/nix/store/*-chromium-*/bin/chromium
```

#### 選用環境變數（如使用 Google Vision API）

```bash
USE_GOOGLE_VISION=true
GOOGLE_APPLICATION_CREDENTIALS=./config/google-vision-key.json
```

⚠️ **注意**: Google Vision 憑證需要透過 Railway Secrets 或環境變數 JSON 字串設定。

### 步驟 3: 部署設定

Railway 會自動偵測以下檔案並配置：
- ✅ `railway.json` - 部署配置
- ✅ `nixpacks.toml` - 建置配置
- ✅ `package.json` - 依賴套件

### 步驟 4: 執行部署

1. 點擊 **"Deploy"**
2. Railway 將自動：
   - 安裝 Node.js 18.x
   - 安裝 Chromium 和相關依賴
   - 執行 `npm ci` 安裝套件
   - 啟動應用程式

### 步驟 5: 檢查部署狀態

部署完成後：
1. 查看 **Deployments** 頁面確認狀態
2. 點擊 **"View Logs"** 查看啟動日誌
3. 應該看到：
   ```
   ✓ 伺服器啟動成功
   ✓ 運行於: http://0.0.0.0:3000
   ```

### 步驟 6: 取得公開 URL

1. 前往 **Settings** 頁面
2. 在 **Networking** 區塊
3. 點擊 **"Generate Domain"**
4. 獲得類似：`your-app.up.railway.app` 的網址

## 🌐 訪問部署的應用

部署成功後，您可以訪問：

```
# API 文檔
https://your-app.up.railway.app/

# 健康檢查
https://your-app.up.railway.app/api/health

# 增強版測試工具
https://your-app.up.railway.app/test-auto-fill-enhanced.html

# 證件審核系統
https://your-app.up.railway.app/document-review.html
```

## 📊 Railway 環境變數完整列表

### 基本設定
| 變數名稱 | 必要 | 預設值 | 說明 |
|---------|------|--------|------|
| `PORT` | ✅ | 3000 | 伺服器埠號 |
| `NODE_ENV` | ✅ | production | 執行環境 |

### OCR 設定
| 變數名稱 | 必要 | 預設值 | 說明 |
|---------|------|--------|------|
| `OCR_ENGINE` | ✅ | tesseract | OCR 引擎 (tesseract/google/paddle) |
| `USE_GOOGLE_VISION` | ✗ | false | 是否使用 Google Vision |
| `GOOGLE_APPLICATION_CREDENTIALS` | ✗ | - | Google 憑證路徑 |

### Puppeteer 設定（重要）
| 變數名稱 | 必要 | 預設值 | 說明 |
|---------|------|--------|------|
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | ✅ | true | 跳過下載 Chromium |
| `PUPPETEER_EXECUTABLE_PATH` | ✅ | /nix/store/... | Chromium 執行路徑 |

## 🔧 進階配置

### 使用 Google Vision API（推薦用於生產環境）

#### 方法 1: 環境變數 JSON 字串

在 Railway Variables 添加：

```bash
GOOGLE_CREDENTIALS_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

然後在 `src/services/ocrService.js` 中使用：

```javascript
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  this.visionClient = new vision.ImageAnnotatorClient({
    credentials: credentials
  });
}
```

#### 方法 2: Railway Secrets

1. 將 `google-vision-key.json` 內容複製
2. 在 Railway 使用 Secret 功能
3. 掛載為檔案

### 調整 Puppeteer 設定

如果需要在無頭模式運行（節省資源）：

```bash
# 添加環境變數
PUPPETEER_HEADLESS=true
```

並在 `src/services/webAutomationService.js` 使用：

```javascript
const browser = await puppeteer.launch({
  headless: process.env.PUPPETEER_HEADLESS === 'true',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
});
```

## 📈 監控與除錯

### 查看日誌

在 Railway Dashboard:
1. 選擇您的服務
2. 點擊 **"View Logs"**
3. 即時查看應用日誌

### 常見日誌訊息

**成功啟動:**
```
✓ 伺服器啟動成功
✓ 運行於: http://0.0.0.0:3000
```

**OCR 初始化:**
```
OCR Service 配置:
- OCR_ENGINE 環境變數: tesseract
- 使用引擎: tesseract
```

### 健康檢查

```bash
curl https://your-app.up.railway.app/api/health
```

預期回應:
```json
{
  "status": "ok",
  "timestamp": "2025-11-12T..."
}
```

## 🐛 故障排除

### 問題 1: Puppeteer 無法啟動

**錯誤訊息:**
```
Error: Failed to launch the browser process
```

**解決方案:**
1. 確認 `nixpacks.toml` 包含所有必要套件
2. 檢查 `PUPPETEER_EXECUTABLE_PATH` 設定正確
3. 添加 Puppeteer launch 參數：
   ```javascript
   args: ['--no-sandbox', '--disable-setuid-sandbox']
   ```

### 問題 2: OCR 辨識失敗

**錯誤訊息:**
```
OCR 初始化失敗
```

**解決方案:**
1. 確認 `OCR_ENGINE` 環境變數設定
2. Tesseract 語言包 `chi_tra.traineddata` 已包含在 repository
3. 檢查記憶體是否足夠

### 問題 3: 記憶體不足

**症狀:**
- 應用程式重啟
- 請求超時

**解決方案:**
1. 升級 Railway 方案（更多 RAM）
2. 限制並發請求數量
3. 使用 `headless: true` 模式
4. 考慮使用外部 OCR API（Google Vision）

### 問題 4: Google Vision API 憑證問題

**錯誤訊息:**
```
Could not load the default credentials
```

**解決方案:**
1. 使用環境變數 JSON 字串方式
2. 確認 JSON 格式正確
3. 檢查憑證權限

## 🔒 安全性建議

### 1. 環境變數保護
- ✅ 使用 Railway Secrets 存儲敏感資訊
- ✅ 不要在代碼中硬編碼憑證
- ✅ 定期輪換 API Keys

### 2. API 保護
建議添加：
- Rate limiting (express-rate-limit)
- API Key 認證
- CORS 設定

### 3. Google Cloud 憑證
- ✅ 限制 Service Account 權限
- ✅ 使用環境變數而非檔案
- ✅ 定期審查使用量

## 📊 效能優化

### 1. 記憶體管理

```javascript
// 在 src/services/webAutomationService.js 添加
async cleanup() {
  if (this.browser) {
    await this.browser.close();
    this.browser = null;
  }
}

// 定期清理
setInterval(() => {
  webAutomationService.cleanup();
}, 1000 * 60 * 30); // 每 30 分鐘
```

### 2. 並發限制

使用 `p-limit` 套件：

```javascript
const pLimit = require('p-limit');
const limit = pLimit(3); // 最多 3 個並發

// 在處理請求時使用
await limit(() => ocrService.recognize(image));
```

### 3. 快取策略

考慮使用 Redis 快取辨識結果：

```bash
# Railway 添加 Redis 服務
# 然後在應用中使用
```

## 🚀 部署後檢查清單

部署完成後，確認以下項目：

- [ ] 應用程式成功啟動（查看日誌）
- [ ] 健康檢查端點回應正常
- [ ] 測試 OCR 辨識功能（上傳/URL）
- [ ] 測試自動填寫功能
- [ ] 測試證件審核系統登入
- [ ] 檢查錯誤日誌
- [ ] 設定自訂域名（可選）
- [ ] 配置 HTTPS（Railway 自動提供）

## 📝 更新部署

當您更新代碼並推送到 GitHub：

```bash
git add .
git commit -m "feat: 新增功能"
git push origin main
```

Railway 會自動：
1. 偵測到新的 commit
2. 觸發重新建置
3. 部署新版本
4. 零停機時間更新

## 💰 成本估算

Railway 提供：
- 免費方案: $5/月 免費額度
- 使用量計費

預估成本（中等使用量）：
- 計算資源: ~$5-10/月
- 流量: 包含在內
- 總計: ~$5-10/月

## 📞 支援資源

- [Railway 文檔](https://docs.railway.app/)
- [Nixpacks 文檔](https://nixpacks.com/)
- [Puppeteer 文檔](https://pptr.dev/)
- [本專案 GitHub](https://github.com/felixcheng0808/Ionex-ID-Verify)

## 🎉 完成！

您的應用現已部署到 Railway！

**Public URL**: `https://your-app.up.railway.app`

可以開始使用：
- OCR 身分證辨識
- 自動填寫監理服務網
- 證件審核系統

---

**部署時間**: 2025-11-12
**版本**: 2.0.0
**狀態**: ✅ 生產就緒
