export const layout = [
  ['q', 'w', 'f', 'p', 'b', 'j', 'l', 'u', 'y', ';'],
  ['a', 'r', 's', 't', 'g', 'm', 'n', 'e', 'i', 'o'],
  ['z', 'x', 'c', 'd', 'v', 'k', 'h', ',', '.', '/'],
];

export const fingerColors = [
  '#cbd5e1', '#fda4af', '#fbbf24', '#fde047', '#a7f3d0',
  '#99f6e4', '#bae6fd', '#c7d2fe', '#ddd6fe',
];

const fingers: Record<string, number> = {
  q: 1, a: 1, z: 1, w: 2, r: 2, x: 2, f: 3, s: 3, c: 3,
  p: 4, t: 4, d: 4, b: 4, g: 4, v: 4,
  j: 5, l: 5, m: 5, n: 5, k: 5, h: 5,
  u: 6, e: 6, ',': 6, y: 7, i: 7, '.': 7, ';': 8, o: 8, '/': 8, ' ': 0,
};

const shifted: Record<string, string> = {
  ':': ';', '<': ',', '>': '.', '?': '/',
};

export function physicalKey(character: string): string {
  return shifted[character] ?? character.toLowerCase();
}

export function getFinger(character: string): number {
  return fingers[physicalKey(character)] ?? -1;
}
