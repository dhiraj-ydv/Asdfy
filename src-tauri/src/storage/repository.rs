use std::{fs, path::Path, time::Duration};
use rusqlite::{params, Connection};

use crate::content::LESSONS;
use crate::models::{validate_username, Lesson, Progress, ProgressInput, Result, CUSTOM_LESSON_ID};

const DATABASE_NAME: &str = "progress.sqlite3";
const SCHEMA_VERSION: i32 = 1;

fn storage_error(error: impl std::fmt::Display) -> String {
    eprintln!("TypeDH storage: {error}");
    "Unable to access local progress. Check free disk space and retry.".into()
}

fn secure(path: &Path, mode: u32) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(mode)).map_err(storage_error)
}

pub struct Repository(Connection);

impl Repository {
    pub fn open(directory: &Path) -> Result<Self> {
        if !directory.is_absolute() { return Err("An absolute app-data directory is required.".into()); }
        fs::create_dir_all(directory).map_err(storage_error)?;
        secure(directory, 0o700)?;
        let path = directory.join(DATABASE_NAME);
        if path.is_symlink() { return Err("The database must not be a symbolic link.".into()); }
        let existed = path.exists();
        let mut connection = Connection::open(path.clone()).map_err(storage_error)?;
        secure(&path, 0o600)?;
        connection.busy_timeout(Duration::from_secs(5)).map_err(storage_error)?;
        let version: i32 = connection.pragma_query_value(None, "user_version", |row| row.get(0)).map_err(storage_error)?;
        // Integrity check only: no migration, compatibility, or destructive reset path.
        if existed && version != SCHEMA_VERSION {
            return Err("Unexpected database format. Close the app and choose a fresh development data directory.".into());
        }
        connection.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;").map_err(storage_error)?;
        let transaction = connection.transaction().map_err(storage_error)?;
        transaction.execute_batch(include_str!("schema.sql")).map_err(storage_error)?;
        for (index, (title, content, level)) in LESSONS.iter().enumerate() {
            transaction.execute(
                "INSERT INTO lessons(id,title,content,level) VALUES (?1,?2,?3,?4)
                 ON CONFLICT(id) DO UPDATE SET title=excluded.title,content=excluded.content,level=excluded.level",
                params![index as i64 + 1, title, content, level],
            ).map_err(storage_error)?;
        }
        transaction.execute(
            "INSERT INTO lessons(id,title,content,level) VALUES (?1,'Custom Practice','',99) ON CONFLICT(id) DO NOTHING",
            [CUSTOM_LESSON_ID],
        ).map_err(storage_error)?;
        transaction.commit().map_err(storage_error)?;
        Ok(Self(connection))
    }

    pub fn lessons(&self) -> Result<Vec<Lesson>> {
        let mut statement = self.0.prepare("SELECT id,title,content,level FROM lessons WHERE id != ?1 ORDER BY level,id").map_err(storage_error)?;
        let rows = statement.query_map([CUSTOM_LESSON_ID], |row| Ok(Lesson {
            id: row.get(0)?, title: row.get(1)?, content: row.get(2)?, level: row.get(3)?,
        })).map_err(storage_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(storage_error)
    }

    pub fn save(&mut self, input: ProgressInput) -> Result<()> {
        input.validate()?;
        self.0.execute(
            "INSERT INTO results(username,lesson_id,wpm,accuracy) VALUES (?1,?2,?3,?4)",
            params![input.username.trim(), input.lesson_id, input.wpm, input.accuracy],
        ).map_err(storage_error)?;
        Ok(())
    }

    pub fn history(&self, username: &str, limit: i64, before: Option<i64>) -> Result<Vec<Progress>> {
        let username = validate_username(username)?;
        let before = before.unwrap_or(i64::MAX);
        if !(1..=200).contains(&limit) || before < 1 { return Err("Invalid history pagination.".into()); }
        let mut statement = self.0.prepare(
            "SELECT id,lesson_id,wpm,accuracy,completed_at FROM results
             WHERE username=?1 AND id<?2 ORDER BY id DESC LIMIT ?3",
        ).map_err(storage_error)?;
        let rows = statement.query_map(params![username, before, limit], |row| Ok(Progress {
            id: row.get(0)?, lesson_id: row.get(1)?, wpm: row.get(2)?, accuracy: row.get(3)?, completed_at: row.get(4)?,
        })).map_err(storage_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(storage_error)
    }
}
