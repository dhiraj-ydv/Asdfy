import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildNotices, collectCrates, collectNpm, licenseFiles, licenseIds, withStandardTexts,
} from '../../scripts/third-party-notices.mjs';

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

test('Asdfy is listed before the third-party packages', () => {
  const pkg = (name, source) => ({ name, version: '1.0.0', license: 'MIT', source, repository: 'r', files: [] });
  const notices = buildNotices([pkg('zlib-rs', 'crate'), pkg('Asdfy', 'app'), pkg('SQLite', 'bundled')]);
  assert.deepEqual(notices.packages.map(entry => entry.name), ['Asdfy', 'SQLite', 'zlib-rs']);
});

test('license expressions are split into SPDX identifiers', () => {
  assert.deepEqual(licenseIds('(MIT OR Apache-2.0) AND Unicode-3.0'), ['MIT', 'Apache-2.0', 'Unicode-3.0']);
  assert.deepEqual(licenseIds('MIT/Apache-2.0'), ['MIT', 'Apache-2.0']);
  assert.deepEqual(licenseIds('Apache-2.0 WITH LLVM-exception OR MIT'), ['Apache-2.0', 'LLVM-exception', 'MIT']);
});

test('packages without license files get the standard text of every license they name', () => {
  const pkg = { name: 'objc2', version: '0.6.5', license: 'Zlib OR Apache-2.0 OR MIT', authors: ['Mads <m@example.com>'],
    files: [] };
  const filled = withStandardTexts(pkg);
  assert.equal(filled.standardText, true);
  assert.deepEqual(filled.files.map(([name]) => name),
    ['Zlib (standard text)', 'Apache-2.0 (standard text)', 'MIT (standard text)']);
  assert.match(filled.files[2][1], /^MIT License\n\nCopyright \(c\) Mads\n/);
  assert.match(withStandardTexts({ ...pkg, license: 'BSD-3-Clause', authors: [] }).files[0][1],
    /^Copyright \(c\) the objc2 authors\n/);
  const shipped = { ...pkg, files: [['LICENSE', 'text']] };
  assert.equal(withStandardTexts(shipped), shipped);
  assert.throws(() => withStandardTexts({ ...pkg, license: 'WTFPL' }), /no WTFPL\.txt/);
});

test('every license a current dependency may fall back to has a template', () => {
  for (const id of ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'MPL-2.0', 'Zlib']) {
    const [[, text]] = withStandardTexts({ name: 'x', version: '1', license: id, files: [] }).files;
    assert.doesNotMatch(text, /<year>|<owner>|<copyright holders>/);
  }
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
