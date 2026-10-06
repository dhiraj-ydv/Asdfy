import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Exercise, normalizePractice, scoreInput } from '../src/domain/practice.ts';
import { getFinger, physicalKey } from '../src/domain/keyboard.ts';

test('scores are finite, bounded, and correctly count partial or incorrect input', () => {
  assert.deepEqual(scoreInput('', 'abc', 0), { wpm: 0, accuracy: 100 });
  assert.deepEqual(scoreInput('abx', 'abc', 60_000), { wpm: 1, accuracy: 67 });
  assert.equal(scoreInput('xxx', 'abc', 1000).accuracy, 0);
  assert.equal(scoreInput('abc', 'abc', 0.01).wpm, 1000);
  assert.equal(scoreInput('🙂x', '🙂y', 1000).accuracy, 50);
});

test('exercise starts on actual input and completes exactly once', () => {
  const exercise = new Exercise('ab');
  exercise.update('', 0);
  assert.equal(exercise.startedAt, null);
  assert.equal(exercise.nextCharacter, 'a');
  assert.equal(exercise.update('a', 100).completedNow, false);
  assert.equal(exercise.nextCharacter, 'b');
  const result = exercise.update('ab', 1100);
  assert.deepEqual(result, { score: { wpm: 24, accuracy: 100 }, completedNow: true });
  assert.equal(exercise.update('ab', 1200).completedNow, false);
  assert.deepEqual(exercise.score(10_000), result.score);
});

test('deletion is supported and Unicode completion uses characters, not code units', () => {
  const exercise = new Exercise('🙂x');
  exercise.update('🙂', 0);
  assert.equal(exercise.nextCharacter, 'x');
  exercise.update('', 100);
  assert.equal(exercise.nextCharacter, '🙂');
  assert.equal(exercise.update('🙂xEXTRA', 1000).completedNow, true);
  assert.equal(exercise.input, '🙂x');
  assert.equal(new Exercise('').update('', 0).completedNow, false);
});

test('custom practice is normalized and bounded', () => {
  assert.equal(normalizePractice('  Hello\n\tWORLD!  '), 'hello world!');
  assert.throws(() => normalizePractice('   '));
  assert.throws(() => normalizePractice('x'.repeat(10_001)));
  assert.equal(normalizePractice('x'.repeat(10_000)).length, 10_000);
});

test('shifted punctuation maps to the correct physical Colemak key', () => {
  assert.equal(physicalKey('?'), '/');
  assert.equal(getFinger('?'), 8);
  assert.equal(getFinger('A'), 1);
  assert.equal(getFinger(' '), 0);
  assert.equal(getFinger('🙂'), -1);
});
