<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';

const props = defineProps<{ text: string; input: string; focused: boolean; started: boolean }>();
const root = useTemplateRef<HTMLElement>('root');
const inner = useTemplateRef<HTMLElement>('inner');
const target = computed(() => Array.from(props.text));
const typed = computed(() => Array.from(props.input));
const caret = ref({ x: 0, y: 0, height: 0, visible: false });
const offset = ref(0);
let observer: ResizeObserver | undefined;

/** Words keep their trailing space so lines only wrap between words. */
const words = computed(() => {
  const groups: { start: number; characters: string[] }[] = [];
  let current: { start: number; characters: string[] } | null = null;
  target.value.forEach((character, index) => {
    if (!current) {
      current = { start: index, characters: [] };
      groups.push(current);
    }
    current.characters.push(character);
    if (character === ' ') current = null;
  });
  return groups;
});

function state(index: number): string {
  const character = typed.value[index];
  if (character === undefined) return index === typed.value.length ? 'pending current' : 'pending';
  return character === target.value[index] ? 'correct' : 'incorrect';
}

/** Moves the caret to the next character and scrolls so it stays on the second visible line. */
async function place() {
  await nextTick();
  const element = inner.value?.querySelector<HTMLElement>('.char.current');
  if (!element) {
    caret.value = { ...caret.value, visible: false };
    return;
  }
  caret.value = { x: element.offsetLeft, y: element.offsetTop, height: element.offsetHeight, visible: true };
  offset.value = Math.max(0, element.offsetTop - element.offsetHeight);
}

watch(() => [props.input, props.text], place);
onMounted(() => {
  void place();
  observer = new ResizeObserver(() => void place());
  if (root.value) observer.observe(root.value);
});
onUnmounted(() => observer?.disconnect());
</script>

<template>
  <div ref="root" class="typing-text" :class="{ blurred: !focused }" :data-text="text" aria-hidden="true">
    <div ref="inner" class="text-inner" :style="{ transform: `translateY(${-offset}px)` }">
      <span v-for="word in words" :key="word.start" class="word"><span v-for="(character, position) in word.characters"
        :key="position" v-memo="[state(word.start + position)]" class="char"
        :class="[state(word.start + position), { space: character === ' ' }]">{{ character }}</span></span>
      <span v-show="caret.visible && focused" class="caret" :class="{ waiting: !started }"
        :style="{ transform: `translate(${caret.x}px, ${caret.y}px)`, height: `${caret.height}px` }"></span>
    </div>
  </div>
</template>

<style scoped>
.typing-text {
  --line: 1.75;
  position: relative;
  height: calc(var(--typing-size) * var(--line) * 3);
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: var(--typing-size);
  line-height: var(--line);
  transition: filter 0.2s, opacity 0.2s;
}

.typing-text.blurred { filter: blur(3px); opacity: 0.55; }

.text-inner {
  position: relative;
  transition: transform 0.18s ease-out;
}

.word {
  display: inline-block;
  max-width: 100%;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.char { color: var(--faint); transition: color 0.08s; }
.char.correct { color: var(--text); }
.char.incorrect { color: var(--danger); text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 6px; }
.char.incorrect.space { background: var(--danger-soft); border-radius: 3px; text-decoration: none; }

.caret {
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  margin-left: -1px;
  border-radius: 1px;
  background: var(--accent);
  transition: transform 0.09s ease-out;
}

.caret.waiting { animation: blink 1.1s step-end infinite; }

@keyframes blink { 50% { opacity: 0; } }
</style>
