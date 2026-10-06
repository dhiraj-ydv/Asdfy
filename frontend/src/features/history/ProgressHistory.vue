<script setup lang="ts">
import type { Progress } from '../../domain/models';
defineProps<{ entries: Progress[]; loading: boolean; error: string; hasMore: boolean }>();
const emit = defineEmits<{ retry: []; more: [] }>();
</script>

<template>
  <div class="history-view-content">
    <div class="card">
      <h2>Your History</h2>
      <p v-if="loading" role="status">Loading progress…</p>
      <div v-if="error" role="alert"><p>{{ error }}</p><button :disabled="loading" @click="emit('retry')">Retry loading</button></div>
      <div class="history-table-wrapper">
        <table class="history-table">
          <thead><tr><th>Date</th><th>WPM</th><th>Accuracy</th></tr></thead>
          <tbody><tr v-for="entry in entries" :key="entry.id">
            <td>{{ new Date(entry.completed_at).toLocaleDateString() }}</td>
            <td class="wpm-val">{{ entry.wpm }}</td><td class="acc-val">{{ entry.accuracy }}%</td>
          </tr></tbody>
        </table>
        <p v-if="!entries.length && !loading && !error">No completed lessons yet.</p>
        <button v-if="hasMore" :disabled="loading" @click="emit('more')">Load older results</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-view-content { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 20px; }
.history-table-wrapper { overflow-x: auto; }
.history-table { width: 100%; border-collapse: collapse; }
.history-table th { text-align: left; padding: 10px; color: var(--text-muted); font-size: 0.8rem; }
.history-table td { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.wpm-val { color: var(--primary-color); font-weight: 700; }
.acc-val { color: var(--accent-color); font-weight: 700; }
</style>
