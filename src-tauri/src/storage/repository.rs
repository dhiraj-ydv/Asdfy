use std::{fs, path::{Path, PathBuf}, time::{Duration, SystemTime, UNIX_EPOCH}};
use rusqlite::{params, Connection, Row};

use crate::content::LESSONS;
use crate::models::{
    validate_username, ActivityDay, KeyStat, LessonBest, ModeBest, Progress, ProgressInput, Result, Summary,
};

const DATABASE_NAME: &str = "progress.sqlite3";

/// Ordered schema migrations. A database's `user_version` is the number it has applied.
/// Never edit, remove, or reorder a released migration; add the next numbered file instead.
pub(crate) const MIGRATIONS: &[&str] = &[
    include_str!("migrations/0001_initial.sql"),
];

fn storage_error(error: impl std::fmt::Display) -> String {
    eprintln!("Asdfy storage: {error}");
    "Unable to access local progress. Check free disk space and retry.".into()
}

/// Restricts progress files to the current user. Windows profile folders are already per-user.
#[cfg(unix)]
fn secure(path: &Path, mode: u32) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(mode)).map_err(storage_error)
}

#[cfg(not(unix))]
fn secure(_path: &Path, _mode: u32) -> Result<()> {
    Ok(())
}

/// Copies a database that is about to be migrated, so the previous version can be restored by hand.
fn backup(connection: &Connection, directory: &Path, version: i64) -> Result<PathBuf> {
    let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map_err(storage_error)?.as_secs();
    let path = (1..100)
        .map(|attempt| match attempt {
            1 => directory.join(format!("progress.v{version}-backup-{stamp}.sqlite3")),
            _ => directory.join(format!("progress.v{version}-backup-{stamp}-{attempt}.sqlite3")),
        })
        .find(|path| !path.exists())
        .ok_or("Too many database backups were made at once. Retry in a moment.")?;
    let target = path.to_str().ok_or("The app-data path is not valid UTF-8.")?;
    connection.execute("VACUUM INTO ?1", [target]).map_err(storage_error)?;
    secure(&path, 0o600)?;
    Ok(path)
}

/// Applies `migrations[from..]` in one transaction. Foreign keys are off so migrations can
/// rebuild tables the way SQLite documents; they are checked before anything is committed.
fn migrate(connection: &mut Connection, migrations: &[&str], from: i64) -> std::result::Result<(), String> {
    connection.execute_batch("PRAGMA foreign_keys=OFF;").map_err(|error| error.to_string())?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    for (index, sql) in migrations.iter().enumerate().skip(from as usize) {
        let step = index + 1;
        transaction.execute_batch(sql).map_err(|error| format!("migration {step}: {error}"))?;
        transaction.pragma_update(None, "user_version", step as i64).map_err(|error| format!("migration {step}: {error}"))?;
    }
    let broken = transaction.prepare("PRAGMA foreign_key_check").and_then(|mut check| check.exists([]))
        .map_err(|error| error.to_string())?;
    if broken {
        return Err("migrations left rows that point at missing records".into());
    }
    transaction.commit().map_err(|error| error.to_string())
}

pub struct Repository(Connection);

impl Repository {
    pub fn open(directory: &Path) -> Result<Self> {
        Self::open_with(directory, MIGRATIONS)
    }

    pub(crate) fn open_with(directory: &Path, migrations: &[&str]) -> Result<Self> {
        if !directory.is_absolute() { return Err("An absolute app-data directory is required.".into()); }
        fs::create_dir_all(directory).map_err(storage_error)?;
        secure(directory, 0o700)?;
        let path = directory.join(DATABASE_NAME);
        if path.is_symlink() { return Err("The database must not be a symbolic link.".into()); }
        let mut connection = Connection::open(path.clone()).map_err(storage_error)?;
        secure(&path, 0o600)?;
        connection.busy_timeout(Duration::from_secs(5)).map_err(storage_error)?;
        let version: i64 = connection.pragma_query_value(None, "user_version", |row| row.get(0)).map_err(storage_error)?;
        let tables: i64 = connection.query_row("SELECT count(*) FROM sqlite_master", [], |row| row.get(0)).map_err(storage_error)?;
        let current = migrations.len() as i64;
        // Databases this version cannot understand are refused before anything is written.
        if version > current {
            return Err("This progress database was created by a newer version of Asdfy and was left unchanged. Install the newest Asdfy version.".into());
        }
        if version < 0 || (version == 0 && tables > 0) {
            return Err("This progress database has an unknown format and was left unchanged.".into());
        }
        connection.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;").map_err(storage_error)?;
        if version < current {
            // A new, empty database has nothing to lose; an existing one is copied first.
            let saved = if version > 0 { Some(backup(&connection, directory, version)?) } else { None };
            migrate(&mut connection, migrations, version).map_err(|error| {
                eprintln!("Asdfy storage: upgrade from version {version} failed: {error}");
                match &saved {
                    Some(path) => format!(
                        "Asdfy could not upgrade your progress database, so it was left unchanged. A copy was also saved as {}.",
                        path.display()),
                    None => "Asdfy could not create its progress database. Check free disk space and retry.".to_string(),
                }
            })?;
        }
        connection.execute_batch("PRAGMA foreign_keys=ON;").map_err(storage_error)?;
        let transaction = connection.transaction().map_err(storage_error)?;
        for (index, lesson) in LESSONS.iter().enumerate() {
            transaction.execute(
                "INSERT INTO lessons(id,title,content,level) VALUES (?1,?2,?3,?4)
                 ON CONFLICT(id) DO UPDATE SET title=excluded.title,content=excluded.content,level=excluded.level",
                params![lesson.id, lesson.title, lesson.content, index as i64 + 1],
            ).map_err(storage_error)?;
        }
        transaction.commit().map_err(storage_error)?;
        Ok(Self(connection))
    }

