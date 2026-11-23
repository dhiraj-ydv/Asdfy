import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Exercise, normalizePractice } from '../src/domain/practice.ts';
import { getFinger, physicalKey, shiftFinger } from '../src/domain/keyboard.ts';

test('exercise starts on actual input and completes exactly once', () => {
  const exercise = new Exercise('ab');
  exercise.update('', 0);
  assert.equal(exercise.startedAt, null);
  assert.equal(exercise.nextCharacter, 'a');
  assert.equal(exercise.update('a', 100), false);
  assert.equal(exercise.nextCharacter, 'b');
  assert.equal(exercise.update('ab', 1100), true);
  assert.deepEqual(exercise.score(1100), { wpm: 24, rawWpm: 24, accuracy: 100, durationMs: 1000, characters: 2, errors: 0 });
  assert.equal(exercise.update('ab', 1200), false);
  assert.deepEqual(exercise.score(10_000), exercise.score(1100));
});

test('corrected mistakes still lower accuracy and raw speed counts every keystroke', () => {
  const exercise = new Exercise('abc');
  exercise.update('x', 0);
  exercise.update('', 100);
  exercise.update('a', 200);
  exercise.update('ab', 300);
  assert.equal(exercise.update('abc', 1000), true);
  const score = exercise.score(1000);
  assert.equal(score.accuracy, 75);
  assert.equal(score.errors, 1);
  assert.equal(score.wpm, 36);
  assert.equal(score.rawWpm, 48);
});

test('uncorrected mistakes reduce net speed', () => {
  const exercise = new Exercise('abcd');
  assert.equal(exercise.update('abxd', 1000), true);
  const score = exercise.score(1000);
  assert.equal(score.accuracy, 75);
  assert.equal(score.wpm, 0);
});

test('stop on error holds the cursor until the right key is typed', () => {
  const exercise = new Exercise('ab', { stopOnError: true });
  exercise.update('x', 0);
  assert.equal(exercise.input, '');
  assert.equal(exercise.errors, 1);
  exercise.update('a', 100);
  assert.equal(exercise.input, 'a');
  assert.equal(exercise.update('ab', 200), true);
  assert.equal(exercise.score(200).accuracy, 67);
});

test('timed exercises stop at the limit and report the limit as duration', () => {
  const exercise = new Exercise('abcdef', { timeLimitMs: 1000 });
  assert.equal(exercise.remainingMs(0), 1000);
  exercise.update('a', 0);
  assert.equal(exercise.tick(500), false);
  assert.equal(exercise.remainingMs(500), 500);
  assert.equal(exercise.tick(1000), true);
  assert.equal(exercise.completed, true);
  assert.equal(exercise.update('ab', 1100), false);
  assert.equal(exercise.score(5000).durationMs, 1000);
  const late = new Exercise('abc', { timeLimitMs: 1000 });
  late.update('a', 0);
  assert.equal(late.update('ab', 2000), true);
  assert.equal(late.input, 'a');
});

test('per-key results use physical keys and skip pauses', () => {
  const exercise = new Exercise('aA b');
  exercise.update('a', 0);
  exercise.update('aA', 300);
  exercise.update('aAx', 400);
  exercise.update('aA', 500);
  exercise.update('aA ', 600);
  exercise.update('aA b', 10_000);
  const keys = Object.fromEntries(exercise.result(10_000).keys.map(stat => [stat.key, stat]));
  assert.deepEqual(keys.a, { key: 'a', hits: 2, misses: 0, time_ms: 300 });
  assert.deepEqual(keys[' '], { key: ' ', hits: 1, misses: 1, time_ms: 200 });
  assert.deepEqual(keys.b, { key: 'b', hits: 1, misses: 0, time_ms: 0 });
});

test('results always report a positive duration', () => {
  const exercise = new Exercise('a');
  assert.equal(exercise.update('a', 50), true);
  assert.equal(exercise.result(50).durationMs, 1);
});

test('deletion is supported and Unicode completion uses characters, not code units', () => {
  const exercise = new Exercise('🙂x');
  exercise.update('🙂', 0);
  assert.equal(exercise.nextCharacter, 'x');
  exercise.update('', 100);
  assert.equal(exercise.nextCharacter, '🙂');
  assert.equal(exercise.update('🙂xEXTRA', 1000), true);
  assert.equal(exercise.input, '🙂x');
  assert.equal(new Exercise('').update('', 0), false);
});

test('custom practice is normalized and bounded', () => {
  assert.equal(normalizePractice('  Hello\n\tWORLD!  '), 'Hello WORLD!');
  assert.equal(normalizePractice('  Hello\n\tWORLD!  ', true), 'hello world!');
  assert.equal(normalizePractice('“hi” — it’s…'), '"hi" - it\'s...');
  assert.throws(() => normalizePractice('   '));
  assert.throws(() => normalizePractice('x'.repeat(10_001)));
  assert.equal(normalizePractice('x'.repeat(10_000)).length, 10_000);
});

test('characters map to the correct physical QWERTY key, finger and shift', () => {
  assert.equal(physicalKey('?'), '/');
  assert.equal(physicalKey('"'), "'");
  assert.equal(physicalKey('!'), '1');
  assert.equal(getFinger('?'), 8);
  assert.equal(getFinger('A'), 1);
  assert.equal(getFinger('t'), 4);
  assert.equal(getFinger('y'), 5);
  assert.equal(getFinger('p'), 8);
  assert.equal(physicalKey(':'), ';');
  assert.equal(getFinger(' '), 0);
  assert.equal(getFinger('🙂'), -1);
  assert.equal(shiftFinger('A'), 8);
  assert.equal(shiftFinger('N'), 1);
  assert.equal(shiftFinger('a'), -1);
});
