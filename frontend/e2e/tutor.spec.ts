import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const results: Record<string, unknown>[] = [];
    const lessons = [
      { id: 101, stage: 'Home row', title: 'Home row anchors', kind: 'text', keys: '', content: 'arst' },
      { id: 102, stage: 'Home row', title: 'Inner reach: G and M', kind: 'text', keys: '', content: 'neio' },
    ];
    function summary() {
      const best = new Map<number, { lesson_id: number; best_wpm: number; best_accuracy: number; attempts: number }>();
      for (const result of results) {
        const id = result.lesson_id as number | null;
        if (id === null) continue;
        const previous = best.get(id);
        best.set(id, {
          lesson_id: id,
          best_wpm: Math.max(previous?.best_wpm ?? 0, result.wpm as number),
          best_accuracy: Math.max(previous?.best_accuracy ?? 0, result.accuracy as number),
          attempts: (previous?.attempts ?? 0) + 1,
        });
      }
      return {
        sessions: results.length, duration_ms: 0, best_wpm: 0, lessons: [...best.values()],
        modes: [], days: [], keys: [],
      };
    }
    Object.assign(window, {
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: Record<string, unknown> = {}) => {
          switch (command) {
            case 'get_lessons': return lessons;
            case 'get_summary': return summary();
            case 'get_progress': return results.slice().reverse();
            case 'save_progress': {
              const input = args.input as Record<string, unknown>;
              const lesson = lessons.find(entry => entry.id === input.lesson_id);
              results.push({ ...input, id: results.length + 1, lesson_title: lesson?.title ?? null, completed_at: new Date().toISOString() });
              return;
            }
            case 'app_version': return '0.1.2';
            default: throw new Error(`Unexpected command: ${command}`);
          }
        },
      },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Learn Colemak-DH' })).toBeVisible();
});

const typingInput = (page: Page) => page.getByLabel('Type the displayed text here');

async function typeShownText(page: Page) {
  await expect(typingInput(page)).toBeFocused();
  const text = await page.locator('.typing-text').getAttribute('data-text');
  // What is drawn must match what is judged, character for character.
  await expect(page.locator('.text-inner')).toHaveText(text ?? '');
  await page.keyboard.type(text ?? '', { delay: 30 });
}

test('complete, repeat, next lesson, statistics, and version', async ({ page }) => {
  await page.getByRole('button', { name: 'Start lesson' }).click();
  await typeShownText(page);
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
  await expect(page.getByText('Result saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Practice again' }).click();
  await expect(typingInput(page)).toHaveValue('');
  await typeShownText(page);
  await expect(page.getByText('Result saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Next lesson' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Inner reach: G and M' })).toBeVisible();
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(page.getByRole('table', { name: 'Recent sessions' }).locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('TypeDH version 0.1.2')).toBeVisible();
});

test('escape restarts typing, navigation keeps the session, and custom practice works', async ({ page }) => {
  await page.getByRole('button', { name: 'Start lesson' }).click();
  await expect(typingInput(page)).toBeFocused();
  await page.keyboard.type('ar');
  await expect(typingInput(page)).toHaveValue('ar');
  await page.keyboard.press('Escape');
  await expect(typingInput(page)).toHaveValue('');
  await page.getByRole('button', { name: 'Statistics' }).click();
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Home row anchors' })).toBeVisible();
  await page.getByRole('button', { name: 'Custom text' }).click();
  await page.getByLabel('Custom practice text').fill('  HELLO\n World  ');
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.locator('.typing-text')).toHaveAttribute('data-text', 'HELLO World');
  await typeShownText(page);
  await expect(page.getByText('Result saved.')).toBeVisible();
  await page.getByRole('button', { name: 'New text' }).click();
  await expect(page.getByLabel('Custom practice text')).toHaveValue('  HELLO\n World  ');
});

test('settings persist across reloads', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('radio', { name: 'Dark' }).click();
  await page.getByRole('switch', { name: /Show keyboard/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Start lesson' }).click();
  await expect(typingInput(page)).toBeFocused();
  await expect(page.locator('.keyboard')).toHaveCount(0);
});
