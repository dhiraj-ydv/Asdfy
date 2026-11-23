# Asdfy

[Downloads](#downloads-and-installation) · [Usage](#using-the-app) · [User data](#user-data-and-privacy) · [Architecture](#architecture) · [GitHub workflow](#github-builds-and-releases) · [Development](#development) · [Support](#support-and-security) · [License](#license)

**Asdfy — touch-typing tutor** for the US QWERTY layout, with a staged course
that introduces keys a few at a time, smart practice aimed at your weakest keys,
timed speed tests, custom text, live keyboard and finger guidance, and detailed
local statistics. No account or cloud database is required.

[Download a release](https://github.com/exolithelabs/TypeDH/releases) ·
[View GitHub builds](https://github.com/exolithelabs/TypeDH/actions/workflows/desktop-build.yml) ·
[Report a bug](https://github.com/exolithelabs/TypeDH/issues)

## Downloads and installation

Open [GitHub Releases](https://github.com/exolithelabs/TypeDH/releases),
choose a version, and expand **Assets**.

| Download | Platform |
| --- | --- |
| `Asdfy_<version>_amd64.AppImage` | Linux x86-64 |
| `Asdfy_<version>_x64-setup.exe` | Windows 10 and 11, x86-64 |
| `Asdfy_<version>_universal.dmg` | macOS 10.15 or later, Intel and Apple Silicon |
| `SHA256SUMS` | Checksums for the files above |

The automatically generated **Source code** archives contain project sources,
not installers. Installed users do not need development tools.

The packages are **not code-signed**, so each operating system warns on first
launch. Download only from this repository's Releases page and, if you like,
check the file against `SHA256SUMS` (`sha256sum -c SHA256SUMS --ignore-missing`).

### Linux (AppImage)

```bash
chmod +x Asdfy_<version>_amd64.AppImage
./Asdfy_<version>_amd64.AppImage
```

AppImages need FUSE 2 (`libfuse2`, called `fuse2` on Arch and `libfuse2t64` on
Ubuntu 24.04). Without it, run with `--appimage-extract-and-run`. To add Asdfy to
your application menu, use a tool such as Gear Lever or AppImageLauncher, or move
the file somewhere permanent and create a desktop entry. To update, replace the
file with the newer AppImage.

WebKitGTK's DMA-BUF renderer can close Wayland windows on some NVIDIA systems, so
Asdfy turns it off by default on Linux. To opt back in for diagnosis, start the app
with `WEBKIT_DISABLE_DMABUF_RENDERER=0`.

### Windows

Run `Asdfy_<version>_x64-setup.exe`. It installs for the current user without
administrator rights. Because the installer is unsigned, SmartScreen may show
**Windows protected your PC**; choose **More info → Run anyway**. To update, run
the newer installer. Uninstall from **Settings → Apps**.

### macOS

Open the `.dmg` and drag **Asdfy** to **Applications**. The app is ad-hoc signed
but not notarized, so the first launch is blocked: Control-click (or right-click)
the app, choose **Open**, then **Open** again. On recent macOS versions you may
instead need **System Settings → Privacy & Security → Open Anyway**. If macOS
reports the app as damaged, clear the download quarantine flag:

```bash
xattr -dr com.apple.quarantine /Applications/Asdfy.app
```

To update, replace the app in **Applications** with the newer one.

### Updating

Open **Settings** to see the installed version. Install the newer release over
the current one as described for your platform. Your lessons and progress are kept.

## Using the app

1. Set your operating system's keyboard layout to English (US) QWERTY. Asdfy
   reads the characters your keyboard sends; it does not change the system layout.
2. **Learn** shows the course: six stages from the home row (A S D F, J K L)
   through the first reaches, the top and bottom rows, capitals, punctuation,
   numbers, and real prose and code. Each lesson drills real words made only from
   letters you have already learned. A lesson is passed at 90% accuracy;
   **Start lesson** / **Continue lesson** always opens the first lesson you have not passed.
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
   stop on errors (the cursor waits for the correct key); toggles for the
   keyboard and finger guide; and where your progress is stored.

| Shortcut | Action |
| --- | --- |
| `Tab` | Focus the typing input |
| `Escape` | Restart the current exercise, or practise again from the results |
| `Enter` | Continue from the results (next lesson, new drill, or new test) |

## User data and privacy

On first launch, Asdfy creates its data folder for the current OS user and a
SQLite database, `progress.sqlite3`, inside it. Each completed session stores
its mode, lesson, speed, raw speed, accuracy, duration, character and mistake
counts, and adds per-key hit, miss, and timing totals. Different OS users have
separate progress; there is no cloud synchronization or online login.

| Platform | Data folder |
| --- | --- |
| Linux | `~/.local/share/io.github.exolithelabs.asdfy/` (or `$XDG_DATA_HOME/io.github.exolithelabs.asdfy/`) |
| Windows | `%APPDATA%\io.github.exolithelabs.asdfy\` |
| macOS | `~/Library/Application Support/io.github.exolithelabs.asdfy/` |

**Settings** shows the exact folder on your computer. The application ID
`io.github.exolithelabs.asdfy` names these folders, so it never changes between
versions. On Linux and macOS the folder and database are readable only by your
user. The webview also stores small UI preferences (theme, text size, and
practice toggles) in its own local storage, separate from the progress database.

To back up progress, fully quit the app, then copy the data folder somewhere
safe. SQLite may also create `progress.sqlite3-wal` and `progress.sqlite3-shm`
companion files; do not delete them while the app is running.

Databases in an unknown format, such as one written by a newer release, are
rejected without being modified. To start fresh, quit the app and move
`progress.sqlite3` and its `-wal`/`-shm` files out of the data folder, then
restart. History loads newest first in pages of 100 results.

Asdfy was previously developed as TypeDH, a Colemak-DH tutor distributed as a
Flatpak. Asdfy uses a new application ID and data folder and does not read,
import, or change TypeDH data, which stays in
`~/.var/app/io.github.exolithelabs.typedh/` until you remove it.

## Architecture

| Component | Implementation |
| --- | --- |
| Frontend | Vue 3, TypeScript, CSS, and Vite |
| Desktop shell | Tauri v2 with Rust |
| Local backend | Rust Tauri commands, compiled into the desktop app |
| Data storage | SQLite through rusqlite, with SQLite bundled at compile time |
| Frontend/backend communication | Tauri IPC with typed command payloads |
| Packages | Tauri bundler: AppImage, NSIS installer, and DMG |

The frontend invokes `get_lessons`, `get_summary`, `get_progress`,
`save_progress`, and `data_location` directly through Tauri. The lesson catalog
is compiled into the binary, so lessons load even when storage is unavailable;
practice text for generated lessons, smart practice, and speed tests is built in
the frontend from a bundled word list. Rust serializes database access on a
background worker and validates the command payloads; the webview cannot submit
SQL or choose database paths. The app makes no HTTP requests. There is no in-app
updater, CORS configuration, API tokens, or shell plugin.
SQLite retains WAL mode, full synchronization, foreign keys, and a write timeout.
Failed database opens can be retried from the UI. Writes are never retried
automatically, and loading/save failures are shown in the interface.

Project layout:

```text
frontend/src/
  domain/           Plain TypeScript: typing engine, QWERTY keyboard map, drill
                    generator, word list, statistics helpers, and models
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
  storage/          SQLite repository, schema, and persistence tests
src-tauri/icons/    App icon source (app-icon.svg) and generated platform icons
scripts/            Release version checks
.github/            Build/release workflow and Dependabot configuration
docs/               Additional maintainer documentation (docs/RELEASING.md)
package.json        Root npm project: Tauri CLI plus the version source of truth
```

Two npm manifests are intentional and cannot be consolidated: Tauri builds the
frontend as a separate project (`beforeBuildCommand: npm --prefix frontend run
build`, `frontendDist: ../frontend/dist` in `src-tauri/tauri.conf.json`), and
CI installs/caches/audits both (`npm ci` plus `npm --prefix frontend ci`).
Keep `package.json` / `package-lock.json` and `frontend/package.json` /
`frontend/package-lock.json` in sync. The release check validates the root app,
Rust, and Tauri versions; the private frontend package has its own version.

## GitHub builds and releases

The normal workflow is to edit code locally, commit, and push. GitHub-hosted
runners test the code and build each platform's package on its own operating
system: the AppImage on Ubuntu 22.04 (its older glibc lets the AppImage run on
more distributions), the Windows installer on Windows, and a universal macOS
disk image on macOS.

| Trigger | Result |
| --- | --- |
| Pull request | Tests and all three packages; Actions artifacts |
| Push to `master` | Tests and all three packages; Actions artifacts |
| Push a `v*` tag | All three packages, followed by a published GitHub prerelease with downloads |
| Manual **Run workflow** | Build for the selected ref; publication only when the ref is a `v*` tag |

Actions artifacts are retained for 14 days. Release assets are attached separately
to the corresponding version in **Releases**. A plain commit does not publish a
release, and creating a tag locally does not trigger Actions until it is pushed.

### Publish a version

Update the version in `package.json`, `src-tauri/Cargo.toml`, and
`src-tauri/tauri.conf.json`. Keep the corresponding lock files consistent, and
commit those changes. Then push an unused matching tag; for example, after
updating to `0.2.0`:

```bash
git tag v0.2.0
git push origin master v0.2.0
```

After all three package jobs pass, GitHub Actions attaches the packages and
publishes the prerelease automatically. The release job uses GitHub's automatic token.
The workflow checks that version files and tags agree, runs frontend
regression tests and JavaScript dependency audits, and tests the native Rust
backend's validation, history pagination, persistence, and statistics on Linux,
Windows, and macOS. Browser tests cover completing, repeating, navigating,
restarting, custom practice, and persisted settings; a startup check verifies the
built AppImage stays open and initializes storage. Actions are pinned to commit
IDs. Published releases cannot be overwritten by a rerun; use a new version tag.
Releases include `SHA256SUMS` for the packages. See
[docs/RELEASING.md](docs/RELEASING.md) for details.

## Development

Production packages are built by GitHub Actions. For contributors who need a
local interactive preview, the commands below launch the desktop
development app with its integrated Rust backend.

Use Node.js 22, the current stable Rust toolchain, and the native
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your
operating system. Run commands from the repo root.

```bash
npm ci
npm --prefix frontend ci
npm run tauri dev
```

The frontend calls Tauri commands to connect to the local backend; running Vite
alone in a browser is not a complete desktop-app preview. Development launches
store progress in a `development/` subdirectory of the data folder, separate
from installed release builds.

To build a package for your own platform instead, run
`npm run tauri build -- --bundles appimage` (Linux), `--bundles nsis` (Windows),
or `--bundles dmg` (macOS). Output is written under `src-tauri/target/release/bundle/`.

To change the app icon, edit `src-tauri/icons/app-icon.svg`, run
`npx tauri icon src-tauri/icons/app-icon.svg -o src-tauri/icons`, and delete the
generated `android`, `ios`, and `Square*`/`StoreLogo` files, which are not used.

## Support and security

For bugs, open an [issue](https://github.com/exolithelabs/TypeDH/issues)
with your app version, operating system and version, package type, and steps
to reproduce. For a failed build, include the GitHub Actions run URL.

For suspected vulnerabilities, follow [SECURITY.md](SECURITY.md) and report
privately. Do not attach your personal database to a public issue.

## License

Licensed under the [Elastic License 2.0](LICENSE). See [NOTICE](NOTICE) for
attributions.
