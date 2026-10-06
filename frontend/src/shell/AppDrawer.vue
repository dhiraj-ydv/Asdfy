<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { Lesson, View } from '../domain/models';

const props = defineProps<{ open: boolean; view: View; lessons: Lesson[]; selectedId?: number; busy: boolean }>();
const emit = defineEmits<{ close: []; navigate: [view: View]; select: [lesson: Lesson]; control: [action: 'restart' | 'close'] }>();
const drawer = ref<HTMLElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
let previousFocus: HTMLElement | null = null;
const navigation: { view: View; label: string }[] = [
  { view: 'lesson', label: '📖 Lessons' }, { view: 'custom', label: '✍️ Custom Practice' },
  { view: 'history', label: '📊 Progress History' }, { view: 'updates', label: '🔄 Updates' },
];
watch(() => props.open, async open => {
  if (open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    closeButton.value?.focus();
  } else previousFocus?.focus();
});

function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close'); }
  if (event.key !== 'Tab') return;
  const buttons = Array.from(drawer.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
  const first = buttons[0];
  const last = buttons.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
</script>

<template>
  <div v-if="open" class="drawer-overlay" @click="emit('close')"></div>
  <aside ref="drawer" class="drawer" :class="{ open }" :inert="!open" :aria-hidden="!open"
    role="dialog" aria-label="Menu" :aria-modal="open" @keydown="keydown">
    <div class="drawer-header">
      <h2>Menu</h2><button ref="closeButton" class="hamburger-btn" aria-label="Close menu" @click="emit('close')">✕</button>
    </div>
    <div class="drawer-content">
      <nav class="drawer-nav" aria-label="Main navigation">
        <button v-for="item in navigation" :key="item.view" class="nav-item" :class="{ active: view === item.view }"
          :disabled="busy" @click="emit('navigate', item.view)">{{ item.label }}</button>
      </nav>
      <div v-if="view === 'lesson'" class="drawer-section">
        <h3>Choose Lesson</h3>
        <ul class="lesson-list">
          <li v-for="lesson in lessons" :key="lesson.id">
            <button :class="{ active: selectedId === lesson.id }" :disabled="busy" @click="emit('select', lesson)">
              <span class="level">Lv. {{ lesson.level }}</span><span class="title">{{ lesson.title }}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
    <div class="drawer-footer">
      <button class="system-btn restart" :disabled="busy" @click="emit('control', 'restart')">🔄 Restart App</button>
      <button class="system-btn stop" :disabled="busy" @click="emit('control', 'close')">🛑 Stop App</button>
    </div>
  </aside>
</template>

<style scoped>
.drawer-nav { display: flex; flex-direction: column; gap: 10px; margin-bottom: 30px; }
.nav-item { text-align: left; background: transparent; padding: 12px; width: 100%; color: var(--text-muted); }
.nav-item.active { background: rgba(66, 184, 131, 0.1); color: var(--primary-color); }
.drawer-section h3 { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; }
.lesson-list { list-style: none; padding: 0; }
.lesson-list button { padding: 10px; border-radius: 6px; display: flex; flex-direction: column; margin-bottom: 5px; width: 100%; background: transparent; color: var(--text-main); text-align: left; }
.lesson-list button:hover { background: rgba(255,255,255,0.05); }
.lesson-list button.active { border: 1px solid var(--primary-color); }
.lesson-list .level { font-size: 0.6rem; color: var(--primary-color); font-weight: 800; }
.lesson-list .title { font-size: 0.9rem; font-weight: 600; }
.drawer-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 10px; }
.system-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); font-size: 0.85rem; justify-content: center; }
.system-btn.restart:hover { background: var(--accent-color); color: white; }
.system-btn.stop:hover { background: var(--error-color); color: white; }
</style>
