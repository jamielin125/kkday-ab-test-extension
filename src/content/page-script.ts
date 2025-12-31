/**
 * Page Script - 在頁面上下文中執行，讀取 A/B 測試資料
 * 此檔案會被注入到頁面中執行
 * 支援 __NUXT__ 和 __INIT_STATE__ 兩種專案類型
 */
(function () {
  // 輪詢配置：使用 exponential backoff 策略
  // 初始間隔 200ms，每次翻倍，最大間隔 2000ms
  // 總等待時間約 12 秒（200 + 400 + 800 + 1600 + 2000*5 = 13000ms）
  const MAX_ATTEMPTS = 10;
  const INITIAL_INTERVAL = 200;
  const MAX_INTERVAL = 2000;
  let attempts = 0;
  let currentInterval = INITIAL_INTERVAL;

  // 深拷貝以避免 Proxy 或不可序列化物件導致 postMessage 失敗
  function safeClone(obj: unknown): unknown {
    if (obj === null || obj === undefined) return null;
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return null;
    }
  }

  function tryReadData() {
    let pageTests = null;
    let globalTests = null;

    // 優先順序：__NUXT__ (useState) > __INIT_STATE__
    if ((window as any).__NUXT__?.state?.$sabTestData) {
      // Nuxt 3 useState - 新版 useAbTest composable
      pageTests = safeClone(
        (window as any).__NUXT__.state.$sabTestData
      );
      globalTests = safeClone(
        (window as any).__NUXT__.pinia?.['core-system']?.systemState?.value
          ?.testCases
      );
    } else if ((window as any).__INIT_STATE__?.state?.common) {
      // 舊版專案
      pageTests = safeClone(
        (window as any).__INIT_STATE__.state.common.abTestData
      );
      globalTests = safeClone(
        (window as any).__INIT_STATE__.state.common.testCases
      );
    }

    // 找到資料或達到最大嘗試次數，就回傳結果
    if (pageTests !== null || globalTests !== null || attempts >= MAX_ATTEMPTS) {
      window.postMessage(
        {
          type: 'KKDAY_AB_TEST_DATA',
          payload: { pageTests, globalTests },
        },
        window.location.origin // 明確指定 origin，避免訊息被其他 origin 攔截
      );
      return;
    }

    // 繼續輪詢（exponential backoff）
    attempts++;
    setTimeout(tryReadData, currentInterval);
    currentInterval = Math.min(currentInterval * 2, MAX_INTERVAL);
  }

  tryReadData();
})();
