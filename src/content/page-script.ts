/**
 * Page Script - 在頁面上下文中執行，讀取 window.__INIT_STATE__
 * 此檔案會被注入到頁面中執行
 */
(function () {
  setTimeout(() => {
    const data =
      (window as any).__INIT_STATE__?.state?.common?.abTestData || null;
    window.postMessage(
      {
        type: 'KKDAY_AB_TEST_DATA',
        payload: data,
      },
      '*'
    );
  }, 2000);
})();
