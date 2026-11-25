<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';

const props = defineProps<{ text: string; input: string; focused: boolean; started: boolean }>();
const root = useTemplateRef<HTMLElement>('root');
const inner = useTemplateRef<HTMLElement>('inner');
const caret = useTemplateRef<HTMLElement>('caret');
const target = computed(() => Array.from(props.text));
const typed = computed(() => Array.from(props.input));
const caretVisible = ref(false);
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

/**
 * Everything a word's rendering depends on, for `v-memo`: its typed characters and whether the caret is in it.
 * A keystroke then re-renders one or two words instead of the whole text.
 */
function signature(word: { start: number; characters: string[] }): string {
  const length = typed.value.length;
  if (word.start > length) return '';
  const end = word.start + word.characters.length;
  return typed.value.slice(word.start, end).join('') + (length < end ? '|' : '');
}

function state(index: number): string {
  const character = typed.value[index];
  if (character === undefined) return index === typed.value.length ? 'pending current' : 'pending';
  return character === target.value[index] ? 'correct' : 'incorrect';
}

/**
 * Moves the caret to the next character and scrolls so it stays on the second visible line.
 * Positions are written to the DOM directly so a keystroke does not cause a second render of the text.
 */
async function place() {
  await nextTick();
  const element = inner.value?.querySelector<HTMLElement>('.char.current');
  caretVisible.value = !!element;
  if (!element || !caret.value || !inner.value) return;
  caret.value.style.transform = `translate(${element.offsetLeft}px, ${element.offsetTop}px)`;
  caret.value.style.height = `${element.offsetHeight}px`;
  inner.value.style.transform = `translateY(${-Math.max(0, element.offsetTop - element.offsetHeight)}px)`;
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
    <div ref="inner" class="text-inner">
      <span v-for="word in words" :key="word.start" v-memo="[word, signature(word)]" class="word"><span
        v-for="(character, position) in word.characters" :key="position" class="char"
        :class="[state(word.start + position), { space: character === ' ' }]">{{ character }}</span></span>
      <span v-show="caretVisible && focused" ref="caret" class="caret" :class="{ waiting: !started }"></span>
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
  /* Character state changes never resize anything, so keep their style and layout work inside this box. */
  contain: layout paint;
  transition: opacity 0.2s;
}

.typing-text.blurred { filter: blur(3px); opacity: 0.55; }

.text-inner {
  position: relative;
  transition: transform 0.18s ease-out;
  will-change: transform;
}

.word {
  display: inline-block;
  max-width: 100%;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.char { color: var(--faint); }
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
  /* Its own compositing layer: moving and blinking the caret never repaints the text. */
  will-change: transform;
  transition: transform 0.05s linear;
}

.caret.waiting { animation: blink 1.1s step-end infinite; }

@keyframes blink { 50% { opacity: 0; } }
</style>
