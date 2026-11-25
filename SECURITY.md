# Security Policy

Please do not open a public issue for a suspected vulnerability. Report it
privately through GitHub's **Report a vulnerability** feature on the Security
tab. Include reproduction steps, impact, and the affected version.

Only the latest released version is supported with security fixes.

The backend runs inside the Rust/Tauri process. Its only internet requests are
HTTPS requests to GitHub for updates: at startup (unless switched off in Settings)
and on request it reads `latest.json` from this repository's latest release, and
when the user chooses **Update now** it downloads the update that file names.
Every update is verified against the minisign public key compiled into the app
before it is installed; the webview cannot choose the address or the version.
The only other network connection is the optional keyboard backlight, off by default,
which connects to an OpenRGB SDK server on `127.0.0.1` only; the webview cannot
choose the host. The backend exposes a small set of typed IPC commands to the local
webview, with no HTTP listener or shell plugin. Rust validates inputs and uses parameterized SQLite
queries in the OS user-data directory. The database is not encrypted; security
depends on the OS user account and filesystem permissions (on Linux and macOS the
data folder and database are restricted to the current user). Unexpected database
formats are rejected rather than automatically reset.

Release packages (AppImage, Windows installer, macOS disk image) are not
code-signed by the operating systems' authorities; only the in-app updater checks
Asdfy's own release signature. Download them only from this repository's GitHub Releases and
compare them against the published `SHA256SUMS`.
