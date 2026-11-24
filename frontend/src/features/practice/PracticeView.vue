<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { Session, SessionResult } from '../../domain/models';
import { MODE_LABELS } from '../../domain/models';
import { physicalKey } from '../../domain/keyboard';
import { formatDuration } from '../../domain/stats';
import { useExercise } from '../../composables/useExercise';
import { settings } from '../../services/settings';
import { showKey } from '../../services/lighting';
import Icon from '../../shell/Icon.vue';
import TypingText from './TypingText.vue';
import KeyboardGuide from './KeyboardGuide.vue';
import FingerGuide from './FingerGuide.vue';
import ResultPanel from './ResultPanel.vue';

const props = defineProps<{
  session: Session;
  enabled: boolean;
  result: SessionResult | null;
  saving: boolean;
  message: string;
  previousBest: number | null;
  hasNext: boolean;
}>();
const emit = defineEmits<{ complete: [result: SessionResult]; next: []; retry: []; leave: [] }>();

const { input, focused, started, nextCharacter, remainingMs, score, focus, accept, reset } = useExercise(
  () => props.session.text,
  () => ({ stopOnError: settings.stopOnError, timeLimitMs: props.session.timeLimitMs }),
  () => props.enabled,
  value => emit('complete', value),
);

const length = computed(() => Array.from(props.session.text).length);
const percent = computed(() => props.session.timeLimitMs
  ? Math.round((1 - (remainingMs.value ?? 0) / props.session.timeLimitMs) * 100)
  : Math.round(Array.from(input.value).length / Math.max(1, length.value) * 100));
const clock = computed(() => remainingMs.value === null
  ? formatDuration(score.value.durationMs)
  : String(Math.ceil(remainingMs.value / 1000)));

const MODIFIERS: Record<string, string> = { Backspace: 'backspace', Tab: 'tab', Enter: 'enter', CapsLock: 'caps' };
const pressed = ref('');
function keydown(event: KeyboardEvent) {
  if (!props.enabled || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'Shift') pressed.value = event.code === 'ShiftRight' ? 'shift-right' : 'shift-left';
  else pressed.value = event.key.length === 1 ? physicalKey(event.key) : MODIFIERS[event.key] ?? '';
}
function release() { pressed.value = ''; }
watch(() => props.enabled, release);
// The physical keyboard follows the on-screen guide, and goes dark between exercises.
watch([nextCharacter, () => props.enabled], ([character, enabled]) => showKey(enabled ? character : ''), { immediate: true });
onMounted(() => {
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', release);
  window.addEventListener('blur', release);
});
onUnmounted(() => {
  showKey('');
  window.removeEventListener('keydown', keydown);
  window.removeEventListener('keyup', release);
  window.removeEventListener('blur', release);
});

function restart() {
  if (props.result) emit('retry');
  else reset();
}
</script>

<template>
  <section class="page practice" :aria-label="session.title">
    <header class="practice-header">
      <button class="icon-btn" aria-label="Back" title="Back" :disabled="saving" @click="emit('leave')"><Icon name="back" /></button>
      <div class="practice-title">
        <p class="eyebrow">{{ MODE_LABELS[session.mode] }}<template v-if="session.lesson"> · {{ session.lesson.stage }}</template></p>
        <h1>{{ session.title }}</h1>
      </div>
      <div v-if="session.focus?.length" class="focus-keys">
        <span class="eyebrow">Focus</span><kbd v-for="key in session.focus" :key="key">{{ key }}</kbd>
      </div>
      <button class="icon-btn" aria-label="Restart" title="Restart (Esc)" :disabled="saving" @click="restart"><Icon name="restart" /></button>
    </header>

    <template v-if="!result">
      <div class="live" aria-hidden="true">
        <div class="live-stat"><span class="value">{{ score.wpm }}</span><span class="label">wpm</span></div>
        <div class="live-stat"><span class="value">{{ score.accuracy }}%</span><span class="label">accuracy</span></div>
        <div class="live-stat"><span class="value">{{ clock }}</span><span class="label">{{ remainingMs === null ? 'time' : 'seconds left' }}</span></div>
      </div>
      <div class="progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="percent">
        <span :style="{ width: `${percent}%` }"></span>
      </div>

      <div class="typing-area" @click="focus">
        <TypingText :text="session.text" :input="input" :focused="focused" :started="started" />
        <div v-if="!focused" class="focus-hint"><span>Click here or press <kbd>Tab</kbd> to type</span></div>
        <input ref="exercise-input" class="hidden-input" :disabled="!enabled" aria-label="Type the displayed text here"
          autocomplete="off" autocapitalize="off" autocorrect="off" :spellcheck="false"
          @paste.prevent @drop.prevent @input="accept" @blur="focused = false" @focus="focused = true" />
      </div>
      <p class="hints"><kbd>Esc</kbd> restart <span aria-hidden="true">·</span> <kbd>Tab</kbd> focus
        <template v-if="settings.stopOnError"> <span aria-hidden="true">·</span> stop on errors is on</template></p>

      <div v-if="settings.showKeyboard || settings.showHands" class="guides">
        <KeyboardGuide v-if="settings.showKeyboard" :target="nextCharacter" :pressed="pressed" />
        <FingerGuide v-if="settings.showHands" :character="nextCharacter" />
      </div>
    </template>

    <ResultPanel v-else :result="result" :mode="session.mode" :saving="saving" :message="message"
      :previous-best="previousBest" :has-next="hasNext" @next="emit('next')" @retry="emit('retry')" @leave="emit('leave')" />
  </section>
</template>

<style scoped>
.practice { gap: 20px; padding-top: 24px; max-width: 1100px; }

.practice-header { display: flex; align-items: center; gap: 12px; }
.practice-title { flex: 1; min-width: 0; }
.practice-title h1 { font-size: 1.3rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.focus-keys { display: flex; align-items: center; gap: 6px; }
.focus-keys kbd { font-size: 0.95rem; text-transform: uppercase; }

.live { display: flex; gap: 36px; }
.live-stat { display: flex; align-items: baseline; gap: 6px; }
.live-stat .value { font-size: 1.6rem; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.live-stat .label { color: var(--muted); font-size: 0.85rem; font-weight: 600; }

.progress { height: 4px; border-radius: 2px; background: var(--surface-3); overflow: hidden; margin-top: -8px; }
.progress span { display: block; height: 100%; background: var(--accent); transition: width 0.2s; }

.typing-area {
  position: relative;
  padding: 28px 32px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  cursor: text;
}

.focus-hint {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.focus-hint span {
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow);
  font-weight: 600;
}

.hidden-input { position: absolute; opacity: 0; pointer-events: none; width: 1px; height: 1px; left: 0; top: 0; }

.hints { text-align: center; color: var(--faint); font-size: 0.82rem; margin-top: -6px; }

.guides {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 260px);
  align-items: center;
  gap: 24px;
}

.guides > :only-child { grid-column: 1 / -1; justify-self: center; width: 100%; max-width: 760px; }

@media (max-width: 1100px) {
  .guides { grid-template-columns: minmax(0, 1fr); }
  .guides :deep(.finger-guide svg) { max-width: 240px; }
}

@media (max-height: 760px) {
  .practice { gap: 14px; padding-top: 16px; }
  .typing-area { padding: 18px 24px; }
  .guides :deep(.finger-guide) { display: none; }
}
</style>
