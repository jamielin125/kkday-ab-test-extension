import {
  buildCookieName,
  getCookieDomain,
  encodeCookieValue,
  isValidCaseValue,
} from '@/utils/abtest';

/**
 * Cookie 操作服務
 * 封裝所有與 A/B Test Cookie 相關的操作
 */
export class CookieService {
  /**
   * 設定 A/B Test override cookie
   * @param tabId - 分頁 ID
   * @param testKey - A/B Test 識別碼
   * @param caseValue - 要設定的 case 值
   * @throws 如果 caseValue 格式無效
   */
  async setCookie(tabId: number, testKey: string, caseValue: string): Promise<void> {
    // 驗證 case 值格式，防止注入攻擊
    if (!isValidCaseValue(caseValue)) {
      throw new Error(`Invalid case value format: ${caseValue}`);
    }

    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) return;

    const url = new URL(tab.url);
    const domain = getCookieDomain(url.hostname);
    const cookieName = buildCookieName(testKey);

    await chrome.cookies.set({
      url: tab.url,
      domain,
      name: cookieName,
      value: encodeCookieValue(caseValue),
      path: '/',
      secure: url.protocol === 'https:',
      sameSite: 'lax',
    });
  }

  /**
   * 批次設定多個 A/B Test cookies
   * @param tabId - 分頁 ID
   * @param changes - 要設定的變更清單
   */
  async setCookies(
    tabId: number,
    changes: Array<{ testKey: string; caseValue: string }>
  ): Promise<void> {
    await Promise.all(
      changes.map(({ testKey, caseValue }) => this.setCookie(tabId, testKey, caseValue))
    );
  }

  /**
   * 清除所有 A/B Test override cookies
   * @param tabId - 分頁 ID
   * @returns 清除的 cookie 數量
   */
  async clearOverrideCookies(tabId: number): Promise<number> {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) {
      throw new Error('無法取得頁面資訊');
    }

    const url = new URL(tab.url);
    const domain = getCookieDomain(url.hostname);

    // 取得所有該 domain 的 cookies
    const cookies = await chrome.cookies.getAll({ domain });

    // 篩選並刪除所有 ab_test_override_ 開頭的 cookie
    const overrideCookies = cookies.filter((c) => c.name.startsWith('ab_test_override_'));

    await Promise.all(
      overrideCookies.map((cookie) =>
        chrome.cookies.remove({
          url: tab.url!,
          name: cookie.name,
        })
      )
    );

    return overrideCookies.length;
  }
}

// 導出單例實例
export const cookieService = new CookieService();
