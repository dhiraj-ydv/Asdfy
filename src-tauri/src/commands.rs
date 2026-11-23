use std::sync::Arc;
use tauri::State;

use crate::content::LESSONS;
use crate::models::{Lesson, Progress, ProgressInput, Result, Summary};
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
pub fn restart_application(app: tauri::AppHandle) {
    app.restart();
}

#[tauri::command]
pub fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Shown in Settings so people know what to back up; the path is never accepted from the UI.
#[tauri::command]
pub fn data_location(state: State<'_, Arc<Storage>>) -> String {
    state.directory().display().to_string()
}
