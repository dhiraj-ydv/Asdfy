# Releasing

## What CI produces

The **Linux build** workflow runs on pull requests, pushes to `master`, version
tags, and manual dispatches. It produces a single artifact:

- an Arch Linux pacman package `typedh-<version>-1-x86_64.pkg.tar.zst`
  for x86-64.

Ordinary builds retain this as a workflow artifact for 14 days. Pushing a
version tag publishes a GitHub prerelease and attaches the pacman package
together with a `SHA256SUMS` file. This uses the automatic per-run
`GITHUB_TOKEN`; no personal access token is required.

Before packaging, CI validates matching application versions, runs frontend
regression tests, and audits JavaScript dependencies. The Linux job compiles
the native Rust backend and tests validation, unsupported-schema rejection,
pagination, and persistence across restart. Published assets include a
`SHA256SUMS` file. An already published release cannot be overwritten by
rerunning the workflow; create a new version instead.

The Linux job builds a temporary Debian staging package with Tauri, then runs
`packaging/arch/build-pkg.sh` inside an Arch Linux container (Docker +
`makepkg`) to produce the pacman package. The `.deb` itself is not published.

## Linux Arch package

The `linux-arch` job runs on `ubuntu-24.04`:

1. Install Tauri system prerequisites
   (`libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`,
   `patchelf`).
2. Build icons and a Debian staging package:
   `npm run tauri build -- --bundles deb`.
3. Repack the `.deb` payload (`usr/bin`, `usr/share/applications`,
   `usr/share/icons`, `usr/share/metainfo`) into `packaging/arch/work/root/`
   and run `makepkg` in `archlinux:latest` via
   `packaging/arch/build-pkg.sh`, producing
   `dist/typedh-<version>-1-x86_64.pkg.tar.zst`.

`packaging/arch/PKGBUILD` declares the pacman runtime `depends`:

> cairo desktop-file-utils gdk-pixbuf2 glib2 gtk3 hicolor-icon-theme
> libayatana-appindicator librsvg libsoup3 openssl pango webkit2gtk-4.1

Keep `pkgver` in sync with `package.json` / `src-tauri/Cargo.toml` /
`src-tauri/tauri.conf.json` (enforced by `scripts/check-release.mjs`);
`pkgrel` is `1`. The package installs system-wide under `/usr` via
`pacman -U`; it is developer-hosted on GitHub Releases, not published to the
AUR or a custom pacman repo, so `pacman -Syu` alone will not update it.

There is no AUR, custom pacman repo, Flatpak, or AppImage publication path in
this workflow. Updates are manual via `pacman -U` (see "Updates" below).

## Updates

There is no in-app updater. The app's **Updates** view shows the installed
version and points to GitHub Releases. To update, install the newer
`.pkg.tar.zst` with `pacman -U`. The backend makes no HTTP requests.

## Creating a release candidate

Ensure the version matches in `package.json`, `src-tauri/Cargo.toml`,
`src-tauri/tauri.conf.json`, `packaging/arch/PKGBUILD`, and their lockfiles,
then push the commit and a matching unused version tag (for example, after
bumping to 0.1.2):

```bash
git tag v0.1.2
git push origin master v0.1.2
```

After the Linux job passes, the workflow publishes the prerelease with its
downloadable asset. Install-test the build (including an N → N+1 `pacman -U`
upgrade where possible, confirming progress survives) before promoting it to
a stable release.

## Before the first public release

1. Review and install the CI artifact on a clean Arch-based virtual machine.
2. Confirm the Arch package installs and upgrades via `pacman -U`.
3. Enable GitHub private vulnerability reporting before making the repository
   public.

Users install or update the Arch package with `pacman -U`. All three reach
the same package; only how the file reaches `pacman` differs:

```bash
sudo pacman -U ./typedh-<version>-1-x86_64.pkg.tar.zst
```

```bash
sudo pacman -U "https://github.com/dhiraj-ydv/typedh/releases/download/v0.1.2/typedh-0.1.2-1-x86_64.pkg.tar.zst"
```

```bash
curl -L -O "https://github.com/dhiraj-ydv/typedh/releases/download/v0.1.2/typedh-0.1.2-1-x86_64.pkg.tar.zst"
sudo pacman -U ./typedh-0.1.2-1-x86_64.pkg.tar.zst
```

Pacman installs the binary under `/usr/bin`, the desktop entry, icons, and
the declared WebKit/GTK runtime dependencies. This path does not use the AUR
or `pacman -Syu` auto-updates; updates are manual `pacman -U` runs against
newer release files/URLs.

The generated prerelease is suitable for testing.
