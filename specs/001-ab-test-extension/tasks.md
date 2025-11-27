# 任務清單：KKday A/B Test Chrome Extension

**輸入**: 設計文件 `/specs/001-ab-test-extension/`
**前置條件**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**測試**: 包含單元測試（Vitest 已列入技術棧）

**組織方式**: 任務依使用者故事分組，支援獨立實作與測試

## 格式說明：`[ID] [P?] [Story?] 描述`

- **[P]**: 可並行執行（不同檔案、無依賴）
- **[Story]**: 所屬使用者故事（US1, US2, US3）
- 描述中包含確切檔案路徑

---

## Phase 1: 專案初始化

**目的**: 建立專案基礎結構與開發環境

- [x] T001 執行 `pnpm create vite` 初始化 Vue 3 + TypeScript 專案
- [x] T002 安裝 Chrome Extension 依賴：`@crxjs/vite-plugin`、`@types/chrome` 於 package.json
- [x] T003 [P] 設定 vite.config.ts 整合 CRXJS 與 Vue 插件
- [x] T004 [P] 設定 tsconfig.json 啟用嚴格模式與路徑別名
- [x] T005 [P] 設定 ESLint 與 Prettier 於 .eslintrc.cjs 和 .prettierrc
- [x] T006 [P] 設定 Vitest 於 vitest.config.ts（jsdom 環境）
- [x] T007 建立 src/manifest.json（Manifest V3 格式，含 permissions 與 host_permissions）
- [x] T008 [P] 建立 public/icons/ 目錄並放置擴充功能圖示（16x16, 48x48, 128x128）

**檢查點**: 專案可執行 `pnpm dev` 啟動開發模式

---

## Phase 2: 基礎建設（阻塞型前置條件）

**目的**: 所有使用者故事共用的核心模組

**⚠️ 重要**: 此階段必須完成後，使用者故事才能開始

### 型別定義

- [x] T009 建立 src/types/index.ts 定義 Environment 型別
- [x] T010 [P] 於 src/types/index.ts 新增 ABTestCase 與 ABTest 介面
- [x] T011 [P] 於 src/types/index.ts 新增 RawABTestData 介面（頁面原始資料格式）
- [x] T012 [P] 於 src/types/index.ts 新增 PageState 介面
- [x] T013 [P] 於 src/types/index.ts 新增 Message Types（AB_TEST_DATA, GET_STATE, SET_CASE, STATE_RESPONSE）

### 共用工具函式

- [x] T014 實作 detectEnvironment() 於 src/utils/environment.ts（正則判斷 sit/stage/production）
- [x] T015 [P] 撰寫 detectEnvironment 單元測試於 tests/unit/environment.test.ts
- [x] T016 實作 parseABTestData() 於 src/utils/abtest.ts（RawABTestData → ABTest[]）
- [x] T017 [P] 撰寫 parseABTestData 單元測試於 tests/unit/abtest.test.ts
- [x] T018 [P] 實作 buildCookieName() 於 src/utils/abtest.ts（產生 ab_test_override_<key> 格式）
- [x] T019 [P] 撰寫 buildCookieName 單元測試於 tests/unit/abtest.test.ts

### Background Service Worker 基礎

- [x] T020 建立 src/background/index.ts 骨架（chrome.runtime.onMessage 監聽器）
- [x] T021 於 src/background/index.ts 實作 tab 狀態管理（Map<tabId, PageState>）

### Content Script 基礎

- [x] T022 建立 src/content/index.ts 骨架（DOMContentLoaded 監聽器）

**檢查點**: 執行 `pnpm test` 所有單元測試通過

---

## Phase 3: 使用者故事 1 - 觀測 A/B Test 狀態（優先順序: P1）🎯 MVP

**目標**: 使用者可在任一 KKday 網站查看當前所有 A/B Test 狀態

**獨立測試**: 安裝擴充功能，前往 www.sit.kkday.com，點擊圖示應顯示 A/B Test 清單

### 實作任務

- [x] T023 [US1] 於 src/content/index.ts 實作 inline script 注入，讀取 window.__INIT_STATE__.state.common.abTestData
- [x] T024 [US1] 於 src/content/index.ts 實作 postMessage 監聽，接收頁面資料
- [x] T025 [US1] 於 src/content/index.ts 實作 chrome.runtime.sendMessage 傳送 AB_TEST_DATA 至 Background
- [x] T026 [US1] 於 src/background/index.ts 處理 AB_TEST_DATA 訊息，儲存至 tab 狀態
- [x] T027 [US1] 於 src/background/index.ts 處理 GET_STATE 訊息，回傳 PageState
- [x] T028 [US1] 建立 src/popup/main.ts 進入點，掛載 Vue App
- [x] T029 [US1] 建立 src/popup/App.vue 主元件，實作 chrome.runtime.sendMessage 取得狀態
- [x] T030 [US1] 建立 src/popup/components/ABTestList.vue 元件，顯示 A/B Test 清單
- [x] T031 [US1] 建立 src/popup/components/ABTestItem.vue 元件，顯示單一測試名稱與當前 case
- [x] T032 [US1] 於 src/popup/App.vue 實作載入中狀態（isLoading: true）
- [x] T033 [US1] 於 src/popup/App.vue 實作錯誤狀態顯示（error 訊息）
- [x] T034 [US1] 於 src/popup/App.vue 實作空清單訊息「目前沒有進行中的 A/B Test」
- [x] T035 [US1] 於 src/popup/App.vue 實作不支援網站訊息「此網站不支援」
- [x] T036 [US1] 建立 src/popup/style.css 基礎樣式（正體中文字型、寬度 350px）

