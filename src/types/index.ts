// T009: Environment 型別
export type Environment = 'sit' | 'stage' | 'production' | 'unsupported';

// T010: ABTestCase 與 ABTest 介面
export interface ABTestCase {
  key: string;
  label: string;
}

export interface ABTest {
  key: string;
  currentCase: string;
  cases: ABTestCase[];
  data: unknown | null;
}

// T011: RawABTestData 介面（頁面原始資料格式）
export interface RawABTestData {
  [testKey: string]: {
    case: string;
    data: unknown | null;
    cases: {
      [caseKey: string]: string;
    };
  };
}

// T012: PageState 介面
export interface PageState {
  environment: Environment;
  url: string;
  abTests: ABTest[];
  isLoading: boolean;
  error: string | null;
}

// T013: Message Types
export interface ABTestDataMessage {
  type: 'AB_TEST_DATA';
  payload: {
    url: string;
    data: RawABTestData | null;
  };
}

export interface GetStateMessage {
  type: 'GET_STATE';
  tabId: number;
}

export interface SetCaseMessage {
  type: 'SET_CASE';
  payload: {
    testKey: string;
    caseValue: string;
    tabId: number;
  };
}

// Phase 3: 批次設定多個 A/B Test
export interface CaseChange {
  testKey: string;
  caseValue: string;
}

export interface SetCasesMessage {
  type: 'SET_CASES';
  payload: {
    changes: CaseChange[];
    tabId: number;
  };
}

export interface ClearOverridesMessage {
  type: 'CLEAR_OVERRIDES';
  payload: {
    tabId: number;
  };
}

export interface StateResponse {
  type: 'STATE_RESPONSE';
  payload: PageState;
}

export type ExtensionMessage =
  | ABTestDataMessage
  | GetStateMessage
  | SetCaseMessage
  | SetCasesMessage
  | ClearOverridesMessage
  | StateResponse;
