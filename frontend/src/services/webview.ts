// Asdfy runs inside a system webview, which offers browser behaviour by default: a page context
// menu (back, reload, inspect), reload and print keys, find, view source and history navigation.
// None of it belongs in a desktop app, so it is switched off. Text fields keep their native menu
// for cut, copy and paste; the hidden typing input does not, so pasting cannot fill an exercise.

const EDITABLE = 'textarea, input[type="search"]';

const KEYS = new Set([
  'F3', 'F5', 'F7', 'F12',
  'BrowserBack', 'BrowserForward', 'BrowserRefresh', 'BrowserHome', 'BrowserSearch',
  'BrowserFavorites', 'BrowserStop',
]);
// Ctrl (or ⌘) + key: find, find next, history, downloads, new window, open, print, reload,
// save page and view source.
const COMMAND_KEYS = new Set(['f', 'g', 'h', 'j', 'n', 'o', 'p', 'r', 's', 'u']);
// Ctrl+Shift (or ⌘⇧) + key: inspector, console, element picker, clear browsing data and a full
// reload.
const INSPECTOR_KEYS = new Set(['i', 'j', 'c', 'k', 'delete']);

type Shortcut = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>;

export function isBrowserShortcut(event: Shortcut): boolean {
  const key = event.key.toLowerCase();
  if (KEYS.has(event.key)) return true;
  // Alt+Left/Right (⌘[ and ⌘] on macOS) move through the webview's history.
  if (event.altKey && !event.ctrlKey && !event.metaKey && (key === 'arrowleft' || key === 'arrowright' || key === 'home')) return true;
  // Ctrl+Alt is AltGr on many layouts, which types characters rather than running commands.
  if (!(event.ctrlKey || event.metaKey) || (event.ctrlKey && event.altKey)) return false;
  if (event.metaKey && (key === '[' || key === ']')) return true;
  if (event.shiftKey) return INSPECTOR_KEYS.has(key) || key === 'r';
  return !event.altKey && COMMAND_KEYS.has(key);
}

function editable(target: EventTarget | null) {
  return target instanceof Element && target.closest(EDITABLE) !== null;
}

export function lockWebview(target: Window = window) {
  target.addEventListener('contextmenu', event => {
    if (!editable(event.target)) event.preventDefault();
  });
  // Capture first so no page handler sees, or lets through, a browser shortcut.
  target.addEventListener('keydown', event => {
    if (isBrowserShortcut(event)) { event.preventDefault(); event.stopPropagation(); }
  }, { capture: true });
  // The mouse's back and forward buttons navigate the webview's history.
  for (const type of ['mousedown', 'mouseup', 'auxclick'] as const) {
    target.addEventListener(type, event => {
      if (event.button === 3 || event.button === 4) event.preventDefault();
    });
  }
}
