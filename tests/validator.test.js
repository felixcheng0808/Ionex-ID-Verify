const validator = require('../src/utils/validator');

describe('台灣身分證字號驗證', () => {
  describe('validateTaiwanID', () => {
    test('應該驗證有效的身分證字號', () => {
      // 這些是格式正確的範例（非真實身分證）
      expect(validator.validateTaiwanID('A123456789')).toBe(true);
      expect(validator.validateTaiwanID('B223456789')).toBe(true);
    });

    test('應該拒絕無效的身分證字號', () => {
      expect(validator.validateTaiwanID('A000000000')).toBe(false);
      expect(validator.validateTaiwanID('12345678')).toBe(false);
      expect(validator.validateTaiwanID('ABC1234567')).toBe(false);
      expect(validator.validateTaiwanID('')).toBe(false);
      expect(validator.validateTaiwanID(null)).toBe(false);
    });

    test('應該處理大小寫', () => {
      expect(validator.validateTaiwanID('a123456789')).toBe(true);
      expect(validator.validateTaiwanID('A123456789')).toBe(true);
    });
  });

  describe('getIDInfo', () => {
    test('應該從身分證字號提取資訊', () => {
      const info = validator.getIDInfo('A123456789');

      expect(info).not.toBeNull();
      expect(info.isValid).toBe(true);
      expect(info.gender).toBe('男');
    });

    test('應該處理女性身分證', () => {
      const info = validator.getIDInfo('A223456789');

      expect(info).not.toBeNull();
      expect(info.gender).toBe('女');
    });

    test('無效身分證應該回傳 null', () => {
      const info = validator.getIDInfo('invalid');
      expect(info).toBeNull();
    });
  });

  describe('extractPossibleIDs', () => {
    test('應該從文字中提取身分證字號', () => {
      const text = '姓名：王小明 身分證字號：A123456789 出生日期：70年01月01日';
      const ids = validator.extractPossibleIDs(text);

      expect(ids.length).toBeGreaterThan(0);
      expect(ids[0]).toBe('A123456789');
    });

    test('應該處理沒有身分證字號的文字', () => {
      const text = '這段文字沒有身分證字號';
      const ids = validator.extractPossibleIDs(text);

      expect(ids).toEqual([]);
    });
  });

  describe('normalizeID', () => {
    test('應該正規化身分證字號格式', () => {
      expect(validator.normalizeID('a 123 456 789')).toBe('A123456789');
      expect(validator.normalizeID('a-123-456-789')).toBe('A123456789');
      expect(validator.normalizeID('  A123456789  ')).toBe('A123456789');
    });
  });
});