**檢查點**: 完成後可在 sit/stage/production 環境觀測 A/B Test 清單

---

## Phase 4: 使用者故事 2 - 切換 A/B Test Case（優先順序: P1）

**目標**: 使用者可在 sit/stage 環境透過下拉選單切換 A/B Test case

**獨立測試**: 在 sit 環境選擇不同 case，頁面重載後應顯示對應測試情境

### 實作任務

- [x] T037 [US2] 於 src/popup/components/ABTestItem.vue 新增下拉選單（v-model 綁定）
- [x] T038 [US2] 於 src/popup/components/ABTestItem.vue 實作 @change 事件，發送 SET_CASE 訊息
- [x] T039 [US2] 於 src/background/index.ts 實作 setCookie() 函式（使用 chrome.cookies.set）
- [x] T040 [US2] 於 src/background/index.ts 處理 SET_CASE 訊息，設定 cookie 並重載頁面
- [x] T041 [US2] 於 src/utils/abtest.ts 實作 getCookieDomain() 依環境回傳正確 domain
- [x] T042 [US2] 於 src/background/index.ts 使用 chrome.tabs.reload() 觸發頁面重載

**檢查點**: 切換 case 後頁面重載，cookie 已設定，A/B Test 顯示新 case

---

## Phase 5: 使用者故事 3 - Production 唯讀模式（優先順序: P2）

**目標**: Production 環境下拉選單停用，僅供觀測

**獨立測試**: 在 www.kkday.com 開啟擴充功能，下拉選單應為 disabled 狀態

### 實作任務

- [x] T043 [US3] 於 src/popup/components/ABTestItem.vue 新增 props: isReadOnly
- [x] T044 [US3] 於 src/popup/components/ABTestList.vue 依據 environment 傳遞 isReadOnly
- [x] T045 [US3] 於 src/popup/components/ABTestItem.vue 實作 disabled 樣式與 cursor: not-allowed
- [x] T046 [US3] 於 src/popup/components/ABTestItem.vue 實作 tooltip 顯示「Production 環境僅供觀測」

**檢查點**: Production 環境下拉選單不可操作，顯示提示訊息

---

## Phase 6: 收尾與跨領域優化

**目的**: 整體優化與驗證

- [x] T047 [P] 執行 `pnpm build` 確認建置成功
- [x] T048 [P] 執行 `pnpm test` 確認所有測試通過
- [x] T049 [P] 執行 `pnpm lint` 確認無程式碼風格問題
- [x] T050 依據 quickstart.md 執行完整功能驗證
- [x] T051 [P] 更新 README.md 說明安裝與使用方式

---

## 依賴關係與執行順序

### 階段依賴

- **Phase 1（初始化）**: 無依賴，可立即開始
- **Phase 2（基礎建設）**: 依賴 Phase 1 完成，**阻塞所有使用者故事**
- **Phase 3（US1）**: 依賴 Phase 2 完成
- **Phase 4（US2）**: 依賴 Phase 3 完成（需要 Popup 基礎架構）
- **Phase 5（US3）**: 依賴 Phase 3 完成（需要 ABTestItem 元件）
- **Phase 6（收尾）**: 依賴所有使用者故事完成

### 使用者故事依賴

- **US1 (P1)**: 可在 Phase 2 完成後開始，無其他依賴
- **US2 (P1)**: 依賴 US1 完成（需要 Popup UI 基礎）
- **US3 (P2)**: 依賴 US1 完成（需要 ABTestItem 元件）
- **US2 與 US3 可並行開發**（由不同開發者）

### 各階段內並行機會

- Phase 1: T003-T006、T008 可並行
- Phase 2: T010-T013 可並行、T015/T017/T019 可並行
- Phase 6: T047-T049、T051 可並行

---

## 並行執行範例

```bash
# Phase 2 型別定義並行:
Task: "於 src/types/index.ts 新增 ABTestCase 與 ABTest 介面"
Task: "於 src/types/index.ts 新增 RawABTestData 介面"
Task: "於 src/types/index.ts 新增 PageState 介面"
Task: "於 src/types/index.ts 新增 Message Types"

# Phase 2 測試並行（在對應實作完成後）:
Task: "撰寫 detectEnvironment 單元測試於 tests/unit/environment.test.ts"
Task: "撰寫 parseABTestData 單元測試於 tests/unit/abtest.test.ts"
Task: "撰寫 buildCookieName 單元測試於 tests/unit/abtest.test.ts"
```

---

## 實作策略

### MVP 優先（僅 US1）

1. 完成 Phase 1: 初始化
2. 完成 Phase 2: 基礎建設
3. 完成 Phase 3: US1（觀測功能）
4. **停下來驗證**: 確認可在所有環境觀測 A/B Test
5. 可先部署/展示 MVP

### 增量交付

1. 完成 Setup + Foundational → 基礎就緒
2. 新增 US1 → 獨立測試 → 部署（MVP！）
3. 新增 US2 → 獨立測試 → 部署（切換功能）
4. 新增 US3 → 獨立測試 → 部署（Production 安全）
5. 每個故事都能獨立交付價值

---

## 備註

- [P] 任務 = 不同檔案、無依賴，可並行
- [Story] 標籤對應 spec.md 中的使用者故事
- 每個使用者故事可獨立完成與測試
- 每完成一個任務或邏輯群組後執行 commit
- 在檢查點停下來驗證功能正確性
- 避免：模糊任務、同檔案衝突、破壞獨立性的跨故事依賴
