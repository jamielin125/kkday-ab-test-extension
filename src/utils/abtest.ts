import type { ABTest, ABTestCase, RawABTestData } from '@/types';

/**
 * T016: 將原始 A/B Test 資料轉換為結構化格式
 * @param rawData - 頁面原始 A/B Test 資料
 * @returns 結構化的 A/B Test 陣列
 */
export function parseABTestData(rawData: RawABTestData | null): ABTest[] {
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
