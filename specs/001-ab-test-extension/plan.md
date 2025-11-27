# 實作計畫：KKday A/B Test Chrome Extension

**分支**: `001-ab-test-extension` | **日期**: 2025-11-26 | **規格**: [spec.md](./spec.md)
**輸入**: 功能規格 `/specs/001-ab-test-extension/spec.md`

## 摘要

開發一個 Chrome 擴充功能，讓 KKday 內部人員能觀測與切換 A/B Test 狀態。在 sit/stage 測試環境可自由切換 case，在 production 環境僅供觀測。透過讀取頁面 `window.__INIT_STATE__.state.common.abTestData` 取得測試資料，並使用 cookie（`ab_test_override_<key>=<value>`）實現 case 切換。

## 技術脈絡

**語言/版本**: TypeScript 5.x
**主要依賴**: Vue 3, Vite, Chrome Extension Manifest V3
**儲存**: Chrome Storage API（擴充功能設定）、Cookie（A/B Test 覆寫）
**測試**: Vitest
**目標平台**: Chrome 瀏覽器（Manifest V3）
**專案類型**: 單一專案（Chrome Extension）
**效能目標**: 3 秒內顯示 A/B Test 清單，5 秒內完成 case 切換
**限制**: 僅支援 KKday 網域（sit/stage/production）
**規模**: 內部工具，預計 50-100 位使用者

## 憲章檢核

*關卡：必須在 Phase 0 研究前通過。Phase 1 設計後需重新檢核。*

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. MVP 優先 | ✅ 通過 | 3 個使用者故事均可獨立交付，P1 優先實作 |
| II. 可測試性 | ✅ 通過 | 所有功能需求已有對應接受條件，Vitest 支援單元測試 |
| III. 簡約設計 | ✅ 通過 | 無預留擴展點，僅實作規格定義的功能 |
| IV. 品質至上 | ✅ 通過 | TypeScript 提供型別檢查，ESLint 提供靜態分析 |

## 專案結構

### 文件（本功能）

```text
specs/001-ab-test-extension/
├── plan.md              # 本文件
├── research.md          # Phase 0 輸出
├── data-model.md        # Phase 1 輸出
├── quickstart.md        # Phase 1 輸出
└── contracts/           # Phase 1 輸出（本專案不適用，無後端 API）
```

### 原始碼（專案根目錄）

```text
src/
├── manifest.json        # Chrome Extension Manifest V3
├── popup/               # 擴充功能彈出視窗
│   ├── App.vue          # 主要 Vue 元件
│   ├── main.ts          # 進入點
│   └── components/      # UI 元件
│       ├── ABTestList.vue
│       └── ABTestItem.vue
├── content/             # Content Script
│   └── index.ts         # 注入頁面，讀取 __INIT_STATE__
├── background/          # Service Worker
│   └── index.ts         # 處理 cookie 操作
├── types/               # TypeScript 型別定義
│   └── index.ts
└── utils/               # 共用工具
    ├── environment.ts   # 環境判斷
    └── abtest.ts        # A/B Test 資料處理

tests/
└── unit/
    ├── environment.test.ts
    └── abtest.test.ts

public/
└── icons/               # 擴充功能圖示
```

**結構決策**: 採用標準 Chrome Extension 結構，搭配 Vue 3 建構 popup 介面。Content Script 負責讀取頁面資料，Background Service Worker 負責 cookie 操作。

## 複雜度追蹤

> 無違反憲章情況，無需記錄。
