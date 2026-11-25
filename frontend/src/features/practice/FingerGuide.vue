<script setup lang="ts">
import { computed } from 'vue';
import { FINGER_NAMES, getFinger, shiftFinger } from '../../domain/keyboard';

const props = defineProps<{ character: string }>();
const finger = computed(() => props.character ? getFinger(props.character) : -1);
const shift = computed(() => props.character ? shiftFinger(props.character) : -1);

// Pinky, ring, middle and index of a left hand; the right hand is drawn mirrored.
const DIGITS = [
  { x: 16, y: 44, width: 22, height: 66 },
  { x: 44, y: 20, width: 24, height: 90 },
  { x: 74, y: 8, width: 24, height: 102 },
  { x: 104, y: 22, width: 24, height: 88 },
];
const HANDS = [
  { fingers: [1, 2, 3, 4], transform: undefined },
  { fingers: [8, 7, 6, 5], transform: 'translate(340 0) scale(-1 1)' },
];

const label = computed(() => {
  if (!props.character) return '';
  if (finger.value < 0) return 'Any finger';
  const name = props.character === ' ' ? 'Thumb on Space' : FINGER_NAMES[finger.value];
  return shift.value < 0 ? name : `${name} + ${FINGER_NAMES[shift.value]} on Shift`;
});

function classes(id: number) {
  return { active: id === finger.value, shift: id === shift.value };
}

function style(id: number) {
  return { '--finger': `var(--finger-${id})` };
}
</script>

<template>
  <figure class="finger-guide">
    <svg viewBox="0 0 340 150" role="img" :aria-label="label || 'Finger guide'">
      <g v-for="(hand, side) in HANDS" :key="side" :transform="hand.transform">
        <rect class="palm" x="14" y="84" width="116" height="58" rx="24" />
        <rect v-for="(digit, index) in DIGITS" :key="index" class="digit" :class="classes(hand.fingers[index]!)"
          :style="style(hand.fingers[index]!)" :x="digit.x" :y="digit.y" :width="digit.width" :height="digit.height" rx="12" />
        <rect class="digit" :class="classes(0)" :style="style(0)" x="124" y="96" width="48" height="22" rx="11"
          transform="rotate(-28 124 107)" />
      </g>
    </svg>
    <figcaption>{{ label }}</figcaption>
  </figure>
</template>

<style scoped>
.finger-guide { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
svg { width: 100%; max-width: 300px; height: auto; }
.palm { fill: var(--surface-2); stroke: var(--border-strong); stroke-width: 1.5; }
.digit { fill: var(--surface); stroke: var(--border-strong); stroke-width: 1.5; }
.digit.active { fill: var(--finger); stroke: var(--finger); }
.digit.shift { fill: color-mix(in srgb, var(--finger) 35%, var(--surface)); stroke: var(--finger); stroke-dasharray: 4 3; }
figcaption { min-height: 1.4em; font-size: 0.85rem; font-weight: 600; color: var(--muted); }
</style>
