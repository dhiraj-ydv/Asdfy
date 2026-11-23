/** Stroke paths on a 24×24 grid, drawn with round caps and joins. */
export const ICONS = {
  learn: 'M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2zM22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z',
  adaptive: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9M12 12h.01',
  test: 'M10 2h4M12 14l3-3M12 6a8 8 0 1 0 0 16a8 8 0 1 0 0-16',
  custom: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
  stats: 'M3 3v18h18M8 17v-4M13 17V8M18 17v-7',
  settings: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  back: 'M19 12H5M12 19l-7-7 7-7',
  restart: 'M3 12a9 9 0 1 0 2.6-6.4L3 8M3 3v5h5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  flame: 'M12 22a7 7 0 0 0 7-7c0-4-3-6.5-4.5-10-1.5 2.5-2 4-1.5 6-1.5-1-2.5-2.5-2.5-4.5C7.5 9 5 11.5 5 15a7 7 0 0 0 7 7z',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M8 14h8',
  upload: 'M12 15V4M7 9l5-5 5 5M4 20h16',
  power: 'M12 2v9M6.3 6.3a8 8 0 1 0 11.4 0',
} as const;

export type IconName = keyof typeof ICONS;
