import type { PageState, ExtensionMessage } from '@/types';
import { ErrorCode } from '@/types';
import { detectEnvironment } from '@/utils/environment';
import { tabStateManager } from './TabStateManager';
import { cookieService } from './CookieService';
import { TabReloadService } from './TabReloadService';

// 建立 TabReloadService 實例
const tabReloadService = new TabReloadService(tabStateManager);

// T020: chrome.runtime.onMessage 監聽器
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    switch (message.type) {
      case 'AB_TEST_DATA':
        if (tabId !== undefined) {
          tabStateManager.updateABTestData(
            tabId,
            message.payload.url,
            message.payload.pageTests,
            message.payload.globalTests
          );
        }
        break;

      case 'GET_STATE': {
        const state = tabStateManager.get(message.tabId);
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
        return true;
      }

      case 'SET_CASE':
        (async () => {
          try {
            const { testKey, caseValue, tabId: targetTabId } = message.payload;

            await cookieService.setCookie(targetTabId, testKey, caseValue);
            await tabReloadService.reloadAndWaitForData(targetTabId);

            sendResponse({ success: true });
          } catch (error) {
            console.error('SET_CASE 執行失敗:', error);
            sendResponse({ success: false, error: String(error) });
          }
        })();
        return true;

      case 'SET_CASES':
        (async () => {
          try {
            const { changes, tabId: targetTabId } = message.payload;

            await cookieService.setCookies(targetTabId, changes);
            await tabReloadService.reloadAndWaitForData(targetTabId);

            sendResponse({ success: true });
          } catch (error) {
            console.error('SET_CASES 執行失敗:', error);
            sendResponse({ success: false, error: String(error) });
          }
        })();
        return true;

      case 'REFRESH_DATA':
        (async () => {
          try {
            const { tabId } = message.payload;
            const tab = await chrome.tabs.get(tabId);
            if (!tab.url) {
              sendResponse({ success: false, error: '無法取得頁面資訊' });
              return;
            }

            await tabReloadService.injectScriptAndWaitForData(tabId);

            const state = tabStateManager.get(tabId);
            sendResponse({ success: true, state });
          } catch (error) {
            console.error('REFRESH_DATA 執行失敗:', error);
            sendResponse({ success: false, error: String(error) });
          }
        })();
        return true;

      case 'CLEAR_OVERRIDES':
        (async () => {
          try {
            const { tabId: targetTabId } = message.payload;

            const cleared = await cookieService.clearOverrideCookies(targetTabId);
            await tabReloadService.reloadAndWaitForData(targetTabId);

            sendResponse({ success: true, cleared });
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
  tabStateManager.cleanup(tabId);
});

// 監聯 tab 更新事件，重置狀態並重新取得資料
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    tabStateManager.setLoading(tabId);
  }

  if (changeInfo.status === 'complete' && tab.url) {
    const hostname = new URL(tab.url).hostname;
    const environment = detectEnvironment(hostname);

    // 只對支援的網站注入 script
    if (environment !== 'unsupported') {
      tabStateManager.updateEnvironment(tabId, tab.url);
      tabReloadService.injectScriptAsync(tabId);
    }
  }
});

console.log('KKday A/B Test Extension: Background Service Worker 已啟動');
