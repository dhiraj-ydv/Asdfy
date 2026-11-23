<script setup lang="ts">
import { computed } from 'vue';
import type { KeyCap } from '../../domain/keyboard';
import { keyboardRows, physicalKey, shiftFinger } from '../../domain/keyboard';

/**
 * `target` and `pressed` drive live guidance; `heat` (0–1 per key) turns the board into a heatmap.
 * `pressed` is a physical key or a modifier id such as `shift-left`.
 */
const props = withDefaults(defineProps<{
  target?: string;
  pressed?: string;
  heat?: Record<string, number>;
  titles?: Record<string, string>;
}>(), { target: '', pressed: '', heat: undefined, titles: undefined });

interface Cap {
  id: string;
  label: string;
  shifted?: string;
  width: number;
  finger: number;
  bump?: boolean;
  modifier?: boolean;
}

function cap(key: KeyCap, width = 1): Cap {
  const letter = /^[a-z]$/u.test(key.key);
  return {
    id: key.key, label: letter ? key.key.toUpperCase() : key.key, shifted: letter ? undefined : key.shifted,
    width, finger: key.finger, bump: key.bump,
  };
}

function modifier(id: string, label: string, width: number, finger: number): Cap {
  return { id, label, width, finger, modifier: true };
}

const [numbers = [], top = [], home = [], bottom = []] = keyboardRows;
const rows: Cap[][] = [
  [...numbers.map(key => cap(key)), modifier('backspace', 'Back', 2, 8)],
  [modifier('tab', 'Tab', 1.5, 1), ...top.map(key => cap(key, key.key === '\\' ? 1.5 : 1))],
  [modifier('caps', 'Caps', 1.75, 1), ...home.map(key => cap(key)), modifier('enter', 'Enter', 2.25, 8)],
  [modifier('shift-left', 'Shift', 2.25, 1), ...bottom.map(key => cap(key)), modifier('shift-right', 'Shift', 2.75, 8)],
  [{ id: ' ', label: '', width: 6.25, finger: 0 }],
];

const targetKey = computed(() => props.target ? physicalKey(props.target) : '');
const targetShift = computed(() => {
  const finger = shiftFinger(props.target);
  return finger === 1 ? 'shift-left' : finger === 8 ? 'shift-right' : '';
});

function style(key: Cap) {
  const heat = props.heat?.[key.id];
  return {
    '--w': key.width,
    '--finger': `var(--finger-${key.finger})`,
    ...(heat === undefined ? {} : { '--heat': `${Math.round(heat * 80)}%` }),
  };
}
</script>

<template>
  <div class="keyboard" :class="{ heatmap: heat }">
    <div class="keys">
      <div v-for="(row, index) in rows" :key="index" class="row">
        <div v-for="key in row" :key="key.id" class="key"
          :class="{
            target: key.id === targetKey || key.id === targetShift,
            pressed: key.id === pressed,
            bump: key.bump,
            modifier: key.modifier,
            measured: heat?.[key.id] !== undefined,
          }"
          :style="style(key)" :title="titles?.[key.id]">
          <span v-if="key.shifted" class="shifted">{{ key.shifted }}</span>
          <span class="label">{{ key.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.keyboard { container-type: inline-size; width: 100%; }

.keys {
  --u: min(46px, calc(100cqi / 15.2));
  --gap: calc(var(--u) * 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap);
}

.row { display: flex; gap: var(--gap); }

.key {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: calc(var(--u) * var(--w) - var(--gap));
  height: calc(var(--u) - var(--gap));
  border-radius: calc(var(--u) * 0.16);
  background: var(--key);
  border: 1px solid var(--border);
  box-shadow: inset 0 -3px 0 color-mix(in srgb, var(--finger) 30%, transparent), 0 1px 0 var(--key-edge);
  color: var(--muted);
  font-size: calc(var(--u) * 0.3);
  font-weight: 650;
  line-height: 1;
  transition: background-color 0.12s, transform 0.08s, box-shadow 0.12s, color 0.12s;
}

.key.modifier { color: var(--faint); font-size: calc(var(--u) * 0.24); font-weight: 600; }
.shifted { font-size: 0.72em; color: var(--faint); margin-bottom: 2px; }

.key.bump::after {
  content: '';
  position: absolute;
  bottom: 18%;
  width: 22%;
  height: 2px;
  border-radius: 1px;
  background: currentColor;
  opacity: 0.45;
}

.key.target {
  background: var(--finger);
  border-color: var(--finger);
  color: #101317;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--finger) 35%, transparent);
}

.key.target .shifted { color: rgba(16, 19, 23, 0.7); }

.key.pressed {
  transform: translateY(1px) scale(0.96);
  background: var(--surface-3);
  color: var(--text);
}

.key.target.pressed { background: var(--finger); color: #101317; }

.heatmap .key { box-shadow: 0 1px 0 var(--key-edge); }
.heatmap .key.measured {
  background: color-mix(in srgb, var(--danger) var(--heat), var(--accent-soft));
  color: var(--text);
}
</style>
