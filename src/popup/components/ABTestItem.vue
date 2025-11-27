<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { ABTest } from '@/types';

const props = defineProps<{
  abTest: ABTest;
  isReadOnly?: boolean;
  pendingValue?: string; // 來自父元件的 pending 值
}>();

const emit = defineEmits<{
  change: [testKey: string, caseValue: string];
}>();

const selectedCase = ref(props.abTest.currentCase);

// 當 pendingValue 變化時同步（用於顯示 pending 狀態）
watch(
  () => props.pendingValue,
  (newVal) => {
    if (newVal !== undefined) {
      selectedCase.value = newVal;
    }
  }
);

// 當 abTest.currentCase 變化時重置（頁面重載後）
watch(
  () => props.abTest.currentCase,
  (newVal) => {
    selectedCase.value = newVal;
  }
);

// 格式化測試名稱：將 snake_case 轉換為更易讀的格式
const displayName = computed(() => {
  return props.abTest.key
    .replace(/_test$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
});

// 是否有待提交的變更
const hasChange = computed(() => {
  return selectedCase.value !== props.abTest.currentCase;
});

// 處理 case 變更 - 只通知父元件，不直接發送訊息
function handleCaseChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const newCase = target.value;

  emit('change', props.abTest.key, newCase);
}
</script>

<template>
  <div
    class="ab-test-item"
    :class="{ 'read-only': isReadOnly, 'has-change': hasChange }"
  >
    <div class="item-header">
      <span
        class="test-name"
        :title="abTest.key"
      >{{ displayName }}</span>
      <span class="test-key">{{ abTest.key }}</span>
    </div>

    <div class="item-control">
      <select
        v-model="selectedCase"
        :disabled="isReadOnly"
        class="case-select"
        :title="isReadOnly ? 'Production 環境僅供觀測' : '選擇 A/B Test case'"
        @change="handleCaseChange"
      >
        <option
          v-for="testCase in abTest.cases"
          :key="testCase.key"
          :value="testCase.key"
        >
          {{ testCase.label }}
        </option>
      </select>

      <!-- 變更指示器 -->
      <span
        v-if="hasChange"
        class="change-indicator"
        title="待套用變更"
      >●</span>
    </div>

    <!-- Production 環境提示 -->
    <div
      v-if="isReadOnly"
      class="read-only-hint"
    >
      🔒 Production 環境僅供觀測
    </div>
  </div>
</template>

<style scoped>
.ab-test-item {
  padding: 12px;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  background: white;
  transition: border-color 0.2s;
}

.ab-test-item:hover {
  border-color: #BDBDBD;
}

.ab-test-item.read-only {
  background: #FAFAFA;
}

.item-header {
  margin-bottom: 8px;
}

.test-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #212121;
  margin-bottom: 2px;
}

.test-key {
  display: block;
  font-size: 11px;
  color: #9E9E9E;
  font-family: monospace;
  word-break: break-all;
}

.item-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.case-select {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid #E0E0E0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.case-select:hover:not(:disabled) {
  border-color: #FF5722;
}

.case-select:focus {
  outline: none;
  border-color: #FF5722;
  box-shadow: 0 0 0 2px rgba(255, 87, 34, 0.1);
}

.case-select:disabled {
  background: #F5F5F5;
  cursor: not-allowed;
  opacity: 0.7;
}

.change-indicator {
  color: #FF5722;
  font-size: 12px;
  animation: pulse 1s ease-in-out infinite;
}

.has-change {
  border-color: #FF5722;
  background: #FFF8F6;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.read-only-hint {
  margin-top: 8px;
  font-size: 11px;
  color: #9E9E9E;
}
</style>
