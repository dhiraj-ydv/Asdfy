import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const results: Record<string, unknown>[] = [];
    const lessons = [
      { id: 1, stage: 'Home row', title: 'Home row anchors', kind: 'text', keys: '', content: 'asdf' },
      { id: 2, stage: 'Home row', title: 'Inner reach: G and H', kind: 'text', keys: '', content: 'jkl;' },
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
        // Channels register a callback that the native side streams messages to.
        transformCallback: (callback: (message: unknown) => void) => {
          Object.assign(window, { channel: callback });
          return 1;
        },
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
            case 'data_location': return '/home/user/.local/share/io.github.exolithelabs.asdfy';
            case 'lighting_connect': return { device: 'Test Keyboard', keys: 30 };
            case 'lighting_highlight': Object.assign(window, { lit: args.keys }); return;
            case 'lighting_disconnect': return;
            case 'update_check': return { version: '0.2.0', notes: 'Faster drills.', installable: true };
            case 'update_install': {
              const send = (window as unknown as { channel: (message: unknown) => void }).channel;
              send({ index: 0, message: { downloaded: 50, total: 100 } });
              await new Promise(resolve => setTimeout(resolve, 300));
              return;
            }
            case 'restart_application': Object.assign(window, { restarted: true }); return;
            default: throw new Error(`Unexpected command: ${command}`);
          }
        },
      },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Learn to touch type' })).toBeVisible();
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
  await expect(page.getByRole('heading', { level: 1, name: 'Inner reach: G and H' })).toBeVisible();
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(page.getByRole('table', { name: 'Recent sessions' }).locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('Asdfy version 0.1.2')).toBeVisible();
  await expect(page.getByText('/home/user/.local/share/io.github.exolithelabs.asdfy')).toBeVisible();
});

test('escape restarts typing, navigation keeps the session, and custom practice works', async ({ page }) => {
  await page.getByRole('button', { name: 'Start lesson' }).click();
  await expect(typingInput(page)).toBeFocused();
  await page.keyboard.type('as');
  await expect(typingInput(page)).toHaveValue('as');
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

test('licenses and notices list Asdfy first and keep open entries open while filtering', async ({ page }) => {
  // CI generates the notices before these tests; see the quality job in desktop-build.yml.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Licenses and notices' }).click();
  const dialog = page.getByRole('dialog', { name: 'Licenses and notices' });
  const filter = dialog.getByLabel('Filter packages');
  await expect(dialog.locator('summary').first()).toContainText('Asdfy');
  await dialog.locator('summary').first().click();
  await expect(dialog.locator('pre')).toHaveCount(2);
  await expect(dialog.locator('pre').first()).toContainText('Apache License');
  await filter.fill('vue');
  await expect(dialog.locator('summary').first()).toContainText('@vue/');
  await expect(dialog.locator('pre')).toHaveCount(0);
  await filter.fill('');
  await expect(dialog.locator('details').first()).toHaveAttribute('open', '');
  await expect(dialog.locator('pre')).toHaveCount(2);
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
});

test('the physical keyboard backlight follows the next key when enabled', async ({ page }) => {
  const litKey = () => page.evaluate(() => (window as unknown as { lit?: { key: string }[] }).lit?.[0]?.key ?? null);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: /Light the next key/ }).click();
  await expect(page.getByText('Connected to Test Keyboard (30 keys).')).toBeVisible();
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await page.getByRole('button', { name: 'Start lesson' }).click();
  await expect(typingInput(page)).toBeFocused();
  await expect.poll(litKey).toBe('a');
  await page.keyboard.type('a');
  await expect.poll(litKey).toBe('s');
});

test('an available update is announced and installed in the app', async ({ page }) => {
  await page.getByRole('button', { name: 'Update to 0.2.0' }).click();
  await expect(page.getByText('Asdfy version 0.1.2')).toBeVisible();
  await expect(page.getByText('Asdfy 0.2.0 is available.')).toBeVisible();
  await expect(page.getByText('Faster drills.')).toBeVisible();
  await page.getByRole('button', { name: 'Update now' }).click();
  await expect(page.getByText('Downloading Asdfy 0.2.0… 50%')).toBeVisible();
  await expect(page.getByText('Asdfy 0.2.0 is installed. Restart to start using it.')).toBeVisible();
  await page.getByRole('button', { name: 'Restart now' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { restarted?: boolean }).restarted)).toBe(true);
});