    pub fn save(&mut self, input: ProgressInput) -> Result<()> {
        input.validate()?;
        let username = input.username.trim();
        let transaction = self.0.transaction().map_err(storage_error)?;
        transaction.execute(
            "INSERT INTO results(username,mode,lesson_id,wpm,raw_wpm,accuracy,duration_ms,characters,errors)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
            params![username, input.mode, input.lesson_id, input.wpm, input.raw_wpm, input.accuracy,
                input.duration_ms, input.characters, input.errors],
        ).map_err(storage_error)?;
        {
            let mut statement = transaction.prepare(
                "INSERT INTO key_stats(username,symbol,hits,misses,time_ms) VALUES (?1,?2,?3,?4,?5)
                 ON CONFLICT(username,symbol) DO UPDATE SET hits=hits+excluded.hits,
                 misses=misses+excluded.misses, time_ms=time_ms+excluded.time_ms",
            ).map_err(storage_error)?;
            for stat in &input.keys {
                statement.execute(params![username, stat.key, stat.hits, stat.misses, stat.time_ms]).map_err(storage_error)?;
            }
        }
        transaction.commit().map_err(storage_error)
    }

    pub fn history(&self, username: &str, limit: i64, before: Option<i64>) -> Result<Vec<Progress>> {
        let username = validate_username(username)?;
        let before = before.unwrap_or(i64::MAX);
        if !(1..=200).contains(&limit) || before < 1 { return Err("Invalid history pagination.".into()); }
        let mut statement = self.0.prepare(
            "SELECT r.id,r.mode,r.lesson_id,l.title,r.wpm,r.raw_wpm,r.accuracy,r.duration_ms,r.characters,r.errors,r.completed_at
             FROM results r LEFT JOIN lessons l ON l.id=r.lesson_id
             WHERE r.username=?1 AND r.id<?2 ORDER BY r.id DESC LIMIT ?3",
        ).map_err(storage_error)?;
        let rows = statement.query_map(params![username, before, limit], |row| Ok(Progress {
            id: row.get(0)?, mode: row.get(1)?, lesson_id: row.get(2)?, lesson_title: row.get(3)?,
            wpm: row.get(4)?, raw_wpm: row.get(5)?, accuracy: row.get(6)?, duration_ms: row.get(7)?,
            characters: row.get(8)?, errors: row.get(9)?, completed_at: row.get(10)?,
        })).map_err(storage_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(storage_error)
    }

    pub fn summary(&self, username: &str) -> Result<Summary> {
        let username = validate_username(username)?;
        let (sessions, duration_ms, best_wpm) = self.0.query_row(
            "SELECT count(*), coalesce(sum(duration_ms),0), coalesce(max(wpm),0.0) FROM results WHERE username=?1",
            [username], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        ).map_err(storage_error)?;
        let lessons = self.rows(
            "SELECT lesson_id, max(wpm), max(accuracy), count(*) FROM results
             WHERE username=?1 AND lesson_id IS NOT NULL GROUP BY lesson_id ORDER BY lesson_id",
            username,
            |row| Ok(LessonBest { lesson_id: row.get(0)?, best_wpm: row.get(1)?, best_accuracy: row.get(2)?, attempts: row.get(3)? }),
        )?;
        let modes = self.rows(
            "SELECT mode, max(wpm), count(*) FROM results WHERE username=?1 GROUP BY mode ORDER BY mode",
            username,
            |row| Ok(ModeBest { mode: row.get(0)?, best_wpm: row.get(1)?, sessions: row.get(2)? }),
        )?;
        let days = self.rows(
            "SELECT date(completed_at,'localtime') AS day, count(*), coalesce(sum(duration_ms),0) FROM results
             WHERE username=?1 GROUP BY day ORDER BY day DESC LIMIT 400",
            username,
            |row| Ok(ActivityDay { day: row.get(0)?, sessions: row.get(1)?, duration_ms: row.get(2)? }),
        )?;
        let keys = self.rows(
            "SELECT symbol,hits,misses,time_ms FROM key_stats WHERE username=?1 ORDER BY symbol",
            username,
            |row| Ok(KeyStat { key: row.get(0)?, hits: row.get(1)?, misses: row.get(2)?, time_ms: row.get(3)? }),
        )?;
        Ok(Summary { sessions, duration_ms, best_wpm, lessons, modes, days, keys })
    }

    fn rows<T>(&self, sql: &str, username: &str, map: impl FnMut(&Row<'_>) -> rusqlite::Result<T>) -> Result<Vec<T>> {
        let mut statement = self.0.prepare(sql).map_err(storage_error)?;
        let rows = statement.query_map([username], map).map_err(storage_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(storage_error)
    }
}
