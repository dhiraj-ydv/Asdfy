# Asdfy

[Downloads](#downloads-and-installation) · [Usage](#using-the-app) · [User data](#user-data-and-privacy) · [Architecture](#architecture) · [GitHub workflow](#github-builds-and-releases) · [Development](#development) · [Support](#support-and-security) · [License](#license)

**Asdfy — touch-typing tutor** for the US QWERTY layout, with a staged course
that introduces keys a few at a time, smart practice aimed at your weakest keys,
timed speed tests, custom text, live keyboard and finger guidance, and detailed
local statistics. No account or cloud database is required.

[Download a release](https://github.com/exolithelabs/Asdfy/releases) ·
[View GitHub builds](https://github.com/exolithelabs/Asdfy/actions/workflows/desktop-build.yml) ·
[Report a bug](https://github.com/exolithelabs/Asdfy/issues)

## Downloads and installation

Open [GitHub Releases](https://github.com/exolithelabs/Asdfy/releases),
choose a version, and expand **Assets**.

| Download | Platform |
| --- | --- |
| `Asdfy_<version>_amd64.deb` | Debian 12+, Ubuntu 22.04+, and derivatives (x86-64) |
| `Asdfy-<version>-1.x86_64.rpm` | Fedora, openSUSE, and other RPM distributions (x86-64) |
| `Asdfy_<version>_amd64.AppImage` | Any x86-64 Linux distribution, no installation |
| `Asdfy_<version>_x64-setup.exe` | Windows 10 and 11, x86-64 |
| `Asdfy_<version>_universal.dmg` | macOS 10.15 or later, Intel and Apple Silicon |
| `SHA256SUMS` | Checksums for the files above |

The automatically generated **Source code** archives contain project sources,
not installers. Installed users do not need development tools.

The packages are **not code-signed**, so each operating system warns on first
launch. Download only from this repository's Releases page and, if you like,
check the file against `SHA256SUMS` (`sha256sum -c SHA256SUMS --ignore-missing`).

### Linux

Pick one package; all three keep progress in the same folder, so you can switch
between them without losing anything.

- **`.deb` or `.rpm`** if your distribution supports one: Asdfy is added to your
  application menu, uses your system's WebKitGTK, and runs natively on Wayland.
  These packages need WebKitGTK 4.1 (`libwebkit2gtk-4.1` / `webkit2gtk4.1`),
  which Ubuntu 22.04+, Debian 12+, and current Fedora and openSUSE releases provide;
  your package manager installs it.
- **AppImage** on any other distribution, or to try Asdfy without installing. It
  bundles its own WebKitGTK, so it is larger.

The Linux packages are not GPG-signed and are not in any repository, so your
package manager will not update them; install a newer release the same way.

#### Debian and Ubuntu (`.deb`)

```bash
sudo apt install ./Asdfy_<version>_amd64.deb   # install or update
sudo apt remove asdfy                          # uninstall
```

The leading `./` matters: without it, `apt` looks for a package in its repositories.

#### Fedora and openSUSE (`.rpm`)

```bash
sudo dnf install ./Asdfy-<version>-1.x86_64.rpm   # Fedora: install or update
sudo dnf remove asdfy                             # Fedora: uninstall

sudo zypper install --allow-unsigned-rpm ./Asdfy-<version>-1.x86_64.rpm   # openSUSE
sudo zypper remove asdfy
```

`zypper` refuses unsigned local packages unless you pass `--allow-unsigned-rpm`.

#### AppImage

```bash
chmod +x Asdfy_<version>_amd64.AppImage
./Asdfy_<version>_amd64.AppImage
```

To add the AppImage to your application menu, use a tool such as Gear Lever or
AppImageLauncher, or move the file somewhere permanent and create a desktop entry.
To update, replace the file with the newer AppImage.

**FUSE.** An AppImage mounts itself as a read-only filesystem when it starts, using
FUSE. Asdfy's AppImage uses the current static AppImage runtime, which carries its
own copy of the FUSE library, so it does **not** need FUSE 2 (`libfuse2`,
`libfuse2t64`, or `fuse2`) — the package that older AppImages ask for. It needs only:

- FUSE support in the kernel (`/dev/fuse`), which desktop distributions enable; and
- the `fusermount3` (or older `fusermount`) program, from the `fuse3` package,
  which most desktops install by default.

| Message when starting the AppImage | What to do |
| --- | --- |
| `Error: No suitable fusermount binary found on the $PATH` | Install `fuse3`: `sudo apt install fuse3`, `sudo dnf install fuse3`, `sudo pacman -S fuse3`, or `sudo zypper install fuse3`. |
| `fuse: device not found, try 'modprobe fuse' first` | Load the module with `sudo modprobe fuse`. Containers, WSL, and some locked-down systems cannot use FUSE at all; use the fallback below. |
| `Cannot mount AppImage, please check your FUSE setup.` | Check the two requirements above, or use the fallback below. |

On Ubuntu, do not install the old `fuse` package to fix this: it replaces `fuse3`
and can remove desktop packages along with it. Asdfy does not need it.

Without FUSE, the AppImage can still run by unpacking itself into a temporary
folder first (slower to start, nothing is installed):

```bash
./Asdfy_<version>_amd64.AppImage --appimage-extract-and-run
```

Setting `APPIMAGE_EXTRACT_AND_RUN=1` does the same. Alternatively, use the `.deb`
or `.rpm`, which do not use FUSE at all.

**If the AppImage window looks wrongly scaled on Wayland.** The AppImage always runs
through XWayland: the GTK start-up hook that Tauri's AppImage bundler adds sets
`GDK_BACKEND=x11` to avoid a known Wayland crash
([tauri#8541](https://github.com/tauri-apps/tauri/issues/8541)). Under XWayland, GTK
applies `GDK_SCALE`, so a session that exports `GDK_SCALE=2` for a 1× monitor (some
Hyprland setups do) draws Asdfy at double size. Start it with the scale that matches
your display, for example `GDK_SCALE=1 ./Asdfy_<version>_amd64.AppImage`, correct
`GDK_SCALE` in your session settings, or use the `.deb` or `.rpm`, which run natively
on Wayland and are not affected.

**NVIDIA.** WebKitGTK's DMA-BUF renderer can close Wayland windows on some NVIDIA
systems, so every Linux package of Asdfy turns it off by default. To opt back in for
diagnosis, start the app with `WEBKIT_DISABLE_DMABUF_RENDERER=0`.

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
   keyboard and finger guide; keyboard backlight; and where your progress is stored.

### Keyboard backlight (optional)

On a keyboard with per-key RGB lighting, Asdfy can light the next key on the
physical keyboard too, in the same finger colour as the on-screen guide, plus the
Shift key for capitals and symbols. All other keys stay dimly lit.

1. Install [OpenRGB](https://openrgb.org) and check that it controls your keyboard
   key by key.
2. In OpenRGB, open **SDK Server** and start the server on the default port, 6742.
3. In Asdfy, open **Settings → Keyboard backlight** and switch on **Light the next
   key on my keyboard**. The status line names the keyboard it found.

Asdfy picks the first keyboard OpenRGB reports with a lit key for every letter. When
you switch the setting off or quit, the keyboard returns to the colours and effect it
had before. Asdfy talks to OpenRGB only, at `127.0.0.1`; it never contacts another
computer. Keyboards that OpenRGB cannot drive key by key, including many generic
SINO WEALTH boards (USB vendor `258a`), cannot use this feature.

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
| Linux (all three packages) | `~/.local/share/io.github.exolithelabs.asdfy/` (or `$XDG_DATA_HOME/io.github.exolithelabs.asdfy/`) |
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

**Upgrades.** When a new version of Asdfy changes how progress is stored, it
upgrades your database the first time it opens it. It first saves a complete copy
next to it, named `progress.v<old version>-backup-<time>.sqlite3`, then applies
every change in a single step: if anything goes wrong, the database is left
exactly as it was, the error is shown, and the copy is still there. Backups are
never deleted automatically; remove old ones once you are happy with the upgrade.
To go back to an older Asdfy, quit the app, replace `progress.sqlite3` with the
matching backup (and delete the `-wal`/`-shm` files), then install that version.

A database written by a newer Asdfy than the one installed, or a file that is not
an Asdfy database, is refused without being modified. To start fresh, quit the
app and move `progress.sqlite3` and its `-wal`/`-shm` files out of the data
folder, then restart. History loads newest first in pages of 100 results.

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
| Packages | Tauri bundler: AppImage, .deb, .rpm, NSIS installer, and DMG |

The frontend invokes `get_lessons`, `get_summary`, `get_progress`,
`save_progress`, `data_location`, and the `lighting_*` commands directly through Tauri. The lesson catalog
is compiled into the binary, so lessons load even when storage is unavailable;
practice text for generated lessons, smart practice, and speed tests is built in
the frontend from a bundled word list. Rust serializes database access on a
background worker and validates the command payloads; the webview cannot submit
SQL or choose database paths. The app makes no HTTP requests. Its only network
connection is the optional keyboard backlight: when switched on, Rust opens a TCP
connection to the OpenRGB SDK server at `127.0.0.1` and speaks OpenRGB's binary
protocol with an in-house client written from OpenRGB's protocol documentation; the
webview chooses neither host nor device. There is no in-app updater, CORS
configuration, API tokens, or shell plugin.
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
  storage/          SQLite repository, numbered schema migrations, and persistence tests
  lighting/         OpenRGB SDK client for the optional keyboard backlight, with a
                    fake-server test suite
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
runners test the code and build each platform's packages on its own operating
system: the AppImage, `.deb`, and `.rpm` on Ubuntu 22.04 (its older glibc lets
them run on more distributions), the Windows installer on Windows, and a universal
macOS disk image on macOS.

| Trigger | Result |
| --- | --- |
| Pull request | Tests and all packages; Actions artifacts |
| Push to `master` | Tests and all packages; Actions artifacts |
| Push a `v*` tag | All packages, followed by a published GitHub prerelease with downloads |
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

After all three platform jobs pass, GitHub Actions attaches the five packages and
publishes the prerelease automatically. The release job uses GitHub's automatic token.
The workflow checks that version files and tags agree, runs frontend
regression tests and JavaScript dependency audits, and tests the native Rust
backend's validation, history pagination, persistence, and statistics on Linux,
Windows, and macOS. Browser tests cover completing, repeating, navigating,
restarting, custom practice, persisted settings, and the keyboard backlight; startup
checks verify that the built AppImage and the installed `.deb` stay open and
initialize storage, and the `.rpm` is checked for a valid header and file list. Actions are pinned to commit
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
`npm run tauri build -- --bundles appimage,deb,rpm` (Linux), `--bundles nsis`
(Windows), or `--bundles dmg` (macOS). Output is written under `src-tauri/target/release/bundle/`.

To change the app icon, edit `src-tauri/icons/app-icon.svg`, run
`npx tauri icon src-tauri/icons/app-icon.svg -o src-tauri/icons`, and delete the
generated `android`, `ios`, and `Square*`/`StoreLogo` files, which are not used.

## Support and security

For bugs, open an [issue](https://github.com/exolithelabs/Asdfy/issues)
with your app version, operating system and version, package type, and steps
to reproduce. For a failed build, include the GitHub Actions run URL.

For suspected vulnerabilities, follow [SECURITY.md](SECURITY.md) and report
privately. Do not attach your personal database to a public issue.

## License

Licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for
attributions.
