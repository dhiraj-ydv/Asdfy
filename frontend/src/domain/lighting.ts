import { getFinger, physicalKey, shiftFinger } from './keyboard.ts';
import type { LitKey } from './models.ts';

/** The on-screen finger colours (styles/base.css --finger-0…8) as RGB for the physical keyboard. */
const FINGER_RGB: [number, number, number][] = [
  [148, 163, 184], [244, 63, 94], [249, 115, 22], [234, 179, 8], [34, 197, 94],
  [20, 184, 166], [59, 130, 246], [139, 92, 246], [217, 70, 239],
];

/** The physical keys to light for `character`: its key, plus the opposite Shift when needed. */
export function litKeys(character: string): LitKey[] {
  const finger = character ? getFinger(character) : -1;
  if (finger < 0) return [];
  const keys: LitKey[] = [{ key: physicalKey(character), color: FINGER_RGB[finger]! }];
  const shift = shiftFinger(character);
  if (shift >= 0) keys.push({ key: shift === 8 ? 'shift-right' : 'shift-left', color: FINGER_RGB[shift]! });
  return keys;
}
