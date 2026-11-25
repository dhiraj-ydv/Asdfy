import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNotices, collectCrates, collectNpm, licenseFiles } from '../../scripts/third-party-notices.mjs';

const normal = [{ kind: null, target: null }];

function crate(dir, name, files = {}) {
  mkdirSync(join(dir, name), { recursive: true });
  for (const [file, text] of Object.entries(files)) writeFileSync(join(dir, name, file), text);
  return {
    id: name, name, version: '1.0.0', license: 'MIT', license_file: null, source: 'registry', repository: null,
    homepage: null, manifest_path: join(dir, name, 'Cargo.toml'),
  };
}

test('license and notice files are found by name, with CRLF line endings normalized', () => {
  const dir = mkdtempSync(join(tmpdir(), 'notices-'));
  writeFileSync(join(dir, 'LICENSE-MIT'), 'MIT text\r\n');
  writeFileSync(join(dir, 'NOTICE'), 'Notice');
  writeFileSync(join(dir, 'COPYING.txt'), 'Copying');
  writeFileSync(join(dir, 'lib.rs'), '');
  mkdirSync(join(dir, 'LICENSES'));
  assert.deepEqual(licenseFiles(dir), [['COPYING.txt', 'Copying'], ['LICENSE-MIT', 'MIT text'], ['NOTICE', 'Notice']]);
});

test('only crates linked through normal dependencies are listed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'notices-'));
  const app = { ...crate(dir, 'app'), source: null };
  const packages = [app, crate(dir, 'linked', { LICENSE: 'MIT' }), crate(dir, 'nested'), crate(dir, 'build-only'),
    crate(dir, 'dev-only')];
  const nodes = [
    { id: 'app', deps: [
      { pkg: 'linked', dep_kinds: normal },
      { pkg: 'build-only', dep_kinds: [{ kind: 'build', target: null }] },
      { pkg: 'dev-only', dep_kinds: [{ kind: 'dev', target: null }] },
    ] },
    { id: 'linked', deps: [{ pkg: 'nested', dep_kinds: normal }] },
    { id: 'nested', deps: [] }, { id: 'build-only', deps: [] }, { id: 'dev-only', deps: [] },
  ];
  const crates = collectCrates({ packages, resolve: { root: 'app', nodes } });
  assert.deepEqual(crates.map(pkg => pkg.name).sort(), ['linked', 'nested']);
  const linked = crates.find(pkg => pkg.name === 'linked');
  assert.deepEqual(linked.files, [['LICENSE', 'MIT']]);
  assert.equal(linked.repository, 'https://crates.io/crates/linked');
});

test('identical license texts are stored once and packages are sorted by name', () => {
  const apache = 'Apache License\n  Version 2.0';
  const notices = buildNotices([
    { name: 'b', version: '1.0.0', license: 'Apache-2.0', source: 'crate', repository: 'r', files: [['LICENSE', apache]] },
    { name: 'a', version: '2.0.0', license: 'Apache-2.0', source: 'npm', repository: 'r',
      files: [['LICENSE', apache.replace('\n  ', '\n')], ['NOTICE', 'Copyright A']] },
  ]);
  assert.deepEqual(notices.packages.map(pkg => pkg.name), ['a', 'b']);
  assert.equal(Object.keys(notices.texts).length, 2);
  assert.equal(notices.packages[1].texts[0], notices.packages[0].texts[0]);
});

test('the frontend bundle dependencies are listed with their license files', () => {
  const packages = collectNpm(fileURLToPath(new URL('..', import.meta.url)).replace(/[\/\\]$/, ''));
  const vue = packages.find(pkg => pkg.name === 'vue');
  assert.ok(vue, 'vue is listed');
  assert.equal(vue.license, 'MIT');
  assert.ok(vue.files.some(([name]) => /^license/i.test(name)));
  assert.ok(packages.some(pkg => pkg.name === '@tauri-apps/api'));
  assert.ok(!packages.some(pkg => pkg.name === 'vite'), 'build tools are not listed');
});
