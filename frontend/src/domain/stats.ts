import type { ActivityDay, KeyStat } from './models.ts';

export function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Consecutive practice days ending today, or yesterday if today has no practice yet. */
export function streak(days: readonly ActivityDay[], today = new Date()): number {
  const active = new Set(days.map(entry => entry.day));
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!active.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (active.has(localDay(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

export function average(values: readonly number[]): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

export function keyAccuracy(stat: KeyStat): number {
  const attempts = stat.hits + stat.misses;
  return attempts ? Math.round(stat.hits / attempts * 100) : 100;
}

export function keySpeed(stat: KeyStat): number | null {
  return stat.hits ? Math.round(stat.time_ms / stat.hits) : null;
}
