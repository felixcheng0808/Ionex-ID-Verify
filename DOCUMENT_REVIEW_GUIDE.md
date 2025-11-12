# 📋 證件審核系統使用指南

## 🎯 功能概述

證件審核系統整合了 Ionex 的證件管理 API 和身分證辨識功能,提供一站式的證件審核工作流程。

## 🚀 快速開始

### 1. 啟動伺服器

```bash
npm start
```

### 2. 開啟證件審核系統

```
http://localhost:3000/document-review.html
```

## 📝 使用流程

### 步驟 1: 選擇環境

系統支援兩個環境:
- **Alpha 環境** - 測試環境
- **Prod 環境** - 正式環境

點擊對應的環境按鈕進行切換。

### 步驟 2: 登入

1. 輸入帳號 (Email)
2. 輸入密碼
3. 點擊「登入」按鈕

登入後系統會:
- ✅ 自動取得 API token
- ✅ 儲存 session 到 localStorage
- ✅ 下次訪問自動恢復登入狀態

### 步驟 3: 查看待審證件

登入成功後會自動載入待審核證件列表,顯示:
- 使用者名稱
- Email
- 手機號碼
- 證件上傳時間
- 證件狀態 (待審核/已通過/已拒絕)

### 步驟 4: 審核證件

點擊「📋 帶入證件」按鈕:
1. 系統會自動開啟新分頁
2. 載入增強版測試頁面
3. 自動填入該使用者的身分證圖片 URL
4. 自動切換到 URL 模式
5. 可立即進行辨識或啟用自動填寫

## 🔧 功能特色

### 環境切換
- ✅ Alpha / Prod 環境快速切換
- ✅ 自動套用對應的 API Key
- ✅ 環境資訊清楚顯示

### 登入機制
- ✅ 安全的 token 認證
- ✅ Session 自動儲存
- ✅ 下次訪問自動登入
- ✅ 登出功能

### 證件列表
- ✅ 即時載入待審核證件
- ✅ 顯示使用者完整資訊
- ✅ 證件狀態一目了然
- ✅ 重新整理功能

### 自動帶入
- ✅ 一鍵帶入身分證圖片 URL
- ✅ 開啟新分頁進行審核
- ✅ 保留使用者資訊
- ✅ 無縫整合辨識功能

## 📊 API 整合

### 登入 API

**Alpha 環境:**
```bash
curl --location 'https://nex-alpha.ionexenergy.com/api/v2/user/auth' \
--header 'scope: knex' \
--header 'Content-Type: application/json' \
--header 'x-api-key: eab583fa-7d80-fc53-a2f3-a331f2175f87' \
--data-raw '{
    "asp": "ep",
    "email": "your-email",
    "password": "your-password",
    "deviceId": "testDeviceIdH"
}'
```

**Prod 環境:**
```bash
curl --location 'https://nex.ionexenergy.com/api/v2/user/auth' \
--header 'scope: knex' \
--header 'Content-Type: application/json' \
--header 'x-api-key: 20bed7cc-35d2-4f42-bff6-49eb8f5bfd6d' \
--data-raw '{
    "asp": "ep",
    "email": "your-email",
    "password": "your-password",
    "deviceId": "testDeviceIdH"
}'
```

### GraphQL 查詢

**查詢待審證件:**

```graphql
query TableDocumentReview(
  $orderBy: [ReviewsOrder!]!
  $filter: RentalReviewsFilter
  $size: Int
  $skip: Int
) {
  RentalReviewsQuery {
    rentalReviews(
      orderBy: $orderBy
      filter: $filter
      size: $size
      skip: $skip
    ) {
      edges {
        node {
          userId
          organization
          displayName
          email
          phone
          certificateLastUploadAt
          rentalCertificates {
            certificateType
            status
            invalidReason
            url
            uploadAt
            expiredAt
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
      totalCount
    }
  }
}
```

**Variables:**
```json
{
  "filter": {
    "organization": "KYMCO_TW"
  },
  "size": 25,
  "skip": 0,
  "orderBy": [
    {
      "direction": "ASC",
      "field": "CERTIFICATE_LAST_UPLOAD_AT"
    }
  ]
}
```

## 🔐 環境配置

### Alpha 環境
- **API Key**: `eab583fa-7d80-fc53-a2f3-a331f2175f87`
- **Auth URL**: `https://nex-alpha.ionexenergy.com/api/v2/user/auth`
- **GraphQL URL**: `https://nex-alpha.ionexenergy.com/pjUq6av7ll-ionexGraphQL`

### Prod 環境
- **API Key**: `20bed7cc-35d2-4f42-bff6-49eb8f5bfd6d`
- **Auth URL**: `https://nex.ionexenergy.com/api/v2/user/auth`
- **GraphQL URL**: `https://nex.ionexenergy.com/pjUq6av7ll-ionexGraphQL`

## 💻 技術實現

### 前端架構
```
document-review.html
├── 環境切換 UI
├── 登入表單
├── 主要內容區
│   ├── 使用者資訊欄
│   ├── 統計卡片
│   └── 證件列表表格
└── JavaScript 邏輯
    ├── 環境管理
    ├── 認證流程
    ├── GraphQL 查詢
    └── 資料渲染
```

### 資料流程
```
1. 使用者登入
   ↓
2. 取得 Bearer Token
   ↓
3. 儲存 Session
   ↓
4. GraphQL 查詢證件列表
   ↓
5. 渲染列表資料
   ↓
6. 使用者點擊「帶入證件」
   ↓
7. 提取 ID_CARD_FRONT URL
   ↓
8. 開啟新分頁並帶入參數
   ↓
9. 增強版頁面接收參數
   ↓
10. 自動填入 URL 並顯示預覽
```

