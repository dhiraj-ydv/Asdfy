// Writes latest.json, the manifest the in-app updater reads, from a folder of signed release files.
// Usage: node scripts/updater-manifest.mjs <release folder> <tag> [notes]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repository = 'exolithelabs/Asdfy';
// The universal macOS archive serves both Mac architectures.
const payloads = [
  ['linux-x86_64', name => name.endsWith('.AppImage')],
  ['windows-x86_64', name => name.endsWith('-setup.exe')],
  ['darwin-aarch64', name => name.endsWith('.app.tar.gz')],
  ['darwin-x86_64', name => name.endsWith('.app.tar.gz')],
];

/** `signatures` maps each update file's name to the contents of its `.sig` file. */
export function buildManifest(files, signatures, tag, notes, date = new Date()) {
  const platforms = {};
  for (const [platform, matches] of payloads) {
    const found = files.filter(matches);
    if (found.length !== 1) throw new Error(`Expected one update file for ${platform}, found ${found.length}`);
    const signature = signatures[found[0]]?.trim();
    if (!signature) {
      throw new Error(`${found[0]} has no .sig file; build with createUpdaterArtifacts and TAURI_SIGNING_PRIVATE_KEY`);
    }
    const url = `https://github.com/${repository}/releases/download/${tag}/${encodeURIComponent(found[0])}`;
    platforms[platform] = { signature, url };
  }
  return { version: tag.replace(/^v/, ''), notes, pub_date: date.toISOString(), platforms };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [folder, tag, notes = `See https://github.com/${repository}/releases/tag/${tag} for what changed.`] =
    process.argv.slice(2);
  const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
  if (!folder || tag !== 'v' + version) {
    console.error(`Usage: node scripts/updater-manifest.mjs <release folder> v${version} [notes]`);
    process.exit(2);
  }
  const files = readdirSync(folder);
  const signatures = Object.fromEntries(files.filter(name => name.endsWith('.sig'))
    .map(name => [name.slice(0, -'.sig'.length), readFileSync(join(folder, name), 'utf8')]));
  writeFileSync(join(folder, 'latest.json'), JSON.stringify(buildManifest(files, signatures, tag, notes), null, 2) + '\n');
  console.log('Wrote latest.json for', version);
}
