# KKday A/B Test Chrome Extension

觀測與切換 KKday 網站 A/B Test 狀態的 Chrome 擴充功能。

## 功能

- **觀測 A/B Test 狀態**: 在 KKday 任一環境 (SIT/Stage/Production) 查看當前所有 A/B Test 清單與狀態
- **切換 A/B Test Case**: 在 SIT 與 Stage 環境透過下拉選單切換 A/B Test case
- **Production 唯讀模式**: Production 環境僅供觀測，無法切換 case

## 支援環境

| 環境 | URL 格式 | 功能 |
|------|----------|------|
| SIT | `www*.sit.kkday.com` | 觀測 + 切換 |
| Stage | `www.stage.kkday.com` | 觀測 + 切換 |
| Production | `www.kkday.com` | 僅觀測 |

## 系統需求

- **Node.js**: >= 22
- **pnpm**: 建議使用

```bash
# 使用 nvm 切換 Node 版本
nvm use
```

## 安裝

### 開發模式

```bash
# 安裝依賴
pnpm install

# 啟動開發伺服器
pnpm dev
```

1. 開啟 Chrome，前往 `chrome://extensions/`
2. 開啟右上角「開發人員模式」
3. 點擊「載入未封裝項目」
4. 選擇專案的 `dist` 資料夾

### 建置

```bash
pnpm build
```

建置完成後，`dist` 資料夾即可作為 Chrome 擴充功能載入。

## 開發指令

```bash
pnpm dev        # 啟動開發伺服器
pnpm build      # 建置生產版本
pnpm test       # 執行單元測試
pnpm lint       # 執行程式碼檢查
pnpm format     # 格式化程式碼
```

## 技術棧

- Vue 3 + TypeScript
- Vite + CRXJS
- Chrome Extension Manifest V3
- Vitest

## 使用方式

1. 安裝擴充功能
2. 前往 KKday 網站 (SIT/Stage/Production)
3. 點擊工具列的擴充功能圖示
4. 查看當前頁面的 A/B Test 清單
5. 在 SIT/Stage 環境可透過下拉選單切換 case

## 授權

MIT
