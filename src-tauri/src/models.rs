use serde::{Deserialize, Serialize};

pub type Result<T> = std::result::Result<T, String>;

pub const MODES: [&str; 4] = ["lesson", "adaptive", "test", "custom"];
const MAX_DURATION_MS: i64 = 86_400_000;
const MAX_COUNT: i64 = 1_000_000;
const MAX_KEYS: usize = 256;

/// One curriculum step. Generated drills use `keys`; fixed passages use `content`.
#[derive(Debug, Clone, Copy, Serialize)]
pub struct Lesson {
    pub id: i64,
    pub stage: &'static str,
    pub title: &'static str,
    pub kind: &'static str,
    pub keys: &'static str,
    pub content: &'static str,
}

#[derive(Debug, Serialize)]
pub struct Progress {
    pub id: i64,
    pub mode: String,
    pub lesson_id: Option<i64>,
    pub lesson_title: Option<String>,
    pub wpm: f64,
    pub raw_wpm: Option<f64>,
    pub accuracy: f64,
    pub duration_ms: Option<i64>,
    pub characters: Option<i64>,
    pub errors: Option<i64>,
    pub completed_at: String,
}

/// Correct presses, wrong presses, and typing time attributed to one physical key.
#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct KeyStat {
    pub key: String,
    pub hits: i64,
    pub misses: i64,
    pub time_ms: i64,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProgressInput {
    pub username: String,
    pub mode: String,
    pub lesson_id: Option<i64>,
    pub wpm: f64,
    pub raw_wpm: f64,
    pub accuracy: f64,
    pub duration_ms: i64,
    pub characters: i64,
    pub errors: i64,
    pub keys: Vec<KeyStat>,
}

#[derive(Debug, Serialize)]
pub struct LessonBest {
    pub lesson_id: i64,
    pub best_wpm: f64,
    pub best_accuracy: f64,
    pub attempts: i64,
}

#[derive(Debug, Serialize)]
pub struct ModeBest {
    pub mode: String,
    pub best_wpm: f64,
    pub sessions: i64,
}

#[derive(Debug, Serialize)]
pub struct ActivityDay {
    pub day: String,
    pub sessions: i64,
    pub duration_ms: i64,
}

#[derive(Debug, Serialize)]
pub struct Summary {
    pub sessions: i64,
    pub duration_ms: i64,
    pub best_wpm: f64,
    pub lessons: Vec<LessonBest>,
    pub modes: Vec<ModeBest>,
    pub days: Vec<ActivityDay>,
    pub keys: Vec<KeyStat>,
}

pub fn validate_username(value: &str) -> Result<&str> {
    let name = value.trim();
    if name.is_empty() || name.chars().count() > 80 {
        return Err("Username must contain 1–80 characters.".into());
    }
    Ok(name)
}

fn bounded(value: f64, max: f64) -> bool {
    value.is_finite() && (0.0..=max).contains(&value)
}

impl ProgressInput {
    pub fn validate(&self) -> Result<()> {
        validate_username(&self.username)?;
        if !MODES.contains(&self.mode.as_str()) {
            return Err("Unknown practice mode.".into());
        }
        // Only lessons reference the catalog; every other mode is free practice.
        match (self.mode == "lesson", self.lesson_id) {
            (true, Some(id)) if crate::content::contains(id) => {}
            (false, None) => {}
            _ => return Err("Unknown lesson.".into()),
        }
        if !bounded(self.wpm, 1000.0) || !bounded(self.raw_wpm, 1000.0) || !bounded(self.accuracy, 100.0) {
            return Err("Invalid practice score.".into());
        }
        if !(1..=MAX_DURATION_MS).contains(&self.duration_ms)
            || !(0..=MAX_COUNT).contains(&self.characters)
            || !(0..=MAX_COUNT).contains(&self.errors)
        {
            return Err("Invalid practice totals.".into());
        }
        if self.keys.len() > MAX_KEYS {
            return Err("Too many key statistics.".into());
        }
        for stat in &self.keys {
            if stat.key.chars().count() != 1
                || !(0..=MAX_COUNT).contains(&stat.hits)
                || !(0..=MAX_COUNT).contains(&stat.misses)
                || !(0..=MAX_DURATION_MS).contains(&stat.time_ms)
            {
                return Err("Invalid key statistics.".into());
            }
        }
        Ok(())
    }
}
