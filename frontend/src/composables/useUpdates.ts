import { reactive } from 'vue';
import type { Client } from '../services/client.ts';
import type { UpdateProgress } from '../domain/models.ts';

export type UpdateState = 'idle' | 'checking' | 'current' | 'available' | 'downloading' | 'installed' | 'error';

/** Downloaded share from 0 to 1, or null while the size is unknown. */
export function progressFraction(progress: UpdateProgress): number | null {
  if (!progress.total) return null;
  return Math.min(1, Math.max(0, progress.downloaded / progress.total));
}

/** Finds a newer signed release on GitHub and installs it in place. */
export function useUpdates(client: Pick<Client, 'checkUpdate' | 'installUpdate' | 'restart'>) {
  const update = reactive({
    state: 'idle' as UpdateState, version: '', notes: '', installable: false,
    progress: null as number | null, message: '',
  });

  /** A quiet check (at startup) never reports failures; the Settings button does. */
  async function check(quiet = false) {
    if (['checking', 'downloading', 'installed'].includes(update.state)) return;
    Object.assign(update, { state: 'checking', message: '' });
    try {
      const found = await client.checkUpdate();
      if (!found) update.state = 'current';
      else Object.assign(update, { state: 'available', version: found.version, notes: found.notes ?? '', installable: found.installable });
    } catch (cause) {
      Object.assign(update, quiet ? { state: 'idle' } : { state: 'error', message: String(cause) });
    }
  }

  async function install() {
    if (update.state !== 'available' || !update.installable) return;
    Object.assign(update, { state: 'downloading', progress: null, message: '' });
    try {
      await client.installUpdate(progress => { update.progress = progressFraction(progress); });
      Object.assign(update, { state: 'installed', progress: 1 });
    } catch (cause) {
      // Nothing was replaced, so the same release can be tried again.
      Object.assign(update, { state: 'available', message: String(cause) });
    }
  }

  async function restart() {
    try { await client.restart(); }
    catch { update.message = 'Asdfy could not restart. Close and reopen it to finish updating.'; }
  }

  return { update, check, install, restart };
}

export type Updates = ReturnType<typeof useUpdates>;
