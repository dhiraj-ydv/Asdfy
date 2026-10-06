<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Score } from '../../domain/models';

defineProps<{ score: Score; saving: boolean; message: string }>();
const emit = defineEmits<{ next: []; again: [] }>();
const dialog = ref<HTMLElement | null>(null);
onMounted(() => dialog.value?.focus());
function trapTab(event: KeyboardEvent) {
  if (event.key !== 'Tab') return;
  const buttons = Array.from(dialog.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
  if (!buttons.length) { event.preventDefault(); return; }
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  event.preventDefault();
  buttons[(index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus();
}
</script>

<template>
  <div class="stats-overlay">
    <div ref="dialog" class="stats-modal card" role="dialog" aria-modal="true" aria-labelledby="result-title" tabindex="-1" @keydown="trapTab">
      <div class="success-icon">🎉</div><h2 id="result-title">Well Done!</h2>
      <p role="status">{{ message }}</p>
      <div class="final-stats-grid">
        <div class="stat-item"><label>Speed</label><div class="value">{{ score.wpm }} <small>WPM</small></div></div>
        <div class="stat-item"><label>Accuracy</label><div class="value">{{ score.accuracy }}%</div></div>
      </div>
      <div class="modal-actions">
        <button :disabled="saving" @click="emit('next')">Next Lesson</button>
        <button :disabled="saving" class="secondary" @click="emit('again')">Practice Again</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-overlay { position: absolute; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 150; }
.stats-modal { text-align: center; width: 100%; max-width: 400px; }
.final-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
.stat-item { background: var(--bg-color); padding: 15px; border-radius: 10px; }
.stat-item label { font-size: 0.7rem; color: var(--text-muted); }
.stat-item .value { font-size: 1.5rem; font-weight: 800; }
.modal-actions { display: flex; flex-direction: column; gap: 10px; }
</style>
