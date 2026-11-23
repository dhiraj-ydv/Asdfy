# TypeDH

[Downloads](#downloads-and-installation) · [Usage](#using-the-app) · [User data](#user-data-and-privacy) · [Architecture](#architecture) · [GitHub workflow](#github-builds-and-releases) · [Development](#development) · [Support](#support-and-security) · [License](#license)

**TypeDH — Colemak-DH typing tutor**, with a staged course that introduces
keys a few at a time, smart practice aimed at your weakest keys, timed speed
tests, custom text, live keyboard and finger guidance, and detailed local
statistics. No account or cloud database is required.

[Download a release](https://github.com/dhiraj-ydv/typedh/releases) ·
[View GitHub builds](https://github.com/dhiraj-ydv/typedh/actions/workflows/desktop-build.yml) ·
[Report a bug](https://github.com/dhiraj-ydv/typedh/issues)

## Downloads and installation

Open [GitHub Releases](https://github.com/dhiraj-ydv/typedh/releases),
choose a version, and expand **Assets**. The published package is a
Flatpak single-file bundle for x86-64, installed with `flatpak install`.

| Download | Purpose |
| --- | --- |
| `typedh-<version>-x86_64.flatpak` | Flatpak bundle (`flatpak install`) |

The automatically generated **Source code** archives contain project sources,
not installers. Installed users do not need development tools.

### Linux (Flatpak bundle install)

Install Flatpak itself through your distribution first (for example,
`sudo pacman -S flatpak` on Arch, `sudo apt install flatpak` on Ubuntu),
then add the Flathub remote once so the GNOME runtime can be resolved:

```bash
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

Install or update with `flatpak install` using the `.flatpak` bundle from
GitHub Releases. The same command upgrades an older installed version when
given a newer bundle file.

#### 1. Download then install/update

Download the `.flatpak` bundle from GitHub Releases (browser), then:

```bash
flatpak install --user ./typedh-<version>-x86_64.flatpak
```

#### 2. Direct URL install/update (no browser download)

```bash
flatpak install --user "https://github.com/dhiraj-ydv/typedh/releases/download/v0.1.2/typedh-0.1.2-x86_64.flatpak"
```

Replace `v0.1.2` / `0.1.2` with the version you want.

#### 3. curl then flatpak install

```bash
curl -L -O "https://github.com/dhiraj-ydv/typedh/releases/download/v0.1.2/typedh-0.1.2-x86_64.flatpak"
flatpak install --user ./typedh-0.1.2-x86_64.flatpak
```

All three are the same packaging method; only how the file reaches `flatpak`
differs.

Launch **TypeDH** from your application menu, or run
`flatpak run io.github.exolithelabs.typedh` from a terminal. The app runs
sandboxed on the GNOME 49 runtime with no network permission; the runtime is
fetched from Flathub on first install when missing. The app is not published
to Flathub; GitHub Releases is the distribution path. Updates are manual via
`flatpak install` with a newer bundle file.

### Updating

Open **Settings** to see the installed version. To update,
run `flatpak install --user` with the newer `.flatpak` bundle file or URL
(see the Linux section). Your lessons and progress are kept.

## Using the app

1. Enable Colemak-DH (ANSI) in your operating system's keyboard settings. The
   tutor reads your keyboard input; it does not change the system layout.
2. **Learn** shows the course: six stages from the home row through the bottom
   and top rows, the full alphabet, capitals, punctuation, numbers, and real
   prose and code. Each lesson drills real words made only from letters you have
   already learned. A lesson is passed at 90% accuracy; **Start lesson** /
   **Continue lesson** always opens the first lesson you have not passed.
3. **Smart practice** ranks keys by how often you miss them and how long they
   take, then builds a drill around the three weakest. Choose letters learned so
   far or the full alphabet, and 25, 50, or 100 words.
4. **Speed test** runs 15, 30, 60, or 120 seconds of common words, optionally
   with punctuation and capitals or numbers. The timer starts on the first key.
5. **Custom text** practises pasted text or a `.txt` file (up to 10,000
   characters). Curly quotes, dashes, and ellipses become typeable ASCII and
   whitespace collapses to single spaces; case is kept unless **Lowercase** is
   switched on. The text itself is never saved.
6. While typing, the keyboard highlights the next key in its finger's colour
   (and the Shift key for capitals and symbols), and the finger guide names the
   finger to use. Every keystroke is judged when typed, so corrected mistakes
   still count against accuracy. Results show speed, accuracy, raw speed, time,
   mistakes, missed keys, and your previous best.
7. **Statistics** shows totals, speed and accuracy trends, a per-key accuracy
   heatmap, your weakest keys, an activity calendar, and session history.
8. **Settings** offers system, light, or dark theme; three typing text sizes;
   stop on errors (the cursor waits for the correct key); and toggles for the
   keyboard and finger guide. Settings are remembered on this computer.

| Shortcut | Action |
| --- | --- |
| `Tab` | Focus the typing input |
| `Escape` | Restart the current exercise, or practise again from the results |
| `Enter` | Continue from the results (next lesson, new drill, or new test) |

## User data and privacy

On first launch, the desktop application creates its data directory for the
current OS user. The backend creates `progress.sqlite3` there and registers the
built-in lesson titles. Later launches reuse that database. Each completed
session stores its mode, lesson, speed, raw speed, accuracy, duration, character
and mistake counts, and adds per-key hit, miss, and timing totals. Different OS users have separate
progress; there is no cloud synchronization or online login.

TypeDH is pre-launch and distributed only as a Flatpak application with ID
`io.github.exolithelabs.typedh`. No migration from earlier development
packages is required.

The source repository contains code and bundled assets. Runtime databases,
generated binaries, dependency directories, and build output are ignored by Git.
The installed application passes an explicit per-user data path to the backend,
so normal app startup does not store progress in the repository or install folder.

Database location for the application ID
`io.github.exolithelabs.typedh`:

`~/.var/app/io.github.exolithelabs.typedh/data/io.github.exolithelabs.typedh/progress.sqlite3`
on the host. Flatpak sets the sandbox's `XDG_DATA_HOME` to its private data directory.

Tauri resolves the exact path from the OS environment. The webview also stores
small UI preferences (theme, text size, and practice toggles) in its local
storage. Those preferences are separate from the SQLite progress database.

To back up progress, fully exit the app, then copy the database
directory somewhere safe. SQLite may also create `progress.sqlite3-wal` and
`progress.sqlite3-shm` companion files; do not delete them while the app is running.
Keeping the same application ID lets subsequent versions locate the existing
database. Back up your progress before upgrading a prerelease.

Fresh installs create a native SQLite database automatically. Databases from
TypeDH 0.1.x (schema version 1) are upgraded in place on first launch: the app
first writes a complete copy named `progress.v1-backup-<unix-time>.sqlite3` next
to the database, then migrates inside a single transaction. Earlier results are
kept with their original lesson titles; earlier custom-practice results become
custom sessions. Older results have no duration or per-key data. If the backup
cannot be written, the database is left unchanged and the error is shown.

Databases with an unknown schema version, such as one written by a newer
release, are rejected without being modified. To start fresh, close the app and
move `progress.sqlite3` and its `-wal`/`-shm` files out of the app-data folder,
then restart. History loads newest first in pages of 100 results.

## Architecture

| Component | Implementation |
| --- | --- |
| Frontend | Vue 3, TypeScript, CSS, and Vite |
| Desktop shell | Tauri v2 with Rust |
| Local backend | Rust Tauri commands, compiled into the desktop app |
| Data storage | SQLite through rusqlite, with SQLite bundled at compile time |
| Frontend/backend communication | Tauri IPC with typed command payloads |

The frontend invokes `get_lessons`, `get_summary`, `get_progress`, and
`save_progress` directly through Tauri. The lesson catalog is compiled into the
binary, so lessons load even when storage is unavailable; practice text for
generated lessons, smart practice, and speed tests is built in the frontend from a
bundled word list. Rust serializes database access on a background worker and
validates the command payloads; the webview cannot submit SQL or choose database paths.
The app makes no HTTP requests. There is no in-app updater, CORS configuration,
API tokens, or shell plugin.
SQLite retains WAL mode, full synchronization, foreign keys, and a write timeout.
Failed database opens can be retried from the UI. Writes are never retried
automatically, and loading/save failures are shown in the interface.

Project layout:

```text
frontend/src/
  domain/           Plain TypeScript: typing engine, keyboard map, drill generator,
                    word list, statistics helpers, and models
  services/         Typed desktop client, settings, and UI preferences
  composables/      App coordination and DOM typing lifecycle
  shell/            Sidebar navigation and icons
  features/         Learn, smart practice, speed test, custom text, practice
                    session, statistics, and settings views
  styles/           Design tokens (light and dark) and shared components
frontend/tests/     Domain, generator, command boundary, and app-state tests
frontend/e2e/       Browser interaction tests with a mocked native boundary
src-tauri/src/
  content/          Built-in lesson catalog
  models.rs         Command payloads and validation
  commands.rs       Thin asynchronous IPC handlers
  storage/          SQLite repository, schema, v1 migration, and persistence tests
scripts/            Release version checks
packaging/flatpak/ Flatpak manifest, desktop entry, AppStream metadata, bundle script
.github/            Build/release workflow and Dependabot configuration
docs/               Additional maintainer documentation (docs/RELEASING.md)
package.json        Root npm project: Tauri CLI plus the version source of truth
```

Two npm manifests are intentional and cannot be consolidated: Tauri builds the
frontend as a separate project (`beforeBuildCommand: npm --prefix frontend run
build`, `frontendDist: ../frontend/dist` in `src-tauri/tauri.conf.json`), and
CI installs/caches/audits both (`npm ci` plus `npm --prefix frontend ci`).
Keep `package.json` / `package-lock.json` and `frontend/package.json` /
`frontend/package-lock.json` in sync. The release check validates root app,
Rust, Tauri, and AppStream versions; the private frontend package has its own version.

## GitHub builds and releases

The normal workflow is to edit code locally, commit, and push. GitHub-hosted
runners install dependencies, run backend tests, build the Flatpak bundle with
flatpak-builder, and upload the resulting file. Release packaging builds
inside the GNOME SDK container, not from this machine's build output. Build-time
networking downloads locked dependencies; the installed app stays offline.

| Trigger | Result |
| --- | --- |
| Pull request | Linux tests/build; Actions artifact |
| Push to `master` | Linux tests/build; Actions artifact |
| Push a `v*` tag | Linux build, followed by a published GitHub prerelease with download |
| Manual **Run workflow** | Build for the selected ref; publication only when the ref is a `v*` tag |

Actions artifacts are retained for 14 days. Release assets are attached separately
to the corresponding version in **Releases**. A plain commit does not publish a
release, and creating a tag locally does not trigger Actions until it is pushed.

### Publish a version

Update the version in `package.json`, `src-tauri/Cargo.toml`,
`src-tauri/tauri.conf.json`, and
`packaging/flatpak/io.github.exolithelabs.typedh.metainfo.xml`. Keep the corresponding
lock files consistent, and commit those changes. Then push an unused matching tag;
for example, after updating to `0.1.2`:

```bash
git tag v0.1.2
git push origin master v0.1.2
```

After the Linux job passes, GitHub Actions attaches the package and publishes
the prerelease automatically. The release job uses GitHub's automatic token.
The workflow checks that version files and tags agree, runs frontend regression
tests and JavaScript dependency audits, and tests the native Rust backend's
validation, history pagination, persistence, statistics, and the backed-up
version 1 migration. Browser tests cover completing, repeating, navigating,
restarting, custom practice, and persisted settings; a packaged startup check verifies
the installed Flatpak stays open and initializes storage. Actions are
pinned to commit IDs. Published releases cannot be overwritten by
a rerun; use a new version tag. Releases include `SHA256SUMS` for the package.

## Development

Production packages are built by GitHub Actions. For contributors who need a
local interactive preview, the commands below launch the desktop
development app with its integrated Rust backend.

Use Node.js 22, the current stable Rust toolchain, and the native
Tauri development prerequisites for your distribution. Run commands from the repo root.

```bash
npm ci
npm --prefix frontend ci
npm run tauri dev
```

The frontend calls Tauri commands to connect to the local backend; running Vite
alone in a browser is not a complete desktop-app preview. Development launches
store progress in a `development/` subdirectory of the app-data directory,
separate from installed release builds.

The Flatpak launcher disables WebKit's DMA-BUF renderer by default to avoid the
Wayland protocol failure observed on this NVIDIA system. It does not change your
desktop settings. To explicitly opt into that renderer for diagnosis:

```bash
flatpak run --env=WEBKIT_DISABLE_DMABUF_RENDERER=0 io.github.exolithelabs.typedh
```

To build the Flatpak bundle locally instead, install Flatpak and
flatpak-builder, add the Flathub remote, install the GNOME 49
platform/SDK plus the Rust and Node SDK extensions, and run:

```bash
./packaging/flatpak/build-flatpak.sh
```

This writes `dist/typedh-<version>-x86_64.flatpak`.

## Support and security

For bugs, open an [issue](https://github.com/dhiraj-ydv/typedh/issues)
with your app version, distro version, installation method, and steps
to reproduce. For a failed build, include the GitHub Actions run URL.

For suspected vulnerabilities, follow [SECURITY.md](SECURITY.md) and report
privately. Do not attach your personal database or signing credentials to a
public issue.

## License

Licensed under the [Elastic License 2.0](LICENSE). See [NOTICE](NOTICE) for
attributions.
