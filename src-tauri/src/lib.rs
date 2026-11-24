mod commands;
mod content;
mod lighting;
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
            app.manage(Arc::new(lighting::Lighting::default()));
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
            commands::data_location,
            commands::lighting_connect,
            commands::lighting_highlight,
            commands::lighting_disconnect,
        ])
        .build(tauri::generate_context!())
        .expect("Asdfy could not initialize its desktop window")
        .run(|app, event| {
            // Give the keyboard back its previous OpenRGB effect when the app closes.
            if let tauri::RunEvent::Exit = event {
                app.state::<Arc<lighting::Lighting>>().disconnect();
            }
        });
}
