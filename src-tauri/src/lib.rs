mod commands;
mod content;
mod models;
mod storage;

use std::sync::Arc;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let mut directory = app.path().app_data_dir()?;
            if cfg!(debug_assertions) {
                directory.push("development");
            }
            // Opening is lazy and retryable; a storage failure never prevents the UI opening.
            app.manage(Arc::new(storage::Storage::new(directory)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_lessons,
            commands::get_progress,
            commands::get_summary,
            commands::save_progress,
            commands::stop_application,
            commands::restart_application,
            commands::app_version,
        ])
        .run(tauri::generate_context!())
        .expect("TypeDH could not initialize its desktop window");
}
