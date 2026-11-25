# Releasing

## What CI produces

The **Desktop build** workflow (`.github/workflows/desktop-build.yml`) runs on
pull requests, pushes to `master`, version tags, and manual dispatches. It
produces three artifacts, each built on its own operating system, with one
package each:

| Artifact | Runner | File |
| --- | --- | --- |
| `Asdfy-Linux-x86_64` | `ubuntu-22.04` | `Asdfy_<version>_amd64.AppImage` |
| `Asdfy-Windows-x86_64` | `windows-2022` | `Asdfy_<version>_x64-setup.exe` (NSIS) |
| `Asdfy-macOS-universal` | `macos-15` | `Asdfy_<version>_universal.dmg` |

Linux ships only as an AppImage; `.deb` and `.rpm` are no longer built (the
`bundle.targets` list in `src-tauri/tauri.conf.json` is `appimage`, `nsis`, `dmg`).

Ordinary builds retain these packages as workflow artifacts for 14 days. A
version tag also uploads each updater signature, and the macOS `.app.tar.gz`,
in those same artifacts, then publishes a GitHub release with the three
packages, their updater files, `latest.json`, and a `SHA256SUMS` file (see [In-app updates](#in-app-updates)). This uses the automatic per-run `GITHUB_TOKEN`; no personal
access token is required. The release job refuses to publish unless every
package was built (artifact folders are flattened first, so `SHA256SUMS` lists
plain file names), and an already published release cannot be
overwritten by rerunning the workflow; create a new version instead.

## Jobs

1. **Release and frontend checks** (`ubuntu-24.04`) validates matching
   application versions and the fixed application ID, runs frontend regression
   tests and the type check, audits JavaScript dependencies, and runs the
   Playwright browser tests.
2. **Package** (matrix: Linux, Windows, macOS) runs the Rust backend tests
   (`cargo test --locked --lib`) on each platform, then
   `npm run tauri -- build --bundles <format>`, which builds the frontend and the
   release binary and bundles it:
   - Linux installs the WebKitGTK 4.1 build prerequisites and `libfuse2` (only the
     build runner gets it; the finished AppImage does not need it), then builds the
     AppImage. It starts the AppImage under Xvfb for 20 seconds, checking that it
     stayed open and created
     `~/.local/share/io.github.exolithelabs.asdfy/progress.sqlite3`.
   - Windows builds the per-user NSIS installer (`installMode: currentUser`).
   - macOS adds the `aarch64` and `x86_64` Rust targets and builds a
     `universal-apple-darwin` app bundle and disk image (`--bundles app,dmg`).
     The updater archive is produced only for the `app` target.
3. **Publish GitHub release** (`ubuntu-latest`) runs only for `v*` tags. It
   downloads the three artifacts, flattens nested bundle folders, and refuses to
   publish unless the AppImage, Windows installer, macOS disk image, macOS
   `.app.tar.gz` updater archive, and a `.sig` for each updater file are all
   present as exactly one file each. It writes `latest.json` with
   `scripts/updater-manifest.mjs` (notes come from GitHub's generated release
   notes) and `SHA256SUMS`, then publishes a stable release. A release that is
   already published is left unchanged.

Each package build also generates the third-party license notices for its own
target through `beforeBuildCommand` (see
[DEVELOPMENT.md](DEVELOPMENT.md#local-preview)); a failure there fails the build.
Crates published without a license file are named in the build log.

Bundle settings live in the `bundle` section of `src-tauri/tauri.conf.json`.

## Signing

Packages are not code-signed. macOS builds are ad-hoc signed
(`signingIdentity: "-"`) so they run on Apple Silicon, but they are not
notarized; Windows installers carry no Authenticode signature. The README
documents the first-launch steps for both. Adding real signing later requires an
Apple Developer ID certificate and notarization credentials, and a Windows code
signing certificate, stored as GitHub Actions secrets and passed to the Tauri
build step.

## In-app updates

Asdfy updates itself with the Tauri updater plugin
(`tauri-plugin-updater`), driven entirely from Rust (`update_check` and
`update_install` in `src-tauri/src/commands.rs`); the webview has no updater
permissions. The app reads

```text
https://github.com/exolithelabs/Asdfy/releases/latest/download/latest.json
```

and installs only files whose minisign signature matches `plugins.updater.pubkey`
in `src-tauri/tauri.conf.json`. The data folder is named after the application ID
`io.github.exolithelabs.asdfy`, which `scripts/check-release.mjs` keeps fixed, so
progress survives updates.

| Platform | Update file | Installed by |
| --- | --- | --- |
| Linux | `Asdfy_<version>_amd64.AppImage` | Replacing the running AppImage file; the user then restarts |
| Windows | `Asdfy_<version>_x64-setup.exe` | Running the NSIS installer in passive mode, which closes and reopens the app |
| macOS | `Asdfy.app.tar.gz` (universal) | Replacing the app bundle; the user then restarts |

Only an AppImage can update itself on Linux (the app checks `$APPIMAGE`), and
debug builds never install updates. Elsewhere, Settings announces the release and
points to GitHub Releases.

### What a tag build does

The committed config does not set `bundle.createUpdaterArtifacts`, so pull
requests, pushes to `master`, and manual runs of other refs need no signing
secret and do not produce updater files.

On a `v*` tag the workflow does three things:

1. The package job requires the Actions secret `TAURI_SIGNING_PRIVATE_KEY`.
   When `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` is non-empty it is passed through;
   an empty password secret is omitted so an unencrypted key can still sign.
   The build passes `--config '{"bundle":{"createUpdaterArtifacts":true}}'`,
   which writes a `.sig` next to the AppImage and the NSIS installer, and on
   macOS adds `bundle/macos/Asdfy.app.tar.gz` with its `.sig`. The macOS job
   must bundle `app` as well as `dmg`; a disk image alone does not emit that
   archive. The package job fails the tag build if any updater file is missing.
   Those files are uploaded with the packages.
2. The release job flattens every platform's files into one folder and writes
   the manifest:

   ```bash
   node scripts/updater-manifest.mjs release-artifacts "$GITHUB_REF_NAME" "<generated notes>"
   ```

   The script fails unless each platform has exactly one update file with a
   signature. The same generated notes are used as the GitHub release notes.
3. It publishes a normal release, not a draft or prerelease. GitHub's
   `releases/latest` URL skips prereleases and drafts, so only a stable release
   is offered to installed apps.

Never rotate the signing key casually: installed apps trust only the public key
they shipped with, so a release signed with a new key cannot reach them. Keep
the private key only in the Actions secret.

## Changing the database schema

The schema lives in numbered migrations in `src-tauri/src/storage/migrations/`,
listed in order in `MIGRATIONS` in `src-tauri/src/storage/repository.rs`. SQLite's
`user_version` records how many migrations a database has applied.

On open, Asdfy:

1. refuses, without writing anything, a database whose version is higher than the
   number of migrations it knows (written by a newer release), or a non-empty file
   with version 0 (not an Asdfy database);
2. for an existing, older database, writes a full copy with `VACUUM INTO` to
   `progress.v<version>-backup-<unix time>.sqlite3` and stops if that fails;
3. applies every pending migration in one transaction with foreign keys off,
   setting `user_version` after each, then runs `PRAGMA foreign_key_check` and
   commits only if it is clean; any error rolls everything back;
4. turns foreign keys on and refreshes the lesson catalog.

To change the schema:

- Add `NNNN_short_name.sql` with the next number and append it to `MIGRATIONS`.
  Never edit, reorder, or delete a migration that has shipped in a release, even a
  prerelease: installed databases have already applied it.
- Write plain SQL. Do not use `BEGIN`, `COMMIT`, `ROLLBACK`, `PRAGMA user_version`,
  or `PRAGMA foreign_keys`; the runner owns those, and a test rejects them.
- `ALTER TABLE … ADD COLUMN` covers simple additions. For anything else, such as
  changing constraints or column types, use SQLite's table rebuild: create
  `<table>_new`, copy the rows, drop the old table, rename the new one, and recreate
  its indexes. Foreign keys are off during migrations, so this works even for tables
  other tables reference; the foreign key check then catches rows the migration orphaned.
- Keep the Rust structs, queries, and frontend models in step with the new columns.
- Add a test in `src-tauri/src/storage/tests.rs` that builds a database at the
  previous version with `Repository::open_with(directory, &MIGRATIONS[..n])`,
  saves representative data, opens it with all migrations, and checks the data.

## Creating a release candidate

Ensure the version matches in `package.json`, `src-tauri/Cargo.toml`,
`src-tauri/tauri.conf.json`, and their lockfiles (enforced by
`scripts/check-release.mjs`), then push the commit and a matching unused version
tag (for example, after bumping to 0.2.0):

```bash
git tag v0.2.0
git push origin master v0.2.0
```

After all package jobs pass, the workflow publishes the release with its
downloadable assets, and installed apps offer it at their next start. Install-test
each package first where possible, including an in-app N → N+1 update that
confirms progress survives.

## Before the first public release

1. Install and launch each CI artifact on a clean machine: a Linux VM without
   development packages, Windows 10/11, and both an Intel and an Apple Silicon Mac.
2. Confirm upgrades keep progress on each platform.
3. Enable GitHub private vulnerability reporting before making the repository
   public.
