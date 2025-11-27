# 技術研究：KKday A/B Test Chrome Extension

**日期**: 2025-11-26
**分支**: `001-ab-test-extension`

## 1. Chrome Extension Manifest V3 架構

### 決策
採用 Manifest V3 作為擴充功能規範版本。

### 理由
- Chrome 已於 2024 年停止接受新的 Manifest V2 擴充功能
- Manifest V3 提供更好的安全性與效能
- Service Worker 取代 Background Page，降低記憶體使用

### 替代方案考量
- Manifest V2：已棄用，不建議新專案使用

### 關鍵技術點
- **Service Worker**: 取代持久性 Background Page，按需啟動
- **Content Script**: 可存取頁面 DOM 但無法直接存取頁面 JS 變數
- **Scripting API**: 需透過 `chrome.scripting.executeScript` 注入程式碼讀取 `window.__INIT_STATE__`
- **Cookie API**: 需在 `permissions` 宣告 `cookies` 權限，指定 host_permissions

---

## 2. 讀取頁面 JavaScript 變數（window.__INIT_STATE__）

### 決策
使用 Content Script 注入 inline script 讀取 `window.__INIT_STATE__`，透過 CustomEvent 或 postMessage 傳回 Content Script。

### 理由
- Content Script 執行於隔離的 JavaScript context，無法直接存取頁面變數
- 注入 inline script 可在頁面 context 執行，存取 window 物件
- 透過 DOM 事件或 postMessage 可跨 context 傳遞資料

### 實作方式
```typescript
// Content Script 注入程式碼
const script = document.createElement('script');
script.textContent = `
  window.postMessage({
    type: 'KKDAY_AB_TEST_DATA',
    payload: window.__INIT_STATE__?.state?.common?.abTestData || null
  }, '*');
`;
document.documentElement.appendChild(script);
script.remove();

// Content Script 接收資料
window.addEventListener('message', (event) => {
  if (event.data.type === 'KKDAY_AB_TEST_DATA') {
    // 處理 A/B Test 資料
  }
});
```

### 替代方案考量
- MutationObserver 監聽 DOM：無法取得 JS 變數
- 攔截網路請求：過於複雜，且資料可能被處理後才存入 window

---

## 3. Cookie 操作機制

### 決策
使用 `chrome.cookies` API 在 Background Service Worker 中操作 cookie。

### 理由
- Content Script 可使用 `document.cookie`，但有 HttpOnly 限制
- `chrome.cookies` API 提供更完整的 cookie 控制能力
- 可設定 domain、path、expires 等屬性

### 實作方式
```typescript
// Background Service Worker
chrome.cookies.set({
  url: 'https://www.sit.kkday.com',
  name: 'ab_test_override_app_only_coupon_on_mweb_test',
  value: 'show_all',
  domain: '.sit.kkday.com',
  path: '/',
  secure: true,
  sameSite: 'lax'
});
```

### 權限需求
```json
{
  "permissions": ["cookies", "activeTab", "scripting"],
  "host_permissions": [
    "*://*.kkday.com/*",
    "*://*.sit.kkday.com/*",
    "*://*.stage.kkday.com/*"
  ]
}
```

---

## 4. Vue 3 + Vite 建構 Chrome Extension

### 決策
使用 CRXJS Vite Plugin 整合 Vue 3 與 Chrome Extension 開發。

### 理由
- 原生支援 Manifest V3
- HMR（Hot Module Replacement）支援，加速開發
- 自動處理 Content Script 與 Background Service Worker 打包
- Vue 3 Composition API 適合小型應用

### 替代方案考量
- Webpack + vue-cli：設定較繁瑣
- Plasmo Framework：功能強大但學習曲線較陡
- 純 Vite：需手動設定較多 Chrome Extension 相關配置

### 建議依賴
```json
{
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.x",
    "@vitejs/plugin-vue": "^5.x",
    "vite": "^5.x",
    "vue": "^3.x",
    "typescript": "^5.x",
    "vitest": "^2.x"
  }
}
```

---

## 5. 環境判斷邏輯

### 決策
透過 URL hostname 正則表達式判斷環境類型。

### 實作方式
```typescript
type Environment = 'sit' | 'stage' | 'production' | 'unsupported';

function detectEnvironment(hostname: string): Environment {
  if (/^www(-\d+)?\.sit\.kkday\.com$/.test(hostname)) {
    return 'sit';
  }
  if (hostname === 'www.stage.kkday.com') {
    return 'stage';
  }
  if (hostname === 'www.kkday.com') {
    return 'production';
  }
  return 'unsupported';
}
```

### 測試案例
| Hostname | 預期結果 |
|----------|----------|
| www.sit.kkday.com | sit |
| www-05.sit.kkday.com | sit |
| www-202.sit.kkday.com | sit |
| www.stage.kkday.com | stage |
| www.kkday.com | production |
| www.google.com | unsupported |

---

## 6. 擴充功能與頁面通訊架構

### 決策
採用標準 Chrome Extension 通訊架構：
- Popup ↔ Background：`chrome.runtime.sendMessage`
- Content Script ↔ Background：`chrome.runtime.sendMessage`
- Content Script ↔ Page：`postMessage` / CustomEvent

### 資料流
```
┌─────────────────────────────────────────────────────────────┐
│                         KKday 頁面                           │
│  window.__INIT_STATE__.state.common.abTestData              │
└─────────────────────────────┬───────────────────────────────┘
                              │ postMessage
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Content Script                          │
│  接收頁面資料，轉發給 Background                              │
└─────────────────────────────┬───────────────────────────────┘
                              │ chrome.runtime.sendMessage
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Background Service Worker                    │
│  儲存狀態、處理 cookie 操作                                   │
└─────────────────────────────┬───────────────────────────────┘
                              │ chrome.runtime.sendMessage
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Popup (Vue 3)                           │
│  顯示 A/B Test 清單、提供切換介面                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 測試策略

### 決策
使用 Vitest 進行單元測試，聚焦於純邏輯函式。

### 可測試範圍
- `detectEnvironment()` 函式：環境判斷邏輯
- `parseABTestData()` 函式：資料解析邏輯
- `buildCookieName()` 函式：cookie 名稱產生

### 測試限制
- Chrome API（`chrome.cookies`、`chrome.runtime`）需 mock
- Content Script 與頁面互動難以單元測試，建議以手動測試為主

### 建議測試設定
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```
