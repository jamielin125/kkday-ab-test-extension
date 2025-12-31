import { type PageState, type ExtensionMessage, type RawABTestData, ErrorCode } from '@/types';
import { detectEnvironment } from '@/utils/environment';
import {
  parseABTestData,
  buildCookieName,
  getCookieDomain,
  encodeCookieValue,
  isValidCaseValue,
} from '@/utils/abtest';

/**
 * 取得 manifest 中定義的 content script 路徑
 */
function getContentScriptPath(): string | undefined {
  const manifest = chrome.runtime.getManifest();
  return manifest.content_scripts?.[0]?.js?.[0];
}

// T021: Tab 狀態管理
const tabStates = new Map<number, PageState>();

// 等待資料更新的 Promise resolvers（用於 REFRESH_DATA）
const pendingRefreshResolvers = new Map<number, () => void>();

// 超時計時器（用於清理）
const refreshTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

// 資料更新等待超時時間 (ms)
const REFRESH_TIMEOUT = 6000;

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
 * @param tabId - 分頁 ID
 * @param url - 頁面 URL
 * @param pageTests - 頁面專屬 A/B 測試資料
 * @param globalTests - 全域 A/B 測試資料
 */
function updateTabABTestData(
  tabId: number,
  url: string,
  pageTests: RawABTestData | null,
  globalTests: RawABTestData | null
): void {
  let state = tabStates.get(tabId);

  if (!state) {
    state = initializeTabState(tabId, url);
  }

  state.url = url;

  // 解析頁面專屬和全域 A/B 測試資料
  const parsedPageTests = parseABTestData(pageTests, 'page');
  const parsedGlobalTests = parseABTestData(globalTests, 'global');
  state.abTests = [...parsedPageTests, ...parsedGlobalTests];

  state.isLoading = false;
  state.error = pageTests === null && globalTests === null ? '無法讀取 A/B Test 資料' : null;

  tabStates.set(tabId, state);

  // 如果有等待中的 refresh 請求，通知完成並清理超時計時器
  const resolver = pendingRefreshResolvers.get(tabId);
  if (resolver) {
    resolver();
    pendingRefreshResolvers.delete(tabId);

    // 清理對應的超時計時器
    const timeoutId = refreshTimeouts.get(tabId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      refreshTimeouts.delete(tabId);
    }
  }
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
 * @throws 如果 caseValue 格式無效
 */
async function setCookie(tabId: number, testKey: string, caseValue: string): Promise<void> {
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

// T020: chrome.runtime.onMessage 監聽器
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    switch (message.type) {
      case 'AB_TEST_DATA':
        if (tabId !== undefined) {
          updateTabABTestData(
            tabId,
            message.payload.url,
            message.payload.pageTests,
            message.payload.globalTests
          );
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
              errorCode: ErrorCode.STATE_NOT_LOADED,
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

      case 'REFRESH_DATA':
        // 重新讀取頁面的 A/B Test 資料，等待完成後回傳 state
        (async () => {
          try {
            const { tabId } = message.payload;
            const tab = await chrome.tabs.get(tabId);
            if (!tab.url) {
              sendResponse({ success: false, error: '無法取得頁面資訊' });
              return;
            }

            // 清理舊的 pending 請求（處理競態條件）
            const existingResolver = pendingRefreshResolvers.get(tabId);
            if (existingResolver) {
              existingResolver(); // 讓舊的 Promise resolve
              pendingRefreshResolvers.delete(tabId);
            }
            const existingTimeout = refreshTimeouts.get(tabId);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
              refreshTimeouts.delete(tabId);
            }

            // 創建等待 Promise
            const dataReadyPromise = new Promise<void>((resolve) => {
              pendingRefreshResolvers.set(tabId, resolve);
            });

            // 設定超時並追蹤計時器
            const timeoutPromise = new Promise<void>((resolve) => {
              const timeoutId = setTimeout(() => {
                pendingRefreshResolvers.delete(tabId);
                refreshTimeouts.delete(tabId);
                resolve();
              }, REFRESH_TIMEOUT);
              refreshTimeouts.set(tabId, timeoutId);
            });

            const contentScriptPath = getContentScriptPath();
            if (contentScriptPath) {
              await chrome.scripting.executeScript({
                target: { tabId },
                files: [contentScriptPath],
              });
            }

            // 等待資料回傳或超時
            await Promise.race([dataReadyPromise, timeoutPromise]);

            // 回傳最新的 state
            const state = getTabState(tabId);
            sendResponse({ success: true, state });
          } catch (error) {
            console.error('REFRESH_DATA 執行失敗:', error);
            sendResponse({ success: false, error: String(error) });
          }
        })();
        return true;

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
      const contentScriptPath = getContentScriptPath();
      if (contentScriptPath) {
        chrome.scripting.executeScript({
          target: { tabId },
          files: [contentScriptPath],
        }).catch((err) => {
          // 忽略無法注入的情況（例如 chrome:// 頁面）
          console.debug('Content script injection skipped:', err.message);
        });
      }
    }
  }
});

console.log('KKday A/B Test Extension: Background Service Worker 已啟動');
