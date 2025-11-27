# 資料模型：KKday A/B Test Chrome Extension

**日期**: 2025-11-26
**分支**: `001-ab-test-extension`

## 核心型別定義

### Environment（環境類型）

```typescript
type Environment = 'sit' | 'stage' | 'production' | 'unsupported';
```

| 值 | 說明 | 操作模式 |
|----|------|----------|
| `sit` | SIT 測試環境 | 可編輯 |
| `stage` | Stage 測試環境 | 可編輯 |
| `production` | 正式環境 | 唯讀 |
| `unsupported` | 不支援的網站 | 停用 |

---

### ABTestCase（A/B Test 案例）

```typescript
interface ABTestCase {
  key: string;      // case 識別碼，如 "control", "show_all"
  label: string;    // 顯示名稱（同 key）
}
```

---

### ABTest（A/B 測試）

```typescript
interface ABTest {
  key: string;              // 測試識別碼，如 "app_only_coupon_on_mweb_test"
  currentCase: string;      // 當前 case，如 "control"
  cases: ABTestCase[];      // 所有可用 cases
  data: unknown | null;     // 附加資料（目前未使用）
}
```

**來源對應**（`window.__INIT_STATE__.state.common.abTestData`）：

```typescript
// 原始資料結構
interface RawABTestData {
  [testKey: string]: {
    case: string;
    data: unknown | null;
    cases: {
      [caseKey: string]: string;
    };
  };
}

// 轉換範例
// 輸入：
{
  "app_only_coupon_on_mweb_test": {
    "case": "control",
    "data": null,
    "cases": {
      "control": "control",
      "show_all": "show_all"
    }
  }
}

// 輸出：
{
  key: "app_only_coupon_on_mweb_test",
  currentCase: "control",
  cases: [
    { key: "control", label: "control" },
    { key: "show_all", label: "show_all" }
  ],
  data: null
}
```

---

### PageState（頁面狀態）

```typescript
interface PageState {
  environment: Environment;
  url: string;
  abTests: ABTest[];
  isLoading: boolean;
  error: string | null;
}
```

| 欄位 | 說明 |
|------|------|
| `environment` | 當前頁面環境類型 |
| `url` | 當前頁面 URL |
| `abTests` | A/B Test 清單 |
| `isLoading` | 是否正在載入資料 |
| `error` | 錯誤訊息（若有） |

---

### Message Types（訊息類型）

擴充功能內部通訊使用的訊息格式：

```typescript
// Content Script → Background
interface ABTestDataMessage {
  type: 'AB_TEST_DATA';
  payload: {
    url: string;
    data: RawABTestData | null;
  };
}

// Popup → Background
interface GetStateMessage {
  type: 'GET_STATE';
  tabId: number;
}

// Popup → Background
interface SetCaseMessage {
  type: 'SET_CASE';
  payload: {
    testKey: string;
    caseValue: string;
    tabId: number;
  };
}

// Background → Popup
interface StateResponse {
  type: 'STATE_RESPONSE';
  payload: PageState;
}
```

---

## 狀態轉換

### 頁面載入流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Loading   │───▶│   Ready     │───▶│   Error     │
│ isLoading:  │    │ isLoading:  │    │ isLoading:  │
│   true      │    │   false     │    │   false     │
│ error: null │    │ error: null │    │ error: msg  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Case 切換流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Current    │───▶│  Setting    │───▶│  Reloading  │
│  Case: A    │    │  Cookie     │    │  Page       │
└─────────────┘    └─────────────┘    └─────────────┘
      │                                      │
      └──────────────────────────────────────┘
                 頁面重載後回到 Current
```

---

## Cookie 格式

### 命名規則

```
ab_test_override_<test_key>=<case_value>
```

### 範例

| Test Key | Case Value | Cookie |
|----------|------------|--------|
| `app_only_coupon_on_mweb_test` | `show_all` | `ab_test_override_app_only_coupon_on_mweb_test=show_all` |
| `home_page_shortcuts_test` | `experiment` | `ab_test_override_home_page_shortcuts_test=experiment` |

### Cookie 屬性

```typescript
interface CookieOptions {
  domain: string;    // 根據環境：".sit.kkday.com" / ".stage.kkday.com"
  path: '/';
  secure: true;
  sameSite: 'lax';
  // 無設定 expires，預設為 session cookie
}
```

---

## 驗證規則

### 環境判斷

| 規則 | 正則表達式 |
|------|-----------|
| SIT | `/^www(-\d+)?\.sit\.kkday\.com$/` |
| Stage | `hostname === 'www.stage.kkday.com'` |
| Production | `hostname === 'www.kkday.com'` |

### 資料驗證

- `RawABTestData` 必須為非 null 物件
- 每個測試項目必須包含 `case` 和 `cases` 欄位
- `cases` 必須為非空物件
