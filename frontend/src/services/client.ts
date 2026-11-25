import type {
  Lesson, LightingStatus, LitKey, Progress, ProgressInput, Summary, UpdateInfo, UpdateProgress,
} from '../domain/models.ts';
import { HISTORY_PAGE_SIZE } from '../domain/models.ts';

export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
/** Wraps a handler in something the native side can stream messages to (a Tauri channel). */
export type Listen = <T>(handler: (message: T) => void) => unknown;

/** The only native boundary. No SQL, paths, or platform details enter the UI. */
export function createClient(invoke: Invoke, listen: Listen) {
  return {
    lessons: () => invoke<Lesson[]>('get_lessons'),
    history: (username: string, before?: number) =>
      invoke<Progress[]>('get_progress', { username, limit: HISTORY_PAGE_SIZE, before: before ?? null }),
    summary: (username: string) => invoke<Summary>('get_summary', { username }),
    save: (input: ProgressInput) => invoke<void>('save_progress', { input }),
    close: () => invoke<void>('stop_application'),
    restart: () => invoke<void>('restart_application'),
    version: () => invoke<string>('app_version'),
    dataLocation: () => invoke<string>('data_location'),
    checkUpdate: () => invoke<UpdateInfo | null>('update_check'),
    installUpdate: (onProgress: (progress: UpdateProgress) => void) =>
      invoke<void>('update_install', { progress: listen(onProgress) }),
    lightingConnect: (port?: number) => invoke<LightingStatus>('lighting_connect', { port: port ?? null }),
    lightingHighlight: (frame: number, keys: LitKey[]) => invoke<void>('lighting_highlight', { frame, keys }),
    lightingDisconnect: () => invoke<void>('lighting_disconnect'),
  };
}

export type Client = ReturnType<typeof createClient>;
