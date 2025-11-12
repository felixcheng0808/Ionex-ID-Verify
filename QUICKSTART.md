# 快速入門指南

## 5 分鐘快速開始

### 1. 安裝與啟動

```bash
# 安裝依賴
npm install

# 啟動服務（開發模式）
npm run dev
```

等待看到以下訊息：
```
✓ 伺服器啟動成功
✓ 運行於: http://localhost:3000
```

### 2. 測試 API

#### 使用 curl 測試健康檢查

```bash
curl http://localhost:3000/api/health
```

預期回應：
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T12:00:00.000Z"
}
```

#### 使用 curl 測試上傳辨識

```bash
curl -X POST http://localhost:3000/api/verify/upload \
  -F "image=@/path/to/your/id-card.jpg"
```

### 3. 使用 Postman 測試

#### 方法 1: 透過 URL 辨識

1. 新增請求
   - 方法: `POST`
   - URL: `http://localhost:3000/api/verify/url`
   - Headers: `Content-Type: application/json`

2. Body (選擇 raw, JSON):
   ```json
   {
     "imageUrl": "https://example.com/id-card.jpg"
   }
   ```

3. 點擊 Send

#### 方法 2: 透過上傳辨識

1. 新增請求
   - 方法: `POST`
   - URL: `http://localhost:3000/api/verify/upload`

2. Body (選擇 form-data):
   - Key: `image`
   - Type: `File`
   - Value: 選擇身分證圖片

3. 點擊 Send

### 4. 使用 Node.js 測試

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// 透過上傳辨識
async function verifyID() {
  const formData = new FormData();
  formData.append('image', fs.createReadStream('./id-card.jpg'));

  const response = await axios.post(
    'http://localhost:3000/api/verify/upload',
    formData,
    { headers: formData.getHeaders() }
  );

  console.log(response.data);
}

verifyID();
```

### 5. 使用前端 JavaScript 測試

```html
<!DOCTYPE html>
<html>
<head>
  <title>身分證辨識測試</title>
</head>
<body>
  <h1>身分證辨識</h1>
  <input type="file" id="fileInput" accept="image/*">
  <button onclick="uploadImage()">辨識</button>
  <pre id="result"></pre>

  <script>
    async function uploadImage() {
      const fileInput = document.getElementById('fileInput');
      const file = fileInput.files[0];

      if (!file) {
        alert('請選擇圖片');
        return;
      }

      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await fetch('http://localhost:3000/api/verify/upload', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        document.getElementById('result').textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        document.getElementById('result').textContent = '錯誤: ' + error.message;
      }
    }
  </script>
</body>
</html>
```

### 6. 預期回應格式

#### 成功回應

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

#### 失敗回應

```json
{
  "success": false,
  "error": "圖片驗證失敗: 不支援的圖片格式"
}
```

### 7. 常見問題

**Q: 首次啟動很慢？**
A: 第一次執行時，Tesseract.js 需要下載繁體中文語言包，請耐心等待。

**Q: 辨識準確度不高？**
A: 請確保：
- 圖片清晰度足夠（建議 1000x1000 以上）
- 光線充足
- 身分證平整無傾斜
- 避免反光

**Q: 如何提高辨識速度？**
A:
- 使用較小的圖片（但不要太小）
- 考慮升級到 Google Cloud Vision API（需修改代碼）

**Q: 支援新式數位身分證嗎？**
A: 目前主要支援舊式身分證，新式數位身分證可能需要調整解析邏輯。

### 8. 下一步

- 閱讀完整的 [README.md](./README.md)
- 查看 [example-test.js](./example-test.js) 了解更多使用範例
- 調整 `.env` 檔案自訂配置
- 執行單元測試: `npm test`

### 9. 需要幫助？

- 查看日誌輸出了解錯誤訊息
- 確認 temp 目錄有寫入權限
- 確認網路連線（如使用 URL 辨識功能）

---

祝您使用愉快！
