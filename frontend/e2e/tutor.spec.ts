import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const results: Record<string, unknown>[] = [];
    Object.assign(window, {
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: Record<string, unknown> = {}) => {
          switch (command) {
            case 'get_lessons': return [
              { id: 1, title: 'Home Row - Basic', content: 'arst', level: 1 },
              { id: 2, title: 'Home Row - DH Focus', content: 'neio', level: 1 },
            ];
            case 'get_progress': return results.slice().reverse();
            case 'save_progress': {
              const input = args.input as Record<string, unknown>;
              results.push({ ...input, id: results.length + 1, completed_at: new Date().toISOString() });
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
  await expect(page.getByLabel('Type the displayed lesson here')).toBeFocused();
});

test('complete, repeat, next lesson, history, and version', async ({ page }) => {
  await page.keyboard.type('arst', { delay: 30 });
  await expect(page.getByRole('dialog', { name: 'Well Done!' })).toBeVisible();
  await expect(page.getByText('Result saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Practice Again' }).click();
  await expect(page.getByLabel('Type the displayed lesson here')).toHaveValue('');
  await page.keyboard.type('arst', { delay: 30 });
  await page.getByRole('button', { name: 'Next Lesson' }).click();
  await expect(page.locator('.current-lesson-name')).toHaveText('Home Row - DH Focus');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Progress History' }).click();
  await expect(page.locator('.history-table tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Updates', exact: false }).click();
  await expect(page.getByText('Installed version: 0.1.2')).toBeVisible();
});

test('drawer shortcuts do not reset practice and custom practice still works', async ({ page }) => {
  await page.keyboard.type('a');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Type the displayed lesson here')).toHaveValue('a');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Custom Practice' }).click();
  await page.getByLabel('Custom practice text').fill('  HELLO\n WORLD  ');
  await page.getByRole('button', { name: 'Start Practice' }).click();
  await page.keyboard.type('hello world', { delay: 20 });
  await expect(page.getByText('Result saved.')).toBeVisible();
});
