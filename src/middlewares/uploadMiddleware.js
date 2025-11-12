const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 配置儲存設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../temp'));
  },
  filename: (req, file, cb) => {
    // 生成唯一檔案名
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// 檔案過濾器
const fileFilter = (req, file, cb) => {
  // 允許的 MIME 類型
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支援的檔案格式，僅支援 JPG、PNG、WEBP'), false);
  }
};

// 配置 multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // 一次只能上傳一個檔案
  }
});

// 單一檔案上傳中介層
const uploadSingle = upload.single('image');

// 錯誤處理包裝器
const uploadMiddleware = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer 錯誤
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: '檔案大小超過限制（最大 10MB）'
        });
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: '一次只能上傳一個檔案'
        });
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          error: '欄位名稱錯誤，請使用 "image" 作為欄位名稱'
        });
      }
      return res.status(400).json({
        success: false,
        error: `上傳錯誤: ${err.message}`
      });
    } else if (err) {
      // 其他錯誤（如檔案格式錯誤）
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    // 檢查是否有檔案上傳
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '請上傳圖片檔案'
      });
    }

    next();
  });
};

module.exports = uploadMiddleware;
