/**
 * 台灣身分證字號驗證工具
 */

class IDValidator {
  constructor() {
    // 第一碼英文字母對應的數字
    this.letterMapping = {
      'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15, 'G': 16, 'H': 17,
      'I': 34, 'J': 18, 'K': 19, 'L': 20, 'M': 21, 'N': 22, 'O': 35, 'P': 23,
      'Q': 24, 'R': 25, 'S': 26, 'T': 27, 'U': 28, 'V': 29, 'W': 32, 'X': 30,
      'Y': 31, 'Z': 33
    };

    // 縣市對應
    this.cityMapping = {
      'A': '台北市', 'B': '台中市', 'C': '基隆市', 'D': '台南市', 'E': '高雄市',
      'F': '新北市', 'G': '宜蘭縣', 'H': '桃園市', 'I': '嘉義市', 'J': '新竹縣',
      'K': '苗栗縣', 'L': '台中縣', 'M': '南投縣', 'N': '彰化縣', 'O': '新竹市',
      'P': '雲林縣', 'Q': '嘉義縣', 'R': '台南縣', 'S': '高雄縣', 'T': '屏東縣',
      'U': '花蓮縣', 'V': '台東縣', 'W': '金門縣', 'X': '澎湖縣', 'Y': '陽明山',
      'Z': '連江縣'
    };
  }

  /**
   * 驗證台灣身分證字號
   * @param {string} id - 身分證字號
   * @returns {boolean} 是否有效
   */
  validateTaiwanID(id) {
    if (!id || typeof id !== 'string') {
      return false;
    }

    // 轉為大寫並移除空白
    id = id.toUpperCase().trim();

    // 檢查格式: 1個英文字母 + 9個數字
    const regex = /^[A-Z][12]\d{8}$/;
    if (!regex.test(id)) {
      return false;
    }

    // 檢查第一碼是否為有效的縣市代碼
    const firstLetter = id[0];
    if (!this.letterMapping[firstLetter]) {
      return false;
    }

    // 計算檢查碼
    return this.verifyChecksum(id);
  }

  /**
   * 驗證檢查碼
   * @param {string} id - 身分證字號
   * @returns {boolean}
   */
  verifyChecksum(id) {
    const firstLetter = id[0];
    const letterValue = this.letterMapping[firstLetter];

    // 將英文字母轉換為兩個數字
    const n1 = Math.floor(letterValue / 10);
    const n2 = letterValue % 10;

    // 權重
    const weights = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1];

    // 計算總和
    let sum = n1 * weights[0] + n2 * weights[1];

    for (let i = 1; i < 10; i++) {
      sum += parseInt(id[i]) * weights[i + 1];
    }

    // 檢查是否能被 10 整除
    return sum % 10 === 0;
  }

  /**
   * 從身分證字號獲取資訊
   * @param {string} id - 身分證字號
   * @returns {object|null} 身分證資訊
   */
  getIDInfo(id) {
    if (!this.validateTaiwanID(id)) {
      return null;
    }

    id = id.toUpperCase().trim();

    return {
      isValid: true,
      city: this.cityMapping[id[0]] || '未知',
      gender: id[1] === '1' ? '男' : '女',
      serialNumber: id.substring(2, 9)
    };
  }

  /**
   * 正規化身分證字號格式
   * @param {string} id - 身分證字號
   * @returns {string} 正規化後的身分證字號
   */
  normalizeID(id) {
    if (!id || typeof id !== 'string') {
      return '';
    }

    // 移除所有空白、破折號等
    return id.toUpperCase().replace(/[\s-]/g, '');
  }

  /**
   * 檢查字串是否可能是身分證字號（寬鬆檢查）
   * @param {string} text - 要檢查的文字
   * @returns {boolean}
   */
  isPossibleID(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }

    text = this.normalizeID(text);

    // 檢查基本格式（不檢查檢查碼）
    const regex = /^[A-Z][12]\d{8}$/;
    return regex.test(text);
  }

  /**
   * 從文字中提取可能的身分證字號
   * @param {string} text - 包含身分證字號的文字
   * @returns {string[]} 可能的身分證字號陣列
   */
  extractPossibleIDs(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // 移除空白和特殊字元
    const normalized = text.toUpperCase().replace(/[\s\n\r]/g, '');

    // 尋找符合格式的字串
    const regex = /[A-Z][12]\d{8}/g;
    const matches = normalized.match(regex) || [];

    // 過濾出有效的身分證字號
    return matches.filter(id => this.validateTaiwanID(id));
  }
}

module.exports = new IDValidator();
