-- Version 1 stored custom practice as placeholder lesson 999 and kept no session details.
-- Runs after the old table is renamed to results_v1 and the current schema is created.
INSERT INTO results(id, username, mode, lesson_id, wpm, accuracy, completed_at)
SELECT id,
       username,
       CASE WHEN lesson_id = 999 THEN 'custom' ELSE 'lesson' END,
       NULLIF(lesson_id, 999),
       wpm,
       accuracy,
       completed_at
FROM results_v1;

DROP TABLE results_v1;
DELETE FROM lessons WHERE id = 999;
