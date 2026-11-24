use super::*;
use super::repository::MIGRATIONS;
use crate::content::LESSONS;
use crate::models::{KeyStat, ProgressInput};
use rusqlite::Connection;
use std::{collections::HashSet, fs, path::Path};
use tempfile::tempdir;

fn session(mode: &str, lesson_id: Option<i64>, wpm: f64) -> ProgressInput {
    ProgressInput {
        username: "User1".into(), mode: mode.into(), lesson_id, wpm, raw_wpm: wpm, accuracy: 0.0,
        duration_ms: 1000, characters: 10, errors: 0, keys: vec![],
    }
}

fn lesson(wpm: f64) -> ProgressInput {
    session("lesson", Some(LESSONS[0].id), wpm)
}

fn key(symbol: &str, hits: i64, misses: i64) -> KeyStat {
    KeyStat { key: symbol.into(), hits, misses, time_ms: hits * 200 }
}

#[test]
fn catalog_is_consistent() {
    let mut ids = HashSet::new();
    for lesson in LESSONS {
        assert!(ids.insert(lesson.id), "duplicate lesson {}", lesson.id);
        assert!(["keys", "words", "caps", "punctuation", "numbers", "text"].contains(&lesson.kind));
        assert_eq!(lesson.kind == "text", !lesson.content.is_empty());
        assert_eq!(lesson.kind == "keys", !lesson.keys.is_empty());
    }
}

#[test]
fn first_launch_creates_storage_and_restart_retains_results() {
    let directory = tempdir().unwrap();
    {
        let mut repository = Repository::open(directory.path()).unwrap();
        let mut input = lesson(42.0);
        input.keys = vec![key("a", 3, 1)];
        repository.save(input).unwrap();
        repository.save(session("custom", None, 50.0)).unwrap();
    }
    let repository = Repository::open(directory.path()).unwrap();
    let history = repository.history("User1", 100, None).unwrap();
    assert_eq!(history.len(), 2);
    assert_eq!(history[0].mode, "custom");
    assert_eq!(history[0].lesson_id, None);
    assert_eq!(history[0].duration_ms, Some(1000));
    assert!(history[0].completed_at.ends_with('Z'));
    assert_eq!(history[1].lesson_title.as_deref(), Some(LESSONS[0].title));
    let summary = repository.summary("User1").unwrap();
    assert_eq!((summary.sessions, summary.duration_ms, summary.best_wpm), (2, 2000, 50.0));
    assert_eq!(summary.lessons.len(), 1);
    assert_eq!(summary.lessons[0].attempts, 1);
    assert_eq!(summary.modes.len(), 2);
    assert_eq!(summary.days.len(), 1);
    assert_eq!(summary.days[0].sessions, 2);
    assert_eq!(summary.keys.len(), 1);
}

#[test]
fn key_statistics_accumulate_per_user() {
    let directory = tempdir().unwrap();
    let mut repository = Repository::open(directory.path()).unwrap();
    for _ in 0..2 {
        let mut input = session("adaptive", None, 30.0);
        input.keys = vec![key("a", 5, 1), key(" ", 4, 0)];
        repository.save(input).unwrap();
    }
    let keys = repository.summary("User1").unwrap().keys;
    let a = keys.iter().find(|stat| stat.key == "a").unwrap();
    assert_eq!((a.hits, a.misses, a.time_ms), (10, 2, 2000));
    assert_eq!(keys.len(), 2);
    assert!(repository.summary("another user").unwrap().keys.is_empty());
}

#[test]
fn invalid_sessions_never_create_results() {
    let directory = tempdir().unwrap();
    let mut repository = Repository::open(directory.path()).unwrap();
    for speed in [f64::NAN, f64::INFINITY, -1.0, 1001.0] { assert!(repository.save(lesson(speed)).is_err()); }
    for id in [-1, 0, 999, i64::MAX] { assert!(repository.save(session("lesson", Some(id), 20.0)).is_err()); }
    assert!(repository.save(session("lesson", None, 20.0)).is_err());
    assert!(repository.save(session("custom", Some(LESSONS[0].id), 20.0)).is_err());
    assert!(repository.save(session("race", None, 20.0)).is_err());
    for accuracy in [f64::NAN, f64::INFINITY, -1.0, 101.0] {
        let mut input = lesson(20.0);
        input.accuracy = accuracy;
        assert!(repository.save(input).is_err());
    }
    let mut input = lesson(20.0);
    input.duration_ms = 0;
    assert!(repository.save(input).is_err());
    let mut input = lesson(20.0);
    input.keys = vec![key("ab", 1, 0)];
    assert!(repository.save(input).is_err());
    let mut input = lesson(20.0);
    input.keys = (0..257).map(|_| key("a", 1, 0)).collect();
    assert!(repository.save(input).is_err());
    let mut input = lesson(20.0);
    input.username = " ".into();
    assert!(repository.save(input).is_err());
    assert!(repository.history("User1", 100, None).unwrap().is_empty());
    assert!(repository.summary("User1").unwrap().keys.is_empty());
}

