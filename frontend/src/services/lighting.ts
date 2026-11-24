import { reactive, watch } from 'vue';
import { litKeys } from '../domain/lighting';
import { desktop } from './desktop';
import { settings } from './settings';

export type LightingState = 'off' | 'connecting' | 'on' | 'error';

/** Connection to the physical keyboard's backlight; it only exists while the setting is on. */
export const lighting = reactive({ state: 'off' as LightingState, device: '', keys: 0, message: '' });
let frame = 0;
let request = 0;

export async function connectLighting() {
  const current = ++request;
  Object.assign(lighting, { state: 'connecting', device: '', keys: 0, message: '' });
  try {
    const status = await desktop.lightingConnect();
    if (current === request) Object.assign(lighting, { state: 'on', device: status.device, keys: status.keys });
  } catch (cause) {
    if (current === request) Object.assign(lighting, { state: 'error', message: String(cause) });
  }
}

export async function disconnectLighting() {
  ++request;
  const active = lighting.state !== 'off';
  Object.assign(lighting, { state: 'off', device: '', keys: 0, message: '' });
  if (active) await desktop.lightingDisconnect().catch(() => undefined);
}

/** Lights the key (and Shift) for `character`; an empty string dims every key. */
export function showKey(character: string) {
  if (lighting.state !== 'on') return;
  desktop.lightingHighlight(++frame, litKeys(character)).catch(cause => {
    if (lighting.state === 'on') Object.assign(lighting, { state: 'error', message: String(cause) });
  });
}

/** Connects when the setting is on, including at startup, and releases the keyboard when it is turned off. */
export function initLighting() {
  watch(() => settings.keyboardLighting, enabled => {
    void (enabled ? connectLighting() : disconnectLighting());
  }, { immediate: true });
}
