# 功能規格：KKday A/B Test Chrome Extension

**功能分支**: `001-ab-test-extension`
**建立日期**: 2025-11-26
**狀態**: 草稿
**輸入**: 使用者需求描述

## 釐清事項

### Session 2025-11-26

- Q: 使用者切換的 case 設定應該在什麼範圍內持久化？ → A: 依環境類型儲存（sit/stage 各自獨立，瀏覽器重啟後仍有效）。切換機制透過設定 cookie 實現，格式為 `ab_test_override_<ab_test_key>=<case_value>`，KKday Web 會讀取此 cookie 決定 A/B Test case。

## 使用者情境與測試

### 使用者故事 1 - 觀測當前 A/B Test 狀態（優先順序: P1）

使用者在任何 KKday 環境（sit/stage/production）瀏覽網頁時，希望能快速查看當前頁面上所有 A/B Test 的狀態，包含測試名稱與當前分組（case）。

**優先順序理由**: 這是擴充功能的核心價值，無論在哪個環境都需要能觀測 A/B Test 狀態。

**獨立測試**: 安裝擴充功能後，在任一 KKday 網站開啟擴充功能面板，即可看到當前所有 A/B Test 清單。

**接受情境**:

1. **Given** 使用者已安裝擴充功能並瀏覽 KKday 網站，**When** 點擊擴充功能圖示，**Then** 顯示當前頁面所有 A/B Test 名稱與對應的 case
2. **Given** 頁面上沒有任何 A/B Test，**When** 點擊擴充功能圖示，**Then** 顯示「目前沒有進行中的 A/B Test」訊息
3. **Given** 使用者瀏覽非 KKday 網站，**When** 點擊擴充功能圖示，**Then** 顯示「此網站不支援」訊息

---

### 使用者故事 2 - 在測試環境切換 A/B Test Case（優先順序: P1）

使用者在 sit 或 stage 測試環境時，希望能自由切換任一 A/B Test 的 case，以便測試不同情境的畫面與行為。

**優先順序理由**: 這是 QA 與開發人員的核心需求，能大幅提升測試效率。

**獨立測試**: 在 sit 環境開啟擴充功能，選擇某個 A/B Test 並從下拉選單切換 case，頁面應重新載入並顯示對應的測試情境。

**接受情境**:

1. **Given** 使用者在 sit 環境（如 www.sit.kkday.com），**When** 在擴充功能中選擇某 A/B Test 的不同 case，**Then** 頁面重新載入並套用該 case
2. **Given** 使用者在 stage 環境（www.stage.kkday.com），**When** 在擴充功能中選擇某 A/B Test 的不同 case，**Then** 頁面重新載入並套用該 case
3. **Given** 使用者切換 case 後，**When** 重新整理頁面，**Then** 選擇的 case 應維持不變（直到使用者再次切換或清除設定）

---

### 使用者故事 3 - Production 環境唯讀模式（優先順序: P2）

使用者在 production 環境時，擴充功能僅提供觀測功能，禁止切換 case，以避免影響真實使用者體驗資料。

**優先順序理由**: 確保 production 資料完整性，避免誤操作。

**獨立測試**: 在 www.kkday.com 開啟擴充功能，確認所有 A/B Test 的下拉選單為停用狀態。

**接受情境**:

1. **Given** 使用者在 production 環境（www.kkday.com），**When** 點擊擴充功能圖示，**Then** 顯示所有 A/B Test 但下拉選單為停用狀態
2. **Given** 使用者在 production 環境，**When** 嘗試點擊下拉選單，**Then** 顯示「Production 環境僅供觀測」提示

---

### 邊界情況

- 頁面尚未完全載入時，A/B Test 資料可能尚未就緒，擴充功能應顯示載入中狀態
- 若 `window.__INIT_STATE__.state.common.abTestData` 不存在或格式錯誤，顯示適當的錯誤訊息
- 使用者在多個分頁開啟不同 KKday 頁面時，各分頁的 A/B Test 狀態應獨立顯示

## 需求

### 功能需求

- **FR-001**: 擴充功能 MUST 能識別當前網站屬於 sit、stage 或 production 環境
  - sit 環境：符合 `www*.sit.kkday.com` 模式（如 www.sit.kkday.com、www-05.sit.kkday.com、www-202.sit.kkday.com）
  - stage 環境：符合 `www.stage.kkday.com`
  - production 環境：符合 `www.kkday.com`

- **FR-002**: 擴充功能 MUST 能從頁面讀取 `window.__INIT_STATE__.state.common.abTestData` 物件

- **FR-003**: 擴充功能 MUST 顯示所有 A/B Test 的名稱與當前 case

- **FR-004**: 在 sit/stage 環境，擴充功能 MUST 提供下拉選單讓使用者選擇任一 case

- **FR-005**: 在 production 環境，擴充功能 MUST 停用下拉選單，僅供觀測

- **FR-006**: 使用者切換 case 後，擴充功能 MUST 設定對應的 cookie（格式：`ab_test_override_<ab_test_key>=<case_value>`），並觸發頁面重新載入以套用新設定

- **FR-007**: 擴充功能 MUST 依環境類型（sit/stage）獨立儲存使用者的 case 選擇，設定在瀏覽器重啟後仍有效（透過 cookie 持久化）

- **FR-008**: 擴充功能介面 MUST 使用正體中文顯示所有文字

### 關鍵實體

- **A/B Test**: 代表單一 A/B 測試，包含測試名稱（key）、當前 case、所有可用 cases
- **環境類型**: sit、stage、production 三種，決定擴充功能的操作模式（可編輯/唯讀）
- **使用者選擇**: 使用者在測試環境中選擇的 case 設定，需持久化儲存

## 成功標準

### 可量測成果

- **SC-001**: 使用者能在 3 秒內查看當前頁面所有 A/B Test 狀態
- **SC-002**: 使用者能在 5 秒內完成 case 切換並看到頁面更新
- **SC-003**: 擴充功能正確識別環境類型的準確率達 100%
- **SC-004**: 使用者在測試環境的 case 選擇能在瀏覽器重啟後維持

## 假設

- 使用者已具備 KKday 內部測試環境的存取權限
- `window.__INIT_STATE__.state.common.abTestData` 資料結構穩定，不會頻繁變動
- 使用者使用 Chrome 瀏覽器（支援 Manifest V3）
- KKday Web 會讀取 `ab_test_override_<ab_test_key>` 格式的 cookie 來覆寫 A/B Test case
