import type { RawABTestData } from '@/types';

/**
 * Content Script - 負責從頁面讀取 A/B Test 資料並傳送至 Background
 */

// 等待頁面完成載入後執行
function init(): void {
  // 注入 inline script 讀取 window.__INIT_STATE__
  injectScript();

  // 監聽頁面傳回的資料
  window.addEventListener('message', handlePageMessage);
}

/**
 * 注入外部 script 至頁面，讀取 window.__INIT_STATE__
 * 使用外部檔案避免 CSP inline script 限制
 */
function injectScript(): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/content/page-script.js');
  script.onload = () => script.remove();
  document.documentElement.appendChild(script);
}

/**
 * 處理頁面傳回的訊息
 */
function handlePageMessage(event: MessageEvent): void {
  // 只處理來自同源的訊息
  if (event.source !== window) return;

  if (event.data?.type === 'KKDAY_AB_TEST_DATA') {
    const rawData: RawABTestData | null = event.data.payload;

    // 傳送資料至 Background Service Worker
    chrome.runtime.sendMessage({
      type: 'AB_TEST_DATA',
      payload: {
        url: window.location.href,
        data: rawData,
      },
    });
  }
}

// 執行初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
