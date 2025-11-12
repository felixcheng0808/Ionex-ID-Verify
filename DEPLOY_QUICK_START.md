# 🚀 Railway 快速部署指南

## ⚡ 5 分鐘部署到 Railway

### 步驟 1: 連接 GitHub (1 分鐘)

1. 前往 https://railway.app/
2. 點擊 **"Start a New Project"**
3. 選擇 **"Deploy from GitHub repo"**
4. 選擇 `felixcheng0808/Ionex-ID-Verify`

### 步驟 2: 設定環境變數 (2 分鐘)

在 **Variables** 頁面添加：

```bash
# 必要設定
PORT=3000
NODE_ENV=production
OCR_ENGINE=tesseract

# Puppeteer 設定（重要！）
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/nix/store/*-chromium-*/bin/chromium
```

### 步驟 3: 部署 (2 分鐘)

點擊 **"Deploy"**，等待部署完成。

### 步驟 4: 取得網址

在 **Settings > Networking** 點擊 **"Generate Domain"**

### 步驟 5: 測試

```bash
# 健康檢查
curl https://your-app.up.railway.app/api/health

# 訪問測試頁面
https://your-app.up.railway.app/test-auto-fill-enhanced.html
```

## ✅ 完成！

您的應用現已上線！

---

## 🔧 進階設定（可選）

### 使用 Google Vision API（更高準確度）

添加環境變數：

```bash
OCR_ENGINE=google
USE_GOOGLE_VISION=true
GOOGLE_CREDENTIALS_JSON='{"type":"service_account",...}'
```

### 啟用無頭模式（節省資源）

```bash
PUPPETEER_HEADLESS=true
```

---

## 📚 詳細文檔

完整部署指南請參考: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

## 🐛 遇到問題？

常見問題解決：
1. Puppeteer 無法啟動 → 檢查 `PUPPETEER_EXECUTABLE_PATH`
2. OCR 失敗 → 確認 `OCR_ENGINE` 設定
3. 記憶體不足 → 升級 Railway 方案

---

**預估部署時間**: 5-10 分鐘
**預估成本**: $5-10/月（中等使用量）
