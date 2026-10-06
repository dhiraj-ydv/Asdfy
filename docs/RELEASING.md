# Releasing

## What CI produces

The **Linux build** workflow runs on pull requests, pushes to `master`, version
tags, and manual dispatches. It produces a single artifact:

- a Flatpak single-file bundle `typedh-<version>-x86_64.flatpak`
  for x86-64.

Ordinary builds retain this as a workflow artifact for 14 days. Pushing a
version tag publishes a GitHub prerelease and attaches the Flatpak bundle
together with a `SHA256SUMS` file. This uses the automatic per-run
`GITHUB_TOKEN`; no personal access token is required.

Before packaging, CI validates matching application versions, runs frontend
regression tests, and audits JavaScript dependencies. The Linux job compiles
the native Rust backend and tests validation, unsupported-schema rejection,
pagination, and persistence across restart. Published assets include a
`SHA256SUMS` file. An already published release cannot be overwritten by
rerunning the workflow; create a new version instead.

The Linux job builds the bundle with `flatpak-builder` inside the GNOME 48
SDK container (`packaging/flatpak/build-flatpak.sh`), then exports a
single-file `.flatpak` bundle with `flatpak build-bundle`.

## Linux Flatpak package

The `linux-flatpak` job runs on `ubuntu-24.04`:

1. Install Flatpak, flatpak-builder, and the host Tauri test prerequisites
   (`libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`,
   `patchelf`).
2. Run the Rust backend tests on the host (`cargo test --locked
   --manifest-path src-tauri/Cargo.toml --lib`).
3. Install the GNOME platform/SDK (`org.gnome.Platform//48`,
   `org.gnome.Sdk//48`) and the Rust/Node SDK extensions from Flathub.
4. Run `packaging/flatpak/build-flatpak.sh`, producing
   `dist/typedh-<version>-x86_64.flatpak`.

`packaging/flatpak/io.github.exolithelabs.typedh.yml` builds the frontend
(`npm --prefix frontend ci` plus `npm --prefix frontend run build`) and the
Tauri backend (`cargo build --release --locked`) inside the SDK, then installs
the `typedh` binary to `/app/bin`, the desktop entry, AppStream metadata, and
the hicolor icons.

The sandbox grants only display/GPU access (`ipc`, `fallback-x11`,
`wayland`, `dri`). No network and no host filesystem access is granted.

Keep the app version in sync across `package.json`,
`src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, and
`packaging/flatpak/io.github.exolithelabs.typedh.metainfo.xml` (enforced by
`scripts/check-release.mjs`). The Tauri identifier must equal the Flatpak
app ID `io.github.exolithelabs.typedh`.

There is no Flathub publication path in this workflow. Updates are manual via
`flatpak install` (see "Updates" below).

## Updates

There is no in-app updater. The app's **Updates** view shows the installed
version and points to GitHub Releases. To update, install the newer
`.flatpak` bundle with `flatpak install --user`. The backend makes no HTTP requests.

## Creating a release candidate

Ensure the version matches in `package.json`, `src-tauri/Cargo.toml`,
`src-tauri/tauri.conf.json`,
`packaging/flatpak/io.github.exolithelabs.typedh.metainfo.xml`, and their lockfiles,
then push the commit and a matching unused version tag (for example, after
bumping to 0.1.2):

```bash
git tag v0.1.2
git push origin master v0.1.2
```

After the Linux job passes, the workflow publishes the prerelease with its
downloadable asset. Install-test the build (including an N → N+1 bundle
reinstall where possible, confirming progress survives) before promoting it to
a stable release.

## Before the first public release

1. Review and install the CI artifact on a clean Linux virtual machine.
2. Confirm the Flatpak bundle installs and updates via `flatpak install`.
3. Enable GitHub private vulnerability reporting before making the repository
   public.

Users install or update the Flatpak bundle with `flatpak install --user`. All three reach
the same bundle; only how the file reaches `flatpak` differs:

```bash
flatpak install --user ./typedh-<version>-x86_64.flatpak
```

```bash
flatpak install --user "https://github.com/dhiraj-ydv/typedh/releases/download/v0.1.2/typedh-0.1.2-x86_64.flatpak"
```

```bash
curl -L -O "https://github.com/dhiraj-ydv/typedh/releases/download/v0.1.2/typedh-0.1.2-x86_64.flatpak"
flatpak install --user ./typedh-0.1.2-x86_64.flatpak
```

Flatpak places the binary under `/app/bin`, the desktop entry, icons, and
AppStream metadata in the sandbox, resolving the GNOME runtime from Flathub on
first install. This path does not use Flathub auto-updates; updates are manual
`flatpak install` runs against newer release files/URLs.

The generated prerelease is suitable for testing.
