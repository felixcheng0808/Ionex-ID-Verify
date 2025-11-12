# 🚀 快速開始 - 身分證辨識 + 自動填寫

## 一分鐘上手

### 1. 啟動伺服器
```bash
npm start
```

### 2. 開啟測試頁面
在瀏覽器中訪問:
```
http://localhost:3000/test-auto-fill.html
```

### 3. 上傳身分證圖片
- 點擊上傳區域或拖曳圖片
- 勾選「啟用自動填寫」
- 點擊「開始辨識」
- 等待瀏覽器自動開啟並填寫表單
- 手動輸入驗證碼完成查詢

## API 快速參考

### 基本用法 (只辨識)
```bash
curl -X POST http://localhost:3000/api/verify/upload \
  -F "image=@id-card.jpg"
```

### 進階用法 (辨識 + 自動填寫)
```bash
curl -X POST http://localhost:3000/api/verify/upload \
  -F "image=@id-card.jpg" \
  -F "autoFillForm=true"
```

## 三種使用方式

### 方式 1: 網頁界面 (最簡單)
```
http://localhost:3000/test-auto-fill.html
```
- ✓ 視覺化操作
- ✓ 即時預覽
- ✓ 結果展示

### 方式 2: API 呼叫 (最靈活)
```javascript
const formData = new FormData();
formData.append('image', file);
formData.append('autoFillForm', 'true');

fetch('/api/verify/upload', {
  method: 'POST',
  body: formData
});
```

### 方式 3: 測試腳本 (最快速)
```bash
node test_auto_fill.js
```

## 重要參數

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `autoFillForm` | false | 是否自動填寫 |
| `keepBrowserAlive` | true | 保持瀏覽器開啟 |

## 完整文檔

- 📘 **INTEGRATION_GUIDE.md** - 完整整合指南
- 📗 **AUTO_FILL_README.md** - 技術文檔
- 📙 **README_INTEGRATION.md** - 整合摘要

## 測試資源

- 🌐 `http://localhost:3000/test-auto-fill.html` - 網頁測試工具
- 🧪 `test_date_format.js` - 日期轉換測試
- 🧪 `test_auto_fill.js` - 自動填寫測試

## 常見問題

**Q: 如何只辨識不自動填寫?**
A: 不要設定 `autoFillForm` 參數,或設為 `false` (預設行為)

**Q: 驗證碼怎麼處理?**
A: 需要手動輸入,瀏覽器會保持開啟等待您操作

**Q: 可以批次處理嗎?**
A: 可以,但建議控制並發數避免資源耗盡

## 支援

如有問題請查閱完整文檔或聯繫開發團隊。

---

立即開始使用! 🎉
