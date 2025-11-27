import type { PageState, ExtensionMessage, RawABTestData } from '@/types';
import { detectEnvironment } from '@/utils/environment';
import { parseABTestData, buildCookieName, getCookieDomain } from '@/utils/abtest';

// T021: Tab 狀態管理
const tabStates = new Map<number, PageState>();

/**
 * 初始化或更新 tab 的 PageState
 */
function initializeTabState(tabId: number, url: string): PageState {
  const hostname = new URL(url).hostname;
  const environment = detectEnvironment(hostname);

  const state: PageState = {
    environment,
    url,
    abTests: [],
    isLoading: true,
    error: null,
  };

  tabStates.set(tabId, state);
  return state;
}

/**
 * 更新 tab 的 A/B Test 資料
 */
function updateTabABTestData(tabId: number, url: string, rawData: RawABTestData | null): void {
  let state = tabStates.get(tabId);

  if (!state) {
    state = initializeTabState(tabId, url);
  }

  state.url = url;
  state.abTests = parseABTestData(rawData);
  state.isLoading = false;
  state.error = rawData === null ? '無法讀取 A/B Test 資料' : null;

  tabStates.set(tabId, state);
}

/**
 * 取得 tab 的 PageState
 */
function getTabState(tabId: number): PageState | null {
  return tabStates.get(tabId) || null;
}

/**
 * T039: 設定 A/B Test override cookie
 * @param tabId - 分頁 ID
 * @param testKey - A/B Test 識別碼
 * @param caseValue - 要設定的 case 值
 */
async function setCookie(tabId: number, testKey: string, caseValue: string): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url) return;

  const url = new URL(tab.url);
  const domain = getCookieDomain(url.hostname);
  const cookieName = buildCookieName(testKey);

  await chrome.cookies.set({
    url: tab.url,
    domain,
    name: cookieName,
    value: caseValue,
    path: '/',
    secure: url.protocol === 'https:',
    sameSite: 'lax',
  });
}

// T020: chrome.runtime.onMessage 監聽器
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    switch (message.type) {
      case 'AB_TEST_DATA':
        if (tabId !== undefined) {
          updateTabABTestData(tabId, message.payload.url, message.payload.data);
        }
        break;

      case 'GET_STATE': {
        const state = getTabState(message.tabId);
        if (state) {
          sendResponse({ type: 'STATE_RESPONSE', payload: state });
        } else {
          sendResponse({
            type: 'STATE_RESPONSE',
            payload: {
              environment: 'unsupported',
              url: '',
              abTests: [],
              isLoading: false,
              error: '尚未載入頁面資料',
            } as PageState,
          });
        }
        return true; // 保持 sendResponse 有效
      }

      case 'SET_CASE':
        // T040: 處理 SET_CASE 訊息，設定 cookie 並重載頁面
        (async () => {
          try {
            const { testKey, caseValue, tabId: targetTabId } = message.payload;

            // T039: 設定 cookie
            await setCookie(targetTabId, testKey, caseValue);

            // T042: 重載頁面
            await chrome.tabs.reload(targetTabId);

            sendResponse({ success: true });
          } catch (error) {
            console.error('SET_CASE 執行失敗:', error);
            sendResponse({ success: false, error: String(error) });
          }
        })();
        return true; // 保持 sendResponse 有效（非同步處理）

      case 'SET_CASES':
        // Phase 3: 批次設定多個 A/B Test cookies
        (async () => {
          try {
            const { changes, tabId: targetTabId } = message.payload;

            // 批次設定所有 cookies
            await Promise.all(
              changes.map(({ testKey, caseValue }: { testKey: string; caseValue: string }) =>
                setCookie(targetTabId, testKey, caseValue)
              )
            );

            // 設定完成後重載頁面一次
            await chrome.tabs.reload(targetTabId);

            sendResponse({ success: true });
          } catch (error) {
            console.error('SET_CASES 執行失敗:', error);
            sendResponse({ success: false, error: String(error) });
          }
        })();
        return true; // 保持 sendResponse 有效（非同步處理）

      case 'CLEAR_OVERRIDES':
        // 清除所有 ab_test_override_* cookie
        (async () => {
          try {
            const { tabId: targetTabId } = message.payload;
            const tab = await chrome.tabs.get(targetTabId);
            if (!tab.url) {
              sendResponse({ success: false, error: '無法取得頁面資訊' });
              return;
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

            // 重載頁面
            await chrome.tabs.reload(targetTabId);

            sendResponse({ success: true, cleared: overrideCookies.length });
          } catch (error) {
            console.error('CLEAR_OVERRIDES 執行失敗:', error);
            sendResponse({ success: false, error: String(error) });
          }
        })();
        return true;
    }
  }
);

// 監聽 tab 關閉事件，清理狀態
chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
});

// 監聽 tab 更新事件，重置狀態並重新取得資料
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    // 重置狀態
    const state = tabStates.get(tabId);
    if (state) {
      state.isLoading = true;
      state.abTests = [];
      tabStates.set(tabId, state);
    }
  }

  if (changeInfo.status === 'complete' && tab.url) {
    // Phase 1 & 2: 頁面載入完成時，重新計算環境並注入 content script
    const hostname = new URL(tab.url).hostname;
    const environment = detectEnvironment(hostname);

    // 只對支援的網站注入 script
    if (environment !== 'unsupported') {
      // 更新或初始化狀態（修復 Phase 2: 環境標籤問題）
      const existingState = tabStates.get(tabId);
      if (existingState) {
        existingState.environment = environment;
        existingState.url = tab.url;
        tabStates.set(tabId, existingState);
      } else {
        initializeTabState(tabId, tab.url);
      }

      // 重新注入 content script 取得資料（修復 Phase 1: 狀態遺失問題）
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/index.js'],
      }).catch((err) => {
        // 忽略無法注入的情況（例如 chrome:// 頁面）
        console.debug('Content script injection skipped:', err.message);
      });
    }
  }
});

console.log('KKday A/B Test Extension: Background Service Worker 已啟動');
