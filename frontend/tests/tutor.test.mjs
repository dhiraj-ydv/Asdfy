import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useTutor } from '../src/composables/useTutor.ts';
import { seededRandom } from '../src/domain/generator.ts';

const lessons = [
  { id: 101, stage: 'Home row', title: 'First', kind: 'keys', keys: 'arstneio', content: '' },
  { id: 102, stage: 'Home row', title: 'Second', kind: 'keys', keys: 'gm', content: '' },
  { id: 117, stage: 'Text', title: 'Passage', kind: 'text', keys: '', content: 'Fixed.' },
];
const outcome = { wpm: 20, rawWpm: 22, accuracy: 95, durationMs: 3000, characters: 10, errors: 1, keys: [] };
function summary(overrides = {}) {
  return { sessions: 0, duration_ms: 0, best_wpm: 0, lessons: [], modes: [], days: [], keys: [], ...overrides };
}
function client(overrides = {}) {
  return {
    lessons: async () => lessons, history: async () => [], summary: async () => summary(), save: async () => {},
    close: async () => {}, restart: async () => {}, version: async () => '0.1.2', ...overrides,
  };
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('startup is retryable and the course points at the first unpassed lesson', async () => {
  let fail = true;
  const app = useTutor(client({
    lessons: async () => { if (fail) throw new Error(); return lessons; },
    summary: async () => summary({ lessons: [
      { lesson_id: 101, best_wpm: 30, best_accuracy: 96, attempts: 2 },
      { lesson_id: 102, best_wpm: 25, best_accuracy: 80, attempts: 1 },
    ] }),
  }), seededRandom(1));
  await app.load();
  assert.ok(app.error.value);
  assert.equal(app.loading.value, false);
  fail = false;
  await app.load();
  assert.equal(app.error.value, '');
  assert.equal(app.upNext.value.id, 102);
  assert.equal(app.learned.value, 'arstneiogm');
});

test('storage failures keep lessons usable and report a retryable error', async () => {
  const app = useTutor(client({ summary: async () => { throw new Error(); } }));
  await app.load();
  assert.equal(app.lessons.value.length, 3);
  assert.match(app.error.value, /progress could not be loaded/);
});

test('sessions open in their own section and survive navigation', async () => {
  const app = useTutor(client(), seededRandom(2));
  await app.load();
  app.startLesson(lessons[2]);
  assert.equal(app.view.value, 'learn');
  assert.equal(app.session.value.text, 'Fixed.');
  app.navigate('stats');
  assert.equal(app.session.value.lesson.id, 117);
  app.startTest({ seconds: 15, punctuation: false, numbers: false });
  assert.equal(app.view.value, 'test');
  assert.equal(app.session.value.timeLimitMs, 15_000);
  app.startAdaptive({ scope: 'learned', words: 25 });
  assert.equal(app.view.value, 'adaptive');
  assert.equal(app.session.value.text.split(' ').length, 25);
  assert.equal(app.session.value.focus.length, 3);
  app.leave();
  assert.equal(app.session.value, null);
});

test('completion is saved once with session details and repeating remounts the exercise', async () => {
  const pending = deferred();
  const saved = [];
  let summaries = 0;
  const app = useTutor(client({
    save: input => { saved.push(input); return pending.promise; },
    summary: async () => { summaries++; return summary(); },
  }));
  await app.load();
  app.startLesson(lessons[0]);
  const done = app.complete(outcome);
  await app.complete(outcome);
  assert.equal(saved.length, 1);
  assert.equal(app.saving.value, true);
  assert.deepEqual(saved[0], {
    username: 'User1', mode: 'lesson', lesson_id: 101, wpm: 20, raw_wpm: 22, accuracy: 95,
    duration_ms: 3000, characters: 10, errors: 1, keys: [],
  });
  pending.resolve();
  await done;
  assert.equal(app.saveMessage.value, 'Result saved.');
  assert.equal(summaries, 2);
  await app.complete(outcome);
  assert.equal(saved.length, 1);
  const key = app.sessionKey.value;
  const text = app.session.value.text;
  app.retry();
  assert.notEqual(app.sessionKey.value, key);
  assert.equal(app.session.value.text, text);
  assert.equal(app.result.value, null);
  assert.equal(app.hasNextLesson.value, true);
  app.next();
  assert.equal(app.session.value.lesson.id, 102);
});

test('custom sessions are saved without a lesson and next returns to the editor', async () => {
  const saved = [];
  const app = useTutor(client({ save: async input => { saved.push(input); } }));
  await app.load();
  app.startCustom('hello world');
  assert.equal(app.view.value, 'custom');
  await app.complete(outcome);
  assert.equal(saved[0].mode, 'custom');
  assert.equal(saved[0].lesson_id, null);
  app.next();
  assert.equal(app.session.value, null);
});

test('failed saves remain visible and are never automatically repeated', async () => {
  let saves = 0;
  const app = useTutor(client({ save: async () => { saves++; throw new Error(); } }));
  await app.load();
  app.startLesson(lessons[0]);
  await app.complete(outcome);
  assert.match(app.saveMessage.value, /could not be confirmed/);
  assert.equal(app.saving.value, false);
  assert.equal(saves, 1);
});

test('previous bests are captured before saving', async () => {
  const app = useTutor(client({ summary: async () => summary({ modes: [{ mode: 'test', best_wpm: 55, sessions: 3 }] }) }));
  await app.load();
  app.startTest({ seconds: 30, punctuation: true, numbers: true });
  await app.complete(outcome);
  assert.equal(app.previousBest.value, 55);
});

test('stale history responses cannot replace a newer request', async () => {
  const first = deferred();
  const second = deferred();
  let requests = 0;
  const app = useTutor(client({ history: () => ++requests === 1 ? first.promise : second.promise }));
  const oldRequest = app.loadHistory();
  const newRequest = app.loadHistory();
  second.resolve([{ id: 2 }]);
  await newRequest;
  first.resolve([{ id: 1 }]);
  await oldRequest;
  assert.equal(app.history.value[0].id, 2);
});

test('history errors do not trigger app reloads and pages use a stable cursor', async () => {
  const page = Array.from({ length: 100 }, (_, index) => ({ id: 200 - index }));
  const cursors = [];
  const app = useTutor(client({ history: async (_, before) => {
    cursors.push(before);
    if (cursors.length === 3) throw new Error();
    return before ? [{ id: 100 }] : page;
  } }));
  await app.loadHistory();
  assert.equal(app.hasMore.value, true);
  await app.loadHistory(true);
  assert.deepEqual(cursors, [undefined, 101]);
  assert.equal(app.history.value.length, 101);
  assert.equal(app.hasMore.value, false);
  await app.loadHistory();
  assert.ok(app.historyError.value);
  assert.equal(app.error.value, '');
});
