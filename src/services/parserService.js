const validator = require('../utils/validator');

class ParserService {
  constructor() {
    // 中文數字轉阿拉伯數字對照表
    this.chineseNumbers = {
      '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
      '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
      '十': 10
    };

    // 台灣縣市列表
    this.cities = [
      '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
      '基隆市', '新竹市', '嘉義市',
      '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣', '嘉義縣',
      '屏東縣', '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣'
    ];
  }

  /**
   * 解析 OCR 結果，提取身分證資訊
   * @param {object} ocrResult - OCR 辨識結果
   * @returns {object} 解析後的身分證資訊
   */
  parseIDCard(ocrResult) {
    const text = ocrResult.text || '';
    const lines = ocrResult.lines || [];

    console.log('解析 OCR 文字:', text.substring(0, 200)); // 顯示前200個字元

    const result = {
      success: false,
      data: {
        idNumber: null,
        name: null,
        gender: null,
        birthDate: null,
        issueDate: null,
        issueLocation: null
      },
      confidence: ocrResult.confidence || 0,
      rawText: text
    };

    try {
      // 1. 提取身分證字號
      result.data.idNumber = this.extractIDNumber(text);

      // 2. 提取姓名
      result.data.name = this.extractName(text, lines);

      // 3. 提取性別（從身分證字號推斷）
      if (result.data.idNumber) {
        const idInfo = validator.getIDInfo(result.data.idNumber);
        if (idInfo) {
          result.data.gender = idInfo.gender;
        }
      }

      // 4. 提取出生日期
      result.data.birthDate = this.extractBirthDate(text);

      // 5. 提取發證日期
      result.data.issueDate = this.extractIssueDate(text);

      // 6. 提取發證地點
      result.data.issueLocation = this.extractIssueLocation(text);

      // 判斷是否成功（至少要有身分證字號）
      result.success = result.data.idNumber !== null;

      return result;
    } catch (error) {
      console.error('解析身分證資訊時發生錯誤:', error);
      return result;
    }
  }

  /**
   * 提取身分證字號
   * @param {string} text - OCR 文字
   * @returns {string|null}
   */
  extractIDNumber(text) {
    // 使用 validator 提取可能的身分證字號
    const possibleIDs = validator.extractPossibleIDs(text);

    if (possibleIDs.length > 0) {
      return possibleIDs[0]; // 返回第一個有效的身分證字號
    }

    // 嘗試更寬鬆的匹配（處理 OCR 可能的錯誤）
    const normalized = text.toUpperCase().replace(/[\s\n\r]/g, '');

    // 常見的 OCR 錯誤修正
    const corrected = normalized
      .replace(/O/g, '0')  // O -> 0
      .replace(/I/g, '1')  // I -> 1（在數字部分）
      .replace(/S/g, '5')  // S -> 5
      .replace(/B/g, '8'); // B -> 8

    const correctedIDs = validator.extractPossibleIDs(corrected);
    if (correctedIDs.length > 0) {
      return correctedIDs[0];
    }

    return null;
  }

  /**
   * 提取姓名
   * @param {string} text - OCR 文字
   * @param {array} lines - OCR 行資料
   * @returns {string|null}
   */
  extractName(text, lines) {
    // 尋找「姓名」關鍵字後面的文字
    const namePatterns = [
      /姓[\s]*名[\s]*[：:]*[\s]*([^\n\r]{2,4})/,
      /姓[\s]*名[\s]*(\S{2,4})/,
      /名[\s]*[：:]*[\s]*([^\n\r]{2,4})/
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // 驗證名字（2-4個中文字）
        if (/^[\u4e00-\u9fa5]{2,4}$/.test(name)) {
          return name;
        }
      }
    }

    // 嘗試從行資料中尋找
    for (const line of lines) {
      const lineText = line.text || '';
      if (lineText.includes('姓名')) {
        const parts = lineText.split(/姓名|:|：/);
        if (parts.length > 1) {
          const name = parts[1].trim();
          if (/^[\u4e00-\u9fa5]{2,4}$/.test(name)) {
            return name;
          }
        }
      }
    }

