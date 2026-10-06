export const preferences = {
  read(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  write(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* Preferences are optional. */ }
  },
};
