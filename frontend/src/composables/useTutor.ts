import { computed, ref } from 'vue';
import type { Client } from '../services/client.ts';
import { preferences } from '../services/preferences.ts';
import type { Lesson, Progress, Score, View } from '../domain/models.ts';
import { CUSTOM_LESSON_ID, HISTORY_PAGE_SIZE } from '../domain/models.ts';
import { normalizePractice } from '../domain/practice.ts';

/** One owner for navigation and asynchronous app state. */
export function useTutor(client: Client) {
  const lessons = ref<Lesson[]>([]);
  const currentLesson = ref<Lesson | null>(null);
  const view = ref<View>('lesson');
  const drawerOpen = ref(false);
  const loading = ref(true);
  const error = ref('');
  const username = preferences.read('username') || 'User1';
  const history = ref<Progress[]>([]);
  const historyLoading = ref(false);
  const historyError = ref('');
  const hasMore = ref(false);
  const result = ref<Score | null>(null);
  const saving = ref(false);
  const saveMessage = ref('');
  const installedVersion = ref('');
  const versionError = ref('');
  const exerciseNumber = ref(0);
  const exerciseKey = computed(() => `${currentLesson.value?.id}:${exerciseNumber.value}`);
  let loadRequest = 0;
  let historyRequest = 0;

  function navigate(next: View) {
    view.value = next;
    drawerOpen.value = false;
    result.value = null;
    if (next === 'history') void loadHistory();
    if (next === 'updates') void loadVersion();
  }

  function selectLesson(lesson: Lesson) {
    currentLesson.value = lesson;
    exerciseNumber.value++;
    navigate('lesson');
    if (lesson.id !== CUSTOM_LESSON_ID) preferences.write('currentLessonId', String(lesson.id));
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
      const id = Number(preferences.read('currentLessonId'));
      const lesson = entries.find(entry => entry.id === id) ?? entries[0]!;
      selectLesson(lesson);
    } catch {
      if (request === loadRequest) error.value = 'The app could not load your lessons. Check free disk space, then retry or restart the app.';
    } finally {
      if (request === loadRequest) loading.value = false;
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
      if (request === historyRequest) historyError.value = 'Progress history could not be loaded. Check free disk space, then retry.';
    } finally {
      if (request === historyRequest) historyLoading.value = false;
    }
  }

  async function complete(score: Score) {
    if (saving.value || result.value || !currentLesson.value) return;
    const lessonId = currentLesson.value.id;
    result.value = score;
    saving.value = true;
    saveMessage.value = 'Saving result…';
    try {
      await client.save({ username, lesson_id: lessonId, ...score });
      saveMessage.value = 'Result saved.';
    } catch {
      saveMessage.value = 'Save could not be confirmed. Check Progress History before repeating this lesson.';
    } finally {
      saving.value = false;
    }
  }

  function practiceAgain() {
    result.value = null;
    exerciseNumber.value++;
    view.value = 'lesson';
  }

  function nextLesson() {
    const index = lessons.value.findIndex(lesson => lesson.id === currentLesson.value?.id);
    const next = index >= 0 ? lessons.value[index + 1] : undefined;
    if (next) selectLesson(next);
    else navigate('history');
  }

  function customPractice(text: string) {
    error.value = '';
    try {
      selectLesson({ id: CUSTOM_LESSON_ID, title: 'Custom Practice', content: normalizePractice(text), level: 99 });
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Invalid practice text.';
    }
  }

  async function loadVersion() {
    installedVersion.value = '';
    versionError.value = '';
    try { installedVersion.value = await client.version(); }
    catch { versionError.value = 'The installed version could not be read.'; }
  }

  async function control(action: 'close' | 'restart') {
    if (!confirm(action === 'close' ? 'Close TypeDH?' : 'Restart TypeDH?')) return;
    try { await client[action](); }
    catch { error.value = `The app could not ${action}. Close and reopen it using your application menu.`; }
  }

  return {
    lessons, currentLesson, view, drawerOpen, loading, error, history,
    historyLoading, historyError, hasMore, result, saving, saveMessage,
    installedVersion, versionError, exerciseKey, load, navigate, selectLesson,
    loadHistory, complete, practiceAgain, nextLesson, customPractice, control,
  };
}
