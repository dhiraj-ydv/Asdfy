import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { Score } from '../domain/models';
import { Exercise } from '../domain/practice';

export function useExercise(
  target: () => string,
  enabled: () => boolean,
  complete: (score: Score) => void,
  targetChange: (character: string) => void,
) {
  const input = ref('');
  const focused = ref(false);
  const inputElement = ref<HTMLInputElement | null>(null);
  const displayElement = ref<HTMLElement | null>(null);
  const score = ref<Score>({ wpm: 0, accuracy: 100 });
  const targetCharacters = computed(() => Array.from(target()));
  const inputCharacters = computed(() => Array.from(input.value));
  let exercise = new Exercise(target());
  let timer: ReturnType<typeof setInterval> | undefined;

  function focus() {
    if (enabled()) inputElement.value?.focus({ preventScroll: true });
  }

  function reset() {
    exercise = new Exercise(target());
    input.value = '';
    score.value = { wpm: 0, accuracy: 100 };
    targetChange(exercise.nextCharacter);
    if (displayElement.value) displayElement.value.scrollTop = 0;
    void nextTick(focus);
  }

  async function acceptInput(event: Event) {
    if (!enabled()) return;
    const element = event.target as HTMLInputElement;
    const update = exercise.update(element.value, performance.now());
    input.value = exercise.input;
    element.value = exercise.input;
    score.value = update.score;
    targetChange(exercise.nextCharacter);
    if (update.completedNow) complete(update.score);
    await nextTick();
    const container = displayElement.value;
    const cursor = container?.querySelector<HTMLElement>('.char.current');
    if (container && cursor) {
      const distance = cursor.getBoundingClientRect().top - container.getBoundingClientRect().top;
      if (distance < 0 || distance > container.clientHeight - 40) {
        container.scrollTo({ top: container.scrollTop + distance - container.clientHeight / 2, behavior: 'smooth' });
      }
    }
  }

  function shortcut(event: KeyboardEvent) {
    // Navigation, dialogs and custom text fields must keep their own keyboard behavior.
    if (!enabled() || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (event.target instanceof HTMLElement && event.target.closest('button, textarea, select, [role="dialog"]')) return;
    if (event.key === 'Tab') { event.preventDefault(); focus(); }
    if (event.key === 'Escape') { event.preventDefault(); reset(); }
  }

  watch(target, reset);
  watch(enabled, value => { if (value) void nextTick(focus); });
  onMounted(() => {
    reset();
    window.addEventListener('keydown', shortcut);
    timer = setInterval(() => {
      if (enabled() && !exercise.completed) score.value = exercise.score(performance.now());
    }, 250);
  });
  onUnmounted(() => {
    window.removeEventListener('keydown', shortcut);
    if (timer) clearInterval(timer);
  });

  return { input, focused, inputElement, displayElement, score, targetCharacters, inputCharacters, focus, acceptInput };
}
