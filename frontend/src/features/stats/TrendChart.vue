<script setup lang="ts">
import { computed, ref } from 'vue';

/** A single-series line chart, oldest value first. */
const props = defineProps<{ label: string; unit: string; values: number[]; min?: number; max?: number }>();
const WIDTH = 560;
const HEIGHT = 170;
const PAD = { top: 14, right: 14, bottom: 14, left: 40 };
const plotWidth = WIDTH - PAD.left - PAD.right;
const plotHeight = HEIGHT - PAD.top - PAD.bottom;
const hover = ref<number | null>(null);

const domain = computed(() => {
  const low = Math.floor((props.min ?? Math.min(...props.values)) / 10) * 10;
  const high = Math.ceil((props.max ?? Math.max(...props.values)) / 10) * 10;
  return { low, high: high > low ? high : low + 10 };
});
const ticks = computed(() => {
  const { low, high } = domain.value;
  return [high, Math.round((low + high) / 2), low];
});
const points = computed(() => props.values.map((value, index) => ({
  x: PAD.left + (props.values.length === 1 ? plotWidth / 2 : index / (props.values.length - 1) * plotWidth),
  y: y(value),
  value,
})));
const line = computed(() => points.value.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(''));
const area = computed(() => {
  const first = points.value[0];
  const last = points.value.at(-1);
  if (!first || !last) return '';
  return `${line.value}L${last.x.toFixed(1)},${PAD.top + plotHeight}L${first.x.toFixed(1)},${PAD.top + plotHeight}Z`;
});
const latest = computed(() => props.values.at(-1));
const shown = computed(() => hover.value === null ? latest.value : props.values[hover.value]);

function y(value: number): number {
  const { low, high } = domain.value;
  return PAD.top + (1 - (value - low) / (high - low)) * plotHeight;
}

function track(event: PointerEvent) {
  const box = (event.currentTarget as SVGElement).getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width * WIDTH;
  const ratio = (x - PAD.left) / plotWidth;
  const count = props.values.length;
  hover.value = count ? Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1)))) : null;
}
</script>

<template>
  <figure class="chart">
    <figcaption>
      <span class="eyebrow">{{ label }}</span>
      <strong>{{ shown === undefined ? '–' : `${Math.round(shown)} ${unit}` }}</strong>
    </figcaption>
    <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" role="img"
      :aria-label="`${label} over the last ${values.length} sessions, latest ${latest ?? 0} ${unit}`"
      @pointermove="track" @pointerleave="hover = null">
      <g class="grid">
        <template v-for="tick in ticks" :key="tick">
          <line :x1="PAD.left" :x2="WIDTH - PAD.right" :y1="y(tick)" :y2="y(tick)" />
          <text :x="PAD.left - 10" :y="y(tick)" dy="0.35em" text-anchor="end">{{ tick }}</text>
        </template>
      </g>
      <path class="area" :d="area" />
      <path class="line" :d="line" />
      <template v-if="hover !== null && points[hover]">
        <line class="cursor" :x1="points[hover]!.x" :x2="points[hover]!.x" :y1="PAD.top" :y2="PAD.top + plotHeight" />
        <circle class="dot" :cx="points[hover]!.x" :cy="points[hover]!.y" r="4.5" />
      </template>
    </svg>
  </figure>
</template>

<style scoped>
.chart { margin: 0; display: flex; flex-direction: column; gap: 8px; }
figcaption { display: flex; justify-content: space-between; align-items: baseline; }
figcaption strong { font-size: 1.2rem; font-variant-numeric: tabular-nums; }
svg { width: 100%; height: auto; display: block; touch-action: none; }
.grid line { stroke: var(--border); stroke-dasharray: 3 4; }
.grid text { fill: var(--faint); font-size: 11px; font-family: var(--font-ui); }
.area { fill: var(--accent-soft); }
.line { fill: none; stroke: var(--accent); stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
.cursor { stroke: var(--border-strong); }
.dot { fill: var(--surface); stroke: var(--accent); stroke-width: 2.5; }
</style>
