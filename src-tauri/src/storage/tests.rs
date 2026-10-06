use super::*;
use crate::models::{ProgressInput, CUSTOM_LESSON_ID};
use tempfile::tempdir;

fn score(id: i64, wpm: f64) -> ProgressInput {
    ProgressInput { username: "User1".into(), lesson_id: id, wpm, accuracy: 0.0 }
}

#[test]
fn first_launch_seeds_lessons_and_restart_retains_results() {
    let directory = tempdir().unwrap();
    {
        let mut repository = Repository::open(directory.path()).unwrap();
        let lessons = repository.lessons().unwrap();
        assert_eq!(lessons.len(), 28);
        repository.save(score(lessons[0].id, 42.0)).unwrap();
        repository.save(score(CUSTOM_LESSON_ID, 50.0)).unwrap();
    }
    let repository = Repository::open(directory.path()).unwrap();
    let history = repository.history("User1", 100, None).unwrap();
    assert_eq!(history.len(), 2);
    assert_eq!(history[0].lesson_id, CUSTOM_LESSON_ID);
    assert_eq!(history[0].accuracy, 0.0);
    assert!(history[0].completed_at.ends_with('Z'));
}

#[test]
fn invalid_scores_never_create_results() {
    let directory = tempdir().unwrap();
    let mut repository = Repository::open(directory.path()).unwrap();
    for speed in [f64::NAN, f64::INFINITY, -1.0, 1001.0] { assert!(repository.save(score(1, speed)).is_err()); }
    for id in [-1, 0, 29, 998, i64::MAX] { assert!(repository.save(score(id, 20.0)).is_err()); }
    for accuracy in [f64::NAN, f64::INFINITY, -1.0, 101.0] {
        let mut input = score(1, 20.0);
        input.accuracy = accuracy;
        assert!(repository.save(input).is_err());
    }
    let mut input = score(1, 20.0);
    input.username = " ".into();
    assert!(repository.save(input).is_err());
    assert!(repository.history("User1", 100, None).unwrap().is_empty());
}

#[test]
fn history_is_newest_first_bounded_and_private() {
    let directory = tempdir().unwrap();
    let mut repository = Repository::open(directory.path()).unwrap();
    for speed in [10.0, 20.0, 30.0] { repository.save(score(1, speed)).unwrap(); }
    let history = repository.history("User1", 2, None).unwrap();
    assert_eq!(history.iter().map(|entry| entry.wpm).collect::<Vec<_>>(), [30.0, 20.0]);
    assert_eq!(repository.history("User1", 2, Some(history[1].id)).unwrap()[0].wpm, 10.0);
    assert!(repository.history("another user", 100, None).unwrap().is_empty());
    for limit in [-1, 0, 201] { assert!(repository.history("User1", limit, None).is_err()); }
    assert!(repository.history("User1", 100, Some(0)).is_err());
}

#[test]
fn payloads_are_strict_and_storage_open_can_be_retried() {
    for value in [
        r#"{"username":"User1","lesson_id":true,"wpm":1,"accuracy":100}"#,
        r#"{"username":"User1","lesson_id":1,"wpm":"10","accuracy":100}"#,
        r#"{"username":"User1","lesson_id":1,"wpm":10,"accuracy":100,"sql":"DROP TABLE results"}"#,
    ] { assert!(serde_json::from_str::<ProgressInput>(value).is_err()); }
    let directory = tempdir().unwrap();
    let blocked = directory.path().join("blocked");
    std::fs::write(&blocked, b"not a directory").unwrap();
    let storage = Storage::new(blocked.clone());
    assert!(storage.access(|repository| repository.lessons()).is_err());
    std::fs::remove_file(blocked).unwrap();
    assert_eq!(storage.access(|repository| repository.lessons()).unwrap().len(), 28);
}

#[test]
fn previous_development_database_is_not_read_or_changed() {
    let directory = tempdir().unwrap();
    let previous = directory.path().join("colemak.db");
    std::fs::write(&previous, b"previous development data").unwrap();
    Repository::open(directory.path()).unwrap();
    assert_eq!(std::fs::read(previous).unwrap(), b"previous development data");
    assert!(directory.path().join("progress.sqlite3").exists());
}
