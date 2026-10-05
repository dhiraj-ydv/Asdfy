# TypeDH

[Downloads](#downloads-and-installation) · [Usage](#using-the-app) · [User data](#user-data-and-privacy) · [Architecture](#architecture) · [GitHub workflow](#github-builds-and-releases) · [Development](#development) · [Support](#support-and-security) · [License](#license)

**TypeDH — Colemak-DH typing tutor**, with progressive
lessons, live keyboard and finger guidance, custom text practice, and local
progress history. No account or cloud database is required.

[Download a release](https://github.com/dhiraj-ydv/typedh/releases) ·
[View GitHub builds](https://github.com/dhiraj-ydv/typedh/actions/workflows/desktop-build.yml) ·
[Report a bug](https://github.com/dhiraj-ydv/typedh/issues)

## Downloads and installation

Open [GitHub Releases](https://github.com/dhiraj-ydv/typedh/releases),
choose a version, and expand **Assets**. The published package is an
Arch Linux pacman package for x86-64, installed with `pacman -U`.

| Download | Purpose |
| --- | --- |
| `typedh-<version>-1-x86_64.pkg.tar.zst` | Arch Linux pacman package (`pacman -U`) |

The automatically generated **Source code** archives contain project sources,
not installers. Installed users do not need development tools.

### Linux (Arch-based, pacman -U install)

Install or update with `pacman -U` using the `.pkg.tar.zst` from GitHub
Releases. This is developer-hosted on Releases (not AUR / `pacman -Syu`).
The same command upgrades an older installed version when given a newer
package file.

#### 1. Download then install/update

Download the `.pkg.tar.zst` from GitHub Releases (browser), then:

```bash
sudo pacman -U ./typedh-<version>-1-x86_64.pkg.tar.zst
```

#### 2. Direct URL install/update (no browser download)

```bash
sudo pacman -U "https://github.com/dhiraj-ydv/typedh/releases/download/v0.1.2/typedh-0.1.2-1-x86_64.pkg.tar.zst"
```

Replace `v0.1.2` / `0.1.2` with the version you want.

#### 3. curl then pacman -U

```bash
curl -L -O "https://github.com/dhiraj-ydv/typedh/releases/download/v0.1.2/typedh-0.1.2-1-x86_64.pkg.tar.zst"
sudo pacman -U ./typedh-0.1.2-1-x86_64.pkg.tar.zst
```

All three are the same packaging method; only how the file reaches `pacman`
differs.

Launch **TypeDH** from your application menu, or run
`typedh` from a terminal. Pacman installs the runtime libraries the
package declares (`webkit2gtk-4.1`, `gtk3`, `libsoup3`,
`libayatana-appindicator`, `librsvg`, `cairo`, `pango`, `gdk-pixbuf2`,
`glib2`, `openssl`, `hicolor-icon-theme`, `desktop-file-utils`; see
`packaging/arch/PKGBUILD`). The app is not published to the AUR or an
official Arch repository; GitHub Releases is the distribution path. Updates
are manual via `pacman -U` with a newer file/URL — `pacman -Syu` alone will
not pick this up without an AUR/repo entry.

### Updating

Open the menu and choose **Updates** to see the installed version. To update,
run `sudo pacman -U` with the newer `.pkg.tar.zst` file or URL (see the
Linux section). `pacman -Syu` alone will not update this developer-hosted
package. Your lessons and progress are kept.

## Using the app

1. Enable Colemak-DH in your operating system's keyboard settings. The tutor
   reads your keyboard input; it does not change the system layout.
2. Open the menu and choose a lesson. Lessons progress from home-row practice
   through words, punctuation, numbers, and coding text.
3. Follow the highlighted keys and finger guidance while typing. Completed
   built-in lessons record words per minute (WPM) and accuracy locally.
4. Open **Progress History** to review previous results.
5. Use **Custom Practice** to paste text or load a `.txt` file. Custom text is
   converted to lowercase and whitespace is normalized for practice. Text is
   limited to 10,000 characters. Custom-practice scores are saved in history;
   the pasted or uploaded text is not stored in the database.

| Shortcut | Action |
| --- | --- |
| `Tab` | Focus the typing input |
| `Escape` | Restart the current typing exercise |

## User data and privacy

On first launch, the desktop application creates its data directory for the
current OS user. The backend creates `colemak.db` there and seeds the built-in
lessons. Later launches reuse that database. Different OS users have separate
progress; there is no cloud synchronization or online login.

The product was renamed from Colemak-DH Tutor to **TypeDH** (issue #18), but
the application ID and database filename were deliberately kept unchanged so
existing progress is preserved with no migration: the UI says TypeDH while the
data path stays `io.github.exolithelabs.ColemakDHTutor` / `colemak.db`.

The source repository contains code and bundled assets. Runtime databases,
generated binaries, dependency directories, and build output are ignored by Git.
The installed application passes an explicit per-user data path to the backend,
so normal app startup does not store progress in the repository or install folder.

Database location for the application ID
`io.github.exolithelabs.ColemakDHTutor` (kept across the TypeDH rename):

`$XDG_DATA_HOME/io.github.exolithelabs.ColemakDHTutor/colemak.db`, defaulting to `~/.local/share/io.github.exolithelabs.ColemakDHTutor/colemak.db`

Tauri resolves the exact path from the OS environment. The webview also stores
small UI preferences, such as the selected lesson, in its local storage. Those
preferences are separate from the SQLite progress database.

To back up progress, fully exit the app, then copy the database
directory somewhere safe. SQLite may also create `colemak.db-wal` and
`colemak.db-shm` companion files; do not delete them while the app is running.
Keeping the same application ID lets subsequent versions locate the existing
database. Back up your progress before upgrading a prerelease.

Fresh installs create a native SQLite database automatically. Unsupported
database schemas are rejected without rewriting their contents. To start fresh,
close the app and move `colemak.db` and its `-wal`/`-shm` files out of the
app-data folder, then restart. Current native databases retain progress across
restarts. History loads newest first in pages of 100 results.

## Architecture

| Component | Implementation |
| --- | --- |
| Frontend | Vue 3, TypeScript, CSS, and Vite |
| Desktop shell | Tauri v2 with Rust |
| Local backend | Rust Tauri commands, compiled into the desktop app |
| Data storage | SQLite through rusqlite, with SQLite bundled at compile time |
| Frontend/backend communication | Tauri IPC with typed command payloads |

The frontend invokes `get_lessons`, `get_progress`, and `save_progress` directly
through Tauri. Rust serializes database access on a background worker and validates
the command payloads; the webview cannot submit SQL or choose database paths.
The app makes no HTTP requests. There is no in-app updater, CORS configuration,
API tokens, or shell plugin.
SQLite retains WAL mode, full synchronization, foreign keys, and a write timeout.
Failed database opens can be retried from the UI. Writes are never retried
automatically, and loading/save failures are shown in the interface.

Project layout:

```text
frontend/           Vue interface (own npm project: frontend/package.json)
src-tauri/          Rust commands, SQLite backend, tests, and desktop configuration
scripts/            Release version checks
packaging/arch/     Arch Linux PKGBUILD and packaging script (pacman .pkg.tar.zst)
.github/            Build/release workflow and Dependabot configuration
docs/               Additional maintainer documentation (docs/RELEASING.md)
package.json        Root npm project: Tauri CLI plus the version source of truth
```

Two npm manifests are intentional and cannot be consolidated: Tauri builds the
frontend as a separate project (`beforeBuildCommand: npm --prefix frontend run
build`, `frontendDist: ../frontend/dist` in `src-tauri/tauri.conf.json`), and
CI installs/caches/audits both (`npm ci` plus `npm --prefix frontend ci`).
Keep `package.json` / `package-lock.json` and `frontend/package.json` /
`frontend/package-lock.json` in sync; the release check fails the build when
versions disagree.

## GitHub builds and releases

The normal workflow is to edit code locally, commit, and push. GitHub-hosted
runners install dependencies, run backend tests, build the frontend and desktop
app, package the pacman package, and upload the resulting file. Release packaging
does not depend on this machine's build output.

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
`src-tauri/tauri.conf.json`, and `packaging/arch/PKGBUILD`. Keep the corresponding
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
validation, schema rejection, history pagination, and persistence. Actions are
pinned to commit IDs. Published releases cannot be overwritten by
a rerun; use a new version tag. Releases include `SHA256SUMS` for the package.

## Development

Production packages are built by GitHub Actions. For contributors who need a
local interactive preview on Arch Linux, the commands below launch the desktop
development app with its integrated Rust backend.

Use Node.js 22, the current stable Rust toolchain, and the native
Tauri development prerequisites for Arch Linux. Run commands from the repo root.

```bash
npm ci
npm --prefix frontend ci
npm run tauri dev
```

The frontend calls Tauri commands to connect to the local backend; running Vite
alone in a browser is not a complete desktop-app preview. Development launches
store progress in a `development/` subdirectory of the app-data directory,
separate from installed release builds.

## Support and security

For bugs, open an [issue](https://github.com/dhiraj-ydv/typedh/issues)
with your app version, Arch-based distro version, installation method, and steps
to reproduce. For a failed build, include the GitHub Actions run URL.

For suspected vulnerabilities, follow [SECURITY.md](SECURITY.md) and report
privately. Do not attach your personal database or signing credentials to a
public issue.

## License

Licensed under the [Elastic License 2.0](LICENSE). See [NOTICE](NOTICE) for
attributions.
