<script setup lang="ts">
import { computed } from 'vue';
import type { Progress, Summary } from '../../domain/models';
import { MODE_LABELS } from '../../domain/models';
import { weakKeys } from '../../domain/generator';
import { average, formatDuration, keyAccuracy, keySpeed, streak } from '../../domain/stats';
import KeyboardGuide from '../practice/KeyboardGuide.vue';
import TrendChart from './TrendChart.vue';
import ActivityGrid from './ActivityGrid.vue';

const props = defineProps<{ summary: Summary; history: Progress[]; loading: boolean; error: string; hasMore: boolean }>();
const emit = defineEmits<{ retry: []; more: [] }>();

const recent = computed(() => props.history.slice(0, 10));
const trend = computed(() => props.history.slice(0, 50).reverse());
const measured = computed(() => props.summary.keys.filter(stat => stat.hits + stat.misses >= 15 && stat.key !== ' '));
const tiles = computed(() => [
  { label: 'Sessions', value: props.summary.sessions.toLocaleString() },
  { label: 'Practice time', value: formatDuration(props.summary.duration_ms) },
  { label: 'Best speed', value: `${Math.round(props.summary.best_wpm)} wpm` },
  { label: 'Recent speed', value: recent.value.length ? `${average(recent.value.map(entry => entry.wpm))} wpm` : '–' },
  { label: 'Recent accuracy', value: recent.value.length ? `${average(recent.value.map(entry => entry.accuracy))}%` : '–' },
  { label: 'Day streak', value: String(streak(props.summary.days)) },
]);
/** 20% misses or worse shows as fully red. */
const heat = computed(() => Object.fromEntries(measured.value.map(stat =>
  [stat.key, Math.min(1, stat.misses / (stat.hits + stat.misses) * 5)])));
const titles = computed(() => Object.fromEntries(props.summary.keys.map(stat =>
  [stat.key, `${keyAccuracy(stat)}% accurate · ${keySpeed(stat) ?? '–'} ms · ${stat.hits + stat.misses} presses`])));
const weakest = computed(() => {
  const byKey = new Map(measured.value.map(stat => [stat.key, stat]));
  return weakKeys(measured.value, measured.value.map(stat => stat.key).join(''), 6)
    .map(key => byKey.get(key)!)
    .filter(Boolean);
});

function when(entry: Progress): string {
  const date = new Date(entry.completed_at);
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>Statistics</h1>
      <p>Everything is stored locally on this computer.</p>
    </header>

    <div class="tiles">
      <div v-for="tile in tiles" :key="tile.label" class="card tile">
        <span class="eyebrow">{{ tile.label }}</span><strong>{{ tile.value }}</strong>
      </div>
    </div>

    <div v-if="trend.length > 1" class="charts">
      <div class="card"><TrendChart label="Speed" unit="wpm" :values="trend.map(entry => entry.wpm)" :min="0" /></div>
      <div class="card"><TrendChart label="Accuracy" unit="%" :values="trend.map(entry => entry.accuracy)" :max="100" /></div>
    </div>

    <div class="card keys">
      <header class="card-header">
        <h2>Key accuracy</h2>
        <p class="muted">Redder keys are missed more often. Hover a key for details.</p>
      </header>
      <KeyboardGuide :heat="heat" :titles="titles" />
      <div v-if="weakest.length" class="weakest">
        <span class="eyebrow">Weakest keys</span>
        <ul>
          <li v-for="stat in weakest" :key="stat.key">
            <kbd>{{ stat.key }}</kbd><span>{{ keyAccuracy(stat) }}%</span><small>{{ keySpeed(stat) ?? '–' }} ms</small>
          </li>
        </ul>
      </div>
      <p v-else class="muted">Complete a few sessions to see per-key results.</p>
    </div>

    <div class="card">
      <header class="card-header"><h2>Activity</h2></header>
      <ActivityGrid :days="summary.days" />
    </div>

    <div class="card">
      <header class="card-header"><h2>Recent sessions</h2></header>
      <p v-if="loading && !history.length" role="status" class="muted">Loading sessions…</p>
      <div v-if="error" class="inline-error" role="alert">
        <p>{{ error }}</p><button class="btn btn-secondary" :disabled="loading" @click="emit('retry')">Retry</button>
      </div>
      <p v-if="!history.length && !loading && !error" class="muted">No sessions yet. Finish a lesson to start your history.</p>
      <div v-if="history.length" class="table-wrap">
        <table>
          <caption class="visually-hidden">Recent sessions</caption>
          <thead><tr><th scope="col">When</th><th scope="col">Session</th><th scope="col" class="num">Speed</th>
            <th scope="col" class="num">Accuracy</th><th scope="col" class="num">Time</th></tr></thead>
          <tbody>
            <tr v-for="entry in history" :key="entry.id">
              <td class="muted">{{ when(entry) }}</td>
              <td>{{ entry.lesson_title ?? MODE_LABELS[entry.mode] }}</td>
              <td class="num strong">{{ Math.round(entry.wpm) }} wpm</td>
              <td class="num">{{ Math.round(entry.accuracy) }}%</td>
              <td class="num muted">{{ entry.duration_ms ? formatDuration(entry.duration_ms) : '–' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button v-if="hasMore" class="btn btn-secondary more" :disabled="loading" @click="emit('more')">Load older sessions</button>
    </div>
  </section>
</template>

<style scoped>
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.tile { display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; }
.tile strong { font-size: 1.45rem; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }

.charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }

.card-header { display: flex; flex-direction: column; gap: 4px; margin-bottom: 18px; }
.card-header p { font-size: 0.88rem; }

.keys { display: flex; flex-direction: column; gap: 18px; }
.keys .card-header { margin-bottom: 0; }
.weakest { display: flex; flex-direction: column; gap: 10px; }
.weakest ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 10px 22px; }
.weakest li { display: flex; align-items: center; gap: 8px; font-weight: 600; font-variant-numeric: tabular-nums; }
.weakest kbd { font-size: 1rem; }
.weakest small { color: var(--muted); font-weight: 500; }

.inline-error { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--danger); margin-bottom: 12px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
th { text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); font-weight: 650; padding: 0 12px 10px 0; }
td { padding: 10px 12px 10px 0; border-top: 1px solid var(--border); white-space: nowrap; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.strong { font-weight: 700; }
.more { margin-top: 16px; }
</style>
