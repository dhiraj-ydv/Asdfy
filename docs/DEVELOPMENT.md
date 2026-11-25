# Development

Production packages are built by GitHub Actions; see [RELEASING.md](RELEASING.md)
for the workflow and how to publish a version. This page covers running the app
locally and how the code is organized.

## Local preview

Use Node.js 22, the current stable Rust toolchain, and the native
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your
operating system. Run commands from the repository root.

```bash
npm ci
npm --prefix frontend ci
npm run tauri dev
```

The frontend reaches its backend through Tauri commands, so running Vite alone in
a browser is not a complete preview. Development launches store progress in a
`development/` subdirectory of the data folder, separate from installed release
builds, and never update themselves.

To build a package for your own platform, run
`npm run tauri build -- --bundles appimage` (Linux), `--bundles nsis` (Windows),
or `--bundles dmg` (macOS). Output is written under
`src-tauri/target/release/bundle/`.

Before each frontend build, Tauri runs `scripts/third-party-notices.mjs`. It
collects Asdfy's `LICENSE` and `NOTICE`, the license and notice files of the
Rust crates linked for the build's target (from `cargo metadata`), the vendored
SQLite, and the frontend's runtime npm dependencies, and writes them to
`frontend/src/generated/third-party-notices.json`, which is not committed. The
frontend bundles that file as a lazily loaded chunk for **Settings → Licenses and
notices**. `npm run tauri dev` skips the step, so the viewer reports that notices
are missing until you run `node scripts/third-party-notices.mjs` yourself.

Some packages are published without a license file. For those, the script uses
the standard text of each license in the package's license expression from
`scripts/licenses/` (SPDX texts), with the package's authors as copyright
holders. The build stops if a license has no template there; add the SPDX text
for that identifier (see `scripts/licenses/README.md`).

## Architecture

| Component | Implementation |
| --- | --- |
| Frontend | Vue 3, TypeScript, CSS, and Vite |
| Desktop shell | Tauri v2 with Rust |
| Local backend | Rust Tauri commands, compiled into the desktop app |
| Data storage | SQLite through rusqlite, with SQLite bundled at compile time |
| Frontend/backend communication | Tauri IPC with typed command payloads |
| Packages | Tauri bundler: AppImage, NSIS installer, and DMG |
| Updates | Tauri updater plugin, driven from Rust, with minisign-signed releases |

The frontend invokes `get_lessons`, `get_summary`, `get_progress`,
`save_progress`, `data_location`, `update_check`, `update_install`, and the
`lighting_*` commands directly through Tauri. The lesson catalog is compiled into
the binary, so lessons load even when storage is unavailable; practice text for
generated lessons, smart practice, and speed tests is built in the frontend from a
bundled word list.

Rust serializes database access on a background worker and validates command
payloads; the webview cannot submit SQL or choose database paths. SQLite runs with
WAL mode, full synchronization, foreign keys, and a write timeout. Failed database
opens can be retried from the UI; writes are never retried automatically, and
load and save failures are shown in the interface. Schema changes follow
[Changing the database schema](RELEASING.md#changing-the-database-schema).

Network access is limited to two paths, both owned by Rust:

- **Updates.** Rust fetches `latest.json` from the repository's latest GitHub
  release and, when asked, the update it names, then verifies the download against
  the public key in `src-tauri/tauri.conf.json`. The webview chooses neither the
  address nor the version; it can only install the release Rust last found.
- **Keyboard backlight.** When switched on, Rust opens a TCP connection to the
  OpenRGB SDK server at `127.0.0.1` and speaks OpenRGB's binary protocol through an
  in-house client written from OpenRGB's protocol documentation. The webview
  chooses neither host nor device.

There is no CORS configuration, API token, or shell plugin.

## Project layout

```text
frontend/src/
  domain/           Plain TypeScript: typing engine, QWERTY keyboard map, drill
                    generator, word list, statistics helpers, and models
  services/         Typed desktop client, settings, and UI preferences
  composables/      App coordination, in-app updates, and DOM typing lifecycle
  shell/            Sidebar navigation and icons
  features/         Learn, smart practice, speed test, custom text, practice
                    session, statistics, and settings views
  styles/           Design tokens (light and dark) and shared components
frontend/tests/     Domain, generator, command boundary, updater, and app-state tests
frontend/e2e/       Browser interaction tests with a mocked native boundary
src-tauri/src/
  content/          Built-in lesson catalog
  models.rs         Command payloads and validation
  commands.rs       Thin asynchronous IPC handlers
  storage/          SQLite repository, numbered schema migrations, and persistence tests
  lighting/         OpenRGB SDK client for the optional keyboard backlight, with a
                    fake-server test suite
src-tauri/icons/    App icon source (app-icon.svg) and generated platform icons
scripts/            Release version checks, the updater manifest (latest.json) builder,
                    the license notice generator, and its SPDX license templates (licenses/)
.github/            Build/release workflow and Dependabot configuration
docs/               Maintainer documentation
package.json        Root npm project: Tauri CLI plus the version source of truth
```

Two npm manifests are intentional: Tauri builds the frontend as a separate project
(`beforeBuildCommand: npm --prefix frontend run build`,
`frontendDist: ../frontend/dist` in `src-tauri/tauri.conf.json`), and CI installs,
caches, and audits both. Keep `package.json` / `package-lock.json` and
`frontend/package.json` / `frontend/package-lock.json` in sync. The release check
validates the root app, Rust, and Tauri versions; the private frontend package has
its own version.

## App icon

Edit `src-tauri/icons/app-icon.svg`, run
`npx tauri icon src-tauri/icons/app-icon.svg -o src-tauri/icons`, and delete the
generated `android`, `ios`, and `Square*`/`StoreLogo` files, which are not used.
