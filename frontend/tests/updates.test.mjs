import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progressFraction, useUpdates } from '../src/composables/useUpdates.ts';

const release = { version: '0.2.0', notes: 'Faster drills.', installable: true };
function client(overrides = {}) {
  return { checkUpdate: async () => release, installUpdate: async () => {}, restart: async () => {}, ...overrides };
}

test('a newer release is announced, downloaded with progress, and installed', async () => {
  const seen = [];
  const updates = useUpdates(client({
    installUpdate: async onProgress => {
      onProgress({ downloaded: 0, total: null });
      seen.push(updates.update.progress);
      onProgress({ downloaded: 50, total: 200 });
      seen.push(updates.update.state, updates.update.progress);
    },
  }));
  await updates.check();
  assert.equal(updates.update.state, 'available');
  assert.equal(updates.update.version, '0.2.0');
  assert.equal(updates.update.notes, 'Faster drills.');
  await updates.install();
  assert.deepEqual(seen, [null, 'downloading', 0.25]);
  assert.equal(updates.update.state, 'installed');
  // An installed update waits for the restart instead of checking again.
  await updates.check();
  assert.equal(updates.update.state, 'installed');
});

test('no newer release reports the latest version', async () => {
  const updates = useUpdates(client({ checkUpdate: async () => null }));
  await updates.check();
  assert.equal(updates.update.state, 'current');
});

test('startup checks fail quietly while manual checks explain', async () => {
  const updates = useUpdates(client({ checkUpdate: async () => { throw 'GitHub could not be reached.'; } }));
  await updates.check(true);
  assert.equal(updates.update.state, 'idle');
  assert.equal(updates.update.message, '');
  await updates.check();
  assert.equal(updates.update.state, 'error');
  assert.equal(updates.update.message, 'GitHub could not be reached.');
});

test('a failed install can be retried, and builds that cannot update never install', async () => {
  let installs = 0;
  const updates = useUpdates(client({ installUpdate: async () => { installs++; throw 'Signature did not match.'; } }));
  await updates.check();
  await updates.install();
  assert.equal(updates.update.state, 'available');
  assert.equal(updates.update.message, 'Signature did not match.');
  await updates.install();
  assert.equal(installs, 2);

  const manual = useUpdates(client({
    checkUpdate: async () => ({ ...release, installable: false }),
    installUpdate: async () => { throw new Error('must not install'); },
  }));
  await manual.check();
  await manual.install();
  assert.equal(manual.update.state, 'available');
});

test('restart failures ask the user to reopen the app', async () => {
  const updates = useUpdates(client({ restart: async () => { throw new Error(); } }));
  await updates.restart();
  assert.match(updates.update.message, /reopen/);
});

test('progress is a clamped fraction, or unknown without a total', () => {
  assert.equal(progressFraction({ downloaded: 50, total: 100 }), 0.5);
  assert.equal(progressFraction({ downloaded: 150, total: 100 }), 1);
  assert.equal(progressFraction({ downloaded: 10, total: null }), null);
  assert.equal(progressFraction({ downloaded: 10, total: 0 }), null);
});