#[test]
fn history_is_newest_first_bounded_and_private() {
    let directory = tempdir().unwrap();
    let mut repository = Repository::open(directory.path()).unwrap();
    for speed in [10.0, 20.0, 30.0] { repository.save(lesson(speed)).unwrap(); }
    let history = repository.history("User1", 2, None).unwrap();
    assert_eq!(history.iter().map(|entry| entry.wpm).collect::<Vec<_>>(), [30.0, 20.0]);
    assert_eq!(repository.history("User1", 2, Some(history[1].id)).unwrap()[0].wpm, 10.0);
    assert!(repository.history("another user", 100, None).unwrap().is_empty());
    for limit in [-1, 0, 201] { assert!(repository.history("User1", limit, None).is_err()); }
    assert!(repository.history("User1", 100, Some(0)).is_err());
}

#[test]
fn payloads_are_strict_and_storage_open_can_be_retried() {
    let valid = r#"{"username":"User1","mode":"custom","lesson_id":null,"wpm":1,"raw_wpm":1,"accuracy":100,"duration_ms":10,"characters":1,"errors":0,"keys":[{"key":"a","hits":1,"misses":0,"time_ms":0}]}"#;
    assert!(serde_json::from_str::<ProgressInput>(valid).is_ok());
    for value in [
        r#"{"username":"User1","mode":"lesson","lesson_id":true,"wpm":1,"raw_wpm":1,"accuracy":100,"duration_ms":10,"characters":1,"errors":0,"keys":[]}"#,
        r#"{"username":"User1","mode":"custom","lesson_id":null,"wpm":"10","raw_wpm":1,"accuracy":100,"duration_ms":10,"characters":1,"errors":0,"keys":[]}"#,
        r#"{"username":"User1","mode":"custom","lesson_id":null,"wpm":1,"raw_wpm":1,"accuracy":100,"duration_ms":10,"characters":1,"errors":0,"keys":[],"sql":"DROP TABLE results"}"#,
        r#"{"username":"User1","mode":"custom","lesson_id":null,"wpm":1,"raw_wpm":1,"accuracy":100,"duration_ms":10,"characters":1,"errors":0,"keys":[{"key":"a","hits":1,"misses":0,"time_ms":0,"x":1}]}"#,
    ] { assert!(serde_json::from_str::<ProgressInput>(value).is_err()); }
    let directory = tempdir().unwrap();
    let blocked = directory.path().join("blocked");
    fs::write(&blocked, b"not a directory").unwrap();
    let storage = Storage::new(blocked.clone());
    assert!(storage.access(|repository| repository.summary("User1")).is_err());
    fs::remove_file(blocked).unwrap();
    assert_eq!(storage.access(|repository| repository.summary("User1")).unwrap().sessions, 0);
}

#[test]
fn newer_and_unknown_databases_are_left_unchanged() {
    for (setup, message) in [
        ("CREATE TABLE future(x); PRAGMA user_version = 9;", "newer version of Asdfy"),
        ("CREATE TABLE other(x);", "unknown format"),
    ] {
        let directory = tempdir().unwrap();
        let path = directory.path().join("progress.sqlite3");
        Connection::open(&path).unwrap().execute_batch(setup).unwrap();
        let before = fs::read(&path).unwrap();
        let error = Repository::open(directory.path()).err().unwrap();
        assert!(error.contains(message), "{error}");
        assert_eq!(fs::read(&path).unwrap(), before);
        assert!(backups(directory.path()).is_empty());
    }
}

/// Migration 2 as a future release might write it: rebuild `lessons`, which `results`
/// references, following SQLite's table-rebuild procedure.
const REBUILD_LESSONS: &str = "
CREATE TABLE lessons_new (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    level INTEGER NOT NULL,
    retired INTEGER NOT NULL DEFAULT 0
);
INSERT INTO lessons_new(id, title, content, level) SELECT id, title, content, level FROM lessons;
DROP TABLE lessons;
ALTER TABLE lessons_new RENAME TO lessons;
CREATE TABLE goals (id INTEGER PRIMARY KEY, wpm REAL NOT NULL);
INSERT INTO goals(wpm) SELECT max(wpm) FROM results;";

fn user_version(directory: &Path) -> i64 {
    Connection::open(directory.join("progress.sqlite3")).unwrap()
        .pragma_query_value(None, "user_version", |row| row.get(0)).unwrap()
}

