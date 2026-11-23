# Security Policy

Please do not open a public issue for a suspected vulnerability. Report it
privately through GitHub's **Report a vulnerability** feature on the Security
tab. Include reproduction steps, impact, and the affected version.

Only the latest released version is supported with security fixes.

The backend runs inside the Rust/Tauri process and makes no network requests.
It exposes a small set of typed IPC commands to the local webview, with no HTTP
listener or shell plugin. Rust validates inputs and uses parameterized SQLite
queries in the OS user-data directory. The database is not encrypted; security
depends on the OS user account and filesystem permissions (on Linux and macOS the
data folder and database are restricted to the current user). Unexpected database
formats are rejected rather than automatically reset.

Release packages (AppImage, Windows installer, macOS disk image) are not
code-signed. Download them only from this repository's GitHub Releases and
compare them against the published `SHA256SUMS`.
