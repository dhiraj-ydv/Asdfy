/** A physical key on a US QWERTY (ANSI) keyboard. Fingers: 0 thumb, 1–4 left pinky→index, 5–8 right index→pinky. */
export interface KeyCap {
  key: string;
  shifted: string;
  finger: number;
  /** F and J carry the tactile bumps that locate the home row. */
  bump: boolean;
}

interface Location {
  key: string;
  shift: boolean;
  finger: number;
}

const ROWS: [string, string, number[]][] = [
  ['`1234567890-=', '~!@#$%^&*()_+', [1, 1, 2, 3, 4, 4, 5, 5, 6, 7, 8, 8, 8]],
  ['qwertyuiop[]\\', 'QWERTYUIOP{}|', [1, 2, 3, 4, 4, 5, 5, 6, 7, 8, 8, 8, 8]],
  ["asdfghjkl;'", 'ASDFGHJKL:"', [1, 2, 3, 4, 4, 5, 5, 6, 7, 8, 8]],
  ['zxcvbnm,./', 'ZXCVBNM<>?', [1, 2, 3, 4, 4, 5, 5, 6, 7, 8]],
];
const BUMPS = new Set('fj');

export const keyboardRows: KeyCap[][] = ROWS.map(([keys, shifted, fingers]) =>
  Array.from(keys, (key, index) => ({ key, shifted: shifted.charAt(index), finger: fingers[index] ?? -1, bump: BUMPS.has(key) })));

const locations = new Map<string, Location>([[' ', { key: ' ', shift: false, finger: 0 }]]);
for (const cap of keyboardRows.flat()) {
  locations.set(cap.key, { key: cap.key, shift: false, finger: cap.finger });
  locations.set(cap.shifted, { key: cap.key, shift: true, finger: cap.finger });
}

export const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
export const FINGER_NAMES = [
  'Thumb', 'Left pinky', 'Left ring', 'Left middle', 'Left index',
  'Right index', 'Right middle', 'Right ring', 'Right pinky',
];

export function physicalKey(character: string): string {
  return locations.get(character)?.key ?? character.toLowerCase();
}

export function getFinger(character: string): number {
  return locations.get(character)?.finger ?? -1;
}

/** Shift is pressed by the pinky of the hand that is not typing the key. */
export function shiftFinger(character: string): number {
  const location = locations.get(character);
  if (!location?.shift) return -1;
  return location.finger <= 4 ? 8 : 1;
}