    return null;
  }

  /**
   * 提取出生日期
   * @param {string} text - OCR 文字
   * @returns {string|null}
   */
  extractBirthDate(text) {
    // 民國年格式: 70年01月01日, 70.01.01
    const patterns = [
      /出生[\s]*日期[\s]*[：:]*[\s]*(\d{2,3})[\s年\.]*(\d{1,2})[\s月\.]*(\d{1,2})/,
      /(\d{2,3})[\s]*年[\s]*(\d{1,2})[\s]*月[\s]*(\d{1,2})[\s]*日/,
      /(\d{2,3})\.(\d{1,2})\.(\d{1,2})/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const year = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        return `${year}年${month}月${day}日`;
      }
    }

    return null;
  }

  /**
   * 提取發證日期
   * @param {string} text - OCR 文字
   * @returns {string|null}
   */
  extractIssueDate(text) {
    // 發證日期格式: 99.01.01
    const patterns = [
      /發證[\s]*日期[\s]*[：:]*[\s]*(\d{2,3})\.(\d{1,2})\.(\d{1,2})/,
      /初發[\s]*[：:]*[\s]*(\d{2,3})\.(\d{1,2})\.(\d{1,2})/,
      /(\d{2,3})\.(\d{1,2})\.(\d{1,2})(?!.*出生)/  // 避免匹配到出生日期
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const year = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        return `${year}.${month}.${day}`;
      }
    }

    return null;
  }

  /**
   * 提取發證地點
   * @param {string} text - OCR 文字
   * @returns {string|null}
   */
  extractIssueLocation(text) {
    // 尋找縣市名稱
    for (const city of this.cities) {
      if (text.includes(city)) {
        return city;
      }
    }

    // 尋找「戶政事務所」前的地名
    const pattern = /([\u4e00-\u9fa5]{2,4})(?:市|縣)?戶政/;
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }

    return null;
  }

  /**
   * 驗證解析結果的完整性
   * @param {object} parseResult - 解析結果
   * @returns {object} 驗證結果
   */
  validateParseResult(parseResult) {
    const validation = {
      isComplete: false,
      missingFields: [],
      warnings: []
    };

    const requiredFields = ['idNumber', 'name', 'birthDate'];
    const optionalFields = ['gender', 'issueDate', 'issueLocation'];

    // 檢查必填欄位
    for (const field of requiredFields) {
      if (!parseResult.data[field]) {
        validation.missingFields.push(field);
      }
    }

    // 檢查選填欄位
    for (const field of optionalFields) {
      if (!parseResult.data[field]) {
        validation.warnings.push(`缺少選填欄位: ${field}`);
      }
    }

    validation.isComplete = validation.missingFields.length === 0;

    return validation;
  }

  /**
   * 格式化日期（民國年轉西元年）
   * @param {string} rocDate - 民國年日期
   * @returns {string|null} 西元年日期
   */
  convertROCToAD(rocDate) {
    if (!rocDate) return null;

    try {
      // 解析民國年格式: 70年01月01日 或 70.01.01
      const match = rocDate.match(/(\d{2,3})[年\.]*(\d{1,2})[月\.]*(\d{1,2})/);
      if (match) {
        const rocYear = parseInt(match[1]);
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        const adYear = rocYear + 1911;
        return `${adYear}-${month}-${day}`;
      }
    } catch (error) {
      console.error('日期轉換錯誤:', error);
    }

    return null;
  }

  /**
   * 將民國年日期轉換為監理服務網格式 (YYYMMDD)
   * @param {string} rocDate - 民國年日期 (例如: "74年01月01日", "74年1月1日", "74.01.01")
   * @returns {string|null} 監理服務網格式日期 (例如: "0740101")
   */
  convertToMVDISFormat(rocDate) {
    if (!rocDate) return null;

    try {
      // 解析民國年格式: 74年01月01日, 74年1月1日, 74.01.01
      // 修改正則表達式以支援1-3位數的年份
      const match = rocDate.match(/(\d{1,3})[年\.]*(\d{1,2})[月\.]*(\d{1,2})/);
      if (match) {
        const rocYear = match[1].padStart(3, '0'); // 民國年補齊3位數
        const month = match[2].padStart(2, '0');   // 月份補齊2位數
        const day = match[3].padStart(2, '0');     // 日期補齊2位數

        return `${rocYear}${month}${day}`;
      }
    } catch (error) {
      console.error('日期轉換錯誤:', error);
    }

    return null;
  }

  /**
   * 驗證並格式化監理服務網日期格式
   * @param {string} dateStr - 日期字串
   * @returns {object} { valid: boolean, formatted: string|null, error: string|null }
   */
  validateMVDISDate(dateStr) {
    const result = {
      valid: false,
      formatted: null,
      error: null
    };

    if (!dateStr) {
      result.error = '日期不可為空';
      return result;
    }

    // 檢查是否為7位數字格式 (YYYMMDD)
    if (!/^\d{7}$/.test(dateStr)) {
      result.error = '日期格式錯誤，應為7位數字 (YYYMMDD)';
      return result;
    }

    const year = parseInt(dateStr.substring(0, 3));
    const month = parseInt(dateStr.substring(3, 5));
    const day = parseInt(dateStr.substring(5, 7));

    // 驗證年份範圍 (民國1年-當前年份)
    const currentROCYear = new Date().getFullYear() - 1911;
    if (year < 1 || year > currentROCYear) {
      result.error = `民國年份超出範圍 (1-${currentROCYear})`;
      return result;
    }

    // 驗證月份
    if (month < 1 || month > 12) {
      result.error = '月份超出範圍 (01-12)';
      return result;
    }

    // 驗證日期
    if (day < 1 || day > 31) {
      result.error = '日期超出範圍 (01-31)';
      return result;
    }

    // 簡單驗證月份天數
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > daysInMonth[month - 1]) {
      result.error = `${month}月不可能有${day}日`;
      return result;
    }

    result.valid = true;
    result.formatted = dateStr;
    return result;
  }

  /**
   * 解析駕照資料
   * @param {object} ocrResult - OCR 辨識結果
   * @returns {object} 解析後的駕照資訊
   */
  parseDrivingLicense(ocrResult) {
    const text = ocrResult.text || '';
    const words = ocrResult.words || [];

    console.log('解析駕照 OCR 文字:', text.substring(0, 200));

    const result = {
      success: false,
      data: {
        licenseNumber: null,
        idNumber: null,
        name: null,
        birthDate: null,
        issueDate: null,
        licenseType: null,
        address: null
      },
      confidence: ocrResult.confidence || 0,
      rawText: text
    };

    try {
      // 1. 提取駕照號碼 (格式: N12XXXXXXX 或類似)
      result.data.licenseNumber = this.extractLicenseNumber(text);

      // 2. 提取身分證字號
      result.data.idNumber = this.extractIDNumber(text);

      // 3. 提取姓名
      result.data.name = this.extractDrivingLicenseName(text);

      // 4. 提取出生日期
      result.data.birthDate = this.extractBirthDate(text);

      // 5. 提取發證日期
      result.data.issueDate = this.extractIssueDate(text);

      // 6. 提取駕照種類 (重點)
      result.data.licenseType = this.extractLicenseType(text, words);

      // 7. 提取地址
      result.data.address = this.extractAddress(text);

      // 判斷是否成功（至少要有駕照號碼或身分證字號）
      result.success = result.data.licenseNumber !== null || result.data.idNumber !== null;

      return result;
    } catch (error) {
      console.error('解析駕照資訊時發生錯誤:', error);
      return result;
    }
  }

  /**
   * 提取駕照號碼
   * @param {string} text - OCR 文字
   * @returns {string|null}
   */
  extractLicenseNumber(text) {
    // 駕照號碼格式: N12XXXXXXX (字母+數字)
    const patterns = [
      /([A-Z]\d{2}\d{7,8})/,
      /駕照[\s]*號碼?[\s]*[：:]*[\s]*([A-Z]\d{2}\d{7,8})/,
      /號[\s]*碼[\s]*([A-Z]\d{2}\d{7,8})/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * 提取駕照上的姓名
   * @param {string} text - OCR 文字
   * @returns {string|null}
   */
  extractDrivingLicenseName(text) {
    // 駕照上的姓名通常在「姓名」或直接在身分證字號後
    const namePatterns = [
      /姓[\s]*名[\s]*[：:]*[\s]*([^\n\r]{2,4})/,
      /[A-Z]\d{9}[\s\n]*([^\n\r]{2,4})/,  // 身分證字號後的名字
      /號[\s]*碼[\s]*[A-Z]\d+[\s\n]+([^\n\r]{2,4})/
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (/^[\u4e00-\u9fa5]{2,4}$/.test(name)) {
          return name;
        }
      }
    }

    return null;
  }

  /**
   * 提取駕照種類 (重點強化)
   * @param {string} text - OCR 文字
   * @param {array} words - OCR 單字陣列
   * @returns {string|null}
   */
  extractLicenseType(text, words = []) {
    console.log('開始提取駕照種類...');
    console.log('OCR 文字內容:', text);
    console.log('Words 陣列長度:', words.length);

    // 台灣駕照種類對照表
    const licenseTypes = {
      // 機車類
      'A': '普通重型機車',
      'A1': '大型重型機車',
      'A2': '普通重型機車',
      'A3': '輕型機車',
      // 汽車類
      'B': '普通小型車',
      'C': '普通大貨車',
      'D': '普通大客車',
      'E': '普通聯結車',
      // 特殊類
      'F': '營業小客車',
      '輕機': '輕型機車',
      '普機': '普通重型機車',
      '大機': '大型重型機車',
      '普重': '普通重型機車',
      '普小': '普通小型車',
      '大貨': '普通大貨車',
      '大客': '普通大客車'
    };

    const detectedTypes = [];

    // 正規化文字(簡繁轉換)
    const normalizedText = text
      .replace(/车/g, '車')
      .replace(/货/g, '貨')
      .replace(/华/g, '華')
      .replace(/发/g, '發');

    console.log('正規化後文字:', normalizedText.substring(0, 150));

    // 方法1: 尋找完整的駕照種類中文描述
    const chinesePatterns = [
      /普通重型機車/,
      /大型重型機車/,
      /輕型機車/,
      /普通小型車/,
      /普通大貨車/,
      /普通大客車/,
      /營業小客車/,
      /普通聯結車/
    ];

    for (const pattern of chinesePatterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        console.log('✓ 找到駕照種類 (中文描述):', match[0]);
        detectedTypes.push(match[0]);
      }
    }

    // 方法2: 尋找英文代碼 (A, A1, A2, B, C, D, E, F)
    // 特別注意: 代碼通常在「種」字附近或駕照類別文字附近
    const codePatterns = [
      /種[\s\n]*類?[\s\n]*[：:]*[\s\n]*([A-F]\d?)/i,
      /駕[\s\n]*種[\s\n]*[：:]*[\s\n]*([A-F]\d?)/i,
      /([A-F]\d?)[\s\n]*種/i,
      /(?:普通|大型|輕型)(?:重型)?(?:機車|小型車|大貨車|大客車)[\s\n]+([A-F]\d?)/i,
      /持[\s\n]*照[\s\n]+([A-F]\d?)/i,  // 新增: 持照附近
      /種[\s\n]*類[\s\n]*([A-F]\d?)/i
    ];

    for (const pattern of codePatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        const code = match[1].toUpperCase();
        console.log('✓ 找到駕照種類代碼:', code);
        if (licenseTypes[code]) {
          detectedTypes.push(`${licenseTypes[code]} (${code})`);
        } else {
          detectedTypes.push(code);
        }
      }
    }

    // 方法3: 從 words 陣列中尋找 (利用位置資訊)
    if (words && words.length > 0) {
      console.log('檢查 words 陣列...');
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordText = (word.text || '').trim()
          .replace(/车/g, '車')
          .replace(/货/g, '貨');

        // 尋找「種」字附近的文字
        if (wordText.includes('種') || wordText.includes('持照')) {
          // 檢查前後的文字
          if (i + 1 < words.length) {
            const nextWord = (words[i + 1].text || '').trim();
            console.log(`  檢查 "${wordText}" 後面的文字: "${nextWord}"`);
            // 檢查是否為英文代碼
            const codeMatch = nextWord.match(/^([A-F]\d?)$/i);
            if (codeMatch) {
              const code = codeMatch[1].toUpperCase();
              console.log('  ✓ 從 words 找到駕照代碼:', code);
              if (licenseTypes[code]) {
                detectedTypes.push(`${licenseTypes[code]} (${code})`);
              }
            }
          }
        }

        // 直接匹配駕照類型關鍵字
        for (const [key, value] of Object.entries(licenseTypes)) {
          if (wordText.includes(value) || (key.length > 1 && wordText.includes(key))) {
            console.log('  ✓ 從 words 找到駕照種類:', value);
            detectedTypes.push(value);
          }
        }
      }
    }

    // 方法4: 寬鬆匹配 - 尋找獨立的 A, B, C, D, E, F 字母 (在合適的上下文中)
    const loosePattern = /(?:種|類|駕|照|持照)[\s\n]{0,10}([A-F]\d?)/gi;
    let match;
    while ((match = loosePattern.exec(normalizedText)) !== null) {
      const code = match[1].toUpperCase();
      console.log('✓ 寬鬆匹配找到代碼:', code);
      if (licenseTypes[code]) {
        detectedTypes.push(`${licenseTypes[code]} (${code})`);
      }
    }

    // 去重並返回
    if (detectedTypes.length > 0) {
      const uniqueTypes = [...new Set(detectedTypes)];
      const result = uniqueTypes.join(', ');
      console.log('最終駕照種類:', result);
      return result;
    }

    console.log('未找到駕照種類');
    return null;
  }

  /**
   * 提取地址
   * @param {string} text - OCR 文字
   * @returns {string|null}
   */
  extractAddress(text) {
    // 尋找「住址」或「地址」關鍵字後面的文字
    const addressPatterns = [
      /住[\s]*址[\s]*[：:]*[\s]*([^\n\r]{5,50})/,
      /地[\s]*址[\s]*[：:]*[\s]*([^\n\r]{5,50})/,
      /([\u4e00-\u9fa5]{2,4}[市縣][\u4e00-\u9fa5]{2,4}[區鄉鎮市][^\n\r]{3,40})/
    ];

    for (const pattern of addressPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const address = match[1].trim();
        // 驗證地址長度
        if (address.length >= 5 && address.length <= 100) {
          return address;
        }
      }
    }

    return null;
  }
}

module.exports = new ParserService();