fn backups(directory: &Path) -> Vec<String> {
    fs::read_dir(directory).unwrap()
        .map(|entry| entry.unwrap().file_name().into_string().unwrap())
        .filter(|name| name.starts_with("progress.v"))
        .collect()
}

/// Creates a version 1 database holding one lesson result and one custom result.
fn version_1(directory: &Path) {
    let mut repository = Repository::open_with(directory, &MIGRATIONS[..1]).unwrap();
    repository.save(lesson(40.0)).unwrap();
    repository.save(session("custom", None, 55.0)).unwrap();
}

#[test]
fn migrations_are_well_formed() {
    assert!(!MIGRATIONS.is_empty());
    for sql in MIGRATIONS {
        let upper = sql.to_uppercase();
        // The runner owns the transaction and the version number.
        for forbidden in ["BEGIN", "COMMIT", "ROLLBACK", "USER_VERSION", "FOREIGN_KEYS"] {
            assert!(!upper.contains(forbidden), "a migration must not contain {forbidden}");
        }
    }
}

#[test]
fn new_databases_get_every_migration_without_a_backup() {
    let directory = tempdir().unwrap();
    Repository::open(directory.path()).unwrap();
    assert_eq!(user_version(directory.path()), MIGRATIONS.len() as i64);
    Repository::open(directory.path()).unwrap();
    assert!(backups(directory.path()).is_empty());
}

#[test]
fn older_databases_are_backed_up_then_upgraded_once() {
    let directory = tempdir().unwrap();
    version_1(directory.path());
    let upgraded = [MIGRATIONS[0], REBUILD_LESSONS];
    let mut repository = Repository::open_with(directory.path(), &upgraded).unwrap();
    assert_eq!(user_version(directory.path()), 2);
    let history = repository.history("User1", 100, None).unwrap();
    assert_eq!(history.len(), 2);
    assert_eq!(history[1].lesson_title.as_deref(), Some(LESSONS[0].title));
    repository.save(lesson(60.0)).unwrap();
    assert_eq!(repository.summary("User1").unwrap().sessions, 3);
    drop(repository);

    let goal: f64 = Connection::open(directory.path().join("progress.sqlite3")).unwrap()
        .query_row("SELECT wpm FROM goals", [], |row| row.get(0)).unwrap();
    assert_eq!(goal, 55.0);
    let saved = backups(directory.path());
    assert_eq!(saved.len(), 1);
    assert!(saved[0].starts_with("progress.v1-backup-"));
    let backup = Connection::open(directory.path().join(&saved[0])).unwrap();
    let version: i64 = backup.pragma_query_value(None, "user_version", |row| row.get(0)).unwrap();
    let rows: i64 = backup.query_row("SELECT count(*) FROM results", [], |row| row.get(0)).unwrap();
    assert_eq!((version, rows), (1, 2));

    Repository::open_with(directory.path(), &upgraded).unwrap();
    assert_eq!(backups(directory.path()).len(), 1);
}

#[test]
fn failed_or_unsafe_upgrades_change_nothing_and_can_be_retried() {
    let orphaning = format!("DELETE FROM lessons WHERE id = {};", LESSONS[0].id);
    for (broken, reason) in [
        ("CREATE TABLE half_done(x); INSERT INTO missing VALUES (1);", "invalid SQL"),
        (orphaning.as_str(), "orphaned results"),
    ] {
        let directory = tempdir().unwrap();
        version_1(directory.path());
        let error = Repository::open_with(directory.path(), &[MIGRATIONS[0], broken]).err().unwrap();
        assert!(error.contains("left unchanged"), "{reason}: {error}");
        assert!(error.contains("progress.v1-backup-"), "{reason}: {error}");
        assert_eq!(user_version(directory.path()), 1, "{reason}");
        let unchanged = Repository::open_with(directory.path(), &MIGRATIONS[..1]).unwrap();
        assert_eq!(unchanged.history("User1", 100, None).unwrap().len(), 2, "{reason}");
        let tables: i64 = Connection::open(directory.path().join("progress.sqlite3")).unwrap()
            .query_row("SELECT count(*) FROM sqlite_master WHERE name = 'half_done'", [], |row| row.get(0)).unwrap();
        assert_eq!(tables, 0, "{reason}");
        drop(unchanged);
        // A corrected release upgrades the same database; each attempt keeps its own backup.
        Repository::open_with(directory.path(), &[MIGRATIONS[0], REBUILD_LESSONS]).unwrap();
        assert_eq!(user_version(directory.path()), 2, "{reason}");
        assert_eq!(backups(directory.path()).len(), 2, "{reason}");
    }
}
