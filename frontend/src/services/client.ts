import type { Lesson, Progress, ProgressInput } from '../domain/models.ts';
import { HISTORY_PAGE_SIZE } from '../domain/models.ts';

export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

/** The only native boundary. No SQL, paths, or platform details enter the UI. */
export function createClient(invoke: Invoke) {
  return {
    lessons: () => invoke<Lesson[]>('get_lessons'),
    history: (username: string, before?: number) =>
      invoke<Progress[]>('get_progress', { username, limit: HISTORY_PAGE_SIZE, before: before ?? null }),
    save: (input: ProgressInput) => invoke<void>('save_progress', { input }),
    close: () => invoke<void>('stop_application'),
    restart: () => invoke<void>('restart_application'),
    version: () => invoke<string>('app_version'),
  };
}

export type Client = ReturnType<typeof createClient>;
