import { reactive, watch } from 'vue';
import { preferences } from './preferences';

export type Theme = 'system' | 'dark' | 'light';
export type TextSize = 'small' | 'medium' | 'large';

export interface Settings {
  theme: Theme;
  textSize: TextSize;
  stopOnError: boolean;
  showKeyboard: boolean;
  showHands: boolean;
  /** Light the next key on a per-key RGB keyboard through OpenRGB. */
  keyboardLighting: boolean;
  /** Look for a newer release on GitHub when the app starts. */
  checkForUpdates: boolean;
}

const DEFAULTS: Settings = {
  theme: 'system', textSize: 'medium', stopOnError: false, showKeyboard: true, showHands: true, keyboardLighting: false,
  checkForUpdates: true,
};
const THEMES: Theme[] = ['system', 'dark', 'light'];
const SIZES: TextSize[] = ['small', 'medium', 'large'];

/** Stored preferences are untrusted: unknown or malformed values fall back to defaults. */
function restore(): Settings {
  let saved: Partial<Record<keyof Settings, unknown>> = {};
  try { saved = JSON.parse(preferences.read('settings') ?? '{}') ?? {}; } catch { /* Use defaults. */ }
  const flag = (key: 'stopOnError' | 'showKeyboard' | 'showHands' | 'keyboardLighting' | 'checkForUpdates') =>
    typeof saved[key] === 'boolean' ? saved[key] as boolean : DEFAULTS[key];
  return {
    theme: THEMES.find(theme => theme === saved.theme) ?? DEFAULTS.theme,
    textSize: SIZES.find(size => size === saved.textSize) ?? DEFAULTS.textSize,
    stopOnError: flag('stopOnError'),
    showKeyboard: flag('showKeyboard'),
    showHands: flag('showHands'),
    keyboardLighting: flag('keyboardLighting'),
    checkForUpdates: flag('checkForUpdates'),
  };
}

/** UI preferences only; progress lives in the native database. */
export const settings = reactive<Settings>(restore());

export function applySettings() {
  watch(settings, value => {
    preferences.write('settings', JSON.stringify(value));
    document.documentElement.dataset.theme = value.theme;
    document.documentElement.dataset.textSize = value.textSize;
  }, { deep: true, immediate: true });
}
