use serde::{Deserialize, Serialize};

pub const CUSTOM_LESSON_ID: i64 = 999;
pub type Result<T> = std::result::Result<T, String>;

#[derive(Debug, Serialize)]
pub struct Lesson {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub level: i32,
}

#[derive(Debug, Serialize)]
pub struct Progress {
    pub id: i64,
    pub lesson_id: i64,
    pub wpm: f64,
    pub accuracy: f64,
    pub completed_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProgressInput {
    pub username: String,
    pub lesson_id: i64,
    pub wpm: f64,
    pub accuracy: f64,
}

pub fn validate_username(value: &str) -> Result<&str> {
    let name = value.trim();
    if name.is_empty() || name.chars().count() > 80 {
        return Err("Username must contain 1–80 characters.".into());
    }
    Ok(name)
}

impl ProgressInput {
    pub fn validate(&self) -> Result<()> {
        validate_username(&self.username)?;
        if !self.wpm.is_finite() || !(0.0..=1000.0).contains(&self.wpm)
            || !self.accuracy.is_finite() || !(0.0..=100.0).contains(&self.accuracy)
        {
            return Err("Invalid practice score.".into());
        }
        if self.lesson_id != CUSTOM_LESSON_ID
            && !(1..=crate::content::LESSONS.len() as i64).contains(&self.lesson_id)
        {
            return Err("Unknown lesson.".into());
        }
        Ok(())
    }
}
