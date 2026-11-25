// Writes the third-party license notices that Settings → About shows, from the Rust crates and npm
// packages that go into the app. Tauri runs it before every frontend build, so each package lists
// the crates for the platform it was built for.
// Usage: node scripts/third-party-notices.mjs [output file]
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutput = join(root, 'frontend/src/generated/third-party-notices.json');
const licenseName = /^(licen[cs]e|copying|copyright|notice|unlicense)([-._ ].*)?$/i;

/** License and notice files in a package folder, as `[file name, text]` pairs sorted by name. */
export function licenseFiles(dir, extra = []) {
  const names = new Set(extra);
  for (const name of readdirSync(dir)) if (licenseName.test(name)) names.add(name);
  return [...names].sort()
    .map(name => join(dir, name))
    .filter(path => existsSync(path) && statSync(path).isFile())
    .map(path => [path.slice(dir.length + 1), readFileSync(path, 'utf8').replace(/\r\n?/g, '\n').trim()]);
}

/**
 * Rust crates linked into the app: everything reachable from the root crate through normal
 * dependencies. Build scripts and dev-dependencies are not shipped, so their edges are skipped.
 */
export function collectCrates(metadata) {
  const packages = new Map(metadata.packages.map(pkg => [pkg.id, pkg]));
  const nodes = new Map(metadata.resolve.nodes.map(node => [node.id, node]));
  const seen = new Set();
  const queue = [metadata.resolve.root];
  while (queue.length) {
    const node = nodes.get(queue.pop());
    for (const dep of node.deps) {
      if (seen.has(dep.pkg) || !dep.dep_kinds.some(kind => kind.kind === null)) continue;
      seen.add(dep.pkg);
      queue.push(dep.pkg);
    }
  }
  return [...seen].map(id => packages.get(id)).filter(pkg => pkg.source !== null).map(pkg => {
    const dir = dirname(pkg.manifest_path);
    return {
      name: pkg.name, version: pkg.version, license: pkg.license ?? 'See license file', source: 'crate',
      repository: pkg.repository ?? pkg.homepage ?? `https://crates.io/crates/${pkg.name}`,
      files: licenseFiles(dir, pkg.license_file ? [pkg.license_file] : []),
      dir,
    };
  });
}

/** npm packages the frontend bundle can import: the frontend's runtime dependencies and theirs. */
export function collectNpm(frontendDir) {
  const found = new Map();
  const visit = (fromDir, name, optional) => {
    // Node resolution: the nearest node_modules folder that has the package, walking up to the frontend.
    let dir = fromDir;
    let pkgDir;
    for (;;) {
      const candidate = join(dir, 'node_modules', name);
      if (existsSync(join(candidate, 'package.json'))) { pkgDir = candidate; break; }
      if (dir === frontendDir) break;
      dir = dirname(dir);
    }
    if (!pkgDir) {
      if (optional) return;
      throw new Error(`${name} is not installed; run npm --prefix frontend ci first`);
    }
    if (found.has(pkgDir)) return;
    const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
    const repository = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url;
    found.set(pkgDir, {
      name: manifest.name, version: manifest.version, source: 'npm',
      license: typeof manifest.license === 'string' ? manifest.license : manifest.license?.type ?? 'See license file',
      repository: repository?.replace(/^git\+/, '').replace(/\.git$/, '') ?? `https://www.npmjs.com/package/${manifest.name}`,
      files: licenseFiles(pkgDir),
      dir: pkgDir,
    });
    for (const dep of Object.keys(manifest.dependencies ?? {})) visit(pkgDir, dep, false);
    for (const dep of Object.keys(manifest.optionalDependencies ?? {})) visit(pkgDir, dep, true);
  };
  const manifest = JSON.parse(readFileSync(join(frontendDir, 'package.json'), 'utf8'));
  for (const dep of Object.keys(manifest.dependencies ?? {})) visit(frontendDir, dep, false);
  return [...found.values()];
}

/** SQLite is compiled in from the copy that libsqlite3-sys vendors, so it is credited separately. */
function bundledSqlite(crates) {
  const sys = crates.find(pkg => pkg.name === 'libsqlite3-sys');
  const header = sys && join(sys.dir, 'sqlite3/sqlite3.h');
  if (!header || !existsSync(header)) return [];
  const version = readFileSync(header, 'utf8').match(/#define SQLITE_VERSION\s+"([^"]+)"/)?.[1] ?? 'bundled';
  return [{
    name: 'SQLite', version, license: 'Public Domain', source: 'crate', repository: 'https://sqlite.org/copyright.html',
    files: [['blessing', 'The author disclaims copyright to this source code. In place of a legal notice, here is a blessing:\n\n'
      + '    May you do good and not evil.\n    May you find forgiveness for yourself and forgive others.\n'
      + '    May you share freely, never taking more than you give.']],
  }];
}

/**
 * Notices as the app reads them. License texts are stored once and referenced by id, since most
 * crates ship the same Apache-2.0 and MIT texts.
 */
export function buildNotices(packages) {
  const texts = {};
  const entries = packages.map(({ name, version, license, source, repository, files }) => {
    const ids = files.map(([, text]) => {
      const id = createHash('sha256').update(text.replace(/\s+/g, ' ')).digest('hex').slice(0, 16);
      texts[id] ??= text;
      return id;
    });
    return { name, version, license, source, repository, texts: [...new Set(ids)] };
  });
  entries.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version, undefined, { numeric: true }));
  return { packages: entries, texts };
}

/** Target triples whose crates the build links; Tauri names the target in TAURI_ENV_TARGET_TRIPLE. */
function targetTriples() {
  const triple = process.env.TAURI_ENV_TARGET_TRIPLE
    || execFileSync('rustc', ['-vV'], { encoding: 'utf8' }).match(/^host: (.+)$/m)[1];
  return triple === 'universal-apple-darwin' ? ['aarch64-apple-darwin', 'x86_64-apple-darwin'] : [triple];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const output = resolve(process.argv[2] ?? defaultOutput);
  const triples = targetTriples();
  const metadata = JSON.parse(execFileSync('cargo', [
    'metadata', '--format-version', '1', '--locked', '--manifest-path', join(root, 'src-tauri/Cargo.toml'),
    ...triples.flatMap(triple => ['--filter-platform', triple]),
  ], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }));
  const crates = collectCrates(metadata);
  const packages = [...crates, ...bundledSqlite(crates), ...collectNpm(join(root, 'frontend'))];
  const notices = buildNotices(packages);
  const missing = notices.packages.filter(pkg => !pkg.texts.length).map(pkg => `${pkg.name} ${pkg.version}`);
  if (missing.length) console.warn(`No license file shipped with: ${missing.join(', ')}`);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(notices) + '\n');
  console.log(`Wrote notices for ${notices.packages.length} packages (${triples.join(', ')}) to ${output}`);
}
