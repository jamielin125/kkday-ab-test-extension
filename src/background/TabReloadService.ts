import type { TabStateManager } from './TabStateManager';

/**
 * 取得 manifest 中定義的 content script 路徑
 */
function getContentScriptPath(): string | undefined {
  const manifest = chrome.runtime.getManifest();
  return manifest.content_scripts?.[0]?.js?.[0];
}

/**
 * Tab 重載服務
 * 封裝 reload + 等待數據回報的邏輯
 */
export class TabReloadService {
  constructor(private stateManager: TabStateManager) {}

  /**
   * 重載頁面並等待數據回報
   * @param tabId - 分頁 ID
   */
  async reloadAndWaitForData(tabId: number): Promise<void> {
    // 1. 設置等待機制（在 reload 前！）
    const waitPromise = this.stateManager.waitForDataUpdate(tabId);

    // 2. 重載頁面
    await chrome.tabs.reload(tabId);

    // 3. 等待數據回報
    await waitPromise;
  }

  /**
   * 注入 content script 並等待數據回報
   * @param tabId - 分頁 ID
   */
  async injectScriptAndWaitForData(tabId: number): Promise<void> {
    // 1. 設置等待機制
    const waitPromise = this.stateManager.waitForDataUpdate(tabId);

    // 2. 注入 content script
    const contentScriptPath = getContentScriptPath();
    if (contentScriptPath) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [contentScriptPath],
      });
    }

    // 3. 等待資料回傳或超時
    await waitPromise;
  }

  /**
   * 注入 content script（不等待，用於 tab 生命週期事件）
   * @param tabId - 分頁 ID
   */
  injectScriptAsync(tabId: number): void {
    const contentScriptPath = getContentScriptPath();
    if (contentScriptPath) {
      chrome.scripting
        .executeScript({
          target: { tabId },
          files: [contentScriptPath],
        })
        .catch((err) => {
          // 忽略無法注入的情況（例如 chrome:// 頁面）
          console.debug('Content script injection skipped:', err.message);
        });
    }
  }
}
