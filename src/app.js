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

// 更新使用者驗證資料 (verify_user.json)
apiRouter.post('/verify-user/update', async (req, res) => {
  const fs = require('fs').promises;
  const filePath = path.join(__dirname, '..', 'verify_user.json');

  try {
    const { userId, displayName, email, idName, idNumber } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '請提供 userId'
      });
    }

    // 讀取現有資料
    let users = [];
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      users = JSON.parse(content);
    } catch (error) {
      // 如果檔案不存在，建立空陣列
      users = [];
    }

    // 找到使用者
    let userIndex = users.findIndex(u => u.userId === userId);
    let isNewUser = false;

    // 如果找不到，新增一筆
    if (userIndex === -1) {
      const newUser = {
        userId,
        displayName: displayName || '',
        email: email || '',
        idName: idName || null,
        idNumber: idNumber || null
      };
      users.push(newUser);
      userIndex = users.length - 1;
      isNewUser = true;
      console.log(`新增使用者 ${userId}: displayName=${displayName}, email=${email}`);
    } else {
      // 更新現有資料
      if (idName !== undefined) {
        users[userIndex].idName = idName || null;
      }
      if (idNumber !== undefined) {
        users[userIndex].idNumber = idNumber || null;
      }
      // 如果有傳入 displayName 或 email 也更新
      if (displayName) {
        users[userIndex].displayName = displayName;
      }
      if (email) {
        users[userIndex].email = email;
      }
    }

    // 寫回檔案
    await fs.writeFile(filePath, JSON.stringify(users, null, 2), 'utf-8');

    console.log(`已${isNewUser ? '新增' : '更新'}使用者 ${userId}: idName=${idName}, idNumber=${idNumber}`);

    return res.json({
      success: true,
      message: isNewUser ? '新增成功' : '更新成功',
      isNewUser,
      data: users[userIndex]
    });

  } catch (error) {
    console.error('更新使用者資料錯誤:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 新增租賃使用者到 rental_user.json
apiRouter.post('/rental-user/add', async (req, res) => {
  const fs = require('fs').promises;
  const filePath = path.join(__dirname, '..', 'rental_user.json');

  try {
    const { userId, email } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '請提供 userId'
      });
    }

    // 讀取現有資料
    let users = [];
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      users = JSON.parse(content);
    } catch (error) {
      // 如果檔案不存在，建立空陣列
      users = [];
    }

    // 檢查是否已存在
    const existingIndex = users.findIndex(u => u.userId === userId);

    if (existingIndex !== -1) {
      // 已存在，更新 email
      if (email) {
        users[existingIndex].email = email;
        await fs.writeFile(filePath, JSON.stringify(users, null, 2), 'utf-8');
      }
      return res.json({
        success: true,
        isNew: false,
        message: '使用者已存在',
        data: users[existingIndex]
      });
    }

    // 新增使用者
    const newUser = {
      userId,
      asp: '',
      email: email || ''
    };
    users.push(newUser);

    // 寫回檔案
    await fs.writeFile(filePath, JSON.stringify(users, null, 2), 'utf-8');

    console.log(`已新增租賃使用者 ${userId}: email=${email}`);

    return res.json({
      success: true,
      isNew: true,
      message: '新增成功',
      data: newUser
    });

  } catch (error) {
    console.error('新增租賃使用者錯誤:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 查詢駕照違規記錄
apiRouter.post('/check-violation', async (req, res) => {
  const webAutomationService = require('./services/webAutomationService');
  const { idNumber, birthDate } = req.body;

  if (!idNumber || !birthDate) {
    return res.status(400).json({ success: false, error: '缺少身分證字號或出生日期' });
  }

  try {
    const hasViolation = await webAutomationService.isViolationRecords(idNumber, birthDate);
    return res.json({ success: true, hasViolation });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

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
      verifyByUpload: 'POST /api/verify/upload'
    },
    usage: {
      verifyByUrl: {
        method: 'POST',
        endpoint: '/api/verify/url',
        description: '透過圖片 URL 辨識身分證/駕照',
        body: {
          imageUrl: 'https://example.com/id-card.jpg'
        }
      },
      verifyByUpload: {
        method: 'POST',
        endpoint: '/api/verify/upload',
        description: '透過上傳圖片辨識身分證/駕照',
        contentType: 'multipart/form-data',
        fields: {
          image: 'file (required)'
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
  - GET  /api/health         健康檢查
  - GET  /api/status         系統狀態
  - POST /api/verify/url     透過 URL 辨識
  - POST /api/verify/upload  透過上傳辨識

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
