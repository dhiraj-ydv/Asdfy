import { LETTERS } from './keyboard.ts';
import type { KeyStat, Lesson, TestOptions } from './models.ts';
import { WORDS } from './words.ts';

export type Random = () => number;

/** Small deterministic generator (mulberry32) so drills can be reproduced in tests. */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function pick<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length)]!;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function wordsUsing(letters: string): string[] {
  const allowed = new Set(letters);
  return WORDS.filter(word => Array.from(word).every(character => allowed.has(character)));
}

/** A pronounceable-enough filler when too few real words use the available letters. */
function filler(letters: string, random: Random): string {
  const pool = Array.from(new Set(letters));
  return Array.from({ length: 2 + Math.floor(random() * 4) }, () => pick(pool, random)).join('');
}

export interface DrillOptions {
  letters: string;
  /** Keys to emphasise; most words will contain at least one. */
  focus?: string;
  count?: number;
  /** Starts with short repetitions of each focus key. */
  warmup?: boolean;
}

/** Words made only from known letters, weighted toward words that contain a focus key. */
export function drill(random: Random, { letters, focus = '', count = 40, warmup = false }: DrillOptions): string {
  const available = Array.from(new Set(letters + focus)).join('');
  if (!available) return '';
  const pool = wordsUsing(available);
  const focusKeys = Array.from(new Set(focus));
  const focused = pool.filter(word => focusKeys.some(key => word.includes(key)));
  const words: string[] = [];
  if (warmup && focusKeys.length <= 4) {
    const vowels = Array.from('aeiou').filter(vowel => available.includes(vowel));
    for (const key of focusKeys) {
      const vowel = vowels.length ? pick(vowels, random) : key;
      words.push(key.repeat(3), `${key}${vowel}${key}`, `${vowel}${key}${vowel}`);
    }
  }
  while (words.length < count) {
    const source = focused.length && random() < 0.6 ? focused : pool;
    const word = source.length >= 8 || (source.length && random() < 0.7)
      ? pick(source, random)
      : filler(focusKeys.join('') || available, random);
    if (word !== words.at(-1)) words.push(word);
  }
  return words.join(' ');
}

const CONTRACTIONS = ["don't", "it's", "i'm", "can't", "we're", "you'll", "isn't", "that's", "let's", "won't"];

/** Turns a word list into sentences: capitals always, punctuation optionally. */
export function sentences(random: Random, text: string, punctuation: boolean): string {
  const words = text.split(' ').filter(Boolean);
  let sentenceStart = true;
  return words.map((word, index) => {
    let next = punctuation && random() < 0.08 ? pick(CONTRACTIONS, random) : word;
    if (sentenceStart || (!punctuation && random() < 0.2)) next = capitalize(next);
    sentenceStart = false;
    if (punctuation && random() < 0.05) next = random() < 0.5 ? `"${next}"` : `(${next})`;
    if (index === words.length - 1) return punctuation ? `${next}.` : next;
    if (punctuation) {
      const roll = random();
      if (roll < 0.1) {
        sentenceStart = true;
        return next + pick(['.', '.', '.', '?', '!'], random);
      }
      if (roll < 0.22) return next + pick([',', ',', ',', ';', ':'], random);
    }
    return next;
  }).join(' ');
}

export function withNumbers(random: Random, text: string): string {
  return text.split(' ').map(word =>
    random() < 0.3 ? String(Math.floor(random() * (random() < 0.5 ? 100 : 10_000))) : word).join(' ');
}

/** Letters introduced by `keys` lessons up to and including `index`. */
export function learnedLetters(lessons: readonly Lesson[], index: number): string {
  return lessons.slice(0, index + 1).filter(lesson => lesson.kind === 'keys').map(lesson => lesson.keys).join('');
}

export function lessonText(random: Random, lessons: readonly Lesson[], lesson: Lesson): string {
  const index = lessons.findIndex(entry => entry.id === lesson.id);
  const letters = learnedLetters(lessons, index) || LETTERS;
  switch (lesson.kind) {
    case 'text': return lesson.content;
    case 'keys': return drill(random, { letters, focus: lesson.keys, count: 40, warmup: true });
    case 'words': return drill(random, { letters, count: 45 });
    case 'caps': return sentences(random, drill(random, { letters, count: 35 }), false);
    case 'punctuation': return sentences(random, drill(random, { letters, count: 35 }), true);
    case 'numbers': return withNumbers(random, drill(random, { letters, count: 35 }));
  }
}

/** Enough common words that fast typists do not run out before the timer. */
export function testText(random: Random, options: Pick<TestOptions, 'punctuation' | 'numbers'>, count = 300): string {
  const common = WORDS.slice(0, 200);
  const words: string[] = [];
  while (words.length < count) {
    const word = pick(common, random);
    if (word !== words.at(-1)) words.push(word);
  }
  let text = words.join(' ');
  if (options.numbers) text = withNumbers(random, text);
  if (options.punctuation) text = sentences(random, text, true);
  return text;
}

/** Higher is weaker: error rate dominates, relative slowness breaks ties. Unpractised keys rank as moderately weak. */
export function weakness(stat: KeyStat | undefined, medianMs: number): number {
  const attempts = stat ? stat.hits + stat.misses : 0;
  if (!stat || attempts < 15) return 1.2;
  const slowness = medianMs > 0 && stat.hits ? stat.time_ms / stat.hits / medianMs : 1;
  return stat.misses / attempts * 5 + slowness;
}

export function medianSpeed(stats: readonly KeyStat[], letters: string): number {
  const speeds = stats.filter(stat => stat.hits >= 10 && letters.includes(stat.key))
    .map(stat => stat.time_ms / stat.hits).sort((a, b) => a - b);
  return speeds.length ? speeds[Math.floor(speeds.length / 2)]! : 0;
}

/** The weakest of `letters`; on ties, letters later in the string (learned more recently) come first. */
export function weakKeys(stats: readonly KeyStat[], letters: string, limit = 3): string[] {
  const byKey = new Map(stats.map(stat => [stat.key, stat]));
  const median = medianSpeed(stats, letters);
  return Array.from(new Set(letters))
    .map((key, index) => ({ key, index, weakness: weakness(byKey.get(key), median) }))
    .sort((a, b) => b.weakness - a.weakness || b.index - a.index)
    .slice(0, limit)
    .map(entry => entry.key);
}
