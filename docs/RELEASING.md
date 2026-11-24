# Releasing

## What CI produces

The **Desktop build** workflow (`.github/workflows/desktop-build.yml`) runs on
pull requests, pushes to `master`, version tags, and manual dispatches. It
produces three artifacts, each built on its own operating system:

| Artifact | Runner | File |
| --- | --- | --- |
| `Asdfy-Linux-x86_64` | `ubuntu-22.04` | `Asdfy_<version>_amd64.AppImage` |
| `Asdfy-Windows-x86_64` | `windows-2022` | `Asdfy_<version>_x64-setup.exe` (NSIS) |
| `Asdfy-macOS-universal` | `macos-15` | `Asdfy_<version>_universal.dmg` |

Ordinary builds retain these as workflow artifacts for 14 days. Pushing a
version tag publishes a GitHub prerelease with all three packages and a
`SHA256SUMS` file. This uses the automatic per-run `GITHUB_TOKEN`; no personal
access token is required. The release job refuses to publish unless exactly
three packages were built, and an already published release cannot be
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
   - Linux installs the WebKitGTK 4.1 build prerequisites and `libfuse2`, builds
     the AppImage, then starts it under Xvfb for 20 seconds and checks that it
     stayed open and created
     `~/.local/share/io.github.exolithelabs.asdfy/progress.sqlite3`.
   - Windows builds the per-user NSIS installer (`installMode: currentUser`).
   - macOS adds the `aarch64` and `x86_64` Rust targets and builds a
     `universal-apple-darwin` disk image.
3. **Publish GitHub prerelease** runs only for `v*` tags.

Bundle settings live in the `bundle` section of `src-tauri/tauri.conf.json`.

## Signing

Packages are not code-signed. macOS builds are ad-hoc signed
(`signingIdentity: "-"`) so they run on Apple Silicon, but they are not
notarized; Windows installers carry no Authenticode signature. The README
documents the first-launch steps for both. Adding real signing later requires an
Apple Developer ID certificate and notarization credentials, and a Windows code
signing certificate, stored as GitHub Actions secrets and passed to the Tauri
build step.

## Updates

There is no in-app updater, and the app makes no HTTP requests (the optional
keyboard backlight connects only to OpenRGB on `127.0.0.1`). **Settings**
shows the installed version. Users update by installing the newer package over
the old one; the data folder is named after the application ID
`io.github.exolithelabs.asdfy`, which `scripts/check-release.mjs` keeps fixed so
progress survives upgrades.

## Creating a release candidate

Ensure the version matches in `package.json`, `src-tauri/Cargo.toml`,
`src-tauri/tauri.conf.json`, and their lockfiles (enforced by
`scripts/check-release.mjs`), then push the commit and a matching unused version
tag (for example, after bumping to 0.2.0):

```bash
git tag v0.2.0
git push origin master v0.2.0
```

After all package jobs pass, the workflow publishes the prerelease with its
downloadable assets. Install-test each package (including an N → N+1 upgrade
where possible, confirming progress survives) before promoting it to a stable
release.

## Before the first public release

1. Install and launch each CI artifact on a clean machine: a Linux VM without
   development packages, Windows 10/11, and both an Intel and an Apple Silicon Mac.
2. Confirm upgrades keep progress on each platform.
3. Enable GitHub private vulnerability reporting before making the repository
   public.
