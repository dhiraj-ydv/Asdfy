import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBrowserShortcut } from '../src/services/webview.ts';

const press = (key, modifiers = {}) =>
  ({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...modifiers });

test('browser reload, print, find, inspector and history shortcuts are blocked', () => {
  for (const event of [
    press('F5'), press('F12'), press('F3'), press('F7'), press('BrowserBack'),
    press('r', { ctrlKey: true }), press('R', { ctrlKey: true, shiftKey: true }),
    press('p', { ctrlKey: true }), press('f', { metaKey: true }), press('u', { ctrlKey: true }),
    press('I', { ctrlKey: true, shiftKey: true }), press('J', { ctrlKey: true, shiftKey: true }),
    press('C', { ctrlKey: true, shiftKey: true }), press('i', { metaKey: true, shiftKey: true }),
    press('ArrowLeft', { altKey: true }), press('ArrowRight', { altKey: true }), press('[', { metaKey: true }),
  ]) assert.equal(isBrowserShortcut(event), true, JSON.stringify(event));
});

test('typing, editing and app shortcuts still reach the page', () => {
  for (const event of [
    press('a'), press('R', { shiftKey: true }), press('Tab'), press('Escape'), press('Enter'), press('Backspace'),
    press('c', { ctrlKey: true }), press('v', { ctrlKey: true }), press('x', { metaKey: true }),
    press('a', { ctrlKey: true }), press('z', { ctrlKey: true }), press('Backspace', { ctrlKey: true }),
    press('ArrowLeft', { ctrlKey: true }), press('ArrowLeft', { shiftKey: true }),
    // AltGr arrives as Ctrl+Alt on Windows and types characters such as @ and €.
    press('@', { ctrlKey: true, altKey: true }), press('r', { ctrlKey: true, altKey: true }),
  ]) assert.equal(isBrowserShortcut(event), false, JSON.stringify(event));
});
