// 載入環境變數 - 必須在所有其他 imports 之前
const dotenv = require('dotenv');
dotenv.config();

// 現在載入其他模組
const express = require('express');
const path = require('path');
const idCardController = require('./controllers/idCardController');
const uploadMiddleware = require('./middlewares/uploadMiddleware');

const app = express();

// 中介層設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 靜態檔案服務
app.use(express.static(path.join(__dirname, '../public')));

// CORS 設定（如果需要）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// 請求日誌
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API 路由
const apiRouter = express.Router();

// 健康檢查
apiRouter.get('/health', idCardController.healthCheck.bind(idCardController));

// 狀態查詢
apiRouter.get('/status', idCardController.getStatus.bind(idCardController));

// 透過 URL 辨識身分證
apiRouter.post('/verify/url', idCardController.verifyByUrl.bind(idCardController));

// 透過上傳圖片辨識身分證
apiRouter.post('/verify/upload', uploadMiddleware, idCardController.verifyByUpload.bind(idCardController));

// 透過 URL 辨識身分證並自動填寫監理服務網表單
apiRouter.post('/verify-and-fill/url', idCardController.verifyAndFillFormByUrl.bind(idCardController));

// 透過上傳圖片辨識身分證並自動填寫監理服務網表單
apiRouter.post('/verify-and-fill/upload', uploadMiddleware, idCardController.verifyAndFillFormByUpload.bind(idCardController));

// 掛載 API 路由
app.use('/api', apiRouter);

// 根路徑
app.get('/', (req, res) => {
  res.json({
    name: 'Ionex ID Verify API',
    version: '1.0.0',
    description: '台灣身分證辨識 API',
    endpoints: {
      health: 'GET /api/health',
      status: 'GET /api/status',
      verifyByUrl: 'POST /api/verify/url',
      verifyByUpload: 'POST /api/verify/upload',
      verifyAndFillByUrl: 'POST /api/verify-and-fill/url',
      verifyAndFillByUpload: 'POST /api/verify-and-fill/upload'
    },
    usage: {
      verifyByUrl: {
        method: 'POST',
        endpoint: '/api/verify/url',
        description: '辨識身分證 (可選自動填寫表單)',
        body: {
          imageUrl: 'https://example.com/id-card.jpg',
          autoFillForm: 'boolean (optional, default: false) - 是否自動填寫監理服務網',
          keepBrowserAlive: 'boolean (optional, default: true) - 自動填寫時是否保持瀏覽器開啟'
        }
      },
      verifyByUpload: {
        method: 'POST',
        endpoint: '/api/verify/upload',
        description: '辨識身分證 (可選自動填寫表單)',
        contentType: 'multipart/form-data',
        fields: {
          image: 'file (required)',
          autoFillForm: 'boolean (optional, default: false) - 是否自動填寫監理服務網',
          keepBrowserAlive: 'boolean (optional, default: true) - 自動填寫時是否保持瀏覽器開啟'
        }
      },
      verifyAndFillByUrl: {
        method: 'POST',
        endpoint: '/api/verify-and-fill/url',
        description: '辨識身分證並強制自動填寫監理服務網表單 (已整合至 /api/verify/url)',
        note: '建議使用 /api/verify/url 並設定 autoFillForm=true',
        body: {
          imageUrl: 'https://example.com/id-card.jpg',
          keepBrowserAlive: true
        }
      },
      verifyAndFillByUpload: {
        method: 'POST',
        endpoint: '/api/verify-and-fill/upload',
        description: '辨識身分證並強制自動填寫監理服務網表單 (已整合至 /api/verify/upload)',
        note: '建議使用 /api/verify/upload 並設定 autoFillForm=true',
        contentType: 'multipart/form-data',
        fields: {
          image: 'file',
          keepBrowserAlive: 'boolean (optional, default: true)'
        }
      }
    }
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '找不到此 API 端點'
  });
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('錯誤:', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || '伺服器內部錯誤'
  });
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   Ionex ID Verify API Server                 ║
║   台灣身分證辨識系統                          ║
╚═══════════════════════════════════════════════╝

✓ 伺服器啟動成功
✓ 運行於: http://localhost:${PORT}
✓ 環境: ${process.env.NODE_ENV || 'development'}

API 端點:
  - GET  /api/health                  健康檢查
  - GET  /api/status                  系統狀態
  - POST /api/verify/url              透過 URL 辨識
  - POST /api/verify/upload           透過上傳辨識
  - POST /api/verify-and-fill/url     辨識並自動填寫表單 (URL)
  - POST /api/verify-and-fill/upload  辨識並自動填寫表單 (上傳)

按下 Ctrl+C 停止服務
  `);
});

// 優雅關閉
const gracefulShutdown = async () => {
  console.log('\n正在關閉伺服器...');

  server.close(async () => {
    console.log('HTTP 伺服器已關閉');

    // 關閉 OCR worker
    const ocrService = require('./services/ocrService');
    await ocrService.terminate();

    // 關閉 Web Automation Service
    const webAutomationService = require('./services/webAutomationService');
    await webAutomationService.terminate();

    console.log('服務已安全關閉');
    process.exit(0);
  });

  // 強制關閉超時
  setTimeout(() => {
    console.error('強制關閉服務');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;
