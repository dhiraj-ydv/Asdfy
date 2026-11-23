import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  drill, learnedLetters, lessonText, seededRandom, sentences, testText, weakKeys, wordsUsing,
} from '../src/domain/generator.ts';
import { WORDS } from '../src/domain/words.ts';
import { streak, formatDuration } from '../src/domain/stats.ts';

const lessons = [
  { id: 101, stage: 'Home row', title: 'Anchors', kind: 'keys', keys: 'arstneio', content: '' },
  { id: 102, stage: 'Home row', title: 'G and M', kind: 'keys', keys: 'gm', content: '' },
  { id: 103, stage: 'Home row', title: 'Review', kind: 'words', keys: '', content: '' },
  { id: 104, stage: 'Index', title: 'D and H', kind: 'keys', keys: 'dh', content: '' },
  { id: 117, stage: 'Text', title: 'Passage', kind: 'text', keys: '', content: 'Fixed text.' },
];

function onlyUses(text, letters) {
  const allowed = new Set(letters + ' ');
  return Array.from(text).every(character => allowed.has(character));
}

test('the seeded generator is deterministic and bounded', () => {
  const first = seededRandom(7);
  const second = seededRandom(7);
  const values = Array.from({ length: 100 }, () => first());
  assert.deepEqual(values, Array.from({ length: 100 }, () => second()));
  assert.ok(values.every(value => value >= 0 && value < 1));
});

test('the word list is clean and home-row lessons have real words', () => {
  assert.ok(WORDS.length > 800);
  assert.ok(WORDS.every(word => /^[a-z]+$/u.test(word)));
  assert.ok(wordsUsing('arstneio').length >= 60);
});

test('drills only use known letters and favour focus keys', () => {
  const random = seededRandom(1);
  const text = drill(random, { letters: 'arstneio', focus: 'gm', count: 60 });
  const words = text.split(' ');
  assert.equal(words.length, 60);
  assert.ok(onlyUses(text, 'arstneiogm'));
  assert.ok(words.filter(word => /[gm]/u.test(word)).length >= 25);
  assert.ok(words.every((word, index) => word !== words[index - 1]));
});

test('lesson text follows the curriculum', () => {
  const random = seededRandom(3);
  assert.equal(learnedLetters(lessons, 3), 'arstneiogmdh');
  assert.ok(onlyUses(lessonText(random, lessons, lessons[2]), 'arstneiogm'));
  const keyLesson = lessonText(random, lessons, lessons[3]);
  assert.ok(keyLesson.startsWith('ddd '));
  assert.ok(onlyUses(keyLesson, 'arstneiogmdh'));
  assert.equal(lessonText(random, lessons, lessons[4]), 'Fixed text.');
});

test('sentences add capitals and punctuation', () => {
  const random = seededRandom(5);
  const text = sentences(random, drill(random, { letters: 'arstneio', count: 80 }), true);
  assert.match(text, /^["(]?[A-Z]/u);
  assert.match(text, /[.?!]$/u);
  assert.match(text, /[,;:]/u);
});

test('speed tests generate enough words with optional numbers', () => {
  const plain = testText(seededRandom(9), { punctuation: false, numbers: false });
  assert.equal(plain.split(' ').length, 300);
  assert.match(plain, /^[a-z ]+$/u);
  assert.match(testText(seededRandom(9), { punctuation: false, numbers: true }), /\d/u);
});

test('weak keys rank misses first and prefer recently learned keys when unknown', () => {
  const stats = [
    { key: 'a', hits: 100, misses: 1, time_ms: 20_000 },
    { key: 'r', hits: 100, misses: 30, time_ms: 20_000 },
    { key: 's', hits: 100, misses: 0, time_ms: 30_000 },
    { key: 't', hits: 100, misses: 0, time_ms: 20_000 },
  ];
  assert.deepEqual(weakKeys(stats, 'arst', 2), ['r', 's']);
  assert.deepEqual(weakKeys([], 'arstgm', 2), ['m', 'g']);
});

test('streaks count consecutive local days and tolerate no practice yet today', () => {
  const today = new Date(2026, 10, 24, 15);
  const days = ['2026-11-21', '2026-11-22', '2026-11-23'].map(day => ({ day, sessions: 1, duration_ms: 1 }));
  assert.equal(streak(days, today), 3);
  assert.equal(streak([...days, { day: '2026-11-24', sessions: 2, duration_ms: 1 }], today), 4);
  assert.equal(streak(days.slice(0, 2), today), 0);
  assert.equal(formatDuration(65_000), '1m 05s');
  assert.equal(formatDuration(3_900_000), '1h 05m');
});
