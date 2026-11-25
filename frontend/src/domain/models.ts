export type Mode = 'lesson' | 'adaptive' | 'test' | 'custom';
export type LessonKind = 'keys' | 'words' | 'caps' | 'punctuation' | 'numbers' | 'text';
export type View = 'learn' | 'adaptive' | 'test' | 'custom' | 'stats' | 'settings';

export interface Lesson {
  id: number;
  stage: string;
  title: string;
  kind: LessonKind;
  /** Letters this lesson introduces; empty for review and passage lessons. */
  keys: string;
  /** Fixed passage for `text` lessons; other kinds are generated. */
  content: string;
}

/** Totals for one physical key, as stored by the backend. */
export interface KeyStat {
  key: string;
  hits: number;
  misses: number;
  time_ms: number;
}

export interface Score {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  durationMs: number;
  characters: number;
  errors: number;
}

export interface SessionResult extends Score {
  keys: KeyStat[];
}

export interface Progress {
  id: number;
  mode: Mode;
  lesson_id: number | null;
  lesson_title: string | null;
  wpm: number;
  raw_wpm: number | null;
  accuracy: number;
  duration_ms: number | null;
  characters: number | null;
  errors: number | null;
  completed_at: string;
}

export interface ProgressInput {
  username: string;
  mode: Mode;
  lesson_id: number | null;
  wpm: number;
  raw_wpm: number;
  accuracy: number;
  duration_ms: number;
  characters: number;
  errors: number;
  keys: KeyStat[];
}

export interface LessonBest {
  lesson_id: number;
  best_wpm: number;
  best_accuracy: number;
  attempts: number;
}

export interface ModeBest {
  mode: Mode;
  best_wpm: number;
  sessions: number;
}

export interface ActivityDay {
  day: string;
  sessions: number;
  duration_ms: number;
}

export interface Summary {
  sessions: number;
  duration_ms: number;
  best_wpm: number;
  lessons: LessonBest[];
  modes: ModeBest[];
  days: ActivityDay[];
  keys: KeyStat[];
}

/** A physical key to light and its RGB colour. */
export interface LitKey {
  key: string;
  color: [number, number, number];
}

export interface LightingStatus {
  device: string;
  keys: number;
}

/** A newer signed release. `installable` is false where this copy cannot replace itself. */
export interface UpdateInfo {
  version: string;
  notes: string | null;
  installable: boolean;
}

/** Bytes of the update downloaded so far; `total` is null when the server does not say. */
export interface UpdateProgress {
  downloaded: number;
  total: number | null;
}

export type LetterScope = 'learned' | 'all';

export interface AdaptiveOptions {
  scope: LetterScope;
  words: number;
}

export interface TestOptions {
  seconds: number;
  punctuation: boolean;
  numbers: boolean;
}

/** Everything needed to run one typing exercise. */
export interface Session {
  mode: Mode;
  title: string;
  text: string;
  lesson?: Lesson;
  focus?: string[];
  timeLimitMs?: number;
  adaptive?: AdaptiveOptions;
  test?: TestOptions;
}

export const MODE_VIEWS: Record<Mode, View> = { lesson: 'learn', adaptive: 'adaptive', test: 'test', custom: 'custom' };
export const MODE_LABELS: Record<Mode, string> = {
  lesson: 'Lesson', adaptive: 'Smart practice', test: 'Speed test', custom: 'Custom text',
};

export function emptySummary(): Summary {
  return { sessions: 0, duration_ms: 0, best_wpm: 0, lessons: [], modes: [], days: [], keys: [] };
}

export const HISTORY_PAGE_SIZE = 100;
export const MAX_CUSTOM_LENGTH = 10_000;
export const MAX_KEY_STATS = 256;
/** Accuracy needed for a lesson to count as passed. */
export const PASS_ACCURACY = 90;
