import type { RawABTestData } from '@/types';

/**
 * Content Script - 負責從頁面讀取 A/B Test 資料並傳送至 Background
 * 支援 __NUXT__ 和 __INIT_STATE__ 兩種專案類型
 */

// 等待頁面完成載入後執行
function init(): void {
  // 注入 inline script 讀取 A/B 測試資料
  injectScript();

  // 監聽頁面傳回的資料
  window.addEventListener('message', handlePageMessage);
}

/**
 * 注入外部 script 至頁面，讀取 A/B 測試資料
 * 使用外部檔案避免 CSP inline script 限制
 */
function injectScript(): void {
  // 檢查 Extension context 是否仍有效
  if (!chrome.runtime?.id) {
    return;
  }

  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('src/content/page-script.js');
    script.onload = () => script.remove();
    document.documentElement.appendChild(script);
  } catch {
    // Extension context invalidated - 擴充功能已被重載或停用
  }
}

/**
 * 處理頁面傳回的訊息
 */
function handlePageMessage(event: MessageEvent): void {
  // 只處理來自同源的訊息
  if (event.source !== window) return;

  if (event.data?.type === 'KKDAY_AB_TEST_DATA') {
    const pageTests: RawABTestData | null = event.data.payload?.pageTests;
    const globalTests: RawABTestData | null = event.data.payload?.globalTests;

    // 檢查 Extension context 是否仍有效
    // 當 Extension 被重載或停用時，chrome.runtime.id 會變成 undefined
    if (!chrome.runtime?.id) {
      return;
    }

    // 傳送資料至 Background Service Worker
    try {
      chrome.runtime.sendMessage({
        type: 'AB_TEST_DATA',
        payload: {
          url: window.location.href,
          pageTests,
          globalTests,
        },
      }).catch((error) => {
        // Service Worker 可能離線（被休眠），忽略此錯誤
        // 用戶重新開啟 popup 時會觸發 REFRESH_DATA 重新取得資料
        console.debug('KKday A/B Test: Service Worker 暫時無法連線', error.message);
      });
    } catch {
      // Extension context invalidated - 擴充功能已被重載或停用
      // 這是預期行為，不需要處理
    }
  }
}

// 執行初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
