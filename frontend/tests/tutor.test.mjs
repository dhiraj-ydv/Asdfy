import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useTutor } from '../src/composables/useTutor.ts';

const lessons = [
  { id: 1, title: 'First', content: 'arst', level: 1 },
  { id: 2, title: 'Second', content: 'neio', level: 1 },
];
function client(overrides = {}) {
  return { lessons: async () => lessons, history: async () => [], save: async () => {},
    close: async () => {}, restart: async () => {}, version: async () => '0.1.2', ...overrides };
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('startup is retryable and navigation retains the selected lesson', async () => {
  let fail = true;
  const app = useTutor(client({ lessons: async () => { if (fail) throw new Error(); return lessons; } }));
  await app.load();
  assert.ok(app.error.value);
  assert.equal(app.loading.value, false);
  fail = false;
  await app.load();
  assert.equal(app.error.value, '');
  app.selectLesson(lessons[1]);
  app.navigate('custom');
  assert.equal(app.currentLesson.value.id, 2);
  app.navigate('lesson');
  assert.equal(app.view.value, 'lesson');
});

test('completion is saved once and repeating remounts the same exercise', async () => {
  const pending = deferred();
  let saves = 0;
  const app = useTutor(client({ save: () => { saves++; return pending.promise; } }));
  await app.load();
  const score = { wpm: 20, accuracy: 0 };
  const done = app.complete(score);
  await app.complete(score);
  assert.equal(saves, 1);
  assert.equal(app.saving.value, true);
  pending.resolve();
  await done;
  await app.complete(score);
  assert.equal(saves, 1);
  const key = app.exerciseKey.value;
  app.practiceAgain();
  assert.notEqual(app.exerciseKey.value, key);
  assert.equal(app.result.value, null);
  app.nextLesson();
  assert.equal(app.currentLesson.value.id, 2);
});

test('failed saves remain visible and are never automatically repeated', async () => {
  let saves = 0;
  const app = useTutor(client({ save: async () => { saves++; throw new Error(); } }));
  await app.load();
  await app.complete({ wpm: 30, accuracy: 100 });
  assert.match(app.saveMessage.value, /could not be confirmed/);
  assert.equal(app.saving.value, false);
  assert.equal(saves, 1);
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
