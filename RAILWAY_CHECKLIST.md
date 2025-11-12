# ✅ Railway 部署檢查清單

## 📋 部署前檢查

### 代碼準備
- [x] 代碼已推送到 GitHub
- [x] `railway.json` 配置完成
- [x] `nixpacks.toml` 配置完成
- [x] `package.json` 包含 engines 欄位
- [x] `.railwayignore` 已設定
- [x] `.env.example` 已更新

### 敏感資訊檢查
- [x] Google Vision 憑證已從 Git 移除
- [x] `.env` 檔案已在 `.gitignore` 中
- [x] 沒有硬編碼的密鑰或 Token

## 🚀 Railway 部署步驟

### 1. 創建專案
- [ ] 前往 https://railway.app/
- [ ] 點擊 "New Project"
- [ ] 選擇 "Deploy from GitHub repo"
- [ ] 選擇 `felixcheng0808/Ionex-ID-Verify`

### 2. 配置環境變數

#### 必要變數（5 個）
- [ ] `PORT=3000`
- [ ] `NODE_ENV=production`
- [ ] `OCR_ENGINE=tesseract`
- [ ] `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- [ ] `PUPPETEER_EXECUTABLE_PATH=/nix/store/*-chromium-*/bin/chromium`

#### 可選變數（如使用 Google Vision）
- [ ] `USE_GOOGLE_VISION=true`
- [ ] `GOOGLE_CREDENTIALS_JSON='{...}'`

### 3. 部署
- [ ] 點擊 "Deploy" 按鈕
- [ ] 等待建置完成（約 3-5 分鐘）
- [ ] 檢查部署日誌無錯誤

### 4. 網路設定
- [ ] 前往 Settings > Networking
- [ ] 點擊 "Generate Domain"
- [ ] 複製生成的 URL

## 🧪 部署後測試

### API 端點測試
- [ ] 健康檢查: `GET /api/health`
  ```bash
  curl https://your-app.up.railway.app/api/health
  ```
  預期: `{"status":"ok",...}`

- [ ] 系統狀態: `GET /api/status`
  ```bash
  curl https://your-app.up.railway.app/api/status
  ```
  預期: `{"success":true,"status":"running",...}`

### 網頁測試工具
- [ ] 增強版測試頁面
  ```
  https://your-app.up.railway.app/test-auto-fill-enhanced.html
  ```
  - [ ] 頁面正常載入
  - [ ] 上傳功能正常
  - [ ] URL 功能正常
  - [ ] 圖片預覽正常

- [ ] 證件審核系統
  ```
  https://your-app.up.railway.app/document-review.html
  ```
  - [ ] 頁面正常載入
  - [ ] 環境切換正常
  - [ ] 登入功能正常

### 功能測試

#### OCR 辨識測試
- [ ] 上傳圖片辨識
  ```bash
  curl -X POST https://your-app.up.railway.app/api/verify/upload \
    -F "image=@test-id.jpg"
  ```

- [ ] URL 圖片辨識
  ```bash
  curl -X POST https://your-app.up.railway.app/api/verify/url \
    -H "Content-Type: application/json" \
    -d '{"imageUrl":"https://example.com/id.jpg"}'
  ```

#### 自動填寫測試
- [ ] 上傳 + 自動填寫
  ```bash
  curl -X POST https://your-app.up.railway.app/api/verify/upload \
    -F "image=@test-id.jpg" \
    -F "autoFillForm=true"
  ```

- [ ] URL + 自動填寫
  ```bash
  curl -X POST https://your-app.up.railway.app/api/verify/url \
    -H "Content-Type: application/json" \
    -d '{"imageUrl":"https://example.com/id.jpg","autoFillForm":true}'
  ```

## 📊 監控檢查

### 日誌檢查
- [ ] 在 Railway Dashboard 查看日誌
- [ ] 確認伺服器啟動訊息
  ```
  ✓ 伺服器啟動成功
  ✓ 運行於: http://0.0.0.0:3000
  ```
- [ ] 確認 OCR 引擎初始化
  ```
  OCR Service 配置:
  - 使用引擎: tesseract
  ```
- [ ] 沒有錯誤訊息

### 效能檢查
- [ ] 回應時間 < 3 秒（OCR 辨識）
- [ ] 記憶體使用正常（< 512MB）
- [ ] CPU 使用正常
- [ ] 沒有頻繁重啟

## 🔒 安全性檢查

### 環境變數安全
- [ ] 敏感資訊使用環境變數
- [ ] 不在日誌中顯示密鑰
- [ ] API Keys 已保護

### HTTPS 設定
- [ ] Railway 自動提供 HTTPS ✓
- [ ] 強制使用 HTTPS

### CORS 設定
- [ ] CORS 設定適當
- [ ] 只允許必要的 origins

## 📈 優化檢查

### 效能優化
- [ ] 考慮啟用回應壓縮
- [ ] 靜態檔案快取設定
- [ ] 圖片處理優化

### 成本優化
- [ ] 並發請求限制（2-5 個）
- [ ] Puppeteer headless 模式
- [ ] 定期清理臨時檔案

### 監控設定
- [ ] 設定 Railway Metrics
- [ ] 錯誤追蹤（可選：Sentry）
- [ ] 效能監控（可選：New Relic）

## 🎯 生產環境準備

### 文檔更新
- [ ] 更新 README.md 包含部署 URL
- [ ] 文檔中的範例 URL 更新
- [ ] API 文檔更新

### 備份與恢復
- [ ] 了解 Railway 備份策略
- [ ] 準備緊急恢復計畫
- [ ] 測試回滾流程

### 團隊協作
- [ ] 團隊成員加入 Railway 專案
- [ ] 權限設定適當
- [ ] 文檔分享給團隊

## 🐛 故障排除準備

### 常見問題準備
- [ ] 閱讀 RAILWAY_DEPLOYMENT.md 故障排除章節
- [ ] 準備 Puppeteer 問題解決方案
- [ ] 準備 OCR 問題解決方案

### 緊急聯絡
- [ ] Railway 支援管道
- [ ] 團隊緊急聯絡方式
- [ ] 服務狀態頁面

## ✅ 最終檢查

### 功能完整性
- [ ] 所有 API 端點正常
- [ ] 所有測試頁面可訪問
- [ ] OCR 辨識功能正常
- [ ] 自動填寫功能正常
- [ ] 證件審核系統正常

### 文檔完整性
- [ ] README.md 包含部署資訊
- [ ] RAILWAY_DEPLOYMENT.md 已完成
- [ ] DEPLOY_QUICK_START.md 已完成
- [ ] API 文檔準確

### 使用者體驗
- [ ] 頁面載入速度快
- [ ] 錯誤訊息清楚
- [ ] 使用流程順暢

## 🎉 部署完成！

恭喜！您的應用已成功部署到 Railway！

### 下一步
1. [ ] 分享部署 URL 給團隊
2. [ ] 監控前 24 小時的運行狀況
3. [ ] 收集使用者回饋
4. [ ] 持續優化效能

---

**部署 URL**: https://your-app.up.railway.app
**部署日期**: ___________
**檢查人員**: ___________
**狀態**: [ ] 通過所有檢查
