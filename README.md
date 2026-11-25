# Asdfy

A touch-typing tutor for the US QWERTY layout. Asdfy teaches keys a few at a
time, targets the keys you miss most, and keeps all of your progress on your own
computer — no account, no cloud.

[Download](https://github.com/exolithelabs/Asdfy/releases/latest) ·
[Report a bug](https://github.com/exolithelabs/Asdfy/issues)

## Features

- **Staged course** — six stages from the home row to capitals, punctuation,
  numbers, prose, and code, using real words built from keys you already know.
- **Smart practice** — drills aimed at your slowest and least accurate keys.
- **Speed tests** — 15 to 120 seconds, with optional punctuation, capitals, and
  numbers.
- **Custom text** — practise anything you paste or open from a `.txt` file.
- **Live guidance** — an on-screen keyboard and finger guide show the next key and
  which finger to use.
- **Statistics** — speed and accuracy trends, a per-key heatmap, an activity
  calendar, and full session history.
- **Keyboard backlight** — optionally lights the next key on a per-key RGB
  keyboard through OpenRGB.

## Install

Download the file for your system from the
[latest release](https://github.com/exolithelabs/Asdfy/releases/latest):

| System | File |
| --- | --- |
| Linux (x86-64, any distribution) | `Asdfy_<version>_amd64.AppImage` |
| Windows 10 and 11 (x86-64) | `Asdfy_<version>_x64-setup.exe` |
| macOS 10.15 or later (Intel and Apple Silicon) | `Asdfy_<version>_universal.dmg` |

The other release files (`.sig`, `.app.tar.gz`, `latest.json`) are used by the
in-app updater. `SHA256SUMS` lets you verify a download:
`sha256sum -c SHA256SUMS --ignore-missing`.

The packages are not code-signed, so each system warns on first launch.

**Linux.** Make the AppImage executable and run it. Keep it in a folder you can
write to, such as `~/Applications`, so it can update itself; tools such as Gear
Lever or AppImageLauncher can add it to your application menu.

```bash
chmod +x Asdfy_<version>_amd64.AppImage
./Asdfy_<version>_amd64.AppImage
```

**Windows.** Run the installer; it installs for your user without administrator
rights. If SmartScreen shows **Windows protected your PC**, choose
**More info → Run anyway**. Uninstall from **Settings → Apps**.

**macOS.** Open the `.dmg` and drag **Asdfy** to **Applications**. On first launch,
Control-click the app and choose **Open**, or use
**System Settings → Privacy & Security → Open Anyway**. If macOS says the app is
damaged, run:

```bash
xattr -dr com.apple.quarantine /Applications/Asdfy.app
```

### Updating

Asdfy checks for a new release at startup and shows **Update to** in the sidebar
when one is available. Open **Settings → About and updates** and choose
**Update now**. The download is verified against Asdfy's signing key before it is
installed, and your progress is kept. On Linux and macOS choose **Restart now**
afterwards; on Windows the installer runs and reopens Asdfy by itself.

You can turn off the startup check in Settings, or update by hand by installing a
newer release over the current one.

## Getting started

1. Set your system keyboard layout to **English (US) QWERTY**. Asdfy reads what
   your keyboard types; it does not change the layout.
2. Open **Learn** and choose **Start lesson**. A lesson is passed at 90% accuracy,
   and **Continue lesson** always takes you to the first one you have not passed.
3. Use **Smart practice**, **Speed test**, and **Custom text** whenever you like,
   and check **Statistics** to see where you are improving.

Every keystroke is judged as you type it, so corrected mistakes still count against
accuracy. **Settings** has the theme, text size, a *stop on errors* mode, and
switches for the on-screen keyboard and finger guide.

| Shortcut | Action |
| --- | --- |
| `Tab` | Focus the typing area |
| `Escape` | Restart the exercise, or practise again from the results |
| `Enter` | Continue from the results |

### Keyboard backlight

With a per-key RGB keyboard, Asdfy can light the next key on the keyboard itself,
in the same finger colour as the on-screen guide.

1. Install [OpenRGB](https://openrgb.org) and check that it controls your keyboard
   key by key.
2. In OpenRGB, start the **SDK Server** on the default port, 6742.
3. In Asdfy, open **Settings → Keyboard backlight** and switch on
   **Light the next key on my keyboard**.

When you switch it off or quit, the keyboard returns to its previous lighting.
Keyboards that OpenRGB cannot drive key by key, including many generic SINO WEALTH
boards (USB vendor `258a`), are not supported.

## Your data

Progress is stored in a local SQLite database, `progress.sqlite3`, in a folder for
your user account. **Settings** shows its exact location.

| System | Folder |
| --- | --- |
| Linux | `~/.local/share/io.github.exolithelabs.asdfy/` |
| Windows | `%APPDATA%\io.github.exolithelabs.asdfy\` |
| macOS | `~/Library/Application Support/io.github.exolithelabs.asdfy/` |

- **Back up** by quitting Asdfy and copying the folder. Keep the
  `progress.sqlite3-wal` and `-shm` files with it if they exist.
- **Upgrades** that change the database first save a full copy named
  `progress.v<old version>-backup-<time>.sqlite3` in the same folder. If the upgrade
  fails, nothing is changed. Backups are never deleted automatically.
- **Go back to an older version** by quitting, replacing `progress.sqlite3` with the
  matching backup, deleting the `-wal` and `-shm` files, and installing that version.
- **Start fresh** by quitting and moving `progress.sqlite3` and its `-wal` and `-shm`
  files out of the folder.

Asdfy connects to the internet only to check GitHub for updates and download them.
The keyboard backlight talks only to OpenRGB on your own computer
(`127.0.0.1`). Custom practice text is never saved.

Asdfy was previously TypeDH, a Colemak-DH tutor distributed as a Flatpak. Asdfy does
not read or change TypeDH data, which stays in
`~/.var/app/io.github.exolithelabs.typedh/` until you remove it.

## Troubleshooting

**The AppImage will not start.** It needs FUSE support in the kernel and the
`fusermount3` program from the `fuse3` package, which most desktops already have.
It does not need the older `libfuse2`/`fuse2`; on Ubuntu, do not install the old
`fuse` package, which can remove desktop packages.

| Message | Fix |
| --- | --- |
| `No suitable fusermount binary found` | Install `fuse3` with your package manager. |
| `fuse: device not found` | Run `sudo modprobe fuse`, or use the fallback below. |
| `Cannot mount AppImage` | Check the requirements above, or use the fallback below. |

Without FUSE (for example in containers or WSL), run it with
`--appimage-extract-and-run`, or set `APPIMAGE_EXTRACT_AND_RUN=1`.

**The window misbehaves on Wayland.** The AppImage runs natively on Wayland
sessions. If you see rendering or scaling problems, you can run it through
XWayland instead with `GDK_BACKEND=x11 ./Asdfy_<version>_amd64.AppImage`.

**The window closes on NVIDIA.** The AppImage disables WebKitGTK's DMA-BUF renderer
by default to avoid this. To re-enable it for testing, start Asdfy with
`WEBKIT_DISABLE_DMABUF_RENDERER=0`.

## Support

Report bugs in [Issues](https://github.com/exolithelabs/Asdfy/issues) with your
Asdfy version, operating system, package type, and steps to reproduce. Please do
not attach your progress database to a public issue.

Report security vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Contributing

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) to run Asdfy locally and for an
overview of the code, and [docs/RELEASING.md](docs/RELEASING.md) for the build and
release workflow.

## License

[Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for attributions.

Asdfy is built on open-source libraries that keep their own licenses. Every
package includes Asdfy's license and NOTICE and the license and notice texts of
those libraries; open **Settings → About and updates → Licenses and notices** to
read them.
