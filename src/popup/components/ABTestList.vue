<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ABTest, Environment, CaseChange } from '@/types';
import ABTestItem from './ABTestItem.vue';

const props = defineProps<{
  abTests: ABTest[];
  environment: Environment;
}>();

// 追蹤待提交的變更 Map<testKey, caseValue>
const pendingChanges = ref<Map<string, string>>(new Map());
const isSubmitting = ref(false);
const isClearing = ref(false);
const submitError = ref<string | null>(null);

// 計算有效變更數量（排除與原值相同的）
const effectiveChanges = computed(() => {
  const changes: CaseChange[] = [];
  pendingChanges.value.forEach((caseValue, testKey) => {
    const test = props.abTests.find((t) => t.key === testKey);
    if (test && test.currentCase !== caseValue) {
      changes.push({ testKey, caseValue });
    }
  });
  return changes;
});

const hasChanges = computed(() => effectiveChanges.value.length > 0);

// 依來源分組 A/B 測試（兼容舊版資料，無 source 視為 page）
const pageTests = computed(() => props.abTests.filter((t) => !t.source || t.source === 'page'));
const globalTests = computed(() => props.abTests.filter((t) => t.source === 'global'));

// 處理子元件的變更事件
function handleChange(testKey: string, caseValue: string) {
  const test = props.abTests.find((t) => t.key === testKey);
  if (!test) return;

  // 如果選擇的值與原值相同，移除 pending
  if (caseValue === test.currentCase) {
    pendingChanges.value.delete(testKey);
  } else {
    pendingChanges.value.set(testKey, caseValue);
  }
  // 觸發響應式更新
  pendingChanges.value = new Map(pendingChanges.value);
}

// 取得特定 test 的 pending 值
function getPendingValue(testKey: string): string | undefined {
  return pendingChanges.value.get(testKey);
}

// 提交所有變更
async function submitChanges() {
  if (!hasChanges.value || isSubmitting.value) return;

  isSubmitting.value = true;
  submitError.value = null;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      submitError.value = '無法取得當前分頁';
      return;
    }

    // 發送批次變更訊息
    const response = await chrome.runtime.sendMessage({
      type: 'SET_CASES',
      payload: {
        changes: effectiveChanges.value,
        tabId: tab.id,
      },
    });

    if (!response?.success) {
      submitError.value = response?.error || '套用變更失敗';
      isSubmitting.value = false;
    }
    // 成功後頁面會重載，popup 會關閉
  } catch (err) {
    console.error('提交變更失敗:', err);
    submitError.value = '發生錯誤，請重試';
    isSubmitting.value = false;
  }
}

// 清除所有 override cookie
async function clearOverrides() {
  if (isClearing.value || isSubmitting.value) return;

  isClearing.value = true;
  submitError.value = null;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      submitError.value = '無法取得當前分頁';
      isClearing.value = false;
      return;
    }

    await chrome.runtime.sendMessage({
      type: 'CLEAR_OVERRIDES',
      payload: { tabId: tab.id },
    });
    // 成功後頁面會重載，popup 會關閉
  } catch (err) {
    console.error('清除設定失敗:', err);
    submitError.value = '清除失敗，請重試';
    isClearing.value = false;
  }
}
</script>

<template>
  <div class="ab-test-list">
    <div class="list-header">
      <span class="count">共 {{ abTests.length }} 個測試</span>
      <span
        v-if="hasChanges"
        class="pending-count"
      >{{ effectiveChanges.length }} 項變更</span>
    </div>

    <div class="list-items">
      <!-- 頁面 A/B 測試區塊 -->
      <div
        v-if="pageTests.length > 0"
        class="test-section"
      >
        <div class="section-header">頁面 A/B 測試</div>
        <ABTestItem
          v-for="test in pageTests"
          :key="test.key"
          :ab-test="test"
          :is-read-only="environment === 'production'"
          :pending-value="getPendingValue(test.key)"
          @change="handleChange"
        />
      </div>

      <!-- 全域 A/B 測試區塊 -->
      <div
        v-if="globalTests.length > 0"
        class="test-section"
      >
        <div class="section-header">全域 A/B 測試</div>
        <ABTestItem
          v-for="test in globalTests"
          :key="test.key"
          :ab-test="test"
          :is-read-only="environment === 'production'"
          :pending-value="getPendingValue(test.key)"
          @change="handleChange"
        />
      </div>
    </div>

    <!-- 錯誤訊息 -->
    <div
      v-if="submitError"
      class="submit-error"
    >
      {{ submitError }}
    </div>

    <!-- 按鈕區域（非 production 環境才顯示） -->
    <div
      v-if="environment !== 'production'"
      class="button-area"
    >
      <button
        class="submit-btn primary"
        :class="{ loading: isSubmitting }"
        :disabled="!hasChanges || isSubmitting || isClearing"
        @click="submitChanges"
      >
        <template v-if="isSubmitting">
          <span class="btn-spinner" />
          <span>套用中...</span>
        </template>
        <span v-else>{{ hasChanges ? `套用 ${effectiveChanges.length} 項變更` : '選擇要變更的項目' }}</span>
      </button>

      <button
        class="submit-btn secondary"
        :class="{ loading: isClearing }"
        :disabled="isSubmitting || isClearing"
        @click="clearOverrides"
      >
        <template v-if="isClearing">
          <span class="btn-spinner" />
          <span>清除中...</span>
        </template>
        <span v-else>清除設定</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ab-test-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.count {
  font-size: 12px;
  color: #9E9E9E;
}

.pending-count {
  font-size: 12px;
  color: #FF5722;
  font-weight: 500;
}

.list-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.test-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  padding: 4px 0;
  border-bottom: 1px solid #EEEEEE;
  margin-bottom: 4px;
}

.submit-error {
  padding: 8px 12px;
  background: #FFEBEE;
  color: #C62828;
  border-radius: 6px;
  font-size: 12px;
  margin-top: 8px;
}

.button-area {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #EEEEEE;
  display: flex;
  gap: 8px;
}

.submit-btn {
  flex: 1;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn.primary {
  color: white;
  background: linear-gradient(135deg, #FF5722, #FF7043);
}

.submit-btn.secondary {
  flex: 0 0 auto;
  color: #666;
  background: #F5F5F5;
  border: 1px solid #E0E0E0;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.submit-btn.primary:disabled {
  background: #E0E0E0;
  color: #9E9E9E;
  cursor: not-allowed;
}

.submit-btn.secondary:disabled {
  background: #FAFAFA;
  color: #BDBDBD;
  cursor: not-allowed;
}

.submit-btn.primary.loading {
  background: #FF8A65;
}

.submit-btn.secondary.loading {
  background: #EEEEEE;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
