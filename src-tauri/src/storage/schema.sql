CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    level INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL CHECK(length(username) BETWEEN 1 AND 80),
    lesson_id INTEGER NOT NULL REFERENCES lessons(id),
    wpm REAL NOT NULL CHECK(wpm BETWEEN 0 AND 1000),
    accuracy REAL NOT NULL CHECK(accuracy BETWEEN 0 AND 100),
    completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS results_by_user ON results(username, id DESC);
PRAGMA user_version = 1;
