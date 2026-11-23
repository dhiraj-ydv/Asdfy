CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    level INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL CHECK(length(username) BETWEEN 1 AND 80),
    mode TEXT NOT NULL CHECK(mode IN ('lesson', 'adaptive', 'test', 'custom')),
    lesson_id INTEGER REFERENCES lessons(id),
    wpm REAL NOT NULL CHECK(wpm BETWEEN 0 AND 1000),
    raw_wpm REAL CHECK(raw_wpm BETWEEN 0 AND 1000),
    accuracy REAL NOT NULL CHECK(accuracy BETWEEN 0 AND 100),
    duration_ms INTEGER CHECK(duration_ms > 0),
    characters INTEGER CHECK(characters >= 0),
    errors INTEGER CHECK(errors >= 0),
    completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK((mode = 'lesson') = (lesson_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS results_by_user ON results(username, id DESC);

CREATE TABLE IF NOT EXISTS key_stats (
    username TEXT NOT NULL CHECK(length(username) BETWEEN 1 AND 80),
    symbol TEXT NOT NULL,
    hits INTEGER NOT NULL DEFAULT 0 CHECK(hits >= 0),
    misses INTEGER NOT NULL DEFAULT 0 CHECK(misses >= 0),
    time_ms INTEGER NOT NULL DEFAULT 0 CHECK(time_ms >= 0),
    PRIMARY KEY(username, symbol)
) WITHOUT ROWID;

PRAGMA user_version = 1;
