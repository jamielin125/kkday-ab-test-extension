import type { ABTest, ABTestCase, ABTestSource, RawABTestData } from '@/types';

/**
 * T016: 將原始 A/B Test 資料轉換為結構化格式
 * @param rawData - 頁面原始 A/B Test 資料
 * @param source - 資料來源 ('page' 頁面專屬 | 'global' 全域)
 * @returns 結構化的 A/B Test 陣列
 */
export function parseABTestData(
  rawData: RawABTestData | null,
  source: ABTestSource
): ABTest[] {
  if (!rawData || typeof rawData !== 'object') {
    return [];
  }

  return Object.entries(rawData).map(([testKey, testValue]) => {
    const cases: ABTestCase[] = testValue.cases
      ? Object.entries(testValue.cases).map(([caseKey, caseLabel]) => ({
          key: caseKey,
          label: caseLabel,
        }))
      : [];

    return {
      key: testKey,
      currentCase: testValue.case || '',
      cases,
      data: testValue.data,
      source,
    };
  });
}

/**
 * T018: 產生 A/B Test cookie 名稱
 * @param testKey - A/B Test 識別碼
 * @returns cookie 名稱
 */
export function buildCookieName(testKey: string): string {
  return `ab_test_override_${testKey}`;
}

/**
 * 根據環境取得 cookie domain
 * @param hostname - 網站主機名稱
 * @returns cookie domain
 */
export function getCookieDomain(hostname: string): string {
  if (hostname.includes('.sit.kkday.com')) {
    return '.sit.kkday.com';
  }
  if (hostname.includes('.stage.kkday.com')) {
    return '.stage.kkday.com';
  }
  return '.kkday.com';
}

/**
 * 編碼 Cookie 值
 * 處理特殊字符以確保 Cookie 值的安全性
 * @param value - 原始 case 值
 * @returns 編碼後的值
 */
export function encodeCookieValue(value: string): string {
  return encodeURIComponent(value);
}

/**
 * 解碼 Cookie 值
 * 與 encodeCookieValue 配對使用
 * @param value - 編碼後的 Cookie 值
 * @returns 解碼後的原始值
 */
export function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // 如果解碼失敗（例如值本身沒有編碼），返回原值
    return value;
  }
}

/**
 * 驗證 case 值格式
 * 防止注入攻擊，只允許安全的字符
 * @param value - 要驗證的 case 值
 * @returns 是否為有效格式
 */
export function isValidCaseValue(value: string): boolean {
  // 允許英文字母、數字、底線、連字號
  return /^[a-zA-Z0-9_-]+$/.test(value);
}
