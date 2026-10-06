import type { Score } from './models.ts';
import { MAX_CUSTOM_LENGTH } from './models.ts';

export function normalizePractice(text: string): string {
  const normalized = text.trim().toLowerCase().replace(/\s+/gu, ' ');
  if (!normalized || normalized.length > MAX_CUSTOM_LENGTH) {
    throw new Error('Enter between 1 and 10,000 characters for custom practice.');
  }
  return normalized;
}

export function scoreInput(input: string, target: string, elapsedMs: number): Score {
  const characters = Array.from(input);
  const expected = Array.from(target);
  const correct = characters.reduce((count, char, index) => count + Number(char === expected[index]), 0);
  return {
    accuracy: characters.length ? Math.round(correct / characters.length * 100) : 100,
    wpm: elapsedMs > 0 ? Math.min(1000, Math.round(characters.length * 12_000 / elapsedMs)) : 0,
  };
}

/** Deterministic exercise state; Vue and the DOM are deliberately not involved. */
export class Exercise {
  readonly target: string;
  input = '';
  startedAt: number | null = null;
  finishedAt: number | null = null;
  completed = false;

  constructor(target: string) {
    this.target = target;
  }

  update(input: string, now: number): { score: Score; completedNow: boolean } {
    if (this.completed) return { score: this.score(now), completedNow: false };
    this.input = Array.from(input).slice(0, Array.from(this.target).length).join('');
    if (this.input && this.startedAt === null) this.startedAt = now;
    this.completed = !!this.target && Array.from(this.input).length === Array.from(this.target).length;
    if (this.completed) this.finishedAt = now;
    return { score: this.score(now), completedNow: this.completed };
  }

  score(now: number): Score {
    return scoreInput(this.input, this.target, this.startedAt === null ? 0 : (this.finishedAt ?? now) - this.startedAt);
  }

  get nextCharacter(): string {
    return Array.from(this.target)[Array.from(this.input).length] ?? '';
  }
}
