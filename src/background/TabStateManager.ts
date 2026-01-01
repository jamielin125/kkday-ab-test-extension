import type { PageState, RawABTestData } from '@/types';
import { detectEnvironment } from '@/utils/environment';
import { parseABTestData } from '@/utils/abtest';

/**
 * Tab 狀態管理器
 * 封裝所有與 Tab 狀態相關的操作，包括：
 * - Tab 狀態的 CRUD 操作
 * - 等待資料更新的機制
 * - 超時控制
 */
export class TabStateManager {
  // Tab 狀態儲存
  private states = new Map<number, PageState>();

  // 等待資料更新的 Promise resolvers
  private pendingResolvers = new Map<number, () => void>();

  // 超時計時器
  private timeouts = new Map<number, ReturnType<typeof setTimeout>>();

  // 資料更新等待超時時間 (ms)
  private readonly REFRESH_TIMEOUT = 6000;

  /**
   * 初始化 Tab 的 PageState
   */
  initialize(tabId: number, url: string): PageState {
    const hostname = new URL(url).hostname;
    const environment = detectEnvironment(hostname);

    const state: PageState = {
      environment,
      url,
      abTests: [],
      isLoading: true,
      error: null,
    };

    this.states.set(tabId, state);
    return state;
  }

  /**
   * 取得 Tab 的 PageState
   */
  get(tabId: number): PageState | null {
    return this.states.get(tabId) || null;
  }

  /**
   * 更新 Tab 的 A/B Test 資料
   */
  updateABTestData(
    tabId: number,
    url: string,
    pageTests: RawABTestData | null,
    globalTests: RawABTestData | null
  ): void {
    let state = this.states.get(tabId);

    if (!state) {
      state = this.initialize(tabId, url);
    }

    state.url = url;

    // 解析頁面專屬和全域 A/B 測試資料
    const parsedPageTests = parseABTestData(pageTests, 'page');
    const parsedGlobalTests = parseABTestData(globalTests, 'global');
    state.abTests = [...parsedPageTests, ...parsedGlobalTests];

    state.isLoading = false;
    state.error = pageTests === null && globalTests === null ? '無法讀取 A/B Test 資料' : null;

    this.states.set(tabId, state);

    // 如果有等待中的 refresh 請求，通知完成
    this.resolveDataUpdate(tabId);
  }

  /**
   * 設定 Tab 為載入中狀態
   */
  setLoading(tabId: number): void {
    const state = this.states.get(tabId);
    if (state) {
      state.isLoading = true;
      state.abTests = [];
      this.states.set(tabId, state);
    }
  }

  /**
   * 更新 Tab 的環境和 URL
   */
  updateEnvironment(tabId: number, url: string): void {
    const hostname = new URL(url).hostname;
    const environment = detectEnvironment(hostname);

    const existingState = this.states.get(tabId);
    if (existingState) {
      existingState.environment = environment;
      existingState.url = url;
      this.states.set(tabId, existingState);
    } else {
      this.initialize(tabId, url);
    }
  }

  /**
   * 清理 Tab 的狀態
   */
  cleanup(tabId: number): void {
    this.states.delete(tabId);
    this.clearPendingResolver(tabId);
  }

  /**
   * 等待頁面資料更新
   * 設定 pendingResolvers，等待 AB_TEST_DATA 回報或超時
   */
  async waitForDataUpdate(tabId: number): Promise<void> {
    // 清理舊的 pending 請求（處理競態條件）
    this.clearPendingResolver(tabId);

    // 創建等待 Promise
    const dataReadyPromise = new Promise<void>((resolve) => {
      this.pendingResolvers.set(tabId, resolve);
    });

    // 設定超時
    const timeoutPromise = new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        this.pendingResolvers.delete(tabId);
        this.timeouts.delete(tabId);
        resolve();
      }, this.REFRESH_TIMEOUT);
      this.timeouts.set(tabId, timeoutId);
    });

    // 等待資料回傳或超時
    await Promise.race([dataReadyPromise, timeoutPromise]);
  }

  /**
   * 清理 pending resolver 和超時計時器
   */
  private clearPendingResolver(tabId: number): void {
    const existingResolver = this.pendingResolvers.get(tabId);
    if (existingResolver) {
      existingResolver();
      this.pendingResolvers.delete(tabId);
    }

    const existingTimeout = this.timeouts.get(tabId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.timeouts.delete(tabId);
    }
  }

  /**
   * 通知資料更新完成
   */
  private resolveDataUpdate(tabId: number): void {
    const resolver = this.pendingResolvers.get(tabId);
    if (resolver) {
      resolver();
      this.pendingResolvers.delete(tabId);

      const timeoutId = this.timeouts.get(tabId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.timeouts.delete(tabId);
      }
    }
  }
}

// 導出單例實例
export const tabStateManager = new TabStateManager();
