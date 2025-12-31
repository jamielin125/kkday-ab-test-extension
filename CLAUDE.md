# KKday A/B Test Chrome Extension

## 專案簡介

KKday A/B Test Chrome Extension 是為 KKday 電商平台設計的 Chrome 擴充功能，用於**觀測和切換 A/B 測試狀態**。

## 目錄結構

```
src/
├── background/index.ts      # Service Worker - 管理分頁狀態、Cookie、消息處理
├── content/
│   ├── index.ts             # Content Script - 橋接網頁與 Service Worker
│   └── page-script.ts       # Page Script - 讀取 __NUXT__/__INIT_STATE__ 數據
├── popup/
│   ├── App.vue              # 主 UI 組件
│   └── components/
│       ├── ABTestList.vue   # A/B 測試清單（批量操作）
│       └── ABTestItem.vue   # 單個測試項目（下拉選單）
├── types/index.ts           # TypeScript 型別定義
├── utils/
│   ├── abtest.ts            # 數據解析、Cookie 操作
│   └── environment.ts       # 環境檢測 (SIT/Stage/Production)
└── manifest.json            # Chrome Extension Manifest V3

tests/unit/                  # 單元測試
specs/001-ab-test-extension/ # 規格文檔
```

## 技術棧

- **Vue 3** + **TypeScript** + **Vite**
- **CRXJS Vite Plugin** - Chrome Extension 構建
- **Chrome APIs**: Tabs, Runtime, Cookies, Scripting
- **Vitest** - 單元測試
- **Node.js >= 22**

## 功能矩陣

| 功能 | SIT | Stage | Production |
|-----|-----|-------|------------|
| 觀測 A/B Test 清單 | ✅ | ✅ | ✅ |
| 查看當前 case | ✅ | ✅ | ✅ |
| 切換 case | ✅ | ✅ | ❌ 唯讀 |

## 開發命令

```bash
pnpm dev        # 開發伺服器
pnpm build      # 生產構建
pnpm test       # 單元測試
pnpm typecheck  # 類型檢查
pnpm lint       # ESLint 檢查
```

## 架構概要

1. **Page Script** → 從 `window.__NUXT__` or `window.__INIT_STATE__`  讀取 A/B 測試數據
2. **Content Script** → 監聽頁面消息並轉發至 Background
3. **Background** → 維護分頁狀態 Map、處理 Cookie 設定
4. **Popup UI** → Vue 3 組件，顯示測試清單與操作界面

## 消息類型

- `AB_TEST_DATA` - 頁面數據上報
- `GET_STATE` - 獲取分頁狀態
- `SET_CASES` - 批量設定 Cases
- `CLEAR_OVERRIDES` - 清除 Override Cookies
- `REFRESH_DATA` - 重新注入 Script