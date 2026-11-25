use std::sync::{Arc, Mutex, PoisonError};
use tauri::ipc::Channel;
use tauri::State;
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::content::LESSONS;
use crate::lighting::{Lighting, LightingStatus, LitKey, DEFAULT_PORT};
use crate::models::{Lesson, Progress, ProgressInput, Result, Summary, UpdateInfo, UpdateProgress};
use crate::storage::{Repository, Storage};

async fn work<T: Send + 'static>(
    state: &State<'_, Arc<Storage>>,
    operation: impl FnOnce(&mut Repository) -> Result<T> + Send + 'static,
) -> Result<T> {
    let storage = Arc::clone(state.inner());
    tauri::async_runtime::spawn_blocking(move || storage.access(operation))
        .await
        .map_err(|_| "Storage operation could not complete.".to_string())?
}

/// The catalog is compiled in, so lessons load even when storage is unavailable.
#[tauri::command]
pub fn get_lessons() -> Vec<Lesson> {
    LESSONS.to_vec()
}

#[tauri::command]
pub async fn get_progress(
    username: String,
    limit: Option<i64>,
    before: Option<i64>,
    state: State<'_, Arc<Storage>>,
) -> Result<Vec<Progress>> {
    work(&state, move |repository| repository.history(&username, limit.unwrap_or(100), before)).await
}

#[tauri::command]
pub async fn get_summary(username: String, state: State<'_, Arc<Storage>>) -> Result<Summary> {
    work(&state, move |repository| repository.summary(&username)).await
}

#[tauri::command]
pub async fn save_progress(input: ProgressInput, state: State<'_, Arc<Storage>>) -> Result<()> {
    work(&state, move |repository| repository.save(input)).await
}

#[tauri::command]
pub fn stop_application(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn restart_application(app: tauri::AppHandle, lighting: State<'_, Arc<Lighting>>) {
    // Restarting skips the exit event, so hand the keyboard back first.
    lighting.disconnect();
    app.restart();
}

#[tauri::command]
pub fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// The release found by the last check. Installing only ever uses this, so the UI never
/// chooses a version or download address.
#[derive(Default)]
pub struct PendingUpdate(Mutex<Option<Update>>);

/// Only the AppImage can replace itself on Linux; development builds never replace themselves.
fn self_updating() -> bool {
    !cfg!(debug_assertions) && (!cfg!(target_os = "linux") || std::env::var_os("APPIMAGE").is_some())
}

fn update_error(error: tauri_plugin_updater::Error) -> String {
    use tauri_plugin_updater::Error;
    match error {
        Error::Reqwest(_) | Error::Network(_) => {
            "GitHub could not be reached. Check your connection, then try again.".into()
        }
        Error::ReleaseNotFound => "GitHub has no update information yet. Try again later.".into(),
        Error::Minisign(_) | Error::Base64(_) | Error::SignatureUtf8(_) | Error::SignedVersionMismatch { .. } => {
            "The download did not match Asdfy's release signature, so nothing was installed.".into()
        }
        Error::TargetNotFound(_) | Error::TargetsNotFound(_) => {
            "The latest release has no update for this system. Download it from GitHub Releases instead.".into()
        }
        Error::Io(_) | Error::PreviousAppNotRestored(_) => {
            format!("The update could not replace the installed app ({error}). Download it from GitHub Releases instead.")
        }
        error => format!("The update failed: {error}"),
    }
}

#[tauri::command]
pub async fn update_check(app: tauri::AppHandle, pending: State<'_, PendingUpdate>) -> Result<Option<UpdateInfo>> {
    // The Windows installer exits the process after this hook, so the RunEvent::Exit
    // handler never runs. Release the keyboard here, then run Tauri's own cleanup.
    let lighting = Arc::clone(app.state::<Arc<Lighting>>().inner());
    let handle = app.clone();
    let update = app
        .updater_builder()
        .on_before_exit(move || {
            lighting.disconnect();
            handle.cleanup_before_exit();
        })
        .build()
        .map_err(update_error)?
        .check()
        .await
        .map_err(update_error)?;
    let info = update.as_ref().map(|update| UpdateInfo {
        version: update.version.clone(),
        notes: update.body.clone(),
        installable: self_updating(),
    });
    *pending.0.lock().unwrap_or_else(PoisonError::into_inner) = update;
    Ok(info)
}

/// Downloads, verifies, and installs the checked release. Windows closes the app to run
/// the installer; elsewhere the new version starts after `restart_application`.
#[tauri::command]
pub async fn update_install(progress: Channel<UpdateProgress>, pending: State<'_, PendingUpdate>) -> Result<()> {
    if !self_updating() {
        return Err("This copy of Asdfy cannot update itself. Download the new version from GitHub Releases.".into());
    }
    let update = pending.0.lock().unwrap_or_else(PoisonError::into_inner).clone()
        .ok_or("Check for updates before installing one.")?;
    let mut downloaded = 0;
    update
        .download_and_install(
            |chunk, total| {
                downloaded += chunk as u64;
                let _ = progress.send(UpdateProgress { downloaded, total });
            },
            || {},
        )
        .await
        .map_err(update_error)
}

/// Shown in Settings so people know what to back up; the path is never accepted from the UI.
#[tauri::command]
pub fn data_location(state: State<'_, Arc<Storage>>) -> String {
    state.directory().display().to_string()
}

/// Runs network work off the main thread so a slow OpenRGB server never stalls the window.
async fn blocking<T: Send + 'static>(operation: impl FnOnce() -> Result<T> + Send + 'static) -> Result<T> {
    tauri::async_runtime::spawn_blocking(operation)
        .await
        .map_err(|_| "Keyboard lighting could not complete.".to_string())?
}

#[tauri::command]
pub async fn lighting_connect(port: Option<u16>, state: State<'_, Arc<Lighting>>) -> Result<LightingStatus> {
    let lighting = Arc::clone(state.inner());
    blocking(move || lighting.connect(port.unwrap_or(DEFAULT_PORT))).await
}

#[tauri::command]
pub async fn lighting_highlight(frame: u64, keys: Vec<LitKey>, state: State<'_, Arc<Lighting>>) -> Result<()> {
    let lighting = Arc::clone(state.inner());
    blocking(move || lighting.highlight(frame, &keys)).await
}

#[tauri::command]
pub async fn lighting_disconnect(state: State<'_, Arc<Lighting>>) -> Result<()> {
    let lighting = Arc::clone(state.inner());
    blocking(move || {
        lighting.disconnect();
        Ok(())
    }).await
}
