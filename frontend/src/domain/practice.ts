import type { KeyStat, Score, SessionResult } from './models.ts';
import { MAX_CUSTOM_LENGTH, MAX_KEY_STATS } from './models.ts';
import { physicalKey } from './keyboard.ts';

/** Gaps longer than this are pauses, not typing time, and are left out of per-key speed. */
const PAUSE_MS = 2_000;

/** Makes pasted text typeable: typographic punctuation becomes ASCII and whitespace collapses. */
export function normalizePractice(text: string, lowercase = false): string {
  let normalized = text.normalize('NFC')
    .replace(/[‘’‚‛′]/gu, "'")
    .replace(/[“”„‟″]/gu, '"')
    .replace(/[‐-―−]/gu, '-')
    .replace(/…/gu, '...')
    .replace(/\s+/gu, ' ')
    .trim();
  if (lowercase) normalized = normalized.toLowerCase();
  const length = Array.from(normalized).length;
  if (!length || length > MAX_CUSTOM_LENGTH) {
    throw new Error('Enter between 1 and 10,000 characters for custom practice.');
  }
  return normalized;
}

function perMinute(characters: number, elapsedMs: number): number {
  return elapsedMs > 0 ? Math.min(1000, Math.round(characters * 12_000 / elapsedMs)) : 0;
}

export interface ExerciseOptions {
  /** Wrong keys are counted but not accepted, so the cursor waits for the right one. */
  stopOnError?: boolean;
  timeLimitMs?: number;
}

interface Tally {
  hits: number;
  misses: number;
  timeMs: number;
}

/**
 * Deterministic exercise state; Vue and the DOM are deliberately not involved.
 * Every keystroke is judged when typed, so corrected mistakes still lower accuracy.
 */
export class Exercise {
  readonly target: readonly string[];
  readonly stopOnError: boolean;
  readonly timeLimitMs: number | null;
  startedAt: number | null = null;
  finishedAt: number | null = null;
  keystrokes = 0;
  errors = 0;
  private typed: string[] = [];
  private lastStroke: number | null = null;
  private tallies = new Map<string, Tally>();

  constructor(target: string, options: ExerciseOptions = {}) {
    this.target = Array.from(target);
    this.stopOnError = options.stopOnError ?? false;
    this.timeLimitMs = options.timeLimitMs ?? null;
  }

  get input(): string {
    return this.typed.join('');
  }

  get completed(): boolean {
    return this.finishedAt !== null;
  }

  get nextCharacter(): string {
    return this.completed ? '' : this.target[this.typed.length] ?? '';
  }

  /** Applies the text field's full value; returns true when this input finished the exercise. */
  update(value: string, now: number): boolean {
    if (this.completed || !this.target.length) return false;
    if (this.tick(now)) return true;
    const next = Array.from(value);
    let common = 0;
    while (common < next.length && common < this.typed.length && next[common] === this.typed[common]) common++;
    this.typed.length = common;
    for (const character of next.slice(common)) {
      if (this.typed.length >= this.target.length || !this.stroke(character, now)) break;
    }
    if (this.typed.length === this.target.length) this.finishedAt = now;
    return this.completed;
  }

  /** Ends a timed exercise once its limit passes; returns true when that happened now. */
  tick(now: number): boolean {
    if (this.completed || this.startedAt === null || this.timeLimitMs === null) return false;
    if (now - this.startedAt < this.timeLimitMs) return false;
    this.finishedAt = this.startedAt + this.timeLimitMs;
    return true;
  }

  remainingMs(now: number): number | null {
    return this.timeLimitMs === null ? null : Math.max(0, this.timeLimitMs - this.elapsed(now));
  }

  score(now: number): Score {
    const elapsed = this.elapsed(now);
    const correct = this.typed.reduce((count, character, index) => count + Number(character === this.target[index]), 0);
    return {
      wpm: perMinute(correct, elapsed),
      rawWpm: perMinute(this.keystrokes, elapsed),
      accuracy: this.keystrokes ? Math.round((this.keystrokes - this.errors) / this.keystrokes * 100) : 100,
      durationMs: Math.round(elapsed),
      characters: this.typed.length,
      errors: this.errors,
    };
  }

  result(now: number): SessionResult {
    const score = this.score(now);
    const keys: KeyStat[] = Array.from(this.tallies, ([key, tally]) => ({
      key, hits: tally.hits, misses: tally.misses, time_ms: Math.round(tally.timeMs),
    }));
    keys.sort((a, b) => b.hits + b.misses - (a.hits + a.misses));
    return { ...score, durationMs: Math.max(1, score.durationMs), keys: keys.slice(0, MAX_KEY_STATS) };
  }

  private elapsed(now: number): number {
    if (this.startedAt === null) return 0;
    const elapsed = (this.finishedAt ?? now) - this.startedAt;
    return this.timeLimitMs === null ? elapsed : Math.min(elapsed, this.timeLimitMs);
  }

  /** Judges one typed character against the expected one; returns whether it was accepted. */
  private stroke(character: string, now: number): boolean {
    const expected = this.target[this.typed.length]!;
    const key = physicalKey(expected);
    const tally = this.tallies.get(key) ?? { hits: 0, misses: 0, timeMs: 0 };
    this.tallies.set(key, tally);
    const interval = this.lastStroke === null ? null : now - this.lastStroke;
    this.startedAt ??= now;
    this.lastStroke = now;
    this.keystrokes++;
    if (character === expected) {
      tally.hits++;
      if (interval !== null && interval <= PAUSE_MS) tally.timeMs += interval;
    } else {
      tally.misses++;
      this.errors++;
      if (this.stopOnError) return false;
    }
    this.typed.push(character);
    return true;
  }
}
