import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const version = JSON.parse(read('package.json')).version;
const appId = 'io.github.exolithelabs.asdfy';
const versions = [
  JSON.parse(read('package-lock.json')).version,
  JSON.parse(read('src-tauri/tauri.conf.json')).version,
  read('src-tauri/Cargo.toml').match(/^version = "([^"]+)"/m)?.[1],
  read('src-tauri/Cargo.lock').match(/name = "asdfy"\r?\nversion = "([^"]+)"/)?.[1],
];
for (const value of versions) assert.equal(value, version, 'Application versions disagree');
// The identifier names every platform's data folder; changing it strands existing progress.
const identifier = JSON.parse(read('src-tauri/tauri.conf.json')).identifier;
assert.equal(identifier, appId, 'Tauri identifier must stay ' + appId);
if (process.env.GITHUB_REF_TYPE === 'tag') {
  assert.match(process.env.GITHUB_REF_NAME, /^v\d+\.\d+\.\d+$/);
  assert.equal(process.env.GITHUB_REF_NAME, 'v' + version);
}
console.log('Application version verified:', version);
