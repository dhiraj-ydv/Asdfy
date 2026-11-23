mod repository;
pub use repository::Repository;

use std::{path::{Path, PathBuf}, sync::Mutex};
use crate::models::Result;

pub struct Storage {
    directory: PathBuf,
    repository: Mutex<Option<Repository>>,
}

impl Storage {
    pub fn new(directory: PathBuf) -> Self {
        Self { directory, repository: Mutex::new(None) }
    }

    pub fn directory(&self) -> &Path {
        &self.directory
    }

    pub fn access<T>(&self, operation: impl FnOnce(&mut Repository) -> Result<T>) -> Result<T> {
        let mut guard = self.repository.lock()
            .map_err(|_| "Storage unavailable. Restart the app.".to_string())?;
        if guard.is_none() {
            *guard = Some(Repository::open(&self.directory)?);
        }
        let repository = guard.as_mut().ok_or("Storage unavailable.")?;
        operation(repository)
    }
}

#[cfg(test)]
mod tests;