## 🎨 使用者介面

### 登入頁面
- 環境切換按鈕 (Alpha / Prod)
- 帳號輸入欄
- 密碼輸入欄
- 登入按鈕
- 錯誤訊息顯示

### 主要頁面
- **頂部欄位**:
  - 環境顯示
  - 使用者 Email
  - 登出按鈕

- **控制列**:
  - 重新整理按鈕

- **統計卡片**:
  - 待審核證件總數
  - 已載入數量

- **證件列表表格**:
  - 使用者名稱
  - Email
  - 手機
  - 上傳時間
  - 證件狀態
  - 操作按鈕

## 🔄 與辨識系統整合

### URL 參數傳遞

當點擊「帶入證件」時:

```
/test-auto-fill-enhanced.html
  ?imageUrl={證件圖片URL}
  &userName={使用者名稱}
```

### 增強版頁面處理

1. 檢測 URL 參數
2. 自動切換到 URL tab
3. 填入圖片 URL
4. 載入圖片預覽
5. 更新頁面標題顯示使用者名稱

## 📱 響應式設計

系統支援:
- ✅ 桌面瀏覽器
- ✅ 平板裝置
- ✅ 手機瀏覽 (有限支援)

## ⚠️ 注意事項

### 安全性
1. **API Key 管理**
   - API Key 目前寫在前端代碼中
   - 建議移至後端環境變數
   - 避免洩漏到公開的 Git repository

2. **Token 儲存**
   - Token 儲存在 localStorage
   - 關閉瀏覽器後仍會保留
   - 需手動登出清除

3. **CORS 設定**
   - 確認 Ionex API 允許跨域請求
   - 如有問題可考慮使用後端代理

### 使用限制
1. **分頁限制**
   - 目前一次載入 25 筆
   - 可調整 size 參數增加數量
   - 需注意效能影響

2. **證件類型**
   - 目前只處理 ID_CARD_FRONT
   - 可擴展支援其他證件類型

3. **瀏覽器支援**
   - 需要支援 localStorage
   - 需要支援 fetch API
   - 建議使用現代瀏覽器

## 🐛 故障排除

### 問題: 登入失敗

**可能原因:**
- 帳號密碼錯誤
- 環境選擇錯誤
- API Key 不正確
- 網路連線問題

**解決方式:**
1. 確認帳號密碼正確
2. 確認環境選擇正確
3. 檢查瀏覽器控制台錯誤訊息
4. 確認 API 服務正常

### 問題: 載入證件列表失敗

**可能原因:**
- Token 過期
- GraphQL 查詢錯誤
- 權限不足

**解決方式:**
1. 重新登入取得新 token
2. 檢查 GraphQL query 格式
3. 確認帳號有查詢權限

### 問題: 無法開啟辨識頁面

**可能原因:**
- 瀏覽器阻擋彈出視窗
- URL 格式錯誤

**解決方式:**
1. 允許瀏覽器彈出視窗
2. 檢查 URL 參數編碼

## 📈 未來擴展

### 短期改進
- [ ] 新增證件審核功能 (通過/拒絕)
- [ ] 支援更多證件類型
- [ ] 新增搜尋和篩選功能
- [ ] 批次處理功能

### 中期改進
- [ ] 完整的分頁導航
- [ ] 證件詳情 Modal
- [ ] 審核歷史記錄
- [ ] 匯出報表功能

### 長期改進
- [ ] 後端 API 代理層
- [ ] 權限管理系統
- [ ] 審核工作流程
- [ ] 統計分析儀表板

## 🎓 完整工作流程範例

### 場景: 審核新上傳的證件

1. **開啟系統**
   ```
   http://localhost:3000/document-review.html
   ```

2. **選擇環境並登入**
   - 選擇 Alpha 環境
   - 輸入測試帳號密碼
   - 點擊登入

3. **查看列表**
   - 系統自動載入待審證件
   - 查看統計數據
   - 瀏覽使用者列表

4. **審核證件**
   - 找到要審核的使用者
   - 點擊「帶入證件」按鈕
   - 新分頁自動開啟並載入圖片
   - 勾選「啟用自動填寫」
   - 點擊「開始辨識」
   - 等待辨識完成
   - 檢查辨識結果
   - (選擇性) 瀏覽器自動填寫監理服務網

5. **完成審核**
   - 關閉辨識分頁
   - 回到審核系統
   - 點擊重新整理載入最新資料

## 📞 支援資源

### 文檔
- **完整指南**: `COMPLETE_GUIDE.md`
- **URL 整合**: `URL_INTEGRATION_GUIDE.md`
- **證件審核**: `DOCUMENT_REVIEW_GUIDE.md` (本文件)

### 測試頁面
- **證件審核系統**: `/document-review.html`
- **增強版辨識**: `/test-auto-fill-enhanced.html`
- **基礎版辨識**: `/test-auto-fill.html`

---

## 總結

證件審核系統提供了完整的工作流程:

✅ **環境管理** - Alpha / Prod 快速切換
✅ **安全登入** - Token 認證與 Session 管理
✅ **證件查詢** - GraphQL 整合查詢待審證件
✅ **一鍵帶入** - 自動開啟辨識頁面並填入資料
✅ **無縫整合** - 與身分證辨識系統完美結合

立即開始使用證件審核系統! 🚀
