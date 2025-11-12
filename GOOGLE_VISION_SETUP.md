# Google Cloud Vision API 設定指南

## 步驟 1: 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊「建立專案」或選擇現有專案
3. 記下專案 ID

## 步驟 2: 啟用 Cloud Vision API

1. 在 Google Cloud Console 中，搜尋「Vision API」
2. 點擊「Cloud Vision API」
3. 點擊「啟用」按鈕
4. 等待 API 啟用完成

## 步驟 3: 建立服務帳戶

1. 前往「IAM 與管理」→「服務帳戶」
2. 點擊「建立服務帳戶」
3. 輸入服務帳戶名稱（例如：id-verify-ocr）
4. 點擊「建立並繼續」
5. 選擇角色：「Cloud Vision API 使用者」
6. 點擊「繼續」→「完成」

## 步驟 4: 建立金鑰

1. 在服務帳戶列表中，找到剛建立的服務帳戶
2. 點擊服務帳戶名稱進入詳細資訊
3. 切換到「金鑰」分頁
4. 點擊「新增金鑰」→「建立新金鑰」
5. 選擇「JSON」格式
6. 點擊「建立」
7. JSON 金鑰檔案會自動下載到您的電腦

## 步驟 5: 設定專案

### 方法 1: 使用金鑰檔案（推薦）

1. 將下載的 JSON 金鑰檔案重新命名為 `google-vision-key.json`
2. 將檔案移動到專案的 `config/` 目錄
   ```bash
   mv ~/Downloads/your-project-xxxxx.json ./config/google-vision-key.json
   ```
3. 編輯 `.env` 檔案，取消註解並設定路徑：
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./config/google-vision-key.json
   ```

### 方法 2: 使用環境變數（適用於伺服器部署）

設定系統環境變數：

**Linux/macOS:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/google-vision-key.json"
```

**Windows (PowerShell):**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\google-vision-key.json"
```

## 步驟 6: 啟用 Google Vision

編輯 `.env` 檔案：
```env
USE_GOOGLE_VISION=true
```

## 步驟 7: 重啟服務

```bash
npm run dev
```

您應該會看到：
```
✓ Google Cloud Vision API 初始化完成
```

## 步驟 8: 測試

使用測試頁面或 curl 上傳身分證圖片進行測試。

## 費用說明

### 免費額度
- 前 1,000 次 OCR 請求/月：**免費**
- 適合小型應用或測試使用

### 付費價格（超過免費額度後）
- 1,001 - 5,000,000 次：$1.50 USD / 1,000 次
- 5,000,001 - 20,000,000 次：$0.60 USD / 1,000 次
- 超過 20,000,000 次：聯絡 Google 獲取企業定價

### 成本控制建議
1. 在 Google Cloud Console 設定預算警示
2. 啟用 API 配額限制
3. 監控每日使用量

## 安全性建議

### ⚠️ 重要注意事項

1. **不要將金鑰檔案上傳到 Git**
   - 已在 `.gitignore` 中排除 `config/google-vision-key.json`
   - 確認金鑰不會被提交到版本控制

2. **限制金鑰權限**
   - 僅授予必要的 Cloud Vision API 權限
   - 不要使用具有管理員權限的金鑰

3. **定期輪換金鑰**
   - 建議每 90 天更換一次金鑰
   - 刪除不再使用的舊金鑰

4. **使用 IP 限制**（生產環境）
   - 在 Google Cloud Console 中限制 API 金鑰的來源 IP

## 切換回 Tesseract.js

如果您想切換回免費的 Tesseract.js：

編輯 `.env`：
```env
USE_GOOGLE_VISION=false
```

重啟服務即可。

## 常見問題排除

### 錯誤：「未經授權」

**原因**：API 未啟用或金鑰路徑錯誤

**解決方案**：
1. 確認已在 Google Cloud Console 啟用 Cloud Vision API
2. 檢查 `GOOGLE_APPLICATION_CREDENTIALS` 路徑是否正確
3. 確認金鑰檔案存在且格式正確

### 錯誤：「權限不足」

**原因**：服務帳戶缺少必要權限

**解決方案**：
1. 在 Google Cloud Console 中檢查服務帳戶權限
2. 確保有「Cloud Vision API 使用者」角色

### 錯誤：「找不到專案」

**原因**：金鑰檔案中的專案 ID 與實際專案不符

**解決方案**：
1. 重新下載正確專案的金鑰檔案
2. 確認使用的是正確的 Google Cloud 專案

### 警告：「未設定 GOOGLE_APPLICATION_CREDENTIALS」

**原因**：未設定金鑰路徑，系統嘗試使用預設憑證

**解決方案**：
1. 如果在本機開發，請按步驟 5 設定金鑰檔案
2. 如果在 Google Cloud 上運行（如 App Engine），預設憑證會自動生效

## 監控使用量

1. 前往 Google Cloud Console
2. 選擇「API 和服務」→「信息中心」
3. 查看 Cloud Vision API 的使用統計
4. 設定配額警示以避免超出預算

## 相關連結

- [Google Cloud Vision API 文件](https://cloud.google.com/vision/docs)
- [價格說明](https://cloud.google.com/vision/pricing)
- [Node.js 客戶端庫](https://github.com/googleapis/nodejs-vision)
- [免費試用 Google Cloud](https://cloud.google.com/free)

---

## 快速檢查清單

- [ ] 建立 Google Cloud 專案
- [ ] 啟用 Cloud Vision API
- [ ] 建立服務帳戶
- [ ] 下載 JSON 金鑰檔案
- [ ] 將金鑰檔案放到 `config/` 目錄
- [ ] 設定 `.env` 中的 `GOOGLE_APPLICATION_CREDENTIALS`
- [ ] 設定 `.env` 中的 `USE_GOOGLE_VISION=true`
- [ ] 重啟服務
- [ ] 測試上傳功能

完成後，您的身分證辨識準確度將大幅提升至 95% 以上！
