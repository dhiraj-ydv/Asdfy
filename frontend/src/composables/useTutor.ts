import { computed, ref } from 'vue';
import type { Client } from '../services/client.ts';
import { preferences } from '../services/preferences.ts';
import type {
  AdaptiveOptions, Lesson, Progress, Session, SessionResult, Summary, TestOptions, View,
} from '../domain/models.ts';
import { emptySummary, HISTORY_PAGE_SIZE, MODE_VIEWS, PASS_ACCURACY } from '../domain/models.ts';
import { LETTERS } from '../domain/keyboard.ts';
import type { Random } from '../domain/generator.ts';
import { drill, learnedLetters, lessonText, testText, weakKeys } from '../domain/generator.ts';

/** One owner for navigation, sessions, and asynchronous app state. */
export function useTutor(client: Client, random: Random = Math.random) {
  const lessons = ref<Lesson[]>([]);
  const summary = ref<Summary>(emptySummary());
  const view = ref<View>('learn');
  const session = ref<Session | null>(null);
  const sessionNumber = ref(0);
  const sessionKey = computed(() => String(sessionNumber.value));
  const loading = ref(true);
  const error = ref('');
  const username = preferences.read('username') || 'User1';
  const history = ref<Progress[]>([]);
  const historyLoading = ref(false);
  const historyError = ref('');
  const hasMore = ref(false);
  const result = ref<SessionResult | null>(null);
  const previousBest = ref<number | null>(null);
  const saving = ref(false);
  const saveMessage = ref('');
  const customText = ref('');
  const adaptiveOptions = ref<AdaptiveOptions>({ scope: 'learned', words: 50 });
  const testOptions = ref<TestOptions>({ seconds: 60, punctuation: false, numbers: false });
  const installedVersion = ref('');
  const versionError = ref('');
  let loadRequest = 0;
  let historyRequest = 0;
  let summaryRequest = 0;

  const passed = computed(() => new Set(summary.value.lessons
    .filter(best => best.best_accuracy >= PASS_ACCURACY).map(best => best.lesson_id)));
  const upNextIndex = computed(() => lessons.value.findIndex(lesson => !passed.value.has(lesson.id)));
  const upNext = computed(() => lessons.value[upNextIndex.value] ?? null);
  /** Letters from every lesson up to the one being learned, so smart practice follows the course. */
  const learned = computed(() => {
    const index = upNextIndex.value === -1 ? lessons.value.length - 1 : upNextIndex.value;
    return learnedLetters(lessons.value, index) || LETTERS;
  });
  const hasNextLesson = computed(() => {
    const current = session.value?.lesson;
    if (!current) return false;
    return lessons.value.findIndex(lesson => lesson.id === current.id) < lessons.value.length - 1;
  });

  function navigate(next: View) {
    view.value = next;
    if (next === 'stats') {
      void loadHistory();
      void loadSummary();
    }
    if (next === 'settings') void loadVersion();
  }

  function begin(next: Session) {
    if (saving.value) return;
    session.value = next;
    result.value = null;
    sessionNumber.value++;
    view.value = MODE_VIEWS[next.mode];
  }

  function startLesson(lesson: Lesson) {
    begin({ mode: 'lesson', title: lesson.title, lesson, text: lessonText(random, lessons.value, lesson) });
  }

  function startAdaptive(options: AdaptiveOptions = adaptiveOptions.value) {
    adaptiveOptions.value = options;
    const letters = options.scope === 'all' ? LETTERS : learned.value;
    const focus = weakKeys(summary.value.keys, letters);
    begin({
      mode: 'adaptive', title: 'Smart practice', focus, adaptive: options,
      text: drill(random, { letters, focus: focus.join(''), count: options.words }),
    });
  }

  function startTest(options: TestOptions = testOptions.value) {
    testOptions.value = options;
    begin({
      mode: 'test', title: `${options.seconds}-second test`, test: options,
      timeLimitMs: options.seconds * 1000, text: testText(random, options),
    });
  }

  /** Expects text already normalized by the custom view. */
  function startCustom(text: string) {
    begin({ mode: 'custom', title: 'Custom text', text });
  }

  function retry() {
    if (saving.value || !session.value) return;
    result.value = null;
    sessionNumber.value++;
  }

  function leave() {
    if (saving.value) return;
    session.value = null;
    result.value = null;
  }

  function next() {
    const current = session.value;
    if (!current || saving.value) return;
    if (current.mode === 'adaptive') return startAdaptive(current.adaptive);
    if (current.mode === 'test') return startTest(current.test);
    const index = lessons.value.findIndex(lesson => lesson.id === current.lesson?.id);
    const following = current.mode === 'lesson' && index >= 0 ? lessons.value[index + 1] : undefined;
    if (following) startLesson(following);
    else leave();
  }

  async function load() {
    const request = ++loadRequest;
    loading.value = true;
    error.value = '';
    try {
      const entries = await client.lessons();
      if (request !== loadRequest) return;
      if (!entries.length) throw new Error('No lessons available.');
      lessons.value = entries;
    } catch {
      if (request === loadRequest) error.value = 'The app could not load its lessons. Restart TypeDH and try again.';
    } finally {
      if (request === loadRequest) loading.value = false;
    }
    if (request === loadRequest && !error.value) await loadSummary();
  }

  async function loadSummary() {
    const request = ++summaryRequest;
    try {
      const value = await client.summary(username);
      if (request === summaryRequest) summary.value = value;
    } catch {
      if (request === summaryRequest) error.value = 'Your progress could not be loaded. Check free disk space, then retry.';
    }
  }

  async function loadHistory(append = false) {
    if (append && (historyLoading.value || !hasMore.value)) return;
    const request = ++historyRequest;
    historyLoading.value = true;
    historyError.value = '';
    try {
      const before = append ? history.value.at(-1)?.id : undefined;
      const entries = await client.history(username, before);
      if (request !== historyRequest) return;
      history.value = append ? [...history.value, ...entries] : entries;
      hasMore.value = entries.length === HISTORY_PAGE_SIZE;
    } catch {
      if (request === historyRequest) historyError.value = 'Session history could not be loaded. Check free disk space, then retry.';
    } finally {
      if (request === historyRequest) historyLoading.value = false;
    }
  }

  function bestFor(current: Session): number | null {
    if (current.mode === 'lesson') {
      return summary.value.lessons.find(best => best.lesson_id === current.lesson?.id)?.best_wpm ?? null;
    }
    return summary.value.modes.find(best => best.mode === current.mode)?.best_wpm ?? null;
  }

  async function complete(outcome: SessionResult) {
    const current = session.value;
    if (saving.value || result.value || !current) return;
    previousBest.value = bestFor(current);
    result.value = outcome;
    saving.value = true;
    saveMessage.value = 'Saving result…';
    try {
      await client.save({
        username, mode: current.mode, lesson_id: current.lesson?.id ?? null,
        wpm: outcome.wpm, raw_wpm: outcome.rawWpm, accuracy: outcome.accuracy, duration_ms: outcome.durationMs,
        characters: outcome.characters, errors: outcome.errors, keys: outcome.keys,
      });
      saveMessage.value = 'Result saved.';
    } catch {
      saveMessage.value = 'Save could not be confirmed. Check Statistics before repeating this session.';
      return;
    } finally {
      saving.value = false;
    }
    await loadSummary();
  }

  async function loadVersion() {
    installedVersion.value = '';
    versionError.value = '';
    try { installedVersion.value = await client.version(); }
    catch { versionError.value = 'The installed version could not be read.'; }
  }

  async function control(action: 'close' | 'restart') {
    if (!confirm(action === 'close' ? 'Quit TypeDH?' : 'Restart TypeDH?')) return;
    try { await client[action](); }
    catch { error.value = `The app could not ${action}. Close and reopen it using your application menu.`; }
  }

  return {
    lessons, summary, view, session, sessionKey, loading, error, history, historyLoading, historyError, hasMore,
    result, previousBest, saving, saveMessage, customText, adaptiveOptions, testOptions, installedVersion,
    versionError, passed, upNext, learned, hasNextLesson,
    load, loadSummary, loadHistory, navigate, startLesson, startAdaptive, startTest, startCustom,
    retry, leave, next, complete, control,
  };
}
