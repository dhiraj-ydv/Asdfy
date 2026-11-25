import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildManifest } from '../../scripts/updater-manifest.mjs';

const files = [
  'Asdfy_0.2.0_amd64.AppImage', 'Asdfy_0.2.0_amd64.AppImage.sig',
  'Asdfy_0.2.0_x64-setup.exe', 'Asdfy_0.2.0_x64-setup.exe.sig',
  'Asdfy.app.tar.gz', 'Asdfy.app.tar.gz.sig', 'Asdfy_0.2.0_universal.dmg', 'SHA256SUMS',
];
const signatures = {
  'Asdfy_0.2.0_amd64.AppImage': 'linux\n', 'Asdfy_0.2.0_x64-setup.exe': 'windows', 'Asdfy.app.tar.gz': 'mac',
};

test('the updater manifest points each platform at its signed release file', () => {
  const date = new Date('2026-11-25T00:00:00Z');
  const manifest = buildManifest(files, signatures, 'v0.2.0', 'Notes', date);
  const download = 'https://github.com/exolithelabs/Asdfy/releases/download/v0.2.0/';
  assert.deepEqual(manifest, {
    version: '0.2.0', notes: 'Notes', pub_date: '2026-11-25T00:00:00.000Z',
    platforms: {
      'linux-x86_64': { signature: 'linux', url: download + 'Asdfy_0.2.0_amd64.AppImage' },
      'windows-x86_64': { signature: 'windows', url: download + 'Asdfy_0.2.0_x64-setup.exe' },
      'darwin-aarch64': { signature: 'mac', url: download + 'Asdfy.app.tar.gz' },
      'darwin-x86_64': { signature: 'mac', url: download + 'Asdfy.app.tar.gz' },
    },
  });
});

test('missing update files or signatures stop the manifest', () => {
  assert.throws(() => buildManifest(files.filter(name => !name.endsWith('.AppImage')), signatures, 'v0.2.0', ''),
    /linux-x86_64, found 0/);
  assert.throws(() => buildManifest(files, { ...signatures, 'Asdfy.app.tar.gz': '' }, 'v0.2.0', ''), /no \.sig file/);
});
