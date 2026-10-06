export interface Lesson {
  id: number;
  title: string;
  content: string;
  level: number;
}

export interface Score {
  wpm: number;
  accuracy: number;
}

export interface Progress extends Score {
  id: number;
  lesson_id: number;
  completed_at: string;
}

export interface ProgressInput extends Score {
  username: string;
  lesson_id: number;
}

export type View = 'lesson' | 'custom' | 'history' | 'updates';

export const CUSTOM_LESSON_ID = 999;
export const HISTORY_PAGE_SIZE = 100;
export const MAX_CUSTOM_LENGTH = 10_000;
