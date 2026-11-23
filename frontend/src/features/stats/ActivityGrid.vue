<script setup lang="ts">
import { computed } from 'vue';
import type { ActivityDay } from '../../domain/models';
import { formatDuration, localDay } from '../../domain/stats';

const props = defineProps<{ days: ActivityDay[] }>();
const WEEKS = 18;

/** Columns are weeks (Monday first), ending with the current week. */
const cells = computed(() => {
  const byDay = new Map(props.days.map(entry => [entry.day, entry]));
  const today = new Date();
  const weekday = (today.getDay() + 6) % 7;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - weekday - (WEEKS - 1) * 7);
  return Array.from({ length: WEEKS * 7 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const entry = byDay.get(localDay(date));
    const sessions = entry?.sessions ?? 0;
    const level = sessions === 0 ? 0 : sessions < 2 ? 1 : sessions < 4 ? 2 : sessions < 7 ? 3 : 4;
    const label = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return {
      key: index,
      future: date > today,
      level,
      title: sessions
        ? `${label}: ${sessions} session${sessions === 1 ? '' : 's'}, ${formatDuration(entry?.duration_ms ?? 0)}`
        : `${label}: no practice`,
    };
  });
});
const activeDays = computed(() => cells.value.filter(cell => cell.level > 0).length);
</script>

<template>
  <figure class="activity">
    <div class="grid" role="img" :aria-label="`Practised on ${activeDays} days in the last ${WEEKS} weeks`">
      <span v-for="cell in cells" :key="cell.key" class="cell" :class="[`level-${cell.level}`, { future: cell.future }]"
        :title="cell.future ? undefined : cell.title"></span>
    </div>
    <figcaption>
      <span>{{ activeDays }} active days in {{ WEEKS }} weeks</span>
      <span class="legend" aria-hidden="true">Less <span class="cell level-0"></span><span class="cell level-1"></span>
        <span class="cell level-2"></span><span class="cell level-3"></span><span class="cell level-4"></span> More</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.activity { margin: 0; display: flex; flex-direction: column; gap: 10px; }
.grid { display: grid; grid-template-rows: repeat(7, 1fr); grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; }
.cell { display: block; aspect-ratio: 1; border-radius: 3px; background: var(--surface-3); }
.cell.future { visibility: hidden; }
.level-1 { background: color-mix(in srgb, var(--accent) 30%, var(--surface-3)); }
.level-2 { background: color-mix(in srgb, var(--accent) 55%, var(--surface-3)); }
.level-3 { background: color-mix(in srgb, var(--accent) 80%, var(--surface-3)); }
.level-4 { background: var(--accent); }
figcaption { display: flex; justify-content: space-between; color: var(--muted); font-size: 0.82rem; }
.legend { display: inline-flex; align-items: center; gap: 3px; }
.legend .cell { width: 11px; }
</style>
