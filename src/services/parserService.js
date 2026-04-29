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

    // 台灣常見姓氏（前100大姓）
    this.commonSurnames = [
      '陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊',
      '許', '鄭', '謝', '郭', '洪', '曾', '邱', '廖', '賴', '周',
      '徐', '蘇', '葉', '莊', '呂', '江', '何', '蕭', '羅', '高',
      '潘', '簡', '朱', '鍾', '游', '彭', '詹', '胡', '施', '沈',
      '余', '趙', '盧', '梁', '顏', '柯', '翁', '魏', '孫', '戴',
      '范', '方', '宋', '鄧', '杜', '傅', '侯', '曹', '薛', '丁',
      '卓', '馬', '阮', '董', '温', '唐', '藍', '石', '蔣', '古',
      '紀', '姚', '連', '馮', '歐', '程', '湯', '黄', '田', '康',
      '姜', '白', '汪', '鄒', '尤', '巫', '鑽', '錢', '凃', '塗'
    ];
  }

  /**
   * 解析 OCR 結果，提取身分證資訊
   * @param {object} ocrResult - OCR 辨識結果
   * @returns {object} 解析後的身分證資訊
   */
  parseIDCard(ocrResult, options = {}) {
    const text = ocrResult.text || '';
    const lines = ocrResult.lines || [];
    const words = ocrResult.words || [];
    const displayName = options.displayName || null;

    console.log('解析 OCR 文字:', text.substring(0, 200)); // 顯示前200個字元
    if (displayName) {
      console.log('輔助 displayName:', displayName);
    }

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

      // 2. 提取姓名（傳入 words 和 displayName 以輔助辨識）
      result.data.name = this.extractName(text, lines, words, displayName);

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
   * @param {array} words - OCR 單字資料（含位置資訊）
   * @param {string} displayName - 輔助用的顯示名稱（格式可能是「名+姓」）
   * @returns {string|null}
   */
  extractName(text, lines, words = [], displayName = null) {
    console.log('開始提取姓名...');
    const candidates = [];

    // 從 displayName 推測可能的姓名（名+姓 -> 姓+名）
    const expectedNames = this.getExpectedNamesFromDisplayName(displayName);
    if (expectedNames.length > 0) {
      console.log(`  從 displayName "${displayName}" 推測可能姓名:`, expectedNames);
    }

    // 方法1: 尋找「姓名」關鍵字後面的文字（放寬到1-5個中文字）
    const namePatterns = [
      /姓[\s]*名[\s]*[：:]*[\s]*([^\n\r\s]{1,5})/,
      /姓[\s]*名[\s]*([^\n\r\s]{1,5})/,
      /姓名[：:\s]*([^\n\r\s]{1,5})/
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = this.cleanName(match[1]);
        if (name) {
          let score = this.scoreName(name);
          // 如果與 displayName 推測的姓名匹配，加分
          score += this.getDisplayNameMatchScore(name, expectedNames);
          console.log(`  方法1 找到候選: "${name}" (分數: ${score})`);
          candidates.push({ name, score, source: 'pattern' });
        }
      }
    }

    // 方法2: 從 words 陣列中利用位置資訊找「姓名」附近的文字
    if (words && words.length > 0) {
      const nameKeywordIndex = words.findIndex(w =>
        (w.text || '').includes('姓名') || (w.text || '').includes('姓') || (w.text || '') === '名'
      );

      if (nameKeywordIndex !== -1) {
        const nameKeyword = words[nameKeywordIndex];
        console.log(`  找到「姓名」關鍵字在 words[${nameKeywordIndex}]: "${nameKeyword.text}"`);

        // 檢查同一個 word 中是否已包含姓名
        const keywordText = nameKeyword.text || '';
        if (keywordText.length > 2) {
          const afterKeyword = keywordText.replace(/姓名|姓|名/g, '').trim();
          if (afterKeyword.length >= 1) {
            const name = this.cleanName(afterKeyword);
            if (name) {
              let score = this.scoreName(name);
              score += this.getDisplayNameMatchScore(name, expectedNames);
              console.log(`  方法2a 同區塊找到: "${name}" (分數: ${score})`);
              candidates.push({ name, score, source: 'same-word' });
            }
          }
        }

        // 檢查下一個 word
        if (nameKeywordIndex + 1 < words.length) {
          const nextWord = words[nameKeywordIndex + 1];
          const name = this.cleanName(nextWord.text);
          if (name) {
            let score = this.scoreName(name);
            score += this.getDisplayNameMatchScore(name, expectedNames);
            console.log(`  方法2b 下一區塊找到: "${name}" (分數: ${score})`);
            candidates.push({ name, score, source: 'next-word' });
          }
        }

        // 利用位置資訊：找「姓名」右邊或下方的文字
        if (nameKeyword.bbox) {
          const keywordBbox = nameKeyword.bbox;
          for (let i = 0; i < words.length; i++) {
            if (i === nameKeywordIndex) continue;
            const word = words[i];
            if (!word.bbox) continue;

            const wordBbox = word.bbox;
            // 檢查是否在右邊（同一行）
            const isRight = wordBbox.x0 > keywordBbox.x1 &&
                           Math.abs(wordBbox.y0 - keywordBbox.y0) < 30;
            // 檢查是否在下方
            const isBelow = wordBbox.y0 > keywordBbox.y1 &&
                           wordBbox.y0 < keywordBbox.y1 + 50 &&
                           Math.abs(wordBbox.x0 - keywordBbox.x0) < 100;

            if (isRight || isBelow) {
              const name = this.cleanName(word.text);
              if (name) {
                let score = this.scoreName(name) + (isRight ? 2 : 1); // 右邊的優先
                score += this.getDisplayNameMatchScore(name, expectedNames);
                console.log(`  方法2c 位置找到: "${name}" (分數: ${score}, ${isRight ? '右邊' : '下方'})`);
                candidates.push({ name, score, source: 'position' });
              }
            }
          }
        }
      }
    }

    // 方法3: 從行資料中尋找
    for (const line of lines) {
      const lineText = line.text || '';
      if (lineText.includes('姓名') || lineText.includes('姓') ) {
        const parts = lineText.split(/姓名|姓|名|:|：/);
        for (let i = 1; i < parts.length; i++) {
          const name = this.cleanName(parts[i]);
          if (name) {
            let score = this.scoreName(name);
            score += this.getDisplayNameMatchScore(name, expectedNames);
            console.log(`  方法3 行資料找到: "${name}" (分數: ${score})`);
            candidates.push({ name, score, source: 'line' });
          }
        }
      }
    }

    // 方法4: 用常見姓氏在全文中搜尋（作為備用）
    for (const surname of this.commonSurnames) {
      const surnamePattern = new RegExp(`${surname}([\\u4e00-\\u9fa5]{1,3})`, 'g');
      let match;
      while ((match = surnamePattern.exec(text)) !== null) {
        const fullName = surname + match[1];
        // 排除明顯不是姓名的（如地名、機關名）
        if (this.isLikelyName(fullName)) {
          let score = this.scoreName(fullName) - 1; // 降低分數，因為這是備用方法
          score += this.getDisplayNameMatchScore(fullName, expectedNames);
          console.log(`  方法4 姓氏搜尋找到: "${fullName}" (分數: ${score})`);
          candidates.push({ name: fullName, score, source: 'surname-search' });
        }
      }
    }

    // 方法5: 如果有 displayName，直接加入候選（高優先級）
    for (const expectedName of expectedNames) {
      // 檢查全文是否包含這個名字的字元（驗證）
      const matchCount = this.countMatchingChars(expectedName, text);
      // displayName 推測的姓名給予高分，特別是三個字的姓名
      let baseScore = 15; // 基礎分數提高
      if (expectedName.length === 3) baseScore += 5; // 三個字額外加分
      if (matchCount >= 2) baseScore += 5; // 匹配兩個字以上額外加分

      const score = this.scoreName(expectedName) + baseScore + matchCount;
      console.log(`  方法5 displayName 推測: "${expectedName}" (分數: ${score}, 匹配字數: ${matchCount})`);
      candidates.push({ name: expectedName, score, source: 'displayName' });
    }

    // 選擇分數最高的候選
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];
      console.log(`  最終選擇: "${best.name}" (分數: ${best.score}, 來源: ${best.source})`);
      return best.name;
    }

    // 最後備用：如果完全沒有候選但有 displayName，直接使用推測的第一個
    if (expectedNames.length > 0) {
      console.log(`  備用方案: 直接使用 displayName 推測 "${expectedNames[0]}"`);
      return expectedNames[0];
    }

    console.log('  未找到姓名');
    return null;
  }

  /**
   * 從 displayName 推測可能的姓名格式
   * displayName 格式可能是「名+姓」，需要反轉
   * @param {string} displayName
   * @returns {string[]} 可能的姓名列表
   */
  getExpectedNamesFromDisplayName(displayName) {
    if (!displayName) return [];

    // 只取中文字
    const chineseOnly = displayName.replace(/[^\u4e00-\u9fa5]/g, '');
    if (chineseOnly.length < 2 || chineseOnly.length > 5) return [];

    const results = [];

    // 嘗試不同的姓名拆分方式
    // 假設格式是「名+姓」，最後一個字是姓
    if (chineseOnly.length >= 2) {
      // 單姓：最後一個字是姓
      const lastName = chineseOnly.charAt(chineseOnly.length - 1);
      const firstName = chineseOnly.substring(0, chineseOnly.length - 1);
      const reversed1 = lastName + firstName;
      if (this.commonSurnames.includes(lastName)) {
        results.push(reversed1);
      }

      // 複姓：最後兩個字是姓（較少見）
      if (chineseOnly.length >= 3) {
        const lastName2 = chineseOnly.substring(chineseOnly.length - 2);
        const firstName2 = chineseOnly.substring(0, chineseOnly.length - 2);
        const reversed2 = lastName2 + firstName2;
        // 複姓列表
        const compoundSurnames = ['歐陽', '司馬', '上官', '諸葛', '司徒', '皇甫'];
        if (compoundSurnames.includes(lastName2)) {
          results.push(reversed2);
        }
      }
    }

    // 也加入原始順序作為候選（可能有些 displayName 已經是姓+名）
    if (this.commonSurnames.includes(chineseOnly.charAt(0))) {
      results.push(chineseOnly);
    }

    return [...new Set(results)]; // 去重
  }

  /**
   * 計算候選姓名與 displayName 推測姓名的匹配分數
   * @param {string} candidate - 候選姓名
   * @param {string[]} expectedNames - 推測的姓名列表
   * @returns {number} 額外分數
   */
  getDisplayNameMatchScore(candidate, expectedNames) {
    if (!candidate || expectedNames.length === 0) return 0;

    for (const expected of expectedNames) {
      // 完全匹配 - 大幅加分
      if (candidate === expected) return 20;

      // 部分匹配（處理缺字情況）
      const matchCount = this.countMatchingChars(candidate, expected);
      const maxLen = Math.max(candidate.length, expected.length);

      // 如果匹配大部分字元
      if (matchCount >= maxLen - 1 && matchCount >= 2) {
        return 15 + matchCount; // 大部分匹配，高分
      } else if (matchCount >= 1) {
        return 8 + matchCount; // 部分匹配
      }
    }

    return 0;
  }

  /**
   * 計算兩個字串中匹配的中文字數量
   * @param {string} str1
   * @param {string} str2
   * @returns {number}
   */
  countMatchingChars(str1, str2) {
    if (!str1 || !str2) return 0;
    let count = 0;
    for (const char of str1) {
      if (str2.includes(char)) count++;
    }
    return count;
  }

  /**
   * 清理姓名字串
   * @param {string} text - 原始文字
   * @returns {string|null} 清理後的姓名
   */
  cleanName(text) {
    if (!text) return null;

    // 移除非中文字元、數字、英文
    let cleaned = text.replace(/[^\u4e00-\u9fa5]/g, '');

    // 移除常見的非姓名關鍵字
    const excludeWords = ['姓名', '出生', '年月日', '發證', '住址', '統一', '編號', '中華民國', '身分證'];
    for (const word of excludeWords) {
      cleaned = cleaned.replace(word, '');
    }

    cleaned = cleaned.trim();

    // 驗證長度（1-5個中文字）
    if (cleaned.length >= 1 && cleaned.length <= 5) {
      return cleaned;
    }

    // 如果太長，嘗試取前2-4個字
    if (cleaned.length > 5) {
      // 如果第一個字是常見姓氏，取姓+名（2-4字）
      const firstChar = cleaned.charAt(0);
      if (this.commonSurnames.includes(firstChar)) {
        return cleaned.substring(0, Math.min(4, cleaned.length));
      }
    }

    return null;
  }

  /**
   * 為姓名候選評分
   * @param {string} name - 姓名候選
   * @returns {number} 分數（越高越好）
   */
  scoreName(name) {
    if (!name) return 0;

    let score = 0;

    // 長度分數（身分證大部分是三個字）
    if (name.length === 3) score += 8;      // 三個字最常見，大幅加分
    else if (name.length === 2) score += 5; // 兩個字也常見
    else if (name.length === 4) score += 3; // 四個字較少
    else if (name.length === 1) score += 1; // 單字最少

    // 姓氏分數
    const firstChar = name.charAt(0);
    if (this.commonSurnames.includes(firstChar)) {
      score += 6;
    }

    // 全是中文字加分
    if (/^[\u4e00-\u9fa5]+$/.test(name)) {
      score += 3;
    }

    return score;
  }

  /**
   * 判斷是否像是姓名（排除地名、機關名等）
   * @param {string} text - 文字
   * @returns {boolean}
   */
  isLikelyName(text) {
    if (!text || text.length < 2 || text.length > 5) return false;

    // 排除詞彙
    const excludePatterns = [
      /市$/, /縣$/, /區$/, /鄉$/, /鎮$/, /村$/, /里$/,
      /路$/, /街$/, /巷$/, /弄$/, /號$/,
      /所$/, /局$/, /處$/, /院$/, /部$/,
      /公司/, /企業/, /銀行/, /醫院/,
      /中華/, /民國/, /台灣/, /臺灣/
    ];

    for (const pattern of excludePatterns) {
      if (pattern.test(text)) return false;
    }

    return true;
  }

  /**
   * 提取出生日期
   * @param {string} text - OCR 文字
   * @returns {string|null}
   */
  extractBirthDate(text) {
    // 民國年格式: 70年01月01日, 70.01.01
    // 優先匹配有「出生」或「年月日」關鍵字的日期
    const patterns = [
      // 標準格式：出生日期 92年7月17日
      /出生[\s]*[日期]*[\s]*[：:]*[\s]*(\d{2,3})[\s年\.]*(\d{1,2})[\s月\.]*(\d{1,2})/,
      // 駕照格式：出生年月日 92年7月17日 或 92.07.17
      /出生[\s]*年[\s]*月[\s]*日[\s]*[：:]*[\s]*(\d{2,3})[\s年\.]*(\d{1,2})[\s月\.]*(\d{1,2})/,
      // OCR 可能把「出生」辨識錯，但「年月日」後面跟民國年格式
      /年月日[\s]*民?國?[\s]*(\d{2,3})[\s]*年[\s]*(\d{1,2})[\s]*月?[\s]*(\d{1,2})/,
      // 只剩「生」或「生期」的 OCR 誤讀
      /生[\s]*期[\s]*[：:]*[\s]*(\d{2,3})[\s年\.]*(\d{1,2})[\s月\.]*(\d{1,2})/,
      // 生日格式
      /生[\s]*日[\s]*[：:]*[\s]*(\d{2,3})[\.\-](\d{1,2})[\.\-](\d{1,2})/,
      // 民國XX年XX月XX日（排除發證日期附近的）
      /民國[\s]*(\d{2,3})[\s]*年[\s]*(\d{1,2})[\s]*月[\s]*(\d{1,2})[\s]*日?(?!.*初發)/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const year = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        console.log(`提取出生日期: ${year}年${month}月${day}日`);
        return `${year}年${month}月${day}日`;
      }
    }

    // 嘗試找第一個「民國XX年XX月XX」格式，但不是在「初發」或「發證」後面的
    const allMinguoDates = [...text.matchAll(/民國[\s]*(\d{2,3})[\s]*年[\s]*(\d{1,2})[\s]*月[\s]*(\d{1,2})/g)];
    if (allMinguoDates.length > 0) {
      for (const match of allMinguoDates) {
        const dateIndex = match.index;
        const beforeText = text.substring(Math.max(0, dateIndex - 10), dateIndex);
        // 如果前面不是「初發」或「發證」，就當作出生日期
        if (!beforeText.includes('初發') && !beforeText.includes('發證') && !beforeText.includes('没日期')) {
          const year = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          const day = match[3].padStart(2, '0');
          console.log(`提取出生日期 (民國格式): ${year}年${month}月${day}日`);
          return `${year}年${month}月${day}日`;
        }
      }
    }

    // 嘗試「名生期 [姓名] DATE」格式：名字後接出生日期（各種分隔符變體）
    // 例：名生期 洪聖皓 07502:01  /  名生期 林宗餐\n63.0610
    const mingShengQiMatch = text.match(
      /名[\s]*生[\s]*期[\s]*[一-龥]{2,5}[\s\n]*(\d{2,3})\.?(\d{2})[\.：:—-](\d{2})/
    );
    if (mingShengQiMatch) {
      const year = mingShengQiMatch[1].padStart(2, '0');
      const month = mingShengQiMatch[2].padStart(2, '0');
      const day = mingShengQiMatch[3].padStart(2, '0');
      const mStr = parseInt(month), dStr = parseInt(day);
      if (mStr >= 1 && mStr <= 12 && dStr >= 1 && dStr <= 31) {
        console.log(`提取出生日期 (名生期格式): ${year}年${month}月${day}日`);
        return `${year}年${month}月${day}日`;
      }
    }

    // 最後嘗試匹配點分隔格式，找所有日期然後排除發證日期
    const allDates = text.match(/(\d{2,3})\.(\d{1,2})\.(\d{1,2})/g);
    if (allDates && allDates.length > 0) {
      const issueDateIndex = text.search(/發證|初發/);

      for (const dateStr of allDates) {
        const dateIndex = text.indexOf(dateStr);
        if (issueDateIndex === -1 || Math.abs(dateIndex - issueDateIndex) > 20) {
          const match = dateStr.match(/(\d{2,3})\.(\d{1,2})\.(\d{1,2})/);
          if (match) {
            const year = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            console.log(`提取出生日期 (fallback): ${year}年${month}月${day}日`);
            return `${year}年${month}月${day}日`;
          }
        }
      }
    }

    // 嘗試無第二個點的格式：YY.MMDD 或 YYY.MMDD（駕照 OCR 常見）
    const dotlessDates = [...text.matchAll(/(\d{2,3})\.(\d{2})(\d{2})\b/g)];
    if (dotlessDates.length > 0) {
      const issueDateIndex = text.search(/發證|初發/);
      for (const match of dotlessDates) {
        const month = parseInt(match[2]), day = parseInt(match[3]);
        if (month < 1 || month > 12 || day < 1 || day > 31) continue;
        const dateIndex = match.index;
        if (issueDateIndex === -1 || Math.abs(dateIndex - issueDateIndex) > 20) {
          const year = match[1].padStart(2, '0');
          console.log(`提取出生日期 (dotless fallback): ${year}年${match[2]}月${match[3]}日`);
          return `${year}年${match[2]}月${match[3]}日`;
        }
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

    const requiredFields = ['idNumber', 'birthDate'];
    const optionalFields = ['name', 'gender', 'issueDate', 'issueLocation'];

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
    const namePatterns = [
      // 最常見：名字在「姓名」標籤上方一行（如：謝孟纯\n姓名）
      /([^\n\r]{2,4})\n[\s]*姓[\s]*名/,
      // OCR 把「姓名 出生日期」誤讀為「名生期」，名字接在後面（如：名生期 余宗惠 性别）
      /名[\s]*生[\s]*期[\s]*([^\n\r\s0-9：:.\-]{2,4})/,
      // 標準：「姓名」標籤後接名字
      /姓[\s]*名[\s]*[：:]*[\s]*([^\n\r]{2,4})/,
      // 身分證字號後的名字
      /[A-Z]\d{9}[\s\n]*([^\n\r]{2,4})/,
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
