import { nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import type { Score, SessionResult } from '../domain/models';
import type { ExerciseOptions } from '../domain/practice';
import { Exercise } from '../domain/practice';

/** Connects the DOM text field, timers, and shortcuts to a plain `Exercise`. */
export function useExercise(
  target: () => string,
  options: () => ExerciseOptions,
  enabled: () => boolean,
  complete: (result: SessionResult) => void,
) {
  const input = ref('');
  const focused = ref(false);
  const started = ref(false);
  const nextCharacter = ref('');
  const remainingMs = ref<number | null>(null);
  const score = ref<Score>({ wpm: 0, rawWpm: 0, accuracy: 100, durationMs: 0, characters: 0, errors: 0 });
  const inputElement = useTemplateRef<HTMLInputElement>('exercise-input');
  let exercise = new Exercise(target(), options());
  let timer: ReturnType<typeof setInterval> | undefined;

  function sync(now: number) {
    input.value = exercise.input;
    started.value = exercise.startedAt !== null;
    nextCharacter.value = exercise.nextCharacter;
    remainingMs.value = exercise.remainingMs(now);
    score.value = exercise.score(now);
  }

  function focus() {
    if (enabled()) inputElement.value?.focus({ preventScroll: true });
  }

  function reset() {
    exercise = new Exercise(target(), options());
    if (inputElement.value) inputElement.value.value = '';
    sync(performance.now());
    void nextTick(focus);
  }

  function finish(now: number) {
    sync(now);
    complete(exercise.result(now));
  }

  function accept(event: Event) {
    const element = event.target as HTMLInputElement;
    if (enabled()) {
      const now = performance.now();
      const finished = exercise.update(element.value, now);
      sync(now);
      if (finished) finish(now);
    }
    element.value = exercise.input;
  }

  function shortcut(event: KeyboardEvent) {
    // Buttons, form controls and other views keep their own keyboard behavior.
    if (!enabled() || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    const element = event.target;
    if (element instanceof HTMLElement && element !== inputElement.value
      && element.closest('button, input, textarea, select, a, [role="dialog"]')) return;
    if (event.key === 'Tab') { event.preventDefault(); focus(); }
    if (event.key === 'Escape') { event.preventDefault(); reset(); }
  }

  function tick() {
    if (!enabled() || exercise.completed || exercise.startedAt === null) return;
    const now = performance.now();
    if (exercise.tick(now)) finish(now);
    else sync(now);
  }

  watch(enabled, value => { if (value) void nextTick(focus); });
  onMounted(() => {
    reset();
    window.addEventListener('keydown', shortcut);
    timer = setInterval(tick, 200);
  });
  onUnmounted(() => {
    window.removeEventListener('keydown', shortcut);
    if (timer) clearInterval(timer);
  });

  return { input, focused, started, nextCharacter, remainingMs, score, focus, accept, reset };
}
