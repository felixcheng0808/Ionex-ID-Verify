const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const LOGS_DIR = path.join(__dirname, '../../logs');

// 錯誤步驟常數
const STEPS = {
  REQUEST_VALIDATION: 'request_validation',
  IMAGE_DOWNLOAD: 'image_download',
  IMAGE_VALIDATION: 'image_validation',
  IMAGE_PREPROCESSING: 'image_preprocessing',
  OCR_RECOGNITION: 'ocr_recognition',
  DATA_PARSING: 'data_parsing',
  RESULT_VALIDATION: 'result_validation',
  VIOLATION_CHECK: 'violation_check',
};

// 錯誤代碼常數
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  INVALID_IMAGE: 'INVALID_IMAGE',
  PREPROCESSING_FAILED: 'PREPROCESSING_FAILED',
  OCR_FAILED: 'OCR_FAILED',
  OCR_LOW_CONFIDENCE: 'OCR_LOW_CONFIDENCE',
  OCR_EMPTY_RESULT: 'OCR_EMPTY_RESULT',
  PARSE_FAILED: 'PARSE_FAILED',
  INCOMPLETE_RESULT: 'INCOMPLETE_RESULT',
  VIOLATION_CHECK_FAILED: 'VIOLATION_CHECK_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

function getTodayFilename() {
  const today = new Date().toISOString().slice(0, 10);
  return path.join(LOGS_DIR, `verification_errors_${today}.json`);
}

function getFilenameForDate(dateStr) {
  return path.join(LOGS_DIR, `verification_errors_${dateStr}.json`);
}

async function readLogFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeLogFile(filePath, records) {
  await fs.writeFile(filePath, JSON.stringify(records, null, 2), 'utf-8');
}

/**
 * 記錄一筆錯誤
 * @param {object} params
 * @param {string} params.sessionId  - 請求的唯一 ID
 * @param {string} params.endpoint   - API 端點，例如 /api/verify/url
 * @param {string} params.step       - 失敗步驟（用 STEPS 常數）
 * @param {string} params.errorCode  - 錯誤代碼（用 ERROR_CODES 常數）
 * @param {string} params.message    - 人類可讀的錯誤訊息
 * @param {object} [params.context]  - 相關上下文（documentType、userId 等）
 * @param {Error}  [params.error]    - 原始 Error 物件（取得 stack trace）
 */
async function logError({ sessionId, endpoint, step, errorCode, message, context = {}, error = null }) {
  const record = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    sessionId,
    endpoint,
    step,
    errorCode,
    message,
    context,
    stack: error?.stack || null,
  };

  const filePath = getTodayFilename();
  const records = await readLogFile(filePath);
  records.push(record);
  await writeLogFile(filePath, records);

  console.error(`[ErrorLog] ${step} | ${errorCode} | ${message}`);
  return record;
}

/**
 * 查詢錯誤紀錄
 * @param {object} filters
 * @param {string} [filters.startDate]  - 開始日期 YYYY-MM-DD（預設今天）
 * @param {string} [filters.endDate]    - 結束日期 YYYY-MM-DD（預設今天）
 * @param {string} [filters.step]       - 過濾特定步驟
 * @param {string} [filters.errorCode]  - 過濾特定錯誤代碼
 * @param {string} [filters.endpoint]   - 過濾特定端點
 * @param {string} [filters.sessionId]  - 過濾特定 session
 * @param {number} [filters.limit]      - 最多回傳幾筆（預設 100）
 * @param {number} [filters.offset]     - 跳過幾筆（分頁用，預設 0）
 */
async function queryErrors(filters = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const startDate = filters.startDate || today;
  const endDate = filters.endDate || today;
  const limit = parseInt(filters.limit) || 100;
  const offset = parseInt(filters.offset) || 0;

  // 收集指定日期範圍內所有日誌檔
  const dates = getDateRange(startDate, endDate);
  let allRecords = [];

  for (const date of dates) {
    const filePath = getFilenameForDate(date);
    const records = await readLogFile(filePath);
    allRecords = allRecords.concat(records);
  }

  // 套用篩選條件
  if (filters.step) {
    allRecords = allRecords.filter(r => r.step === filters.step);
  }
  if (filters.errorCode) {
    allRecords = allRecords.filter(r => r.errorCode === filters.errorCode);
  }
  if (filters.endpoint) {
    allRecords = allRecords.filter(r => r.endpoint === filters.endpoint);
  }
  if (filters.sessionId) {
    allRecords = allRecords.filter(r => r.sessionId === filters.sessionId);
  }

  // 由新到舊排序
  allRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = allRecords.length;
  const paginated = allRecords.slice(offset, offset + limit);

  return { total, offset, limit, records: paginated };
}

/**
 * 查詢錯誤統計摘要
 * @param {object} filters
 * @param {string} [filters.startDate]
 * @param {string} [filters.endDate]
 */
async function getErrorStats(filters = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const startDate = filters.startDate || today;
  const endDate = filters.endDate || today;

  const dates = getDateRange(startDate, endDate);
  let allRecords = [];

  for (const date of dates) {
    const records = await readLogFile(getFilenameForDate(date));
    allRecords = allRecords.concat(records);
  }

  const total = allRecords.length;

  // 依步驟分組
  const byStep = {};
  const byErrorCode = {};
  const byEndpoint = {};

  for (const r of allRecords) {
    byStep[r.step] = (byStep[r.step] || 0) + 1;
    byErrorCode[r.errorCode] = (byErrorCode[r.errorCode] || 0) + 1;
    byEndpoint[r.endpoint] = (byEndpoint[r.endpoint] || 0) + 1;
  }

  return {
    dateRange: { startDate, endDate },
    total,
    byStep,
    byErrorCode,
    byEndpoint,
  };
}

// 取得兩個日期之間的所有日期字串陣列
function getDateRange(start, end) {
  const dates = [];
  const current = new Date(start);
  const last = new Date(end);

  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// 列出所有有日誌的日期
async function listLogDates() {
  try {
    const files = await fs.readdir(LOGS_DIR);
    return files
      .filter(f => f.startsWith('verification_errors_') && f.endsWith('.json'))
      .map(f => f.replace('verification_errors_', '').replace('.json', ''))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

module.exports = {
  STEPS,
  ERROR_CODES,
  logError,
  queryErrors,
  getErrorStats,
  listLogDates,
};
