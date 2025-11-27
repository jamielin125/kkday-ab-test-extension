<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { PageState } from '@/types';
import ABTestList from './components/ABTestList.vue';

const state = ref<PageState | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    // 取得當前 tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      error.value = '無法取得當前分頁資訊';
      isLoading.value = false;
      return;
    }

    // 向 Background 請求狀態
    const response = await chrome.runtime.sendMessage({
      type: 'GET_STATE',
      tabId: tab.id,
    });

    if (response?.type === 'STATE_RESPONSE') {
      state.value = response.payload;
    } else {
      error.value = '無法取得頁面狀態';
    }
  } catch (err) {
    error.value = '發生錯誤，請重新整理頁面後再試';
    console.error('KKday A/B Test Extension:', err);
  } finally {
    isLoading.value = false;
  }
});

// 環境顯示名稱
const environmentLabel = {
  sit: 'SIT 測試環境',
  stage: 'Stage 測試環境',
  production: 'Production 正式環境',
  unsupported: '不支援的網站',
};
</script>

<template>
  <div class="popup-container">
    <header class="header">
      <h1>KKday A/B Test</h1>
    </header>

    <main class="content">
      <!-- T032: 載入中狀態 -->
      <div
        v-if="isLoading"
        class="status-message loading"
      >
        <span class="spinner" />
        <span>載入中...</span>
      </div>

      <!-- T033: 錯誤狀態 -->
      <div
        v-else-if="error"
        class="status-message error"
      >
        <span class="icon">⚠️</span>
        <span>{{ error }}</span>
      </div>

      <!-- T035: 不支援網站 -->
      <div
        v-else-if="state?.environment === 'unsupported'"
        class="status-message unsupported"
      >
        <span class="icon">🚫</span>
        <span>此網站不支援</span>
      </div>

      <!-- 正常顯示 -->
      <template v-else-if="state">
        <div
          class="environment-badge"
          :class="state.environment"
        >
          {{ environmentLabel[state.environment] }}
        </div>

        <!-- T034: 空清單訊息 -->
        <div
          v-if="state.abTests.length === 0"
          class="status-message empty"
        >
          <span class="icon">📋</span>
          <span>目前沒有進行中的 A/B Test</span>
        </div>

        <!-- A/B Test 清單 -->
        <ABTestList
          v-else
          :ab-tests="state.abTests"
          :environment="state.environment"
        />
      </template>
    </main>

    <footer class="footer">
      <small>KKday A/B Test Extension v1.0.0</small>
    </footer>
  </div>
</template>

<style scoped>
.popup-container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.header {
  padding: 12px 16px;
  background: linear-gradient(135deg, #FF5722, #FF7043);
  color: white;
}

.header h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.content {
  flex: 1;
  padding: 16px;
}

.environment-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 12px;
}

.environment-badge.sit {
  background: #E3F2FD;
  color: #1565C0;
}

.environment-badge.stage {
  background: #FFF3E0;
  color: #E65100;
}

.environment-badge.production {
  background: #FFEBEE;
  color: #C62828;
}

.status-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 8px;
  font-size: 14px;
}

.status-message.loading {
  background: #F5F5F5;
  color: #666;
}

.status-message.error {
  background: #FFEBEE;
  color: #C62828;
}

.status-message.empty {
  background: #F5F5F5;
  color: #666;
}

.status-message.unsupported {
  background: #ECEFF1;
  color: #546E7A;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #E0E0E0;
  border-top-color: #FF5722;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.icon {
  font-size: 18px;
}

.footer {
  padding: 8px 16px;
  text-align: center;
  color: #9E9E9E;
  font-size: 11px;
  border-top: 1px solid #EEEEEE;
}
</style>
