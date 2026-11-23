<script setup lang="ts">
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue';
import type { Mode, SessionResult } from '../../domain/models';
import { PASS_ACCURACY } from '../../domain/models';
import { formatDuration } from '../../domain/stats';
import Icon from '../../shell/Icon.vue';

const props = defineProps<{
  result: SessionResult;
  mode: Mode;
  saving: boolean;
  message: string;
  previousBest: number | null;
  hasNext: boolean;
}>();
const emit = defineEmits<{ next: []; retry: []; leave: [] }>();
const panel = useTemplateRef<HTMLElement>('panel');
const primary = useTemplateRef<HTMLButtonElement>('primary');

const passed = computed(() => props.mode !== 'lesson' || props.result.accuracy >= PASS_ACCURACY);
const heading = computed(() => passed.value ? 'Session complete' : 'Almost there');
const nextLabel = computed(() => ({
  lesson: props.hasNext ? 'Next lesson' : 'Back to lessons',
  adaptive: 'New drill',
  test: 'New test',
  custom: 'New text',
})[props.mode]);
const best = computed(() => {
  if (props.previousBest === null) return 'First result';
  const difference = Math.round(props.result.wpm - props.previousBest);
  return difference > 0 ? `New best · +${difference} wpm` : `Best ${Math.round(props.previousBest)} wpm`;
});
const troubleKeys = computed(() => props.result.keys.filter(key => key.misses > 0)
  .sort((a, b) => b.misses - a.misses).slice(0, 6));
const details = computed(() => [
  { label: 'Raw speed', value: `${props.result.rawWpm} wpm` },
  { label: 'Time', value: formatDuration(props.result.durationMs) },
  { label: 'Characters', value: String(props.result.characters) },
  { label: 'Mistakes', value: String(props.result.errors) },
]);

function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !props.saving) {
    event.preventDefault();
    emit('retry');
  }
}

onMounted(() => panel.value?.focus());
watch(() => props.saving, async saving => {
  if (saving) return;
  await nextTick();
  if (!document.activeElement || document.activeElement === document.body || document.activeElement === panel.value) {
    primary.value?.focus();
  }
}, { immediate: true });
</script>

<template>
  <section ref="panel" class="result card" tabindex="-1" aria-labelledby="result-title" @keydown="keydown">
    <header class="result-header">
      <div>
        <h2 id="result-title">{{ heading }}</h2>
        <p v-if="!passed" class="muted">Reach {{ PASS_ACCURACY }}% accuracy to pass this lesson.</p>
      </div>
      <span class="best" :class="{ improved: best.startsWith('New') }">{{ best }}</span>
    </header>
    <div class="headline">
      <div class="figure"><span class="value">{{ result.wpm }}</span><span class="unit">wpm</span></div>
      <div class="figure" :class="{ low: !passed }"><span class="value">{{ result.accuracy }}%</span><span class="unit">accuracy</span></div>
    </div>
    <dl class="details">
      <div v-for="item in details" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div>
    </dl>
    <div v-if="troubleKeys.length" class="trouble">
      <span class="eyebrow">Missed keys</span>
      <div class="key-row">
        <span v-for="key in troubleKeys" :key="key.key" class="trouble-key">
          <kbd>{{ key.key === ' ' ? 'Space' : key.key }}</kbd><small>×{{ key.misses }}</small>
        </span>
      </div>
    </div>
    <p class="status" role="status">{{ message }}</p>
    <div class="actions">
      <button ref="primary" class="btn btn-primary btn-lg" :disabled="saving" @click="emit('next')">{{ nextLabel }}</button>
      <button class="btn btn-secondary btn-lg" :disabled="saving" @click="emit('retry')">
        <Icon name="restart" />Practice again
      </button>
      <span class="hint"><kbd>Enter</kbd> continue · <kbd>Esc</kbd> again</span>
    </div>
  </section>
</template>

<style scoped>
.result { display: flex; flex-direction: column; gap: 22px; padding: 28px; outline: none; }
.result-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.result-header h2 { font-size: 1.35rem; }

.best {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 650;
  white-space: nowrap;
}

.best.improved { background: var(--accent-soft); color: var(--accent-strong); }

.headline { display: flex; gap: 48px; flex-wrap: wrap; }
.figure { display: flex; align-items: baseline; gap: 8px; }
.figure .value { font-size: 3.4rem; font-weight: 750; letter-spacing: -0.04em; line-height: 1; font-variant-numeric: tabular-nums; }
.figure .unit { color: var(--muted); font-weight: 600; }
.figure.low .value { color: var(--warning); }

.details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
  margin: 0;
}

.details div { padding: 12px 14px; border-radius: var(--radius-sm); background: var(--surface-2); }
.details dt { font-size: 0.78rem; color: var(--muted); font-weight: 600; }
.details dd { margin: 2px 0 0; font-size: 1.1rem; font-weight: 700; font-variant-numeric: tabular-nums; }

.trouble { display: flex; flex-direction: column; gap: 8px; }
.trouble-key { display: inline-flex; align-items: center; gap: 4px; }
.trouble-key kbd { font-size: 0.95rem; }
.trouble-key small { color: var(--danger); font-weight: 650; }

.status { color: var(--muted); font-size: 0.9rem; min-height: 1.4em; }
.actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.hint { margin-left: auto; color: var(--faint); font-size: 0.82rem; }
</style>
