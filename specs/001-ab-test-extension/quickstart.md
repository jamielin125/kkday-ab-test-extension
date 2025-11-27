# 快速開始：KKday A/B Test Chrome Extension

## 前置需求

- Node.js 18+
- pnpm（建議）或 npm
- Chrome 瀏覽器

## 安裝與建置

```bash
# 1. 安裝依賴
pnpm install

# 2. 開發模式（含 HMR）
pnpm dev

# 3. 建置正式版本
pnpm build
```

## 載入擴充功能至 Chrome

1. 開啟 Chrome，前往 `chrome://extensions/`
2. 開啟右上角「開發人員模式」
3. 點擊「載入未封裝項目」
4. 選擇專案的 `dist` 資料夾

## 使用方式

### 觀測 A/B Test 狀態

1. 前往任一 KKday 網站（sit/stage/production）
2. 點擊瀏覽器工具列的擴充功能圖示
3. 查看當前頁面的所有 A/B Test 及其 case

### 切換 A/B Test Case（僅限 sit/stage）

1. 在 sit 或 stage 環境開啟擴充功能
2. 找到要測試的 A/B Test
3. 從下拉選單選擇目標 case
4. 頁面會自動重新載入並套用新的 case

## 開發指令

```bash
# 執行單元測試
pnpm test

# 執行測試（監聽模式）
pnpm test:watch

# 型別檢查
pnpm typecheck

# 程式碼檢查
pnpm lint
```

## 專案結構

```
src/
├── manifest.json        # 擴充功能設定
├── popup/               # 彈出視窗 UI
├── content/             # 內容腳本（讀取頁面資料）
├── background/          # 背景服務（處理 cookie）
├── types/               # TypeScript 型別
└── utils/               # 共用工具函式
```

## 驗證功能

### 測試環境識別

| 網址 | 預期環境 | 可否切換 |
|------|----------|----------|
| www.sit.kkday.com | SIT | ✅ |
| www-05.sit.kkday.com | SIT | ✅ |
| www.stage.kkday.com | Stage | ✅ |
| www.kkday.com | Production | ❌（唯讀） |

### 驗證 Cookie 設定

切換 case 後，可在 Chrome DevTools → Application → Cookies 查看：

```
名稱: ab_test_override_<test_key>
值: <selected_case>
網域: .sit.kkday.com（或 .stage.kkday.com）
```

## 常見問題

### Q: 擴充功能顯示「此網站不支援」

確認您正在瀏覽 KKday 網站（sit/stage/production 環境）。

### Q: 切換 case 後沒有效果

1. 確認 cookie 已正確設定（DevTools → Application → Cookies）
2. 確認 KKday Web 支援該 A/B Test 的 cookie 覆寫機制

### Q: 看不到任何 A/B Test

頁面可能尚未載入完成，或該頁面沒有進行中的 A/B Test。
