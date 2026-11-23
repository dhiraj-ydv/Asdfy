// Lesson content is data, separate from application and persistence logic.
// The course follows the US QWERTY layout, starting from the home row.
use crate::models::Lesson;

const fn lesson(
    id: i64,
    stage: &'static str,
    title: &'static str,
    kind: &'static str,
    keys: &'static str,
    content: &'static str,
) -> Lesson {
    Lesson { id, stage, title, kind, keys, content }
}

const HOME: &str = "Home row";
const REACH: &str = "First reaches";
const TOP: &str = "Top row";
const BOTTOM: &str = "Bottom row";
const SYMBOLS: &str = "Shift, symbols and numbers";
const TEXT: &str = "Real text";

pub const LESSONS: &[Lesson] = &[
    lesson(1, HOME, "Home row anchors", "keys", "asdfjkl", ""),
    lesson(2, HOME, "Inner reach: G and H", "keys", "gh", ""),
    lesson(3, HOME, "Home row words", "words", "", ""),
    lesson(4, REACH, "E and I", "keys", "ei", ""),
    lesson(5, REACH, "R and U", "keys", "ru", ""),
    lesson(6, REACH, "T and O", "keys", "to", ""),
    lesson(7, REACH, "Review: home row and reaches", "words", "", ""),
    lesson(8, TOP, "W and Y", "keys", "wy", ""),
    lesson(9, TOP, "P and Q", "keys", "pq", ""),
    lesson(10, TOP, "Review: top row", "words", "", ""),
    lesson(11, BOTTOM, "N and M", "keys", "nm", ""),
    lesson(12, BOTTOM, "C and V", "keys", "cv", ""),
    lesson(13, BOTTOM, "B, X and Z", "keys", "bxz", ""),
    lesson(14, BOTTOM, "Review: every letter", "words", "", ""),
    lesson(15, SYMBOLS, "Capital letters", "caps", "", ""),
    lesson(16, SYMBOLS, "Punctuation", "punctuation", "", ""),
    lesson(17, SYMBOLS, "Numbers", "numbers", "", ""),
    lesson(18, TEXT, "Prose: First light", "text", "",
        "The first light crept over the hills and found the village still asleep. A kettle hissed in a quiet kitchen, a dog stretched by the door, and somewhere a radio began to hum an old song. By the time the baker opened the shutters, the street smelled of bread and rain."),
    lesson(19, TEXT, "Prose: Rhythm", "text", "",
        "Good typing is less about speed than rhythm. Keep your wrists relaxed, let each finger return home, and trust the keyboard. Speed arrives on its own once the motions stop needing thought, so practice a little every day rather than a lot once a week."),
    lesson(20, TEXT, "Prose: Gettysburg", "text", "",
        "Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal."),
    lesson(21, TEXT, "Code: Python", "text", "",
        "def mean(values: list[float]) -> float: return sum(values) / len(values) if values else 0.0"),
    lesson(22, TEXT, "Code: Rust", "text", "",
        "for (index, word) in words.iter().enumerate() { println!(\"{index}: {word}\"); }"),
    lesson(23, TEXT, "Code: Shell", "text", "",
        "grep -rn \"TODO\" src/ | sort -u > todo.txt && wc -l todo.txt"),
];

pub fn contains(id: i64) -> bool {
    LESSONS.iter().any(|lesson| lesson.id == id)
}
